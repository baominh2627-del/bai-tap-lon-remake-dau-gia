const http = require('node:http');
const net = require('node:net');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const readline = require('node:readline');

const root = __dirname;
const port = Number(process.env.WEB_PORT || 8080);
const tcpHost = process.env.AUCTION_HOST || '127.0.0.1';
const tcpPort = Number(process.env.AUCTION_PORT || 9999);
const sessions = new Map();
const notifications = new Set(['BID_UPDATE===', 'TIME_EXTENDED===', 'NEW_AUCTION_NOTIFY===', 'FORCE_LOGOUT===']);

function createSession() {
  const socket = net.createConnection({ host: tcpHost, port: tcpPort });
  const lines = readline.createInterface({ input: socket });
  const waiters = [];
  let pendingError;
  lines.on('line', line => {
    if ([...notifications].some(prefix => line.startsWith(prefix))) return;
    const resolve = waiters.shift();
    if (resolve) resolve(line);
  });
  socket.on('error', error => {
    pendingError = error;
    while (waiters.length) waiters.shift()(null, error);
  });
  let queue = Promise.resolve();
  return {
    request(action, data) {
      const run = async () => {
        if (!socket.writable || pendingError) throw pendingError || new Error('Auction server disconnected');
        const response = new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('Auction server timed out')), 15000);
          waiters.push((line, error) => { clearTimeout(timer); error ? reject(error) : resolve(line); });
        });
        socket.write(`${action}===${typeof data === 'string' ? data : JSON.stringify(data)}\n`);
        return await response;
      };
      queue = queue.then(run, run);
      return queue;
    },
    get closed() { return socket.destroyed; },
    close() { socket.destroy(); lines.close(); }
  };
}

function send(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/api/action' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 1024 * 1024) req.destroy(); });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        if (!/^[A-Z_]{2,40}$/.test(input.action || '') || !('data' in input)) return send(res, 400, { error: 'Yêu cầu không hợp lệ.' });
        const cookie = req.headers.cookie?.match(/(?:^|;\s*)auction_session=([a-f0-9]+)/)?.[1];
        let id = cookie;
        let session = id && sessions.get(id);
        if (!session) {
          id = crypto.randomBytes(24).toString('hex');
          session = createSession();
          sessions.set(id, session);
          res.setHeader('set-cookie', `auction_session=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`);
        }
        const response = await session.request(input.action, input.data);
        send(res, 200, { response });
      } catch (error) {
        send(res, 502, { error: error.message || 'Không kết nối được auction server.' });
      }
    });
    return;
  }
  const requested = pathname === '/' ? 'index.html' : pathname.slice(1);
  const base = requested === 'index.html' || requested.startsWith('uploads/') ? path.resolve(root, '..') : root;
  const file = path.resolve(base, requested);
  if (!file.startsWith(base + path.sep)) return send(res, 403, { error: 'Forbidden' });
  fs.readFile(file, (error, content) => {
    if (error) return send(res, 404, { error: 'Not found' });
    const type = file.endsWith('.css') ? 'text/css; charset=utf-8' : file.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/html; charset=utf-8';
    res.writeHead(200, { 'content-type': type }); res.end(content);
  });
});

server.listen(port, () => console.log(`Auction web: http://localhost:${port} (TCP ${tcpHost}:${tcpPort})`));
setInterval(() => {
  for (const [id, session] of sessions) {
    // Prune sockets that the auction server has closed.
    if (session.closed) { session.close(); sessions.delete(id); }
  }
}, 60000).unref();

