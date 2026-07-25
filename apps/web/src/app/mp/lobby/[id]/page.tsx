"use client";

import { Copy, Crown, Users } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import type { Route } from "next";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { startGame } from "@/actions/lobby";
import LanguageSwitch from "@/components/languageSwitch";
import SoundToggle from "@/components/soundToggle";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { inviteUrl, MAX_PLAYERS, MIN_PLAYERS, PUBLIC_ORIGIN } from "@/lib/lobby";

export default function LobbyPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const lobbyId = params.id;
  const { snapshot, connected } = useLobbyChannel({ lobbyId });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);

  const { execute, isPending } = useAction(startGame, {
    onSuccess: ({ data }) => {
      if (data && !data.ok) {
        const messages = {
          tooFewPlayers: "mp.needTwoPlayers",
          notHost: "mp.notHost",
          notFound: "mp.lobbyNotFound",
          closed: "mp.lobbyClosed",
        } as const;
        toast.error(t(messages[data.error]));
      }
    },
    onError: () => toast.error(t("mp.createFailed")),
  });

  const players = snapshot?.players ?? [];
  const code = snapshot?.inviteCode ?? "";
  const canStart = players.length >= MIN_PLAYERS && !isPending;
  const inProgress = snapshot?.status === "IN_PROGRESS" || snapshot?.status === "COMPLETED";
  const hostId = players.find((player) => player.isHost)?.id ?? null;

  async function copyLink() {
    if (!code) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl(code));
    setCopied(true);
    toast.success(t("mp.copied"));
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{t("mp.lobbyTitle")}</h1>
        {code ? (
          <p className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-primary">{code}</p>
        ) : (
          <p className="mt-2 text-base-content/60">{t("mp.connecting")}</p>
        )}
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Users className="size-5" />
              {t("mp.players")}
            </span>
            <span className="text-sm text-base-content/60">
              {t("mp.playerCount", { count: players.length, max: MAX_PLAYERS })}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-box bg-base-100 px-4 py-3"
              >
                <span className="font-medium">{player.name}</span>
                {player.isHost ? (
                  <span className="badge badge-primary gap-1">
                    <Crown className="size-3" />
                    {t("mp.host")}
                  </span>
                ) : null}
              </li>
            ))}
            {players.length === 0 ? (
              <li className="rounded-box bg-base-100 px-4 py-3 text-base-content/50">
                {connected ? t("mp.waitingForHost") : t("mp.connecting")}
              </li>
            ) : null}
          </ul>

          <div className="card-actions flex-col gap-3">
            {inProgress ? (
              hostId ? (
                <Link
                  href={`/mp/play/${hostId}` as Route}
                  className="btn btn-primary btn-lg w-full"
                >
                  {t("mp.backToGame")}
                </Link>
              ) : null
            ) : (
              <>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg w-full"
                  onClick={() => dialogRef.current?.showModal()}
                >
                  {t("mp.invite")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg w-full"
                  disabled={!canStart}
                  onClick={() => execute({ lobbyId })}
                >
                  {t("mp.startGame")}
                </button>
                {players.length < MIN_PLAYERS ? (
                  <p className="text-center text-sm text-base-content/60">
                    {t("mp.needTwoPlayers")}
                  </p>
                ) : null}
              </>
            )}
          </div>
        </div>
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box max-w-3xl text-center">
          <h3 className="text-2xl font-bold">{t("mp.invite")}</h3>

          <div className="my-6 flex flex-col items-center gap-6">
            <p className="text-xl md:text-2xl">
              {t("mp.inviteStep1")}{" "}
              <span className="font-bold text-primary">100masu.mikn.dev/invite</span>
            </p>
            <p className="text-xl md:text-2xl">{t("mp.inviteStep2")}</p>
            <p className="font-mono text-6xl font-black tracking-[0.2em] text-primary md:text-8xl">
              {code}
            </p>
            {code ? (
              <div className="rounded-box bg-white p-4">
                <QRCode value={inviteUrl(code)} size={180} />
              </div>
            ) : null}
            <p className="text-sm break-all text-base-content/60">
              {PUBLIC_ORIGIN}/invite/{code}
            </p>
          </div>

          <div className="modal-action justify-center">
            <button type="button" className="btn btn-outline" onClick={copyLink}>
              <Copy className="size-4" />
              {copied ? t("mp.copied") : t("mp.copyLink")}
            </button>
            <form method="dialog">
              <button className="btn btn-primary">{t("mp.close")}</button>
            </form>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </main>
  );
}
