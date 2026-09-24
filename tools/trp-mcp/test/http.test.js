import assert from 'node:assert/strict';
import test from 'node:test';

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

import { PublicCorpus } from '../src/corpus.js';
import { createTrpHttpServer } from '../src/http.js';
import { document, fixture } from './support/fixture.js';

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  return `http://127.0.0.1:${address.port}`;
}

test('Streamable HTTP exposes health, search, and fetch without authentication', async (t) => {
  const { root, write } = fixture(t);
  write('SPEC/SPEC-001.md', document('SPEC-001', 'status: Active', 'Health is a living relation.'));
  const server = createTrpHttpServer({ corpus: new PublicCorpus(root) });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = await listen(server);

  const health = await fetch(`${base}/healthz`);
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);

  const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp`));
  const client = new Client({ name: 'trp-http-test', version: '0.2.0' });
  t.after(() => client.close());
  await client.connect(transport);
  const tools = await client.listTools();
  assert.ok(tools.tools.some((tool) => tool.name === 'search'));

  const searched = await client.callTool({ name: 'search', arguments: { query: 'living relation' } });
  assert.equal(searched.structuredContent.results[0].id, 'SPEC/SPEC-001.md');
  const fetched = await client.callTool({ name: 'fetch', arguments: { id: 'SPEC/SPEC-001.md' } });
  assert.match(fetched.structuredContent.text, /living relation/u);
});

test('HTTP boundary rejects oversized bodies and unrecognized hosts', async (t) => {
  const { root } = fixture(t);
  const server = createTrpHttpServer({ corpus: new PublicCorpus(root), maxBodyBytes: 64 });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const base = await listen(server);

  const oversized = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ value: 'x'.repeat(100) }),
  });
  assert.equal(oversized.status, 413);

  const denied = await fetch(`${base}/healthz`, { headers: { origin: 'https://attacker.example' } });
  assert.equal(denied.status, 403);
});
