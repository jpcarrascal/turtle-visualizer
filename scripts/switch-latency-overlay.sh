#!/usr/bin/env sh
set -eu

usage() {
  echo "Usage: sudo ./scripts/switch-latency-overlay.sh [on|off] [base-url]" >&2
  echo "Example: sudo ./scripts/switch-latency-overlay.sh on http://localhost:8080" >&2
  exit 1
}

MODE="${1:-}"
BASE_URL="${2:-http://localhost:8080}"

if [ -z "$MODE" ]; then
  usage
fi

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./scripts/switch-latency-overlay.sh [on|off]" >&2
  exit 1
fi

DROPIN_DIR="/etc/systemd/system/turtle-visualizer-kiosk.service.d"
DROPIN_FILE="$DROPIN_DIR/20-latency-overlay.conf"

case "$MODE" in
  on)
    mkdir -p "$DROPIN_DIR"
    LATENCY_URL="${BASE_URL%/}/?latency=1"
    cat > "$DROPIN_FILE" <<EOF
[Service]
Environment=APP_URL=$LATENCY_URL
EOF
    systemctl daemon-reload
    systemctl restart turtle-visualizer-kiosk.service
    echo "Latency overlay enabled: $LATENCY_URL"
    ;;
  off)
    rm -f "$DROPIN_FILE"
    systemctl daemon-reload
    systemctl restart turtle-visualizer-kiosk.service
    echo "Latency overlay disabled."
    ;;
  *)
    usage
    ;;
esac