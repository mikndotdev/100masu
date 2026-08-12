"use client";

import { useAction } from "next-safe-action/hooks";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { joinLobby, lookupInvite } from "@/actions/lobby";
import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SoundToggle from "@100masu/ui/components/soundToggle";
import { inviteErrorKey, MAX_NAME_LENGTH, normalizeInviteCode } from "@/lib/lobby";

export default function InviteJoinPage() {
  const { t } = useTranslation();
  const params = useParams<{ code: string }>();
  const code = normalizeInviteCode(params.code ?? "");
  const [name, setName] = useState("");
  const [invalid, setInvalid] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const [checked, setChecked] = useState(false);
  const checkedOnce = useRef(false);

  const lookup = useAction(lookupInvite, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        setInvalid(inviteErrorKey(data.error));
      }
      if (data?.ok) {
        setInProgress(data.inProgress);
      }
      setChecked(true);
    },
    onError: () => {
      setInvalid("invite.joinFailed");
      setChecked(true);
    },
  });
  const runLookup = lookup.execute;

  useEffect(() => {
    if (checkedOnce.current || code === "") {
      return;
    }
    checkedOnce.current = true;
    runLookup({ code });
  }, [code, runLookup]);

  const { execute, isPending } = useAction(joinLobby, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        toast.error(t(inviteErrorKey(data.error)));
      }
    },
    onError: () => toast.error(t("invite.joinFailed")),
  });

  const canJoin = name.trim() !== "" && !isPending;

  if (!checked) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
        <span className="loading loading-dots loading-lg" />
        <p className="text-base-content/60">{t("invite.checking")}</p>
      </main>
    );
  }

  if (invalid) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold">{t(invalid)}</h1>
        <p className="font-mono text-xl tracking-[0.3em] text-base-content/50">{code}</p>
        <Link href="/invite" className="btn btn-primary">
          {t("invite.tryAnother")}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <header className="text-center">
        <h1 className="text-3xl font-bold md:text-4xl">{t("invite.nameTitle")}</h1>
        <p className="mt-2 text-base-content/70">{t("invite.nameTagline")}</p>
        <p className="mt-4 font-mono text-2xl font-bold tracking-[0.3em] text-primary">{code}</p>
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          {inProgress ? (
            <div className="rounded-box bg-warning/15 px-4 py-3 text-left">
              <span className="badge badge-warning badge-sm gap-1 font-semibold">
                <span className="inline-block size-1.5 rounded-full bg-current" />
                {t("invite.inProgress")}
              </span>
              <p className="mt-2 text-sm text-base-content/70">{t("invite.inProgressNote")}</p>
            </div>
          ) : null}

          <label className="form-control">
            <span className="mb-1 font-semibold">{t("mp.nameLabel")}</span>
            <input
              type="text"
              autoFocus
              autoComplete="nickname"
              maxLength={MAX_NAME_LENGTH}
              placeholder={t("mp.namePlaceholder")}
              className="input input-bordered w-full"
              value={name}
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && canJoin) {
                  execute({ code, name });
                }
              }}
            />
          </label>

          <button
            type="button"
            className="btn btn-primary btn-lg w-full"
            disabled={!canJoin}
            onClick={() => execute({ code, name })}
          >
            {isPending ? <span className="loading loading-spinner" /> : t("invite.join")}
          </button>
        </div>
      </div>
    </main>
  );
}
