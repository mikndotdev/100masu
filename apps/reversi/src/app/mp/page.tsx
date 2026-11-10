"use client";

import { CLOCK_PRESETS, type ClockPreset } from "@100masu/reversi";
import { env } from "@100masu/env/web";
import Captcha from "@100masu/ui/components/captcha";
import { Stagger, StaggerItem } from "@100masu/ui/components/stagger";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { createGame } from "@/actions/game";
import { FlipCard, FlipLink } from "@/components/flipCard";
import Segmented from "@/components/segmented";
import { ColorPicker } from "@/components/setupPickers";
import StartHeader from "@/components/startHeader";
import TopBar from "@/components/topBar";
import { CLOCK_PRESET_KEYS, MAX_NAME_LENGTH, type ColorChoice } from "@/lib/game";

function clockLabel(preset: ClockPreset, untimed: string) {
  return CLOCK_PRESETS[preset] ? preset : untimed;
}

export default function FriendPage() {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [color, setColor] = useState<ColorChoice>("random");
  const [clock, setClock] = useState<ClockPreset>("untimed");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
  }

  const { execute, isPending } = useAction(createGame, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        resetCaptcha();
        toast.error(t(data.error === "captcha" ? "reversi.captchaError" : "reversi.createFailed"));
      }
    },
    onError: () => {
      resetCaptcha();
      toast.error(t("reversi.createFailed"));
    },
  });

  const canCreate = captchaToken !== null && name.trim() !== "" && !isPending;

  function create() {
    if (canCreate && captchaToken) {
      execute({ name: name.trim(), color, clock, captchaToken });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-8 px-4 py-12">
      <TopBar />
      <Stagger className="contents">
        <StaggerItem>
          <StartHeader tagline={t("reversi.tagline")} />
        </StaggerItem>

        <FlipCard className="w-full">
          <div className="card w-full bg-base-100 shadow-xl ring-1 ring-base-content/15">
            <div className="card-body gap-6">
              <h2 className="card-title">{t("reversi.friendTitle")}</h2>
              <label className="flex flex-col">
                <span className="mb-1 font-semibold">{t("reversi.nameLabel")}</span>
                <input
                  type="text"
                  className="input w-full"
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="nickname"
                  placeholder={t("reversi.namePlaceholder")}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <ColorPicker value={color} onChange={setColor} />

              <Segmented
                label={t("reversi.clockLabel")}
                options={CLOCK_PRESET_KEYS}
                value={clock}
                onChange={setClock}
                render={(option) => clockLabel(option, t("reversi.untimed"))}
              />

              <Captcha
                key={captchaKey}
                endpoint={env.NEXT_PUBLIC_CAP_API_ENDPOINT}
                onVerify={setCaptchaToken}
                onError={resetCaptcha}
              />

              <button
                type="button"
                className="btn btn-primary btn-lg"
                disabled={!canCreate}
                onClick={create}
              >
                {isPending ? <span className="loading loading-spinner loading-sm" /> : null}
                {t("reversi.create")}
              </button>

              <FlipLink href="/join" className="link link-hover self-center">
                {t("reversi.haveCode")}
              </FlipLink>
            </div>
          </div>
        </FlipCard>

        <StaggerItem>
          <FlipLink href="/" className="btn btn-ghost">
            {t("reversi.back")}
          </FlipLink>
        </StaggerItem>
      </Stagger>
    </main>
  );
}
