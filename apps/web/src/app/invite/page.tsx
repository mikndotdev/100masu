"use client";

import { useAction } from "next-safe-action/hooks";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { lookupInvite } from "@/actions/lobby";
import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SoundToggle from "@100masu/ui/components/soundToggle";
import { INVITE_CODE_LENGTH, inviteErrorKey, normalizeInviteCode } from "@/lib/lobby";

export default function InviteCodePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const normalized = normalizeInviteCode(code);
  const valid = normalized.length === INVITE_CODE_LENGTH && /^[A-Z0-9]+$/.test(normalized);

  const { execute, isPending } = useAction(lookupInvite, {
    onSuccess: ({ data }) => {
      if (data?.ok) {
        router.push(`/invite/${normalized}` as Route);
        return;
      }
      setError(data ? inviteErrorKey(data.error) : "invite.joinFailed");
    },
    onError: () => setError("invite.joinFailed"),
  });

  function submit() {
    if (!valid || isPending) {
      return;
    }
    setError(null);
    execute({ code: normalized });
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
          <label className="flex flex-col">
            <span className="mb-1 font-semibold">{t("invite.codeLabel")}</span>
            <input
              type="text"
              autoFocus
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={INVITE_CODE_LENGTH}
              placeholder={t("invite.codePlaceholder")}
              className={`input w-full text-center font-mono text-3xl tracking-[0.3em] uppercase ${
                error ? "input-error" : ""
              }`}
              value={code}
              onChange={(event) => {
                setCode(event.target.value.toUpperCase());
                setError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  submit();
                }
              }}
            />
            {error ? <span className="mt-2 text-sm text-error">{t(error)}</span> : null}
          </label>

          <button
            type="button"
            className="btn btn-primary btn-lg w-full"
            disabled={!valid || isPending}
            onClick={submit}
          >
            {isPending ? <span className="loading loading-spinner" /> : t("invite.continue")}
          </button>
        </div>
      </div>
    </main>
  );
}
