const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/catalog');
let catalog, writes;
const original = { id: 'miro', name: 'Miro', url: 'https://miro.com', category: 'gestao', icon: 'link' };
beforeEach(() => {
  process.env.HUB_GITHUB_TOKEN = 'test-token';
  process.env.HUB_ADMIN_PASSWORD = 'test-password-long';
  catalog = { tools: [{ ...original }] }; writes = 0;
  global.fetch = async (_url, options) => {
    if (options.method === 'PUT') {
      writes++;
      catalog = JSON.parse(Buffer.from(JSON.parse(options.body).content, 'base64').toString());
      return { ok: true, json: async () => ({ commit: { sha: 'commit-id' } }) };
    }
    return { ok: true, json: async () => ({ sha: 'file-sha', content: Buffer.from(JSON.stringify(catalog)).toString('base64') }) };
  };
});
async function request(body, password = 'test-password-long') {
  const result = {};
  await handler({ method: 'PUT', headers: { authorization: `Bearer ${password}` }, body }, {
    setHeader() {}, status(code) { result.status = code; return this; }, json(body) { result.body = body; },
  });
  return result;
}
test('edits persist in GitHub and preserve unrelated tools', async () => {
  catalog.tools.push({ ...original, id: 'other' });
  const result = await request({ action: 'edit', id: 'miro', original, tool: { ...original, url: 'https://new.example' } });
  assert.equal(result.status, 200);
  assert.equal(catalog.tools[0].url, 'https://new.example');
  assert.equal(catalog.tools[1].url, original.url);
});
test('adding and retrying creates only one tool and commit', async () => {
  const body = { action: 'add', id: 'custom-12345678-1234-1234-1234-123456789abc', tool: { ...original, name: 'Nova' } };
  assert.equal((await request(body)).status, 200);
  assert.equal((await request(body)).status, 200);
  assert.equal(catalog.tools.length, 2);
  assert.equal(writes, 1);
});
test('stale edits do not overwrite newer edits', async () => {
  catalog.tools[0].url = 'https://another.example';
  assert.equal((await request({ action: 'edit', id: 'miro', original, tool: { ...original, name: 'Changed' } })).status, 409);
  assert.equal(writes, 0);
});
test('invalid password and URLs cannot write', async () => {
  const body = { action: 'edit', id: 'miro', original, tool: { ...original } };
  assert.equal((await request(body, 'wrong')).status, 401);
  body.tool.url = 'javascript:alert(1)';
  assert.equal((await request(body)).status, 400);
  assert.equal(writes, 0);
});
test('GitHub failure and missing configuration never claim success', async () => {
  const body = { action: 'edit', id: 'miro', original, tool: { ...original } };
  global.fetch = async () => { throw Error('network'); };
  assert.equal((await request(body)).status, 502);
  delete process.env.HUB_GITHUB_TOKEN;
  assert.equal((await request(body)).status, 503);
});
