#!/usr/bin/env node
// usage: node comparisons/home-environment-v1/game/server.cjs [port]
// Serves the real home with the comparison switcher. Nothing is written to the checkout.
const http = require('http'), path = require('path'), {resolve} = require('./patch.cjs');
const types = {'.html':'text/html; charset=utf-8', '.js':'text/javascript', '.mjs':'text/javascript', '.cjs':'text/javascript', '.css':'text/css',
  '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.jpg':'image/jpeg', '.svg':'image/svg+xml', '.mp3':'audio/mpeg', '.ogg':'audio/ogg',
  '.wav':'audio/wav', '.woff2':'font/woff2', '.glb':'model/gltf-binary', '.wasm':'application/wasm'};
const port = Number(process.argv[2]) || 8770;
http.createServer((request, response) => {
  let body = null;
  try { body = resolve(request.url); } catch (error) { response.writeHead(500); response.end(String(error)); return; }
  if (!body) { response.writeHead(404); response.end('Not found'); return; }
  const name = request.url.split(/[?#]/)[0];
  response.writeHead(200, {'content-type':types[path.extname(name === '/' ? 'index.html' : name)] || 'application/octet-stream', 'cache-control':'no-store'});
  response.end(body);
}).listen(port, '127.0.0.1', () => console.log('http://127.0.0.1:' + port + '/#gC-28-1-2-0-1'));
