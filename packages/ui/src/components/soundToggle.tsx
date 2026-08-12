"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSoundEffect } from "./soundProvider";

export default function SoundToggle() {
  const { t } = useTranslation();
  const { muted, toggleMuted } = useSoundEffect();

  return (
    <button
      type="button"
      onClick={toggleMuted}
      aria-label={muted ? t("play.unmute") : t("play.mute")}
      className="btn btn-square btn-ghost btn-sm"
    >
      {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
    </button>
  );
}
