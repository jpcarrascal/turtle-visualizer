#!/usr/bin/env sh
set -eu

APP_URL="${APP_URL:-http://localhost:8080}"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || true)"
CAGE_BIN="$(command -v cage || true)"

if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium is not installed" >&2
  exit 1
fi

CHROMIUM_FLAGS="--kiosk --no-first-run --disable-session-crashed-bubble --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --enable-features=UseOzonePlatform --ozone-platform=wayland"

if [ -n "$CAGE_BIN" ]; then
  exec "$CAGE_BIN" -- "$CHROMIUM_BIN" $CHROMIUM_FLAGS "$APP_URL"
fi

exec "$CHROMIUM_BIN" $CHROMIUM_FLAGS "$APP_URL"
