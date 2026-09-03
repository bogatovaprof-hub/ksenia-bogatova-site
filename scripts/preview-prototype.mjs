import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.SITE_PREVIEW_PORT || 4175);
// QA flags affect only this local server's responses, never site files.
const noJs = process.argv.includes('--no-js');
const reducedMotion = process.argv.includes('--reduced-motion');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid preview port');

http.createServer(async (req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }); res.end(); return; }
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname); }
  catch { res.writeHead(400); res.end(); return; }
  const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
  const absolute = path.resolve(root, relative);
  if (!(relative === 'index.html' || relative === 'privacy.html' || relative === 'consent.html' || relative.startsWith('assets/')) || !absolute.startsWith(root) || !mime[path.extname(absolute)]) {
    res.writeHead(404); res.end('Not found'); return;
  }
  try {
    let data = await fs.readFile(absolute);
    if (noJs && path.extname(absolute) === '.html') data = Buffer.from(data.toString().replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
    if (reducedMotion && path.extname(absolute) === '.css') data = Buffer.from(data.toString().replaceAll('@media (prefers-reduced-motion: reduce)', '@media all'));
    if (reducedMotion && relative === 'assets/js/site.js') data = Buffer.from(data.toString().replace("window.matchMedia('(prefers-reduced-motion: reduce)')", '({matches: true, addEventListener() {}})'));
    const headers = { 'Content-Type': mime[path.extname(absolute)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex, nofollow', 'Accept-Ranges': 'bytes' };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(range[2] ? Number(range[2]) : data.length - 1, data.length - 1);
      if (start > end || start >= data.length) { res.writeHead(416, { 'Content-Range': `bytes */${data.length}` }); res.end(); return; }
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 });
      res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end + 1));
    } else {
      res.writeHead(200, { ...headers, 'Content-Length': data.length });
      res.end(req.method === 'HEAD' ? undefined : data);
    }
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Prototype: http://127.0.0.1:${port}/`));
