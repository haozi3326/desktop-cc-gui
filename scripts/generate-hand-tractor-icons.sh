#!/usr/bin/env bash
# 手扶拖拉机应用图标套图：与 CC GUI 相同入口（tauri icon），输出 src-tauri/icons + public。
# 源图建议 1024×1024 方图、留足边距（与 CC GUI app-icon 一致）；默认用 brand 审定稿。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="${1:-$ROOT/brand/hand-tractor-icon-square.png}"
EXPORT="$ROOT/brand/hand-tractor-tauri-icons"

if [[ ! -f "$SOURCE" ]]; then
  echo "error: source icon not found: $SOURCE" >&2
  exit 1
fi

echo "source: $SOURCE"
cd "$ROOT/src-tauri"
pnpm exec tauri icon "$SOURCE" -o icons

cp icons/icon.png "$ROOT/public/app-icon.png"
cp icons/icon.png icons/app-icon.png

mkdir -p "$EXPORT"
for f in app-icon.png 32x32.png 64x64.png 128x128.png 128x128@2x.png icon.png icon.icns icon.ico; do
  cp "icons/$f" "$EXPORT/$f"
done

echo "ok: src-tauri/icons, public/app-icon.png, $EXPORT/ (CC GUI 同级 8 件套)"
