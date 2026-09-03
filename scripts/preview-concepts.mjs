import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const files = [
  'variants/system.html',
  'variants/money.html',
  'variants/growth.html',
  'assets/css/site.css',
  'assets/css/prototype-v2.css',
  'assets/css/concept-variants.css',
  'assets/js/config.js',
  'assets/js/analytics.js',
  'assets/js/site.js',
  'assets/js/concept-variants.js',
  'assets/ksenia-bogatova-portrait-mobile.webp',
  'assets/ksenia-bogatova-portrait-desktop.webp',
  'assets/ksenia-bogatova-portrait-fallback.jpg'
];
const allowed = new Map(files.map((file) => [`/${file}`, file]));
allowed.set('/', 'variants/system.html');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg' };
const port = Number(process.env.SITE_CONCEPTS_PORT || 4174);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');

const server = http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    res.end('Method not allowed');
    return;
  }
  let pathname;
  try { pathname = new URL(req.url, 'http://127.0.0.1').pathname; }
  catch { res.writeHead(400); res.end('Bad request'); return; }
  const file = allowed.get(pathname);
  if (!file) { res.writeHead(404); res.end('Not found'); return; }
  // The canonical route keeps relative links correct for the comparison pages.
  if (pathname === '/') {
    res.writeHead(302, { Location: '/variants/system.html' });
    res.end();
    return;
  }
  try {
    const data = await fs.readFile(path.join(root, file));
    res.writeHead(200, {
      'Content-Type': mime[path.extname(file)],
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Robots-Tag': 'noindex, nofollow'
    });
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {
    res.writeHead(500);
    res.end('Preview asset unavailable');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Concept previews: http://127.0.0.1:${port}/variants/system.html`);
});
