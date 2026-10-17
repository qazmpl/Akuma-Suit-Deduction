/**
 * ACMA MATRIX // Optional Dedicated Standalone Relay Server
 * 
 * If you ever want to host your own private relay instead of public cloud brokers:
 * Run: node server.js
 * Default Port: 8080 (or process.env.PORT)
 */

const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ACMA Matrix Realtime Server Online');
});

const wss = new WebSocket.Server({ server });
const rooms = new Map(); // roomId -> Set of ws clients

wss.on('connection', (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const roomId = (url.searchParams.get('room') || 'default').toUpperCase();

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(ws);
  console.log(`[ACMA Server] Client connected to Room: ${roomId} (Total: ${rooms.get(roomId).size})`);

  ws.on('message', (message) => {
    const clients = rooms.get(roomId);
    if (!clients) return;
    for (const client of clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  });

  ws.on('close', () => {
    const clients = rooms.get(roomId);
    if (clients) {
      clients.delete(ws);
      if (clients.size === 0) {
        rooms.delete(roomId);
      }
    }
    console.log(`[ACMA Server] Client disconnected from Room: ${roomId}`);
  });
});

server.listen(PORT, () => {
  console.log(`⚡ ACMA Matrix Relay Server running on port ${PORT}`);
});
