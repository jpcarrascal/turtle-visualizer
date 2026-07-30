// One-shot diagnostic: inspects the running kiosk's visual-canvas element and WebGL
// framebuffer directly, without navigating away from the current page. Run locally
// on the Pi while the kiosk service is up with --remote-debugging-port=9222.
//
// Usage: node scripts/check-canvas-status.mjs

import WebSocket from 'ws';

const DEBUG_PORT = process.env.DEBUG_PORT ?? '9222';

const PROBE = `(() => {
  const canvas = document.getElementById('visual-canvas');
  if (!canvas) return { error: 'no #visual-canvas element found' };
  const rect = canvas.getBoundingClientRect();
  const gl = canvas.getContext('webgl');
  if (!gl) return { width: canvas.width, height: canvas.height, rect, error: 'getContext(webgl) returned null' };
  const glError = gl.getError();
  // Definitive per-context check: a hardware path reports the real GPU here
  // (e.g. "V3D 4.2"), a software fallback reports SwiftShader.
  const dbg = gl.getExtension('WEBGL_debug_renderer_info');
  const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const vendor = dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  const pixel = new Uint8Array(4);
  try {
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
  } catch (e) {
    return { width: canvas.width, height: canvas.height, rect, glError, readPixelsError: e.message };
  }
  return {
    width: canvas.width,
    height: canvas.height,
    rect: { width: rect.width, height: rect.height },
    glError,
    renderer,
    vendor,
    pixelAt00: Array.from(pixel),
    hydraFps: window.__hydraInstance?.synth?.stats?.fps ?? null,
    activeSource: window.__hydraInstance ? 'hydra instance exists' : 'no hydra instance'
  };
})()`;

async function main() {
  const res = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`);
  if (!res.ok) {
    throw new Error(`Could not reach DevTools endpoint: ${res.status}`);
  }
  const targets = await res.json();
  const target = targets.find((t) => t.type === 'page') ?? targets[0];
  if (!target) {
    throw new Error('No inspectable page found. Is the kiosk running with --remote-debugging-port set?');
  }

  const debuggerUrl = target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1');
  const ws = new WebSocket(debuggerUrl);
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

  const { result, exceptionDetails } = await send('Runtime.evaluate', {
    expression: PROBE,
    returnByValue: true
  });

  if (exceptionDetails) {
    console.error('Evaluation threw:', exceptionDetails.text);
  } else {
    console.log(JSON.stringify(result.value, null, 2));
  }

  ws.close();
  process.exit(0);
}

main().catch((error) => {
  console.error('check-canvas-status failed:', error.message);
  process.exit(1);
});
