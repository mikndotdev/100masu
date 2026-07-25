"use client";

import { useAction } from "next-safe-action/hooks";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { joinLobby } from "@/actions/lobby";
import LanguageSwitch from "@/components/languageSwitch";
import SoundToggle from "@/components/soundToggle";
import { MAX_NAME_LENGTH, normalizeInviteCode } from "@/lib/lobby";

export default function InviteJoinPage() {
  const { t } = useTranslation();
  const params = useParams<{ code: string }>();
  const code = normalizeInviteCode(params.code ?? "");
  const [name, setName] = useState("");

  const { execute, isPending } = useAction(joinLobby, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        const key =
          data.error === "notFound"
            ? "mp.lobbyNotFound"
            : data.error === "closed"
              ? "mp.lobbyClosed"
              : "mp.lobbyFull";
        toast.error(t(key));
      }
    },
    onError: () => toast.error(t("invite.joinFailed")),
  });

  const canJoin = name.trim() !== "" && !isPending;

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
