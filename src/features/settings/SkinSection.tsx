import { useSyncExternalStore } from "react";
import { useTranslation } from "react-i18next";
import Image from "lucide-react/dist/esm/icons/image";
import {
  Slider as AriaSlider,
  SliderOutput,
  SliderThumb,
  SliderTrack,
} from "react-aria-components";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";
import {
  SettingsCard,
  SettingsRow,
  SettingsSectionLabel,
} from "@/components/application/settings/settings-rows";
import { BUILTIN_SKINS } from "@/features/skin/skin-catalog";
import {
  getSkinSnapshot,
  pickAndApplyLocalWallpaper,
  readWallpaperChromeOpacity,
  setSkinBuiltin,
  setSkinDefault,
  setWallpaperChromeOpacity,
  skinSelectionEquals,
  subscribeSkin,
  WALLPAPER_CHROME_OPACITY_MAX,
  WALLPAPER_CHROME_OPACITY_MIN,
} from "@/features/skin/skin";
import type { SkinState } from "@/features/skin/skin-types";
import { isWallpaperActive } from "@/features/skin/skin-types";

function SkinTile({
  label,
  previewUrl,
  selected,
  onSelect,
}: {
  label: string;
  previewUrl?: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cx(
        "flex flex-col gap-2 rounded-2lg border p-2 text-left transition-colors",
        selected
          ? "border-accent-500 bg-background-secondary-hover shadow-nav-selected"
          : "border-border-button-default bg-background-primary-default hover:bg-background-primary-hover",
      )}
    >
      <div
        className={cx(
          "aspect-[16/10] w-full overflow-hidden rounded-lg bg-background-tertiary-default",
          previewUrl ? "bg-cover bg-center" : "flex items-center justify-center",
        )}
        style={previewUrl ? { backgroundImage: `url("${previewUrl}")` } : undefined}
      >
        {!previewUrl && (
          <span className="text-caption-1-medium text-text-tertiary">{label}</span>
        )}
      </div>
      <span className="text-body-2-medium text-text-primary">{label}</span>
    </button>
  );
}

function isSelected(state: SkinState, next: SkinState): boolean {
  return skinSelectionEquals(state, next);
}

/** Settings → 换肤/壁纸: wallpaper pick, unified chrome opacity, reset. */
export function SkinSection() {
  const { t } = useTranslation();
  const state = useSyncExternalStore(
    subscribeSkin,
    getSkinSnapshot,
    () => ({ kind: "default" as const }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <SettingsSectionLabel>{t("skin.title")}</SettingsSectionLabel>
        <p className="mt-1 text-body-2-regular text-text-secondary">{t("skin.description")}</p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <SkinTile
            label={t("skin.officialDefault")}
            selected={isSelected(state, { kind: "default" })}
            onSelect={() => setSkinDefault()}
          />
          {BUILTIN_SKINS.map((skin) => (
            <SkinTile
              key={skin.id}
              label={t(skin.nameKey)}
              previewUrl={skin.wallpaper}
              selected={isSelected(state, { kind: "builtin", builtinId: skin.id })}
              onSelect={() => setSkinBuiltin(skin.id)}
            />
          ))}
        </div>
        <div className="mt-4">
          <Button
            variant="secondary"
            leadingIcon={Image}
            onClick={() => {
              void pickAndApplyLocalWallpaper(t("skin.pickLocalTitle"));
            }}
          >
            {t("skin.pickLocal")}
          </Button>
        </div>
      </div>

      <div>
        <SettingsSectionLabel>{t("skin.chromeOpacity")}</SettingsSectionLabel>
        <SettingsCard className="mt-2">
          <SettingsRow
            anchor="chromeOpacity"
            label={t("skin.chromeOpacity")}
            description={
              isWallpaperActive(state)
                ? t("skin.chromeOpacityHint")
                : t("skin.chromeOpacityDisabled")
            }
          >
            <div className="flex w-full min-w-[12rem] max-w-sm flex-col items-stretch gap-2">
              <AriaSlider
                aria-label={t("skin.chromeOpacity")}
                className="w-full"
                minValue={WALLPAPER_CHROME_OPACITY_MIN}
                maxValue={WALLPAPER_CHROME_OPACITY_MAX}
                step={1}
                value={readWallpaperChromeOpacity(state)}
                isDisabled={!isWallpaperActive(state)}
                onChange={(value) => setWallpaperChromeOpacity(value)}
              >
                <SliderOutput className="mb-2 block text-right text-body-2-regular text-text-secondary tabular-nums">
                  {({ state: sliderState }) => `${sliderState.values[0]}%`}
                </SliderOutput>
                <SliderTrack className="relative h-[27px] w-full rounded-lg bg-background-secondary-default">
                  {({ state: trackState }) => (
                    <>
                      <div
                        className="absolute inset-y-0 left-0 rounded-lg bg-background-tertiary-hover"
                        style={{
                          width: `${trackState.getThumbPercent(0) * 100}%`,
                        }}
                      />
                      <SliderThumb
                        className="top-1/2 h-[21px] w-[21px] cursor-grab rounded-[7px] border border-border-checkbox-default bg-background-primary-default shadow-xs outline-none transition-shadow data-[dragging]:cursor-grabbing data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[focus-visible]:ring-2 data-[focus-visible]:ring-border-focus-ring"
                      />
                    </>
                  )}
                </SliderTrack>
              </AriaSlider>
            </div>
          </SettingsRow>
        </SettingsCard>
      </div>

      <div>
        <Button variant="secondary" onClick={() => setSkinDefault()}>
          {t("skin.resetOfficial")}
        </Button>
      </div>
    </div>
  );
}
