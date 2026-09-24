#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

import { PublicCorpus } from './corpus.js';
import { buildServer } from './server.js';

const DEFAULT_MAX_BODY_BYTES = 128 * 1024;

function allowedHost(hostHeader) {
  const host = String(hostHeader || '').trim().toLowerCase().replace(/:\d+$/u, '');
  const configured = String(process.env.TRP_ALLOWED_HOSTS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return host === 'localhost'
    || host === '127.0.0.1'
    || host === '::1'
    || host === 'hub.three-quarters.net'
    || host.endsWith('.run.app')
    || configured.includes(host);
}

function allowedOrigin(originHeader) {
  if (!originHeader) return true;
  const configured = String(process.env.TRP_ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  try {
    const origin = new URL(String(originHeader));
    const normalized = origin.origin.toLowerCase();
    return configured.includes(normalized)
      || (origin.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(origin.hostname))
      || (origin.protocol === 'https:' && [
        'hub.three-quarters.net',
        'chatgpt.com',
        'claude.ai',
      ].includes(origin.hostname));
  } catch {
    return false;
  }
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Content-Type, Last-Event-ID, MCP-Protocol-Version, MCP-Session-Id',
  );
  res.setHeader('Access-Control-Expose-Headers', 'MCP-Protocol-Version, MCP-Session-Id');
}

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Length', Buffer.byteLength(body));
  res.end(body);
}

async function readJsonBody(req, maxBytes) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error('Request body exceeds the public MCP limit.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('Request body is not valid JSON.');
    error.statusCode = 400;
    throw error;
  }
}

export function createTrpHttpServer({
  corpus = new PublicCorpus(),
  maxBodyBytes = DEFAULT_MAX_BODY_BYTES,
} = {}) {
  return createServer(async (req, res) => {
    const started = performance.now();
    const requestId = String(req.headers['x-cloud-trace-context'] || randomUUID()).split('/')[0];
    let url;
    try {
      url = new URL(req.url || '/', 'http://localhost');
    } catch {
      json(res, 400, { error: 'Malformed request URL.' });
      return;
    }
    let status = 500;

    res.on('finish', () => {
      status = res.statusCode;
      process.stdout.write(`${JSON.stringify({
        severity: status >= 500 ? 'ERROR' : status >= 400 ? 'WARNING' : 'INFO',
        event: 'http_request',
        requestId,
        method: req.method,
        path: url.pathname,
        status,
        durationMs: Math.round(performance.now() - started),
      })}\n`);
    });

    cors(res);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    if (!allowedHost(req.headers.host) || !allowedOrigin(req.headers.origin)) {
      json(res, 403, { error: 'Host or Origin not allowed.' });
      return;
    }

    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (url.pathname === '/healthz' && req.method === 'GET') {
      json(res, 200, {
        ok: true,
        service: 'three-realms-protocol-public',
        corpusDigest: corpus.digest,
      });
      return;
    }

    if (url.pathname === '/' && req.method === 'GET') {
      json(res, 200, {
        name: 'Three Realms Protocol public MCP',
        mcp: '/mcp',
        health: '/healthz',
        authentication: 'none',
        access: 'public-read-only',
      });
      return;
    }

    if (url.pathname !== '/mcp') {
      json(res, 404, { error: 'Not found.' });
      return;
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      json(res, 405, { error: 'The stateless MCP endpoint accepts POST requests only.' });
      return;
    }

    let parsedBody;
    try {
      parsedBody = await readJsonBody(req, maxBodyBytes);
      const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
      const mcp = buildServer(undefined, corpus);
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        void mcp.close().catch(() => {});
      };
      res.once('finish', close);
      res.once('close', close);
      await mcp.connect(transport);
      await transport.handleRequest(req, res, parsedBody);
    } catch (error) {
      if (!res.headersSent) {
        json(res, Number(error?.statusCode) || 500, {
          error: Number(error?.statusCode) ? error.message : 'MCP request failed.',
          requestId,
        });
      } else if (!res.writableEnded) {
        res.end();
      }
    }
  });
}

export function startHttp() {
  const port = Number(process.env.PORT || 8080);
  const server = createTrpHttpServer();
  server.listen(port, '0.0.0.0', () => {
    process.stdout.write(`${JSON.stringify({
      severity: 'INFO',
      event: 'server_started',
      port,
      corpusProfile: 'public-only',
    })}\n`);
  });
  const shutdown = () => server.close(() => process.exit(0));
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  return server;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  startHttp();
}
