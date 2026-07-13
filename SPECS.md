# SPECS.md

## Project Summary

Build a Raspberry Pi-based headless music visualization engine centered on Hydra Video Synth. The system should boot into a minimal browser-only runtime, load a local web app, accept live sketch code from another machine over the network, and react to MIDI input from local USB MIDI devices and, if feasible, MIDI-over-network.

The core user experience is:

1. Power on the Pi.
2. The device boots into a minimal browser runtime.
3. A local web app loads automatically.
4. If no remote sketch arrives, a local sketch is always active.
5. Remote sketch code can replace the active sketch over the network.
6. MIDI messages can influence visual parameters and select sketches.

## Goals

- Run on Raspberry Pi with as few intermediary processes as practical.
- Avoid a full desktop environment if possible.
- Host a local web app that embeds Hydra Video Synth.
- Support live sketch updates from another computer over the network.
- Support MIDI input from USB MIDI devices.
- Preferably support MIDI-over-network for remote or studio routing.
- Maintain a persistent sketch fallback so the screen is never blank after boot.
- Provide a local library of sketches that can be selected via MIDI Program Change.

## Non-Goals

- Building a general-purpose desktop environment.
- Creating a full code editor inside the browser.
- Replacing Hydra with a different visual engine.
- Implementing a native browser engine from scratch.
- Solving studio networking, device provisioning, or content authoring workflows outside this app.

## Recommended Direction

The most practical implementation path is:

- Raspberry Pi OS Lite or an equally minimal Linux image.
- A minimal fullscreen browser launch path rather than a desktop session.
- A local HTTP server for the app rather than `file://`.
- Chromium for browser compatibility, especially for WebMIDI.
- Hydra embedded as a runtime library, not as the editor UI.
- WebSocket-based sketch injection from a companion machine.
- A sketch manifest and persistence layer for local fallback behavior.

This spec intentionally leaves the exact browser launch stack open so the implementation can choose the lightest reliable option.

## Concrete Build Assumptions

Use these as the default implementation choices unless a later decision changes them:

- Raspberry Pi OS Lite as the base image.
- Cage as the minimal Wayland compositor by default. In practice, Cage's cursor hiding has been unreliable on at least one real setup; Weston (heavier, but with working cursor hiding via `kiosk-shell.so`) is a validated fallback — see `INSTALL_PI.md`'s Compositor Choice section. Raspberry Pi OS Bookworm is the validated target OS; Trixie's Chromium build (`150.0.7871.100` as observed) has a GPU-process crash loop on Pi 4 that disables all GPU acceleration.
- Chromium as the browser runtime.
- `http://localhost` or another local HTTP origin for the app.
- `rtpmidid` or an equivalent RTP-MIDI bridge for MIDI-over-network.
- Last-action-wins behavior when remote sketch updates and MIDI Program Change selections compete.
- Trusted studio LAN as the default security model for early versions.

## System Overview

### Runtime Layers

- Bootloader / firmware
- Linux kernel
- Minimal userspace
- Browser runtime
- Local web app

### App Components

- Static asset server for the local web app.
- WebSocket endpoint for incoming sketch code.
- Browser client that instantiates Hydra.
- MIDI input handler in the browser.
- Sketch library loader and persistence layer.

## Functional Requirements

### 1. Local Web App

- The device shall load a local web app on startup.
- The app shall embed Hydra Video Synth and render to a full-screen canvas.
- The app shall run without requiring a code editor UI.

### 2. Remote Sketch Injection

- A separate computer shall be able to send sketch code to the device over the network.
- The device shall apply incoming sketch code without manual intervention.
- The system shall report sketch evaluation errors back to the sender if possible.
- The most recently received valid remote sketch shall be persisted as the last-good sketch.

### 3. Local Sketch Library

- The app shall include a local library of sketches stored on disk.
- At least one sketch shall be designated as the default fallback.
- If no remote sketch is active, the app shall load a local sketch automatically.
- The app shall be able to preload the library for fast switching.

### 4. MIDI Support

- The app shall accept MIDI input from a USB MIDI device.
- The app should support MIDI-over-network if the chosen implementation path allows it.
- Continuous controller messages shall be available for live parameter control.
- Program Change messages shall select sketches from the local library.
- MIDI messages shall be routable by channel, at minimum for Program Change selection.

### 5. Persistence and Recovery

- The system shall remember the last successfully running sketch across restarts.
- On reboot, the app shall restore the last-good sketch before any remote code arrives.
- If no persisted state exists, the default local sketch shall load.
- A crash or network interruption shall not leave the display blank for long.

## Sketch Model

### Sketch Sources

There are two sketch sources:

- Remote sketches pushed over the network.
- Local library sketches selected from a manifest.

### Selection Rules

- The active sketch is the latest valid sketch selected or received.
- If a remote sketch is active and a Program Change arrives, the newer event wins unless the implementation introduces an explicit lock later.
- The currently active sketch should be persisted as the new last-good sketch.

### Sketch Format

- Sketches are JavaScript source strings that run in the browser client.
- Sketches are evaluated against the Hydra instance or a thin control wrapper around it.
- The exact sketch API surface should be kept small and documented.

## Local Sketch Library Format

Use a manifest file on disk to define the local sketch library.

Example shape:

```json
[
  { "pc": 0, "file": "drift.js", "name": "Drift" },
  { "pc": 1, "file": "strobe.js", "name": "Strobe" },
  { "pc": 2, "file": "tunnel.js", "name": "Tunnel" }
]
```

Requirements:

- Program Change values map directly to sketch slots.
- The browser should preload the library at startup if practical.
- The default sketch should be explicit in the manifest.

## Network Interface

### Sketch Push Channel

- Use WebSocket for remote sketch injection.
- The device should host the socket endpoint alongside the local HTTP server.
- The remote sender should be able to replace the current sketch with a source string.

### Error Handling

- Sketch evaluation should be wrapped in error handling.
- Failures should not crash the entire app.
- Invalid remote sketches should be rejected and reported.

### Security

- Remote sketch injection is equivalent to trusted code execution in the page.
- The system should assume a trusted LAN or disconnected local setup.
- No authentication layer is required for the first version.
- If the device is later exposed to an untrusted network, add access control then.

## MIDI Interface

### Continuous Control

- MIDI CC messages should update live visual parameters.
- Parameter state should be available to sketches through a stable shared object or API.

### Program Change

- MIDI Program Change should select local library sketches.
- Program Change should be channel-aware.
- The selected sketch should load immediately without a network round trip.

### MIDI-over-Network

- Preferred implementation path is a MIDI-over-network bridge that exposes a local MIDI device to the browser.
- If that is too complex, the project should defer the choice rather than hard-code the wrong protocol.

## Persistence

Persist enough state to recover after a reboot:

- Last-good sketch source or identifier.
- Last active local library slot.
- Optional MIDI routing or channel preferences.

Persistence may live either server-side or in browser storage, but it must survive normal restarts in the chosen deployment model.

## Acceptance Criteria

The build is acceptable when:

- The Pi boots into the app without requiring a desktop login.
- Hydra renders a visual output fullscreen.
- A default local sketch appears on first boot.
- Remote sketch code can be sent from another machine and take over playback.
- A reboot restores the last working sketch.
- MIDI Program Change selects a local sketch.
- MIDI CC data can influence visuals.
- The app does not require the operator to type code on the device itself.

## Open Items

These are intentionally not assumed yet:

- Exact browser launch stack details if Cage is unavailable on the target image.
- Whether the sketch library should be file-based only or also editable through a companion tool.
- Whether the local HTTP server should be built into the same process as the sketch relay.
- Whether the project should include a manual lock mode for the active sketch in later versions.

## Agent Handoff

This repository is suitable for agent takeover if the next agent follows these boundaries:

- Safe to change without asking: app scaffolding, local server, sketch manifest loading, MIDI handling, persistence plumbing, and build scripts.
- Ask before changing: browser launch strategy, protocol choice for MIDI-over-network, security model for remote sketch execution, and any hardware-specific boot configuration.
- Out of scope unless explicitly requested: desktop environment setup, custom browser engine work, or rewriting Hydra itself.

## Suggested Next Implementation Slice

1. Scaffold the local web app and minimal server.
2. Embed Hydra and load one default sketch.
3. Add WebSocket sketch injection.
4. Add the sketch manifest and Program Change selection.
5. Add persistence for last-good sketch recovery.
6. Add MIDI CC handling and, if chosen, MIDI-over-network bridging.
