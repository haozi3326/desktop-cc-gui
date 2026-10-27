#!/usr/bin/env bash
# 将 tauri build 产物装入 /Applications/手扶拖拉机.app（不保留旧包备份）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/src-tauri/target/release/bundle/macos/手扶拖拉机.app}"
DEST="/Applications/手扶拖拉机.app"
LS="/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister"

[ -d "$SRC" ] || { echo "error: built app not found: $SRC" >&2; exit 1; }

if [ -d "$DEST" ]; then
  "$LS" -u "$DEST" 2>/dev/null || true
fi

rm -rf "$DEST"
ditto "$SRC" "$DEST"
"$ROOT/scripts/patch-macos-app-icon.sh" "$DEST"
codesign --force --deep --sign - "$DEST" 2>/dev/null || true
"$LS" -f -R "$DEST" 2>/dev/null || true
killall Dock iconservicesd 2>/dev/null || true
plutil -p "$DEST/Contents/Info.plist" | rg "CFBundleIdentifier|CFBundleShortVersionString|CFBundleIconFile"
echo "installed: $DEST"
