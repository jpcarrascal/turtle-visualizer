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

This installs and enables:

- `turtle-visualizer.service`
- `turtle-visualizer-kiosk.service`

## 4. Check status

```sh
systemctl status turtle-visualizer.service
systemctl status turtle-visualizer-kiosk.service
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
