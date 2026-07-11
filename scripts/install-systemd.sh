#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
ROOT_DIR="$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)"
INSTALL_USER="${SUDO_USER:-}"

SERVER_UNIT_SRC="$ROOT_DIR/systemd/turtle-visualizer.service"
KIOSK_UNIT_SRC="$ROOT_DIR/systemd/turtle-visualizer-kiosk.service"

SERVER_UNIT_DST="/etc/systemd/system/turtle-visualizer.service"
KIOSK_UNIT_DST="/etc/systemd/system/turtle-visualizer-kiosk.service"

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./scripts/install-systemd.sh" >&2
  exit 1
fi

if [ -z "$INSTALL_USER" ]; then
  echo "SUDO_USER is empty. Run via sudo from the target login user." >&2
  exit 1
fi

if [ ! -f "$SERVER_UNIT_SRC" ] || [ ! -f "$KIOSK_UNIT_SRC" ]; then
  echo "Service unit files were not found in the repository" >&2
  exit 1
fi

install -m 0644 "$SERVER_UNIT_SRC" "$SERVER_UNIT_DST"

tmp_unit="$(mktemp)"
cp "$KIOSK_UNIT_SRC" "$tmp_unit"
sed -i.bak "s/^User=.*/User=$INSTALL_USER/" "$tmp_unit"
sed -i.bak2 "s|^Environment=HOME=.*|Environment=HOME=/home/$INSTALL_USER|" "$tmp_unit"
install -m 0644 "$tmp_unit" "$KIOSK_UNIT_DST"
rm -f "$tmp_unit" "$tmp_unit.bak" "$tmp_unit.bak2"

systemctl daemon-reload
systemctl enable --now turtle-visualizer.service
systemctl enable --now turtle-visualizer-kiosk.service

echo "Installed and enabled turtle-visualizer services for user $INSTALL_USER"
