# turtle-visualizer on Raspberry Pi

This guide installs and enables turtle-visualizer as:

- a Node.js server service on port 8080
- a kiosk browser service using Cage + Chromium (default) or Weston + Chromium (see Compositor Choice below)

## 0. OS Version

Use **Raspberry Pi OS Lite 64-bit, Bookworm**. Avoid Trixie for now: as of 2026-07, Trixie's packaged Chromium (`150.0.7871.100`) crashes its GPU process during initialization on Pi 4 (V3D/Mesa) regardless of which GL backend is requested. After enough crashes, Chromium permanently disables all GPU features for the rest of the session (`chrome://gpu` shows "GPU process was unable to boot: GPU access is disabled due to frequent crashes"). This is not fixable with Chromium command-line flags — it happens before flags have any effect. Re-check this if you must use Trixie in the future, in case an updated Chromium package fixes it. Bookworm + Pi 4 + Chromium is a mature, widely field-tested combination and did not show this problem.

## 1. Install system packages

Run on Raspberry Pi OS Lite:

```sh
sudo apt update
sudo apt install -y git nodejs npm chromium-browser cage
```

If `chromium-browser` is unavailable on your image, install `chromium`.

## 2. Clone project from GitHub

The units assume this path:

- `/opt/turtle-visualizer`

Clone the repository there:

```sh
USER_NAME="${SUDO_USER:-$USER}"
sudo mkdir -p /opt/turtle-visualizer
sudo chown -R "$USER_NAME:$USER_NAME" /opt/turtle-visualizer
cd /opt
sudo -u "$USER_NAME" git clone https://github.com/jpcarrascal/turtle-visualizer.git turtle-visualizer
```

Install Node dependencies:

```sh
cd /opt/turtle-visualizer
npm ci
```

To update later:

```sh
cd /opt/turtle-visualizer
git pull
npm ci
```

## 3. Install and enable services

From inside `/opt/turtle-visualizer`:

```sh
sudo ./scripts/install-systemd.sh
```

To keep baseline behavior without boot refresh restarts:

```sh
sudo KIOSK_ENABLE_REFRESH=0 ./scripts/install-systemd.sh
```

This installs and enables:

- `turtle-visualizer.service`
- `turtle-visualizer-kiosk.service`
- `turtle-visualizer-kiosk-refresh.service` (delayed one-shot service that restarts kiosk twice after boot)

## 4. Check status

```sh
systemctl status turtle-visualizer.service
systemctl status turtle-visualizer-kiosk.service
systemctl status turtle-visualizer-kiosk-refresh.service
```

## GPU Acceleration Checklist

Chromium can silently fall back to software rendering, or in the worst case disable GPU features entirely after repeated crashes. Both look like "crap graphics" or a frozen/blank canvas with no obvious error on screen.

1. Confirm the full KMS driver is enabled in `/boot/firmware/config.txt`:

```
dtoverlay=vc4-kms-v3d
```

Not `vc4-fkms-v3d`, and no leftover `gpu_mem=` split from older tutorials (the KMS driver allocates memory dynamically).

2. Confirm Mesa itself is hardware-accelerated, independent of Chromium:

```sh
sudo apt install -y mesa-utils
eglinfo -B
```

Renderer should say `V3D ...`. If it says `llvmpipe`, this is a kernel/config.txt problem, not a Chromium flag problem.

3. Check Chromium's actual GPU status with the bundled diagnostic script. Chromium refuses `chrome://` URLs as a kiosk launch argument (it silently opens something else instead), so pointing `APP_URL` at `chrome://gpu` directly does not work — use the script instead, which drives the already-running kiosk tab over the DevTools protocol:

```sh
sudo systemctl edit turtle-visualizer-kiosk.service
```

Add:
```ini
[Service]
Environment=KIOSK_EXTRA_FLAGS=--remote-debugging-port=9222
```

```sh
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk.service
cd /opt/turtle-visualizer
node scripts/check-gpu-status.mjs
```

This prints the full `chrome://gpu` status page to your terminal, including "Problems Detected" (specific disabled features and reasons) and "Graphics Feature Status". When done, remove the override — note this also clears any other active drop-ins (compositor choice, latency overlay), see [Compositor Choice](#compositor-choice-cage-vs-weston) below:

```sh
sudo systemctl revert turtle-visualizer-kiosk.service
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk.service
```

4. `start-kiosk.sh` and `start-kiosk-weston-client.sh` currently pass `--use-gl=egl --enable-gpu-rasterization --enable-zero-copy --ignore-gpu-blocklist --disable-frame-rate-limit`. These were added while chasing the Trixie GPU crash described above and may not be needed on Bookworm — check `chrome://gpu` with the script above on a fresh install before assuming they're required. `--ignore-gpu-blocklist` in particular is a diagnostic override; don't leave it on permanently without a reason, since it can force-enable GPU paths Chromium has deliberately blocklisted for known bugs.

Restart the kiosk service after any `config.txt` change (a full reboot is required for `dtoverlay` changes to take effect).

### KIOSK_EXTRA_FLAGS Quoting

`KIOSK_EXTRA_FLAGS` (or any `Environment=` override with more than one space-separated value) needs to be wrapped in double quotes, or systemd silently drops everything after the first flag:

```ini
# Wrong — only --remote-debugging-port=9222 survives, the rest are dropped
Environment=KIOSK_EXTRA_FLAGS=--remote-debugging-port=9222 --enable-unsafe-swiftshader

# Right
Environment="KIOSK_EXTRA_FLAGS=--remote-debugging-port=9222 --enable-unsafe-swiftshader"
```

Check for this if a multi-flag override seems to have no effect:

```sh
journalctl -u turtle-visualizer-kiosk.service -n 50 --no-pager | grep -i "invalid environment assignment"
```

## MIDI Latency: Practical Tuning Checklist

For this app, the useful latency target is MIDI event to next rendered frame.

1. Use the latest latency overlay metrics (callback/paint/total):

```sh
sudo /opt/turtle-visualizer/scripts/switch-latency-overlay.sh on
```

Disable when done:

```sh
sudo /opt/turtle-visualizer/scripts/switch-latency-overlay.sh off
```

2. Keep CPU at performance governor during shows:

```sh
echo performance | sudo tee /sys/devices/system/cpu/cpu*/cpufreq/scaling_governor
```

3. Disable unneeded services (only if you do not use them):

```sh
sudo systemctl disable --now bluetooth.service hciuart.service
sudo systemctl disable --now avahi-daemon.service avahi-daemon.socket
sudo systemctl disable --now triggerhappy.service
sudo systemctl disable --now cups.service cups-browsed.service
sudo systemctl disable --now ModemManager.service
```

Inspect currently enabled services before changing anything:

```sh
systemctl list-unit-files --state=enabled
```

4. Avoid changing compositor while testing latency. Keep either Weston or Cage fixed for the whole test run.

5. For true end-to-end beat-to-photon latency, use a high-fps camera test (audio path + display path), not browser metrics alone.

## Compositor Choice: Cage vs Weston

Default kiosk mode uses Cage — it's simpler, with fewer moving parts. In practice, Cage's cursor hiding has been unreliable on at least one real setup (the mouse cursor stayed visible despite `WLR_NO_HARDWARE_CURSORS`, CSS `cursor: none`, and the app's own cursor-parking trick in `refreshCursorState()`). Switching to Weston has reliably fixed cursor visibility when that happens:

```sh
sudo apt install -y weston
sudo /opt/turtle-visualizer/scripts/switch-compositor.sh weston
```

Switch back to Cage:

```sh
sudo /opt/turtle-visualizer/scripts/switch-compositor.sh cage
```

The `switch-compositor.sh` helper is the recommended toggle path. If cursor visibility matters for your install (e.g. anything public-facing) and you'd rather not troubleshoot Cage's cursor behavior first, it's reasonable to just start with Weston.

### Latency Overlay On/Off (Safe with Weston/Cage)

Use this helper to toggle the overlay without touching compositor settings:

```sh
sudo /opt/turtle-visualizer/scripts/switch-latency-overlay.sh on
sudo /opt/turtle-visualizer/scripts/switch-latency-overlay.sh off
```

Optional base URL:

```sh
sudo /opt/turtle-visualizer/scripts/switch-latency-overlay.sh on http://localhost:8080
```

Do not use `systemctl revert turtle-visualizer-kiosk.service` to remove only the overlay,
because revert also removes compositor overrides (for example `KIOSK_COMPOSITOR=weston`).

### Manual Weston Enable (if needed)

If you prefer editing the unit directly, this is the manual equivalent:

```sh
sudo systemctl edit turtle-visualizer-kiosk.service
```

Add:

```ini
[Service]
Environment=KIOSK_COMPOSITOR=weston
```

Then apply:

```sh
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk.service
```

Rollback to baseline instantly:

```sh
sudo /opt/turtle-visualizer/scripts/rollback-kiosk-baseline.sh
```

### Roll Back Explicitly to Cage

If you enabled Weston and want to force Cage mode again:

```sh
sudo /opt/turtle-visualizer/scripts/rollback-kiosk-baseline.sh
```

The rollback script does three things:

- removes any `systemctl edit` override on `turtle-visualizer-kiosk.service` (including `KIOSK_COMPOSITOR=weston`)
- disables/stops `turtle-visualizer-kiosk-refresh.service`
- restarts `turtle-visualizer-kiosk.service`

Manual equivalent (if needed):

```sh
sudo systemctl revert turtle-visualizer-kiosk.service
sudo systemctl disable --now turtle-visualizer-kiosk-refresh.service
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk.service
```

If the boot cursor still appears, increase the refresh delay (default: 20s):

```sh
sudo systemctl edit turtle-visualizer-kiosk-refresh.service
```

Add:

```ini
[Service]
Environment=KIOSK_REFRESH_DELAY=30
```

Then apply:

```sh
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk-refresh.service
```

Server health endpoint:

```sh
curl -sS http://localhost:8080/healthz
```

## 5. Logs

```sh
journalctl -u turtle-visualizer.service -f
journalctl -u turtle-visualizer-kiosk.service -f
```

## MIDI Program Change Reference

Use MIDI Program Change (PC) messages to select sketches.

| PC | Sketch |
| --- | --- |
| 0 | Default Drift |
| 1 | Spacebarman: Black |
| 2 | Spacebarman: Logo |
| 3 | Spacebarman: TV Noise |
| 4 | Spacebarman: Camera |
| 10 | Spacebarman: Blue Slow Tentacles |
| 11 | Spacebarman: Pink Blobs |
| 12 | Spacebarman: Architecture |
| 13 | Spacebarman: Purple Vertical Lines |
| 14 | Spacebarman: Purple Noisy Vertical Lines |
| 15 | Spacebarman: Red Kaleid Blobs |
| 16 | Spacebarman: Skulls |
| 17 | Spacebarman: Slow Color |
| 22 | Spacebarman: Architecture Alt |
| 23 | Spacebarman: This Body |
| 24 | Spacebarman: Sexy A |
| 25 | Spacebarman: Sexy B |
| 26 | Spacebarman: Pink Slow Tentacles |
| 27 | Spacebarman: Noise Flash |
| 28 | Spacebarman: Slow Noise |
| 29 | Spacebarman: Lockdown |
| 30 | Spacebarman: Wriggly Blue Lines |
| 31 | Spacebarman: Wriggly Blue Kaleid |
| 32 | Spacebarman: QR IG |
| 100 | Spacebarman: Blue Tentacles Brighter |
| 110 | Strobe |
| 111 | Tunnel |

The canonical source is the sketch manifest at `public/sketches/manifest.json`.

## Notes

- The install script auto-configures the kiosk unit with your login user, home, and runtime directory.
- The default URL is `http://localhost:8080` and can be overridden with `APP_URL` in the kiosk unit.
- If Cage is not installed, kiosk mode requires an existing desktop session (`DISPLAY` or `WAYLAND_DISPLAY`).
- `KIOSK_EXTRA_FLAGS` lets you pass ad hoc Chromium flags (e.g. for debugging) without editing the launch scripts — see [KIOSK_EXTRA_FLAGS Quoting](#kiosk_extra_flags-quoting) for the systemd gotcha.
- `scripts/check-gpu-status.mjs` reads the live `chrome://gpu` status via the DevTools protocol — see the GPU Acceleration Checklist above.

## Troubleshooting Kiosk Service

If `turtle-visualizer-kiosk.service` is restarting with `status=1/FAILURE`:

```sh
journalctl -u turtle-visualizer-kiosk.service -n 80 --no-pager
```

Common fixes:

```sh
sudo apt install -y cage chromium-browser || sudo apt install -y cage chromium
cd /opt/turtle-visualizer
git pull
sudo ./scripts/install-systemd.sh
sudo systemctl restart turtle-visualizer-kiosk.service
```

If logs include `XDG_RUNTIME_DIR is not set` or `Could not open target tty`:

```sh
cd /opt/turtle-visualizer
git pull
sudo ./scripts/install-systemd.sh
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk.service
```

If logs still show `Could not open tty0 to update VT: Permission denied`, ensure your local clone includes the latest unit update that forces `LIBSEAT_BACKEND=logind`, then reinstall services:

```sh
cd /opt/turtle-visualizer
git pull
sudo ./scripts/install-systemd.sh
sudo systemctl daemon-reload
sudo systemctl restart turtle-visualizer-kiosk.service
```

If the app boots to a "Boot failed: ..." status and the page's own `canvas.getContext('webgl')` returns `null` (check via `scripts/check-gpu-status.mjs` or a DevTools console), and `chrome://gpu` shows "GPU access is disabled due to frequent crashes", this is a GPU-process crash loop, not a config problem — see the OS Version note at the top of this guide. Do not try `start-kiosk.sh` directly over SSH to debug this manually: it will fail with `libseat`/"Could not open target tty" errors, because an SSH shell has no VT/seat session. Always debug through the systemd service (`systemctl start/restart` + `journalctl`), which runs correctly on `tty1`.
