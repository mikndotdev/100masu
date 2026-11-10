"use client";

import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useQueryStates } from "nuqs";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { createLobby } from "@/actions/lobby";
import { env } from "@100masu/env/web";
import Captcha from "@100masu/ui/components/captcha";
import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SettingsForm from "@100masu/ui/components/settingsForm";
import SoundToggle from "@100masu/ui/components/soundToggle";
import { Stagger, StaggerItem } from "@100masu/ui/components/stagger";
import { settingsParsers } from "@/lib/gameParams";

function MultiplayerSetupContent() {
  const { t } = useTranslation();
  const [settings, setSettings] = useQueryStates(settingsParsers);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  const [name, setName] = useState("");
  const [allowLateJoin, setAllowLateJoin] = useState(false);

  function resetCaptcha() {
    setCaptchaToken(null);
    setCaptchaKey((key) => key + 1);
  }

  const { execute, isPending } = useAction(createLobby, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        resetCaptcha();
        toast.error(t(data.error === "captcha" ? "mp.captchaError" : "mp.createFailed"));
      }
    },
    onError: () => {
      resetCaptcha();
      toast.error(t("mp.createFailed"));
    },
  });

  const canCreate = captchaToken !== null && name.trim() !== "" && !isPending;

  function handleCreateLobby() {
    if (!canCreate || !captchaToken) {
      return;
    }
    execute({
      name: name.trim(),
      captchaToken,
      op: settings.op,
      start: settings.start,
      end: settings.end,
      order: settings.order,
      check: settings.check,
      allowLateJoin,
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <Stagger className="contents">
        <StaggerItem>
          <header className="text-center">
            <h1 className="text-4xl font-bold md:text-5xl">{t("mp.title")}</h1>
            <p className="mt-2 text-base-content/70">{t("mp.tagline")}</p>
          </header>
        </StaggerItem>

        <StaggerItem className="w-full">
          <div className="card w-full bg-base-200 shadow-xl">
            <div className="card-body gap-6">
              <label className="flex flex-col">
                <span className="mb-1 font-semibold">{t("mp.nameLabel")}</span>
                <input
                  type="text"
                  className="input w-full"
                  value={name}
                  maxLength={20}
                  autoComplete="nickname"
                  placeholder={t("mp.namePlaceholder")}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <SettingsForm settings={settings} onChange={(next) => void setSettings(next)} />

              <label className="flex cursor-pointer items-start justify-between gap-4">
                <span className="flex flex-col">
                  <span className="font-semibold">{t("setup.allowLateJoin")}</span>
                  <span className="text-sm text-base-content/60">
                    {t("setup.allowLateJoinHint")}
                  </span>
                </span>
                <input
                  type="checkbox"
                  className="toggle toggle-primary shrink-0"
                  checked={allowLateJoin}
                  onChange={(event) => setAllowLateJoin(event.target.checked)}
                />
              </label>

              <div className="divider my-0" />

              <Captcha
                key={captchaKey}
                endpoint={env.NEXT_PUBLIC_CAP_API_ENDPOINT}
                onVerify={setCaptchaToken}
                onError={() => {
                  setCaptchaToken(null);
                  toast.error(t("mp.captchaError"));
                }}
              />

              <div className="card-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full"
                  disabled={!canCreate}
                  onClick={handleCreateLobby}
                >
                  {isPending ? <span className="loading loading-spinner" /> : t("mp.createLobby")}
                </button>
              </div>
            </div>
          </div>
        </StaggerItem>

        <StaggerItem>
          <Link href="/" className="btn btn-ghost">
            {t("mp.back")}
          </Link>
        </StaggerItem>
      </Stagger>
    </main>
  );
}

export default function MultiplayerSetupPage() {
  return (
    <Suspense>
      <MultiplayerSetupContent />
    </Suspense>
  );
}
