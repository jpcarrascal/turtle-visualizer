#!/usr/bin/env sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
  echo "Run as root: sudo ./scripts/rollback-kiosk-baseline.sh" >&2
  exit 1
fi

# Remove any drop-in overrides (for example experimental compositor settings).
systemctl revert turtle-visualizer-kiosk.service || true

# Disable the boot refresh helper to return to baseline startup behavior.
systemctl disable --now turtle-visualizer-kiosk-refresh.service || true

systemctl daemon-reload
systemctl restart turtle-visualizer-kiosk.service

echo "Rolled back to baseline kiosk behavior (cage path, no refresh service)."
