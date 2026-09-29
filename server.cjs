const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
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
