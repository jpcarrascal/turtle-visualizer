// One-shot diagnostic: navigates the running kiosk's Chromium to chrome://gpu via the
// DevTools protocol and dumps the rendered status text. Run directly on the Pi while
// the kiosk service is up with --remote-debugging-port=9222 (loopback is enough, no
// need for --remote-debugging-address or a tunnel since this runs locally).
//
// Usage: node scripts/check-gpu-status.mjs

import WebSocket from 'ws';

const DEBUG_PORT = process.env.DEBUG_PORT ?? '9222';

async function main() {
  const res = await fetch(`http://localhost:${DEBUG_PORT}/json`);
  if (!res.ok) {
    throw new Error(`Could not reach DevTools endpoint: ${res.status}`);
  }
  const targets = await res.json();
  const target = targets.find((t) => t.type === 'page') ?? targets[0];
  if (!target) {
    throw new Error('No inspectable page found. Is the kiosk running with --remote-debugging-port set?');
  }

  const ws = new WebSocket(target.webSocketDebuggerUrl);
  let nextId = 0;

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 10000);
      const handler = (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === id) {
          ws.off('message', handler);
          clearTimeout(timeout);
          if (msg.error) reject(new Error(msg.error.message));
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  await new Promise((resolve, reject) => {
    ws.once('open', resolve);
    ws.once('error', reject);
  });

  await send('Page.navigate', { url: 'chrome://gpu' });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const { result } = await send('Runtime.evaluate', {
    expression: 'document.body.innerText',
    returnByValue: true
  });

  console.log(result.value);
  ws.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('check-gpu-status failed:', error.message);
  process.exit(1);
});
