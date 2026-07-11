#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

SERVER_UNIT_SRC="$ROOT_DIR/systemd/video-turtle.service"
KIOSK_UNIT_SRC="$ROOT_DIR/systemd/video-turtle-kiosk.service"

SERVER_UNIT_DST="/etc/systemd/system/video-turtle.service"
KIOSK_UNIT_DST="/etc/systemd/system/video-turtle-kiosk.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./scripts/install-systemd.sh" >&2
  exit 1
fi

if [ ! -f "$SERVER_UNIT_SRC" ] || [ ! -f "$KIOSK_UNIT_SRC" ]; then
  echo "Service unit files were not found in the repository" >&2
  exit 1
fi

install -m 0644 "$SERVER_UNIT_SRC" "$SERVER_UNIT_DST"
install -m 0644 "$KIOSK_UNIT_SRC" "$KIOSK_UNIT_DST"

systemctl daemon-reload
systemctl enable --now video-turtle.service
systemctl enable --now video-turtle-kiosk.service

echo "Installed and enabled video-turtle services"
