#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
APP_URL="${APP_URL:-http://localhost:8080}"
KIOSK_COMPOSITOR="${KIOSK_COMPOSITOR:-cage}"

CHROMIUM_BIN="$(command -v chromium-browser || command -v chromium || true)"
CAGE_BIN="$(command -v cage || true)"
WESTON_BIN="$(command -v weston || true)"

# On some Pi Wayland stacks the pointer is drawn by the compositor; disable
# hardware cursors to let app-level cursor hiding take effect.
export WLR_NO_HARDWARE_CURSORS=1
export XCURSOR_SIZE=1

# Hide the Linux virtual terminal text cursor used by tty1 kiosk sessions.
if command -v setterm >/dev/null 2>&1; then
  setterm -cursor off >/dev/null 2>&1 || true
fi

if [ -z "$CHROMIUM_BIN" ]; then
  echo "Chromium is not installed (missing chromium-browser/chromium in PATH)" >&2
  exit 1
fi

COMMON_FLAGS="--kiosk --no-first-run --disable-session-crashed-bubble --noerrdialogs --disable-infobars --disable-pinch --overscroll-history-navigation=0 --autoplay-policy=no-user-gesture-required --ash-hide-cursor"
WAYLAND_FLAGS="--enable-features=UseOzonePlatform --ozone-platform=wayland"

if [ "$KIOSK_COMPOSITOR" = "weston" ]; then
  if [ -z "$WESTON_BIN" ]; then
    echo "KIOSK_COMPOSITOR=weston requested, but weston is not installed" >&2
    echo "Falling back to cage mode" >&2
  else
    weston_config="$(mktemp)"
    weston_client="$SCRIPT_DIR/start-kiosk-weston-client.sh"
    cat >"$weston_config" <<EOF
[core]
shell=kiosk-shell.so
idle-time=0
require-input=false

[shell]
locking=false
panel-position=none
cursor-size=1

[autolaunch]
path=$weston_client
watch=true
EOF

    exec "$WESTON_BIN" --config="$weston_config"
  fi
fi

if [ -n "$CAGE_BIN" ]; then
  exec "$CAGE_BIN" -- "$CHROMIUM_BIN" $COMMON_FLAGS $WAYLAND_FLAGS "$APP_URL"
fi

if [ -n "${DISPLAY:-}" ] || [ -n "${WAYLAND_DISPLAY:-}" ]; then
  exec "$CHROMIUM_BIN" $COMMON_FLAGS "$APP_URL"
fi

echo "Cage is not installed and no active DISPLAY/WAYLAND_DISPLAY was found" >&2
echo "Install cage or run under a desktop session" >&2
exit 1
