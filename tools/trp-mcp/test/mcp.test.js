import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/client';
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio';

import { document, fixture } from './support/fixture.js';

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test('official MCP client can list and call all six read-only tools', async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(packageRoot, 'src', 'server.js')],
    cwd: packageRoot,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'trp-mcp-test', version: '0.1.0' });
  try {
    await client.connect(transport);
    const listed = await client.listTools();
    assert.deepEqual(
      listed.tools.map((tool) => tool.name).sort(),
      ['trp_current', 'trp_lex', 'trp_manifest', 'trp_pending', 'trp_resolve', 'trp_search'],
    );
    assert.ok(listed.tools.every((tool) => tool.annotations?.readOnlyHint === true));
    const searchSchema = listed.tools.find((tool) => tool.name === 'trp_search').inputSchema;
    assert.equal(Object.hasOwn(searchSchema.properties, 'include_review_required'), false);

    const manifest = await client.callTool({ name: 'trp_manifest', arguments: {} });
    assert.equal(manifest.isError, undefined);
    assert.equal(manifest.structuredContent.profile, 'public-only');
    assert.equal(manifest.structuredContent.counts.indexed, 260);

    const resolution = await client.callTool({ name: 'trp_resolve', arguments: { id: 'LEX·007' } });
    assert.equal(resolution.isError, undefined);
    assert.equal(resolution.structuredContent.found, true);
    assert.match(resolution.structuredContent.documents[0].path, /^LEX\//u);

    const search = await client.callTool({ name: 'trp_search', arguments: { query: '健康', corpus: 'lex' } });
    assert.ok(search.structuredContent.results.length > 0);
    const current = await client.callTool({ name: 'trp_current', arguments: { id_or_topic: 'LEX·007' } });
    assert.equal(current.structuredContent.found, true);
    const lex = await client.callTool({ name: 'trp_lex', arguments: { term: '健康' } });
    assert.ok(lex.structuredContent.entries.length > 0);
    assert.equal(lex.structuredContent.entries[0].id, 'LEX·007');
    assert.match(lex.structuredContent.entries[0].content, /不依賴崩潰/u);
    const pending = await client.callTool({ name: 'trp_pending', arguments: { kind: 'candidate', limit: 3 } });
    assert.equal(pending.structuredContent.kind, 'candidate');
  } finally {
    await client.close();
  }
});

test('MCP rejects invalid inputs, withholds private data, and reports stale errors', async (t) => {
  const { root, write } = fixture(t);
  write('SPEC/SPEC-001.md', document('SPEC-001', 'status: Active'));
  write('PRIVATE/SPEC-999.md', document('SPEC-999', '', 'withheld-sentinel'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [join(packageRoot, 'src', 'server.js')],
    cwd: packageRoot,
    env: { TRP_REPO_ROOT: root },
    stderr: 'pipe',
  });
  const client = new Client({ name: 'trp-mcp-boundary-test', version: '0.1.0' });
  try {
    await client.connect(transport);
    const invalid = await client.callTool({ name: 'trp_search', arguments: { query: 'test', limit: 0 } });
    assert.equal(invalid.isError, true);
    const search = await client.callTool({ name: 'trp_search', arguments: { query: 'withheld-sentinel', include_review_required: true } });
    assert.equal(search.isError, undefined);
    assert.deepEqual(search.structuredContent.results, []);
    const privateDocument = await client.callTool({ name: 'trp_resolve', arguments: { id: 'SPEC-999' } });
    assert.equal(privateDocument.structuredContent.found, false);

    write('SPEC/SPEC-001.md', document('SPEC-001', 'status: Active', 'Changed.'));
    for (const [name, args] of [
      ['trp_resolve', { id: 'SPEC-001' }], ['trp_search', { query: 'Initial' }],
      ['trp_current', { id_or_topic: 'SPEC-001' }], ['trp_lex', { term: 'health' }],
      ['trp_pending', {}], ['trp_manifest', {}],
    ]) {
      const result = await client.callTool({ name, arguments: args });
      assert.equal(result.isError, true, name);
      assert.equal(JSON.parse(result.content[0].text).code, 'STALE_CORPUS', name);
      assert.equal(result.structuredContent, undefined);
    }
  } finally {
    await client.close();
  }
});
