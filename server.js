'use strict';
/** FF Urdu Name — zero-dependency server: static frontend + convert API. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { convert } = require('./lib/convert');

const PORT = process.env.PORT || 20348;
const HOST = process.env.HOST || '127.0.0.1';
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/api/health') return sendJson(res, 200, { ok: true, service: 'ff-urdu-name' });

  if (url.pathname === '/api/convert') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'POST only' });
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 8192) req.destroy(); });
    req.on('end', () => {
      let data;
      try { data = JSON.parse(body || '{}'); } catch { return sendJson(res, 400, { error: 'Invalid JSON' }); }
      const text = typeof data.text === 'string' ? data.text.slice(0, 200) : '';
      return sendJson(res, 200, convert(text, { mode: data.mode, separator: data.separator }));
    });
    return;
  }

  // static
  let file = url.pathname === '/' ? '/index.html' : url.pathname === '/guide' ? '/guide.html' : url.pathname === '/names' ? '/names.html' : url.pathname;
  file = path.normalize(file).replace(/^(\.\.[\/\\])+/, '');
  const full = path.join(PUBLIC, file);
  if (!full.startsWith(PUBLIC)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(full, (err, buf) => {
    if (err) {
      return fs.readFile(path.join(PUBLIC, '404.html'), (e2, page) => {
        if (e2) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Not found'); }
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
        return res.end(page);
      });
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full)] || 'application/octet-stream',
      'Cache-Control': 'no-cache', // tiny site: never let browsers serve stale CSS/JS after a deploy
    });
    res.end(buf);
  });
});

server.listen(PORT, HOST, () => console.log(`ff-urdu-name listening on ${HOST}:${PORT}`));
