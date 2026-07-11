#!/usr/bin/env sh
set -eu

APP_URL="${APP_URL:-http://localhost:8080}"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || true)"
CAGE_BIN="$(command -v cage || true)"

if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium is not installed (missing chromium-browser/chromium in PATH)" >&2
  exit 1
fi

COMMON_FLAGS="--kiosk --no-first-run --disable-session-crashed-bubble --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required"
WAYLAND_FLAGS="--enable-features=UseOzonePlatform --ozone-platform=wayland"

if [ -n "$CAGE_BIN" ]; then
  exec "$CAGE_BIN" -- "$CHROMIUM_BIN" $COMMON_FLAGS $WAYLAND_FLAGS "$APP_URL"
fi

if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
  exec "$CHROMIUM_BIN" $COMMON_FLAGS "$APP_URL"
fi

echo "Cage is not installed and no active DISPLAY/WAYLAND_DISPLAY was found" >&2
echo "Install cage or run under a desktop session" >&2
exit 1
