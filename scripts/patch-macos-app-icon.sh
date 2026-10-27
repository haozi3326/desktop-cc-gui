#!/usr/bin/env bash
# 打包后给 .app 补上 AppIcon.icns（与 icon.icns 相同），便于 Dock/Finder 解析。
set -euo pipefail
APP="${1:?usage: patch-macos-app-icon.sh /path/to/手扶拖拉机.app}"
RES="$APP/Contents/Resources"
ICNS="$RES/icon.icns"
[ -f "$ICNS" ] || { echo "missing $ICNS" >&2; exit 1; }
cp "$ICNS" "$RES/AppIcon.icns"
plutil -replace CFBundleIconFile -string AppIcon "$APP/Contents/Info.plist" 2>/dev/null || \
  plutil -insert CFBundleIconFile -string AppIcon "$APP/Contents/Info.plist"
