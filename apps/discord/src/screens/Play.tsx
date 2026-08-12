import { checkAnswer, countProgress, formatDuration, GRID_SIZE, MAX_PLAYERS } from "@100masu/game";
import CurrentCalculation from "@100masu/ui/components/currentCalculation";
import GameBoard from "@100masu/ui/components/gameBoard";
import Leaderboard from "@100masu/ui/components/leaderboard";
import OpponentsPane from "@100masu/ui/components/opponentsPane";
import { useSoundEffect } from "@100masu/ui/components/soundProvider";
import Stopwatch from "@100masu/ui/components/stopwatch";
import TitleScreen from "@100masu/ui/components/titleScreen";
import WinScreen from "@100masu/ui/components/winScreen";
import { usePlayChannel, type FinishEvent } from "@100masu/ui/hooks/usePlayChannel";
import type { LobbySnapshot } from "@100masu/ui/protocol";
import { useOpponentsStore } from "@100masu/ui/store/opponents";
import { AnimatePresence } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import { playingActivity, type Activity } from "../presence";
import type { Session } from "../realtime";

type ActiveCell = { row: number; col: number };

const INTRO_GRACE_MS = 15_000;
const MAX_RECHECKS = 3;

type PlayProps = {
  session: Session;
  snapshot: LobbySnapshot;
  presence: { instanceId: string; setPresence: (activity: Activity | null) => void };
  onFinished: () => void;
};

export default function Play({ session, snapshot, presence, onFinished }: PlayProps) {
  const { t } = useTranslation();
  const { play } = useSoundEffect();
  const { game, checkResult, sendCell, sendCommit, sendCheck, onFinish } = usePlayChannel(
    session.playerId,
    true,
  );

  const [answers, setAnswers] = useState<string[] | null>(null);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [winPending, setWinPending] = useState(false);
  const seenFinishes = useRef<Set<string>>(new Set());
  const navigated = useRef(false);
  const syncedRef = useRef(0);
  const lastCheckToast = useRef(0);
  const recheckedFor = useRef<string | null>(null);
  const recheckAttempts = useRef(0);
  const resetOpponents = useOpponentsStore((state) => state.reset);

  useEffect(() => {
    resetOpponents();
    return () => resetOpponents();
  }, [resetOpponents]);

  useEffect(() => {
    if (introDone || !snapshot.startedAt) {
      return;
    }
    const key = `100masu:mp-intro:${snapshot.lobbyId}`;
    if (window.sessionStorage.getItem(key)) {
      setIntroDone(true);
      return;
    }
    window.sessionStorage.setItem(key, "1");
    if (snapshot.startedAt - Date.now() > -INTRO_GRACE_MS) {
      setShowIntro(true);
    } else {
      setIntroDone(true);
    }
  }, [introDone, snapshot.startedAt, snapshot.lobbyId]);

  useEffect(() => {
    if (!game || game.syncedAt === syncedRef.current) {
      return;
    }
    syncedRef.current = game.syncedAt;
    setAnswers(game.answers);
  }, [game]);

  const handleIntroComplete = useCallback(() => {
    setShowIntro(false);
    setIntroDone(true);
  }, []);

  useEffect(() => {
    onFinish((event: FinishEvent) => {
      if (event.playerId === session.playerId) {
        if (!navigated.current) {
          setWinPending(true);
        }
        return;
      }
      if (seenFinishes.current.has(event.playerId)) {
        return;
      }
      seenFinishes.current.add(event.playerId);
      toast(t("mp.opponentFinished", { name: event.name, time: formatDuration(event.timeMs) }));
      play("opponent_done");
    });
  }, [onFinish, session.playerId, t, play]);

  const goToResult = useCallback(() => {
    if (navigated.current) {
      return;
    }
    navigated.current = true;
    onFinished();
  }, [onFinished]);

  useEffect(() => {
    if (game?.finishedAt != null && !winPending) {
      goToResult();
    }
  }, [game?.finishedAt, winPending, goToResult]);

  const progress = game && answers ? countProgress(game.board, game.op, answers) : null;
  const revealed = game?.check === "input" || checkResult !== null;

  const { instanceId, setPresence } = presence;
  const startedAtPresence = game?.startedAt ?? null;
  const correct = progress?.correct ?? 0;
  const filled = progress?.filled ?? 0;
  const answerable = progress?.answerable ?? 0;

  useEffect(() => {
    if (!game) {
      return;
    }
    setPresence(
      playingActivity(t, instanceId, {
        op: game.op,
        start: snapshot.startNumber,
        end: snapshot.endNumber,
        check: game.check,
        correct,
        filled,
        answerable,
        startedAt: startedAtPresence,
        players: snapshot.players.length,
        max: MAX_PLAYERS,
      }),
    );
  }, [
    t,
    instanceId,
    setPresence,
    game,
    snapshot.startNumber,
    snapshot.endNumber,
    snapshot.players.length,
    correct,
    filled,
    answerable,
    startedAtPresence,
  ]);

  useEffect(() => {
    if (!checkResult || checkResult.solved || !progress?.solved) {
      return;
    }
    const signature = `${checkResult.correct}/${checkResult.answerable}`;
    if (recheckedFor.current === signature || recheckAttempts.current >= MAX_RECHECKS) {
      return;
    }
    recheckedFor.current = signature;
    recheckAttempts.current += 1;
    sendCheck();
  }, [checkResult, progress?.solved, sendCheck]);

  useEffect(() => {
    if (!checkResult || checkResult.solved || checkResult.at === lastCheckToast.current) {
      return;
    }
    lastCheckToast.current = checkResult.at;
    toast.error(
      t("play.correct", { correct: checkResult.correct, answerable: checkResult.answerable }),
    );
    play("incorrect");
  }, [checkResult, t, play]);

  function handleCellChange(index: number, value: string) {
    const previous = answers?.[index] ?? "";
    setAnswers((prev) => {
      if (!prev) {
        return prev;
      }
      const next = [...prev];
      next[index] = value;
      return next;
    });
    sendCell(index, value);
    if (value.length > previous.length) {
      play("write");
    }
  }

  function handleCellBlur(index: number) {
    if (!game || !answers) {
      return;
    }
    const value = answers[index] ?? "";
    if (value.trim() === "") {
      return;
    }
    sendCommit(index);
    if (game.check !== "input") {
      return;
    }
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const leftValue = game.board.left[row];
    const topValue = game.board.top[col];
    if (leftValue === undefined || topValue === undefined) {
      return;
    }
    play(checkAnswer(game.op, leftValue, topValue, value) ? "correct" : "incorrect");
  }

  if (!game || !answers) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4">
        <span className="loading loading-dots loading-lg" />
        <p className="text-sm text-base-content/60">{t("mp.gameStarting")}</p>
      </main>
    );
  }

  const activeLeft = activeCell ? (game.board.left[activeCell.row] ?? null) : null;
  const activeTop = activeCell ? (game.board.top[activeCell.col] ?? null) : null;
  const startedAtLocal = game.startedAt === null ? null : game.startedAt + game.clockOffset;

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-4 px-3 py-4">
      <div className="flex items-start justify-center gap-4">
        <OpponentsPane selfId={session.playerId} startedAt={startedAtLocal} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <CurrentCalculation op={game.op} left={activeLeft} top={activeTop} />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Stopwatch startedAt={startedAtLocal} finishedAt={game.finishedAt} />
              <span className="text-sm font-medium">
                {revealed && progress
                  ? t("play.correct", {
                      correct: progress.correct,
                      answerable: progress.answerable,
                    })
                  : t("play.filled", {
                      filled: progress?.filled ?? 0,
                      answerable: progress?.answerable ?? 0,
                    })}
              </span>
            </div>
            {game.check === "end" ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => sendCheck()}
                disabled={!progress || progress.filled < progress.answerable}
              >
                {t("play.checkAnswers")}
              </button>
            ) : null}
          </div>

          <GameBoard
            board={game.board}
            op={game.op}
            answers={answers}
            check={game.check}
            showResults={checkResult !== null}
            onCellChange={handleCellChange}
            onCellBlur={handleCellBlur}
            onActiveCell={(row, col) => setActiveCell({ row, col })}
          />
        </div>

        <Leaderboard selfId={session.playerId} check={game.check} />
      </div>

      <AnimatePresence>
        {showIntro ? (
          <TitleScreen
            op={game.op}
            start={snapshot.startNumber}
            end={snapshot.endNumber}
            order={snapshot.order}
            check={game.check}
            onComplete={handleIntroComplete}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>{winPending ? <WinScreen onComplete={goToResult} /> : null}</AnimatePresence>
    </main>
  );
}
