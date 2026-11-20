/* Zero-dependency static server for local preview.
 *
 *   node tools/serve.js            → http://localhost:5173
 *   node tools/serve.js 8080       → http://localhost:8080
 *
 * Why not just open index.html? A file:// page is awkward to automate:
 * Chrome extensions (Claude in Chrome included) need the separate
 * "Allow access to file URLs" permission to touch it, and some APIs behave
 * differently off-origin. Serving over http://localhost makes the page an
 * ordinary site that any tool can drive, and matches how GitHub Pages
 * will serve it. No caching, so a reload always shows your latest edit.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.argv[2]) || 5173;
// Loopback only: the folder also holds private notes (PROJECT_BRIEF.md etc.),
// so the preview must never be reachable from other devices on the network.
const HOST = '127.0.0.1';
// Gitignored working notes are never served, even locally.
// Matched against the path relative to the project root, with forward slashes.
const PRIVATE = /^(PROJECT_BRIEF|CLAUDE|DEPLOY|LAUNCH_CHECKLIST)\.md$|^(\.git|notes|drafts|tools\/shots)(\/|$)/i;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(req.url.split('?')[0]); }
  catch (e) { res.writeHead(400).end('Bad request'); return; }
  if (rel.endsWith('/')) rel += 'index.html';

  const file = path.join(ROOT, rel);
  const inside = path.relative(ROOT, file).split(path.sep).join('/');
  // never serve outside the project directory, nor the private notes inside it
  if (!file.startsWith(ROOT + path.sep) || PRIVATE.test(inside)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  fs.readFile(file, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404 — ' + rel);
      console.log('404 ' + rel);
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store'
    });
    res.end(buf);
    console.log('200 ' + rel);
  });
}).listen(PORT, HOST, () => {
  console.log(`\n  Yushu Singh — serving ${ROOT}`);
  console.log(`  http://localhost:${PORT}\n`);
  console.log('  Ctrl+C to stop.\n');
});
