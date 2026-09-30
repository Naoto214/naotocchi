// Opt-in CI preload: observe localhost CSS transport failures without retrying,
// changing request options, or suppressing the original error.
const http = require('node:http');
const originalRequest = http.request;
const sockets = new WeakMap();

http.request = function (...args) {
  const req = originalRequest.apply(this, args);
  if (!/^127\.0\.0\.1(?::\d+)?$/.test(req.host || '') || !/\.css(?:\?|$)/.test(req.path || '')) return req;
  const started = performance.now();
  let details = null;
  req.on('socket', socket => {
    let previous = sockets.get(socket);
    if (!previous) {
      previous = { firstSeen: performance.now(), lastResponseEnd: null };
      sockets.set(socket, previous);
    }
    details = {
      socket,
      firstSeen: previous.firstSeen,
      idleMs: previous.lastResponseEnd === null ? null : performance.now() - previous.lastResponseEnd,
    };
    req.on('response', res => res.on('end', () => { previous.lastResponseEnd = performance.now(); }));
  });
  req.on('error', error => {
    console.error('CSS_TRANSPORT_DIAGNOSTIC ' + JSON.stringify({
      node: process.version,
      path: req.path,
      code: error.code || null,
      message: error.message,
      reusedSocket: req.reusedSocket,
      elapsedMs: performance.now() - started,
      socketAgeMs: details ? performance.now() - details.firstSeen : null,
      idleMs: details?.idleMs ?? null,
      localPort: details?.socket.localPort ?? null,
      remotePort: details?.socket.remotePort ?? null,
    }));
  });
  return req;
};
