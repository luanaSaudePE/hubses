const { timingSafeEqual, randomUUID } = require('node:crypto');
const categories = new Set(['gestao', 'suporte', 'ia', 'comunicacao']);
const endpoint = 'https://api.github.com/repos/luanaSaudePE/hubses/contents/catalog.json';
const branch = 'main';
function equal(a, b) {
  const x = Buffer.from(a || ''), y = Buffer.from(b || '');
  return x.length === y.length && timingSafeEqual(x, y);
}
function valid(tool) {
  if (!tool || typeof tool.name !== 'string' || !tool.name.trim() || tool.name.length > 60
      || typeof tool.url !== 'string' || tool.url.length > 4096 || !categories.has(tool.category)) return false;
  if (!tool.url) return true;
  try { return ['http:', 'https:'].includes(new URL(tool.url).protocol); } catch { return false; }
}
function sameTool(a, b) {
  return a && b && ['id', 'name', 'url', 'category', 'icon'].every(key => a[key] === b[key]);
}
module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'PUT') {
    res.setHeader('Allow', 'PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  }
  const token = process.env.HUB_GITHUB_TOKEN;
  const password = process.env.HUB_ADMIN_PASSWORD;
  if (!token || !password || password.length < 16) return res.status(503).json({ error: 'A edição ainda precisa ser ativada pelo administrador.' });
  if (!equal(req.headers.authorization, `Bearer ${password}`)) return res.status(401).json({ error: 'Senha de edição inválida.' });
  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Dados inválidos.' }); }
  if (!body || !valid(body.tool) || !['add', 'edit'].includes(body.action)
      || typeof body.id !== 'string' || !/^[a-z0-9-]{1,100}$/.test(body.id)
      || (body.action === 'add' && !/^custom-[a-f0-9-]{36}$/.test(body.id))) {
    return res.status(400).json({ error: 'Confira nome, categoria e endereço http:// ou https://.' });
  }
  const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json', 'User-Agent': 'hubses-editor' };
  try {
    for (let attempt = 0; attempt < 3; attempt++) {
      const read = await fetch(`${endpoint}?ref=${branch}`, { headers, cache: 'no-store', signal: AbortSignal.timeout(8000) });
      if (!read.ok) throw new Error('GitHub read failed');
      const file = await read.json();
      const catalog = JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
      if (!Array.isArray(catalog.tools)) throw new Error('Invalid catalog');
      const index = catalog.tools.findIndex(tool => tool.id === body.id);
      const current = catalog.tools[index];
      const next = { id: body.id, name: body.tool.name.trim(), url: body.tool.url.trim(),
        category: body.tool.category, icon: current?.icon || 'link' };
      // Retrying a request that already succeeded must not create duplicate commits.
      if (sameTool(current, next)) return res.status(200).json({ tool: current, unchanged: true });
      if ((body.action === 'add' && current) || (body.action === 'edit' && !sameTool(current, body.original))) {
        return res.status(409).json({ error: 'Esta ferramenta mudou desde que você abriu a edição. Aguarde a publicação, atualize a página e tente novamente.' });
      }
      if (body.action === 'add') catalog.tools.push(next);
      else catalog.tools[index] = next;
      catalog.revision = randomUUID();
      const write = await fetch(endpoint, {
        method: 'PUT', headers, signal: AbortSignal.timeout(10000),
        body: JSON.stringify({ message: `Atualiza ferramenta: ${next.name.replace(/[\r\n]/g, ' ')}`, branch,
          sha: file.sha, content: Buffer.from(JSON.stringify(catalog, null, 2) + '\n').toString('base64') }),
      });
      if (write.status === 409) continue;
      if (!write.ok) throw new Error('GitHub write failed');
      const result = await write.json();
      return res.status(200).json({ tool: next, commit: result.commit.sha });
    }
    return res.status(409).json({ error: 'Houve outra alteração durante o salvamento. Tente novamente.' });
  } catch {
    return res.status(502).json({ error: 'Não foi possível confirmar o salvamento no GitHub. Tente novamente; uma repetição não duplica a ferramenta.' });
  }
};
