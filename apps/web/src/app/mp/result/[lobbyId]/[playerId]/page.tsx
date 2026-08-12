"use client";

import { Check } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import { useSoundEffect } from "@100masu/ui/components/soundProvider";
import SoundToggle from "@100masu/ui/components/soundToggle";
import SpectateCarousel from "@100masu/ui/components/spectateCarousel";
import { useLobbyChannel } from "@100masu/ui/hooks/useLobbyChannel";
import { useSpectateChannel } from "@100masu/ui/hooks/useSpectateChannel";
import { formatDuration } from "@/lib/game";

export default function MultiplayerResultPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ lobbyId: string; playerId: string }>();
  const { lobbyId, playerId } = params;
  const { play } = useSoundEffect();

  const { snapshot } = useLobbyChannel({ lobbyId });
  const self = snapshot?.players.find((player) => player.id === playerId) ?? null;
  const finished = self?.finishedAt != null;

  const { state: spectate } = useSpectateChannel(playerId, finished);
  const celebrated = useRef(false);
  const redirected = useRef(false);

  useEffect(() => {
    if (snapshot && self && self.finishedAt === null && !redirected.current) {
      redirected.current = true;
      router.replace(`/mp/play/${playerId}` as Route);
    }
  }, [snapshot, self, router, playerId]);

  useEffect(() => {
    if (!finished || celebrated.current) {
      return;
    }
    celebrated.current = true;
    play("applaud");
    let cancelled = false;
    void import("canvas-confetti").then((module) => {
      if (cancelled) {
        return;
      }
      module.default({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
    });
    return () => {
      cancelled = true;
    };
  }, [finished, play]);

  if (snapshot && !self) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold">{t("mp.lobbyNotFound")}</h1>
        <Link href="/mp" className="btn btn-primary">
          {t("mp.backToLobby")}
        </Link>
      </main>
    );
  }

  if (!snapshot || !self || self.finishedAt === null) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <span className="loading loading-dots loading-lg" />
      </main>
    );
  }

  const finishers = snapshot.players
    .filter((player) => player.finishedAt !== null)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
  const placement = finishers.findIndex((player) => player.id === playerId) + 1;
  const elapsed =
    snapshot.startedAt !== null ? formatDuration(self.finishedAt - snapshot.startedAt) : null;

  const opponents = (spectate?.players ?? []).filter((player) => player.playerId !== playerId);

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{t("mp.resultTitle")}</h1>
        <p className="mt-3 text-6xl font-black text-primary">{t("mp.place", { n: placement })}</p>
        {elapsed ? (
          <p className="mt-3 flex flex-col items-center gap-1">
            <span className="text-sm text-base-content/60">{t("mp.yourTime")}</span>
            <span className="text-4xl font-bold tabular-nums [font-family:var(--font-dseg)]">
              {elapsed}
            </span>
          </p>
        ) : null}
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-4">
          <h2 className="font-semibold">{t("mp.leaderboard")}</h2>
          <ol className="flex flex-col gap-2">
            {finishers.map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center gap-3 rounded-box px-4 py-2 ${
                  player.id === playerId ? "bg-primary/20" : "bg-base-100"
                }`}
              >
                <span className="w-5 font-bold tabular-nums opacity-60">{index + 1}</span>
                <span className="flex-1 truncate font-medium">{player.name}</span>
                <Check className="size-4 text-success" />
                <span className="font-mono text-sm tabular-nums">
                  {snapshot.startedAt !== null
                    ? formatDuration((player.finishedAt ?? 0) - snapshot.startedAt)
                    : "--:--"}
                </span>
              </li>
            ))}
            {snapshot.players
              .filter((player) => player.finishedAt === null)
              .map((player) => (
                <li
                  key={player.id}
                  className="flex items-center gap-3 rounded-box bg-base-100 px-4 py-2 opacity-60"
                >
                  <span className="w-5" />
                  <span className="flex-1 truncate font-medium">{player.name}</span>
                  <span className="font-mono text-sm tabular-nums">
                    {snapshot.check === "input" ? player.correctCount : player.filledCount}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      </div>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-4">
          <h2 className="font-semibold">{t("mp.spectate")}</h2>
          {spectate ? (
            <SpectateCarousel
              board={spectate.board}
              op={spectate.op}
              check={spectate.check}
              players={opponents}
            />
          ) : (
            <span className="loading loading-dots mx-auto" />
          )}
        </div>
      </div>

      <Link href="/mp" className="btn btn-ghost">
        {t("mp.backToLobby")}
      </Link>
    </main>
  );
}
