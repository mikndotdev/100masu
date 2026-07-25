"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@/components/languageSwitch";
import SoundToggle from "@/components/soundToggle";
import { INVITE_CODE_LENGTH, normalizeInviteCode } from "@/lib/lobby";

export default function InviteCodePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState("");

  const normalized = normalizeInviteCode(code);
  const valid = normalized.length === INVITE_CODE_LENGTH && /^[A-Z0-9]+$/.test(normalized);

  function submit() {
    if (!valid) {
      return;
    }
    router.push(`/invite/${normalized}` as Route);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{t("invite.title")}</h1>
        <p className="mt-2 text-base-content/70">{t("invite.tagline")}</p>
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <label className="form-control">
            <span className="mb-1 font-semibold">{t("invite.codeLabel")}</span>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={INVITE_CODE_LENGTH}
              placeholder={t("invite.codePlaceholder")}
              className="input input-bordered w-full text-center font-mono text-3xl tracking-[0.3em] uppercase"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submit();
                }
              }}
            />
          </label>

          <button
            type="button"
            className="btn btn-primary btn-lg w-full"
            disabled={!valid}
            onClick={submit}
          >
            {t("invite.continue")}
          </button>
        </div>
      </div>
    </main>
  );
}
