#!/usr/bin/env sh
set -eu

APP_URL="${APP_URL:-http://localhost:8080}"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || true)"
CAGE_BIN="$(command -v cage || true)"
YDOTOOL_BIN="$(command -v ydotool || true)"

# On some Pi Wayland stacks the pointer is drawn by the compositor; disable
# hardware cursors to let app-level cursor hiding take effect.
export WLR_NO_HARDWARE_CURSORS=1
export XCURSOR_SIZE=1

# Hide the Linux virtual terminal text cursor used by tty1 kiosk sessions.
if command -v setterm >/dev/null 2>&1; then
  setterm -cursor off >/dev/null 2>&1 || true
fi

park_pointer_to_edge() {
  if [ -z "$YDOTOOL_BIN" ]; then
    return
  fi

  # Best effort: move pointer to bottom-right after compositor/app startup.
  (
    sleep 2
    "$YDOTOOL_BIN" mousemove --absolute 65535 65535 >/dev/null 2>&1 || true
    sleep 1
    "$YDOTOOL_BIN" mousemove --absolute 65535 65535 >/dev/null 2>&1 || true
  ) &
}

if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium is not installed (missing chromium-browser/chromium in PATH)" >&2
  exit 1
fi

COMMON_FLAGS="--kiosk --no-first-run --disable-session-crashed-bubble --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --ash-hide-cursor"
WAYLAND_FLAGS="--enable-features=UseOzonePlatform --ozone-platform=wayland"

if [ -n "$CAGE_BIN" ]; then
  park_pointer_to_edge
  exec "$CAGE_BIN" -- "$CHROMIUM_BIN" $COMMON_FLAGS $WAYLAND_FLAGS "$APP_URL"
fi

if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
  park_pointer_to_edge
  exec "$CHROMIUM_BIN" $COMMON_FLAGS "$APP_URL"
fi

echo "Cage is not installed and no active DISPLAY/WAYLAND_DISPLAY was found" >&2
echo "Install cage or run under a desktop session" >&2
exit 1
