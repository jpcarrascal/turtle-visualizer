const statusText = document.getElementById('status-text');
const sourceText = document.getElementById('source-text');
const programText = document.getElementById('program-text');

const storageKey = 'turtle-visualizer:last-good-sketch';
const KICK_NOTES = new Set([35, 36]);
const state = {
  manifest: [],
  activeSource: null,
  activeProgram: null,
  cc: {},
  socket: null,
  midiAccess: null,
  pendingCcBroadcasts: new Map(),
  ccBroadcastScheduled: false,
  triggers: {
    kick: 0
  }
};

boot().catch((error) => setStatus(`Boot failed: ${error.message}`, 'error'));

async function boot() {
  refreshCursorState();
  startTriggerDecayLoop();
  setStatus('Loading manifest', 'boot');
  state.manifest = await loadManifest();
  const persisted = loadPersistedSketch();

  initializeHydra();
  connectSocket();
  await initializeMidi();

  if (persisted?.source === 'library' && Number.isInteger(persisted.program)) {
    // Refresh library sketches from file so saved stale code does not mask recent changes.
    await selectLibrarySketch(persisted.program, { persist: false });
  } else if (persisted?.code) {
    state.activeProgram = persisted.program ?? null;
    applySketch(persisted.code, {
      source: persisted.source ?? 'persisted',
      label: persisted.label ?? 'Persisted sketch',
      program: persisted.program ?? null
    });
  }

  const defaultEntry = state.manifest.find((entry) => entry.default) ?? state.manifest[0];
  if (defaultEntry && !state.activeSource) {
    await selectLibrarySketch(defaultEntry.pc, { persist: false });
  }

  setStatus('Ready', 'ok');
}

function startTriggerDecayLoop() {
  const decay = () => {
    // Exponential-style decay keeps kick pulses visible but short.
    state.triggers.kick = Math.max(0, state.triggers.kick * 0.86 - 0.008);
    window.triggers = state.triggers;
    requestAnimationFrame(decay);
  };

  window.triggers = state.triggers;
  requestAnimationFrame(decay);
}

function refreshCursorState() {
  const applyCursorNone = () => {
    document.documentElement.style.cursor = 'none';
    document.body.style.cursor = 'none';
  };

  const nudge = () => {
    applyCursorNone();
    document.dispatchEvent(
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: Math.max(0, window.innerWidth - 2),
        clientY: Math.max(0, window.innerHeight - 2)
      })
    );
    applyCursorNone();
  };

  applyCursorNone();
  requestAnimationFrame(() => requestAnimationFrame(nudge));
  setTimeout(nudge, 700);
}

async function loadManifest() {
  const response = await fetch('/sketches/manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Manifest request failed: ${response.status}`);
  }

  return response.json();
}

function connectSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const socket = new WebSocket(`${protocol}//${location.host}/ws`);
  state.socket = socket;

  socket.addEventListener('open', () => {
    setStatus('Connected', 'ok');
    socket.send(JSON.stringify({ type: 'client:ready' }));
  });

  socket.addEventListener('message', async (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      setStatus('Invalid socket payload', 'warn');
      return;
    }

    if (message.type === 'state:init' || message.type === 'state:update') {
      updateRemoteState(message.state);
      return;
    }

    if (message.type === 'log') {
      setStatus(message.message, message.level === 'error' ? 'error' : 'info');
      return;
    }

    if (message.type === 'sketch:remote') {
      applySketch(message.code, { source: 'remote', label: 'Remote sketch' });
    }
  });

  socket.addEventListener('close', () => setStatus('Disconnected', 'warn'));
  socket.addEventListener('error', () => setStatus('Socket error', 'error'));
}

async function initializeMidi() {
  if (!navigator.requestMIDIAccess) {
    setStatus('MIDI unavailable', 'warn');
    return;
  }

  try {
    state.midiAccess = await navigator.requestMIDIAccess({ sysex: false });
    wireMidiInputs(state.midiAccess);
    state.midiAccess.addEventListener('statechange', () => wireMidiInputs(state.midiAccess));
  } catch (error) {
    setStatus(`MIDI init failed: ${error.message}`, 'warn');
  }
}

function wireMidiInputs(midiAccess) {
  for (const input of midiAccess.inputs.values()) {
    input.onmidimessage = handleMidiMessage;
  }
}

function queueCcBroadcast(controller, value, channel) {
  const key = `${channel}:${controller}`;
  state.pendingCcBroadcasts.set(key, { controller, value, channel });

  if (state.ccBroadcastScheduled) {
    return;
  }

  state.ccBroadcastScheduled = true;
  requestAnimationFrame(() => {
    state.ccBroadcastScheduled = false;

    if (!state.socket || state.socket.readyState !== WebSocket.OPEN) {
      state.pendingCcBroadcasts.clear();
      return;
    }

    for (const payload of state.pendingCcBroadcasts.values()) {
      state.socket.send(JSON.stringify({ type: 'midi:cc', ...payload }));
    }

    state.pendingCcBroadcasts.clear();
  });
}

function handleMidiMessage(event) {
  const [statusByte, data1, data2 = 0] = event.data;
  const type = statusByte & 0xf0;
  const channel = (statusByte & 0x0f) + 1;

  if (type === 0x90 && data2 > 0) {
    const velocityNormalized = data2 / 127;
    const gain = KICK_NOTES.has(data1) ? 1 : 0.6;
    state.triggers.kick = Math.max(state.triggers.kick, velocityNormalized * gain);
    window.triggers = state.triggers;
  }

  if (type === 0xb0) {
    state.cc[data1] = data2;
    queueCcBroadcast(data1, data2, channel);
    return;
  }

  if (type === 0xc0) {
    selectLibrarySketch(data1, { source: 'midi', channel }).catch((error) => {
      setStatus(`Sketch load failed: ${error.message}`, 'error');
    });
  }
}

function initializeHydra() {
  if (window.__hydraInstance) {
    return window.__hydraInstance;
  }

  if (!window.Hydra) {
    throw new Error('Hydra runtime is not loaded');
  }

  const canvas = document.getElementById('visual-canvas');
  window.__hydraInstance = new window.Hydra({
    detectAudio: false,
    canvas,
    makeGlobal: true
  });
  window.cc = state.cc;
  window.midi = state.midiAccess;
  return window.__hydraInstance;
}

async function selectLibrarySketch(program, options = {}) {
  const entry = state.manifest.find((candidate) => candidate.pc === program);
  if (!entry) {
    setStatus(`No sketch for program ${program}`, 'warn');
    return;
  }

  const response = await fetch(`/sketches/${entry.file}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Sketch load failed: ${response.status}`);
  }

  const code = await response.text();
  applySketch(code, { source: 'library', label: entry.name ?? entry.file, program });

  if (options.persist !== false) {
    persistSketch({ code, source: 'library', label: entry.name ?? entry.file, program });
  }

  state.activeProgram = program;
  updateHud();
  state.socket?.send(JSON.stringify({ type: 'sketch:program-change', program }));
}

function applySketch(code, metadata = {}) {
  window.cc = state.cc;
  window.midi = state.midiAccess;

  try {
    runSketch(code, metadata);
    state.activeSource = metadata;
    if (metadata.program !== null && metadata.program !== undefined) {
      state.activeProgram = metadata.program;
    }
    updateHud();
    persistSketch({ code, ...metadata });
    setStatus(`Loaded ${metadata.label ?? metadata.source ?? 'sketch'}`, 'ok');
  } catch (error) {
    state.socket?.send(JSON.stringify({ type: 'sketch:eval-error', message: error.message }));
    setStatus(`Sketch error: ${error.message}`, 'error');
  }
}

function runSketch(code, metadata) {
  initializeHydra();
  window.cc = state.cc;
  window.midi = state.midiAccess;
  const evaluator = new Function(code);
  evaluator();
}

function updateRemoteState(remoteState) {
  if (!remoteState) {
    return;
  }

  state.cc = remoteState.cc ?? state.cc;
  window.cc = state.cc;
  if (remoteState.selectedProgram !== null && remoteState.selectedProgram !== undefined) {
    state.activeProgram = remoteState.selectedProgram;
  }
  if (remoteState.remoteSketch) {
    state.activeSource = { source: 'remote', label: 'Remote sketch' };
  }

  updateHud();
}

function persistSketch(entry) {
  localStorage.setItem(storageKey, JSON.stringify(entry));
}

function loadPersistedSketch() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function updateHud() {
  sourceText.textContent = state.activeSource?.label ?? 'None';
  programText.textContent = state.activeProgram === null || state.activeProgram === undefined ? '-' : String(state.activeProgram);
}

function setStatus(message, tone) {
  statusText.textContent = message;
  document.documentElement.dataset.statusTone = tone;
}
