import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.join(__dirname, 'public');
const hydraBundlePath = path.join(__dirname, 'node_modules', 'hydra-synth', 'dist', 'hydra-synth.js');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png']
]);

const state = {
  remoteSketch: null,
  selectedProgram: null,
  cc: {},
  lastGoodSketch: null,
  updatedAt: new Date().toISOString()
};

const server = http.createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url ?? '/', 'http://localhost');
    const pathname = requestUrl.pathname;

    if (pathname === '/healthz') {
      sendJson(response, 200, { ok: true, updatedAt: state.updatedAt });
      return;
    }

    if (pathname === '/api/state') {
      sendJson(response, 200, state);
      return;
    }

    if (pathname === '/api/sketches') {
      const manifestPath = path.join(publicDir, 'sketches', 'manifest.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      sendJson(response, 200, manifest);
      return;
    }

    if (pathname === '/vendor/hydra-synth.js') {
      const fileBuffer = await readFile(hydraBundlePath);
      response.writeHead(200, {
        'Content-Type': 'text/javascript; charset=utf-8',
        'Content-Length': fileBuffer.length
      });
      response.end(fileBuffer);
      return;
    }

    const relativePath = pathname === '/' ? '/index.html' : pathname;
    const safePath = path.normalize(relativePath).replace(/^([.][.][/\\])+/, '');
    const filePath = path.join(publicDir, safePath);

    if (!filePath.startsWith(publicDir)) {
      sendText(response, 400, 'Bad request');
      return;
    }

    const fileStats = await stat(filePath);
    if (fileStats.isDirectory()) {
      sendText(response, 403, 'Forbidden');
      return;
    }

    const fileBuffer = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      'Content-Type': mimeTypes.get(ext) ?? 'application/octet-stream',
      'Content-Length': fileBuffer.length
    });
    response.end(fileBuffer);
  } catch (error) {
    sendText(response, 404, 'Not found');
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'state:init', state }));

  socket.on('message', (rawMessage) => {
    let message;
    try {
      message = JSON.parse(rawMessage.toString());
    } catch {
      socket.send(JSON.stringify({ type: 'error', message: 'Invalid JSON message' }));
      return;
    }

    if (message.type === 'sketch:remote') {
      state.remoteSketch = message.code ?? null;
      state.lastGoodSketch = message.code ?? state.lastGoodSketch;
      state.updatedAt = new Date().toISOString();
      broadcast({ type: 'state:update', state });
      return;
    }

    if (message.type === 'sketch:program-change') {
      state.selectedProgram = message.program ?? null;
      state.updatedAt = new Date().toISOString();
      broadcast({ type: 'state:update', state });
      return;
    }

    if (message.type === 'midi:cc') {
      state.cc[String(message.controller)] = message.value;
      state.updatedAt = new Date().toISOString();
      broadcast({ type: 'state:update', state });
      return;
    }

    if (message.type === 'sketch:eval-error') {
      state.updatedAt = new Date().toISOString();
      broadcast({ type: 'log', level: 'error', message: message.message ?? 'Sketch evaluation failed' });
    }
  });
});

function broadcast(payload) {
  const serialized = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(serialized);
    }
  }
}

function sendJson(response, statusCode, body) {
  const payload = Buffer.from(JSON.stringify(body));
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': payload.length
  });
  response.end(payload);
}

function sendText(response, statusCode, body) {
  const payload = Buffer.from(body);
  response.writeHead(statusCode, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': payload.length
  });
  response.end(payload);
}

const port = Number(process.env.PORT ?? 8080);

server.listen(port, () => {
  console.log(`turtle-visualizer listening on http://localhost:${port}`);
});
