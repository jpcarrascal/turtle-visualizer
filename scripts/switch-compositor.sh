#!/usr/bin/env sh
set -eu

usage() {
  echo "Usage: sudo ./scripts/switch-compositor.sh [weston|cage]" >&2
  exit 1
}

if [ "${1:-}" = "" ]; then
  usage
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./scripts/switch-compositor.sh [weston|cage]" >&2
  exit 1
fi

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
KIOSK_DROPIN_DIR="/etc/systemd/system/turtle-visualizer-kiosk.service.d"
KIOSK_DROPIN_FILE="$KIOSK_DROPIN_DIR/10-compositor.conf"

case "$1" in
  weston)
    if ! command -v weston >/dev/null 2>&1; then
      echo "weston is not installed. Install it with: sudo apt install -y weston" >&2
      exit 1
    fi

    mkdir -p "$KIOSK_DROPIN_DIR"
    cat > "$KIOSK_DROPIN_FILE" <<'EOF'
[Service]
Environment=KIOSK_COMPOSITOR=weston
EOF

    systemctl daemon-reload
    systemctl restart turtle-visualizer-kiosk.service
    echo "Switched compositor to weston."
    ;;
  cage)
    "$ROOT_DIR/scripts/rollback-kiosk-baseline.sh"
    ;;
  *)
    usage
    ;;
esac