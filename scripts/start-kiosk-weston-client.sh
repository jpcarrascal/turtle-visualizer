#!/usr/bin/env sh
set -eu

APP_URL="${APP_URL:-http://localhost:8080}"
CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || true)"

if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium is not installed (missing chromium-browser/chromium in PATH)" >&2
  exit 1
fi

COMMON_FLAGS="--kiosk --no-first-run --disable-session-crashed-bubble --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --ash-hide-cursor"
WAYLAND_FLAGS="--enable-features=UseOzonePlatform --ozone-platform=wayland"

exec "$CHROMIUM_BIN" $COMMON_FLAGS $WAYLAND_FLAGS "$APP_URL"
