# video-turtle on Raspberry Pi

This guide installs and enables video-turtle as:

- a Node.js server service on port 8080
- a kiosk browser service using Cage + Chromium (or Chromium alone)

## 1. Install system packages

Run on Raspberry Pi OS Lite:

```sh
sudo apt update
sudo apt install -y nodejs npm chromium-browser cage
```

If `chromium-browser` is unavailable on your image, install `chromium`.

## 2. Copy project to target path

The units assume this path:

- `/opt/video-turtle`

Copy the repo there:

```sh
sudo mkdir -p /opt/video-turtle
sudo rsync -a --delete ./ /opt/video-turtle/
sudo chown -R pi:pi /opt/video-turtle
```

Install Node dependencies:

```sh
cd /opt/video-turtle
npm ci
```

## 3. Install and enable services

From inside `/opt/video-turtle`:

```sh
sudo ./scripts/install-systemd.sh
```

This installs and enables:

- `video-turtle.service`
- `video-turtle-kiosk.service`

## 4. Check status

```sh
systemctl status video-turtle.service
systemctl status video-turtle-kiosk.service
```

Server health endpoint:

```sh
curl -sS http://localhost:8080/healthz
```

## 5. Logs

```sh
journalctl -u video-turtle.service -f
journalctl -u video-turtle-kiosk.service -f
```

## Notes

- The kiosk unit runs as user `pi`. If your device uses a different user, edit `systemd/video-turtle-kiosk.service`.
- The default URL is `http://localhost:8080` and can be overridden with `APP_URL` in the kiosk unit.
- If Cage is not installed, the launcher falls back to Chromium kiosk mode.
