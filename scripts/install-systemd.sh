#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"

SERVER_UNIT_SRC="$ROOT_DIR/systemd/turtle-visualizer.service"
KIOSK_UNIT_SRC="$ROOT_DIR/systemd/turtle-visualizer-kiosk.service"

SERVER_UNIT_DST="/etc/systemd/system/turtle-visualizer.service"
KIOSK_UNIT_DST="/etc/systemd/system/turtle-visualizer-kiosk.service"

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
systemctl enable --now turtle-visualizer.service
systemctl enable --now turtle-visualizer-kiosk.service

echo "Installed and enabled turtle-visualizer services"
