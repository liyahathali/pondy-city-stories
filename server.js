// Zero-dependency static server: node server.js  ->  http://localhost:8080
const http = require('http');
const fs = require('fs');
const path = require('path');
const PORT = process.env.PORT || 8080;
const ROOT = __dirname;
const TYPES = { '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.aac': 'audio/aac', '.flac': 'audio/flac', '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.wasm': 'application/wasm', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.webp': 'image/webp' };
http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end('Forbidden'); }
  // The radio asks for /music/ to find the player's own songs: answer with a JSON file list.
  if (p === '/music/' || p === '/music') {
    return fs.readdir(path.join(ROOT, 'music'), (err, list) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, must-revalidate' });
      res.end(JSON.stringify(err ? [] : list.filter((f) => /\.(mp3|ogg|m4a|wav|aac|flac)$/i.test(f))));
    });
  }
  // Drop-in 3D models: /models/<folder>/ answers with the .glb/.gltf/.fbx files placed there.
  if (p.startsWith('/models/') && p.endsWith('/')) {
    return fs.readdir(file, (err, list) => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, must-revalidate' });
      res.end(JSON.stringify(err ? [] : list.filter((f) => /\.(glb|gltf|fbx)$/i.test(f))));
    });
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store, must-revalidate' });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`\n  Pondy City Stories is running!\n  Open  http://localhost:${PORT}  in Chrome, Edge or Firefox.\n  (Press Ctrl+C to stop the server)\n`);
});
