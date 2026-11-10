"use client";

import { legalMoves, opponent, score, type Color } from "@100masu/reversi";
import type { ErrorMessage } from "@100masu/reversi/protocol";
import { useSoundEffect } from "@100masu/ui";
import { Stagger, StaggerItem } from "@100masu/ui/components/stagger";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Board from "@/components/board";
import InvitePanel from "@/components/invitePanel";
import PlayerCard from "@/components/playerCard";
import ResultBanner from "@/components/resultBanner";
import TopBar from "@/components/topBar";
import { useReversiChannel, type GameState } from "@/hooks/useReversiChannel";

type GameViewProps = {
  gameId: string;
  identity: string | null;
};

export default function GameView({ gameId, identity }: GameViewProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const { play } = useSoundEffect();
  const [confirmingResign, setConfirmingResign] = useState(false);

  const onError = useCallback(
    (code: ErrorMessage["code"]) => {
      if (code === "illegal") {
        play("incorrect");
        toast.error(t("reversi.illegal"));
      }
    },
    [play, t],
  );

  const { state, connected, move, resign, rematch } = useReversiChannel(gameId, identity, onError);
  const previous = useRef<GameState | null>(null);

  useEffect(() => {
    const before = previous.current;
    previous.current = state;
    if (state?.nextGameId && state.nextGameId !== before?.nextGameId) {
      router.push(`/g/${state.nextGameId}` as Route);
      return;
    }
    if (!state || !before) {
      return;
    }
    if (before.status === "waiting" && state.status === "playing") {
      play("start");
    }
    if (state.lastMove && state.board !== before.board) {
      play("write");
      if (state.status === "playing" && state.turn === state.lastMove.color) {
        const passer = state.seats[opponent(state.lastMove.color)]?.name ?? "";
        toast(t("reversi.passed", { name: passer }));
      }
    }
    if (before.status === "playing" && state.status === "finished") {
      if (!state.you || state.result?.winner === state.you) {
        play("applaud");
      }
    }
    const opponentColor = state.you ? opponent(state.you) : null;
    if (
      opponentColor &&
      state.status === "finished" &&
      state.seats[opponentColor]?.rematch &&
      !before.seats[opponentColor]?.rematch &&
      !state.seats[state.you!]?.rematch
    ) {
      toast(t("reversi.rematchOffered", { name: state.seats[opponentColor]?.name }));
    }
  }, [state, play, router, t]);

  const hints = useMemo(() => {
    if (!state || state.status !== "playing" || !state.you || state.turn !== state.you) {
      return new Set<number>();
    }
    return new Set(legalMoves(state.board, state.you));
  }, [state]);

  if (!state) {
    return (
      <main className="flex min-h-dvh items-center justify-center gap-3">
        <span className="loading loading-spinner loading-lg text-primary" />
        <span>{t("reversi.connecting")}</span>
      </main>
    );
  }

  if (state.status === "waiting") {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-8 px-4 py-12">
        <TopBar />
        <h1 className="text-4xl font-bold">{t("reversi.title")}</h1>
        {state.you ? (
          <InvitePanel code={state.inviteCode} />
        ) : (
          <p className="text-base-content/70">{t("reversi.spectatorWaiting")}</p>
        )}
      </main>
    );
  }

  const bottom: Color = state.you ?? "B";
  const top = opponent(bottom);
  const discs = score(state.board);
  const card = (color: Color) => (
    <PlayerCard
      color={color}
      seat={state.seats[color]}
      discs={discs[color]}
      isYou={state.you === color}
      active={state.status === "playing" && state.turn === color}
      clock={state.clock}
      turn={state.turn}
      clockOffset={state.clockOffset}
    />
  );
  const youWantRematch = state.you ? state.seats[state.you]?.rematch : false;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[600px] flex-col items-center gap-3 px-4 py-4">
      <TopBar />
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-bold">{t("reversi.title")}</h1>
        <div className="flex items-center gap-2">
          {!state.you ? (
            <span className="badge badge-secondary">{t("reversi.spectating")}</span>
          ) : null}
          {!connected ? <span className="loading loading-spinner loading-sm" /> : null}
        </div>
      </div>

      <Stagger className="contents">
        <StaggerItem className="w-full">{card(top)}</StaggerItem>
        <StaggerItem className="flex w-full justify-center">
          <Board
            board={state.board}
            lastMove={state.lastMove}
            hints={hints}
            hintColor={state.you}
            onPlay={move}
          />
        </StaggerItem>
        <StaggerItem className="w-full">{card(bottom)}</StaggerItem>
      </Stagger>

      <div className="flex min-h-12 w-full flex-col items-center gap-3">
        {state.status === "playing" ? (
          <>
            <span className="text-lg font-semibold">
              {state.turn === state.you
                ? t("reversi.yourTurn")
                : t("reversi.theirTurn", { name: state.turn ? state.seats[state.turn]?.name : "" })}
            </span>
            {state.you ? (
              confirmingResign ? (
                <div className="flex items-center gap-2">
                  <span>{t("reversi.confirmResign")}</span>
                  <button
                    type="button"
                    className="btn btn-error btn-sm"
                    onClick={() => {
                      setConfirmingResign(false);
                      resign();
                    }}
                  >
                    {t("reversi.resign")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setConfirmingResign(false)}
                  >
                    {t("reversi.cancel")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setConfirmingResign(true)}
                >
                  {t("reversi.resign")}
                </button>
              )
            ) : null}
          </>
        ) : (
          <>
            {state.result ? (
              <ResultBanner
                board={state.board}
                result={state.result}
                you={state.you}
                names={{ B: state.seats.B?.name ?? "", W: state.seats.W?.name ?? "" }}
              />
            ) : null}
            <div className="flex flex-wrap items-center justify-center gap-2">
              {state.you ? (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={youWantRematch}
                  onClick={rematch}
                >
                  {youWantRematch ? t("reversi.rematchWaiting") : t("reversi.rematch")}
                </button>
              ) : null}
              <Link href="/mp" className="btn btn-ghost">
                {t("reversi.newGame")}
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
