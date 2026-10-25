/** Built-in wallpaper packs shipped with the app (under `public/skins`). */
export interface BuiltinSkin {
  id: string;
  /** i18n key for the card title. */
  nameKey: string;
  /** URL path served from `public/` (also used as list thumbnail). */
  wallpaper: string;
}

export const BUILTIN_SKINS: readonly BuiltinSkin[] = [
  {
    id: "twilight-hills",
    nameKey: "skin.builtin.twilightHills",
    wallpaper: "/skins/twilight-hills.jpg",
  },
];

export function builtinSkinById(id: string): BuiltinSkin | undefined {
  return BUILTIN_SKINS.find((skin) => skin.id === id);
}
