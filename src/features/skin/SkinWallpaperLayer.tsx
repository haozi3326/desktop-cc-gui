import { useSyncExternalStore } from "react";
import {
  getSkinSnapshot,
  resolveWallpaperUrl,
  subscribeSkin,
} from "./skin";

/**
 * Full-window wallpaper behind chrome (sidebar, tab strip, chat). Fixed to the
 * viewport with `background-size: cover`; panels stay readable via
 * `html[data-wallpaper="active"]` token overrides in styles/skin.css.
 */
export function SkinWallpaperLayer() {
  const state = useSyncExternalStore(
    subscribeSkin,
    getSkinSnapshot,
    () => ({ kind: "default" as const }),
  );
  const url = resolveWallpaperUrl(state);
  if (!url) return null;

  return (
    <div
      data-testid="skin-wallpaper-layer"
      data-skin-wallpaper=""
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 bg-background-secondary-default"
      style={{
        backgroundImage: `url("${url}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  );
}
