"use client";

import type { Color } from "@100masu/reversi";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Stagger, StaggerItem } from "@100masu/ui/components/stagger";

import { joinGame } from "@/actions/game";
import TopBar from "@/components/topBar";
import { MAX_NAME_LENGTH } from "@/lib/game";

type JoinFormProps = { code: string; hostName: string; color: Color };

export default function JoinForm({ code, hostName, color }: JoinFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");

  const { execute, isPending } = useAction(joinGame, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        toast.error(t(data.error === "notFound" ? "reversi.notFound" : "reversi.joinFailed"));
      }
    },
    onError: () => toast.error(t("reversi.joinFailed")),
  });

  const canJoin = name.trim() !== "" && !isPending;

  function submit() {
    if (canJoin) {
      execute({ code, name: name.trim() });
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <TopBar />
      <Stagger className="contents">
        <StaggerItem>
          <header className="text-center">
            <h1 className="text-4xl font-bold">{t("reversi.joinTitle")}</h1>
            <p className="mt-2 text-base-content/70">
              {t("reversi.hostWaiting", { name: hostName })}
            </p>
          </header>
        </StaggerItem>
        <StaggerItem className="w-full">
          <div className="card w-full bg-base-200 shadow-xl">
            <div className="card-body gap-6">
              <label className="flex flex-col">
                <span className="mb-1 font-semibold">{t("reversi.nameLabel")}</span>
                <input
                  type="text"
                  autoFocus
                  className="input w-full"
                  value={name}
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="nickname"
                  placeholder={t("reversi.namePlaceholder")}
                  onChange={(event) => setName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submit();
                    }
                  }}
                />
              </label>
              <p className="text-sm text-base-content/70">
                {t("reversi.playingAs", {
                  color: t(color === "B" ? "reversi.black" : "reversi.white"),
                })}{" "}
                {t("reversi.blackFirst")}
              </p>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canJoin}
                onClick={submit}
              >
                {isPending ? <span className="loading loading-spinner loading-sm" /> : null}
                {t("reversi.join")}
              </button>
            </div>
          </div>
        </StaggerItem>
      </Stagger>
    </main>
  );
}
