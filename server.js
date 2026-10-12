import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!['index.html', 'styles.css', 'app.js'].includes(file)) { res.writeHead(404).end('Not found'); return; }
  try { const body = await readFile(path.join(root, file)); res.writeHead(200, { 'Content-Type': types[path.extname(file)], 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'" }).end(body); }
  catch { res.writeHead(500).end('Unable to load application'); }
});
server.listen(Number(process.env.PORT) || 4173, '127.0.0.1', () => console.log(`SENTRIX demo: http://127.0.0.1:${Number(process.env.PORT) || 4173}`));
