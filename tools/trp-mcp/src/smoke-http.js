#!/usr/bin/env node
import assert from 'node:assert/strict';

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';

const endpoint = process.argv[2];
if (!endpoint) throw new Error('Usage: node src/smoke-http.js <https://host/mcp>');

const transport = new StreamableHTTPClientTransport(new URL(endpoint));
const client = new Client({ name: 'trp-mcp-smoke', version: '0.2.0' });

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const names = listed.tools.map((tool) => tool.name).sort();
  assert.equal(names.length, 9);
  assert.ok(names.includes('search'));
  assert.ok(names.includes('fetch'));

  const searched = await client.callTool({ name: 'search', arguments: { query: '健康' } });
  assert.equal(searched.isError, undefined);
  assert.ok(searched.structuredContent.results.length > 0);
  const id = searched.structuredContent.results[0].id;

  const fetched = await client.callTool({ name: 'fetch', arguments: { id } });
  assert.equal(fetched.isError, undefined);
  assert.equal(fetched.structuredContent.id, id);
  assert.ok(fetched.structuredContent.text.length > 0);

  process.stdout.write(`${JSON.stringify({
    ok: true,
    endpoint,
    toolCount: names.length,
    searchResults: searched.structuredContent.results.length,
    fetchedId: id,
  })}\n`);
} finally {
  await client.close();
}
