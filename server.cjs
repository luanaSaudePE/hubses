const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
for (const name of ['.env', '.env.local']) {
  const file = path.join(__dirname, name);
  if (fs.existsSync(file)) process.loadEnvFile(file);
}
const handler = require('./api/catalog');
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/catalog') {
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) return res.status(413).json({ error: 'Dados muito grandes.' });
    }
    req.body = body;
    return handler(req, res);
  }
  if (pathname === '/catalog.json' && req.method === 'GET') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(fs.readFileSync(path.join(__dirname, 'catalog.json')));
  }
  if ((pathname === '/' || pathname === '/index.html') && ['GET', 'HEAD'].includes(req.method)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(req.method === 'HEAD' ? undefined : fs.readFileSync(path.join(__dirname, 'index.html')));
  }
  res.writeHead(404);
  res.end('Not found');
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
  console.log(`Central local: http://localhost:${server.address().port}`);
});
