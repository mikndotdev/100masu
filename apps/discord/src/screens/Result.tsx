import { formatDuration, MAX_PLAYERS } from "@100masu/game";
import Avatar from "@100masu/ui/components/avatar";
import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SpectateCarousel from "@100masu/ui/components/spectateCarousel";
import { useSoundEffect } from "@100masu/ui/components/soundProvider";
import { useSpectateChannel } from "@100masu/ui/hooks/useSpectateChannel";
import type { LobbySnapshot } from "@100masu/ui/protocol";
import { Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { finishedActivity, type Activity } from "../presence";
import { requestRematch, type Session } from "../realtime";

type ResultProps = {
  session: Session;
  snapshot: LobbySnapshot;
  presence: { instanceId: string; setPresence: (activity: Activity | null) => void };
  onRematch: () => void;
};

export default function Result({ session, snapshot, presence, onRematch }: ResultProps) {
  const { t } = useTranslation();
  const { play } = useSoundEffect();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const celebrated = useRef(false);

  const self = snapshot.players.find((player) => player.id === session.playerId);
  const finished = self?.finishedAt != null;
  const { state: spectate } = useSpectateChannel(session.playerId, finished);

  useEffect(() => {
    if (!finished || celebrated.current) {
      return;
    }
    celebrated.current = true;
    play("applaud");
    let cancelled = false;
    void import("canvas-confetti").then((module) => {
      if (!cancelled) {
        module.default({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [finished, play]);

  useEffect(() => {
    if (snapshot.nextLobbyId) {
      onRematch();
    }
  }, [snapshot.nextLobbyId, onRematch]);

  const finishers = snapshot.players
    .filter((player) => player.finishedAt !== null)
    .sort((a, b) => (a.finishedAt ?? 0) - (b.finishedAt ?? 0));
  const placement = finishers.findIndex((player) => player.id === session.playerId) + 1;
  const elapsed =
    snapshot.startedAt !== null && self?.finishedAt != null
      ? formatDuration(self.finishedAt - snapshot.startedAt)
      : null;

  const opponents = (spectate?.players ?? []).filter(
    (player) => player.playerId !== session.playerId,
  );

  const { instanceId, setPresence } = presence;
  const elapsedMs =
    snapshot.startedAt !== null && self?.finishedAt != null
      ? self.finishedAt - snapshot.startedAt
      : null;
  const playerCount = snapshot.players.length;

  useEffect(() => {
    if (placement <= 0) {
      return;
    }
    setPresence(
      finishedActivity(t, instanceId, {
        placement,
        elapsedMs,
        players: playerCount,
        max: MAX_PLAYERS,
      }),
    );
  }, [t, instanceId, setPresence, placement, elapsedMs, playerCount]);

  async function handleRematch() {
    setBusy(true);
    setError(null);
    try {
      await requestRematch(session.playerId, session.token);
      onRematch();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6">
      <div className="flex justify-end">
        <LanguageSwitch />
      </div>

      <header className="text-center">
        <h1 className="text-3xl font-bold">{t("mp.resultTitle")}</h1>
        {placement > 0 ? (
          <p className="mt-2 text-5xl font-black text-primary">{t("mp.place", { n: placement })}</p>
        ) : null}
        {elapsed ? (
          <p className="mt-2 flex flex-col items-center gap-1">
            <span className="text-xs text-base-content/60">{t("mp.yourTime")}</span>
            <span className="text-3xl font-bold tabular-nums [font-family:var(--font-dseg)]">
              {elapsed}
            </span>
          </p>
        ) : null}
      </header>

      <section className="card bg-base-200">
        <div className="card-body gap-3">
          <h2 className="text-sm font-semibold">{t("mp.leaderboard")}</h2>
          <ol className="flex flex-col gap-2">
            {finishers.map((player, index) => (
              <li
                key={player.id}
                className={`flex items-center gap-3 rounded-box px-3 py-2 ${
                  player.id === session.playerId ? "bg-primary/20" : "bg-base-100"
                }`}
              >
                <span className="w-5 font-bold tabular-nums opacity-60">{index + 1}</span>
                <Avatar name={player.name} />
                <span className="flex-1 truncate text-sm font-medium">{player.name}</span>
                <Check className="size-4 text-success" />
                <span className="font-mono text-xs tabular-nums">
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
                  className="flex items-center gap-3 rounded-box bg-base-100 px-3 py-2 opacity-60"
                >
                  <span className="w-5" />
                  <Avatar name={player.name} />
                  <span className="flex-1 truncate text-sm font-medium">{player.name}</span>
                  <span className="font-mono text-xs tabular-nums">
                    {snapshot.check === "input" ? player.correctCount : player.filledCount}
                  </span>
                </li>
              ))}
          </ol>
        </div>
      </section>

      {spectate && opponents.length > 0 ? (
        <section className="card bg-base-200">
          <div className="card-body gap-3">
            <h2 className="text-sm font-semibold">{t("mp.spectate")}</h2>
            <SpectateCarousel
              board={spectate.board}
              op={spectate.op}
              check={spectate.check}
              players={opponents}
            />
          </div>
        </section>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      <button
        type="button"
        className="btn btn-primary btn-lg"
        disabled={busy}
        onClick={() => void handleRematch()}
      >
        {busy ? <span className="loading loading-spinner" /> : t("mp.playAgain")}
      </button>
    </main>
  );
}
