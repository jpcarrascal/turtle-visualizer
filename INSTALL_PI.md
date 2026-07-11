# turtle-visualizer on Raspberry Pi

This guide installs and enables turtle-visualizer as:

- a Node.js server service on port 8080
- a kiosk browser service using Cage + Chromium (or Chromium alone)

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

## Optional: Experimental Weston Compositor Mode

Default kiosk mode uses Cage. To try Weston mode (easy to roll back):

```sh
sudo apt install -y weston
sudo /opt/turtle-visualizer/scripts/switch-compositor.sh weston
```

Switch back to Cage:

```sh
sudo /opt/turtle-visualizer/scripts/switch-compositor.sh cage
```

The `switch-compositor.sh` helper is the recommended toggle path.

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

## Notes

- The install script auto-configures the kiosk unit with your login user, home, and runtime directory.
- The default URL is `http://localhost:8080` and can be overridden with `APP_URL` in the kiosk unit.
- If Cage is not installed, kiosk mode requires an existing desktop session (`DISPLAY` or `WAYLAND_DISPLAY`).

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
