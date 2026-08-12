"use client";

import { Crown, Users } from "lucide-react";
import { AnimatePresence } from "motion/react";
import type { Route } from "next";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import CurrentCalculation from "@100masu/ui/components/currentCalculation";
import GameBoard from "@100masu/ui/components/gameBoard";
import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import Leaderboard from "@100masu/ui/components/leaderboard";
import OpponentsPane from "@100masu/ui/components/opponentsPane";
import { useSoundEffect } from "@100masu/ui/components/soundProvider";
import SoundToggle from "@100masu/ui/components/soundToggle";
import Stopwatch from "@100masu/ui/components/stopwatch";
import TitleScreen from "@100masu/ui/components/titleScreen";
import WinScreen from "@100masu/ui/components/winScreen";
import { useLobbyChannel } from "@100masu/ui/hooks/useLobbyChannel";
import { usePlayChannel, type FinishEvent } from "@100masu/ui/hooks/usePlayChannel";
import { checkAnswer, countProgress, formatDuration, GRID_SIZE } from "@/lib/game";
import { MAX_PLAYERS } from "@/lib/lobby";
import { useOpponentsStore } from "@100masu/ui/store/opponents";

type ActiveCell = { row: number; col: number };

const INTRO_GRACE_MS = 15_000;

export default function MultiplayerPlayPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const playerId = params.id;
  const { play } = useSoundEffect();

  const { snapshot } = useLobbyChannel({ playerId });
  const started = snapshot?.status === "IN_PROGRESS" || snapshot?.status === "COMPLETED";

  const { game, checkResult, sendCell, sendCommit, sendCheck, onFinish } = usePlayChannel(
    playerId,
    started,
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
  const resetOpponents = useOpponentsStore((state) => state.reset);

  useEffect(() => {
    resetOpponents();
    return () => resetOpponents();
  }, [resetOpponents]);

  useEffect(() => {
    if (!started || introDone || !snapshot?.startedAt) {
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
  }, [started, introDone, snapshot?.startedAt, snapshot?.lobbyId]);

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
      if (event.playerId === playerId) {
        // Winning *now* earns the celebration; arriving already-finished does not.
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
  }, [onFinish, playerId, router, snapshot, t, play]);

  const progress = game && answers ? countProgress(game.board, game.op, answers) : null;
  const revealed = game?.check === "input" || checkResult !== null;

  const goToResult = useCallback(() => {
    if (navigated.current || !snapshot) {
      return;
    }
    navigated.current = true;
    router.replace(`/mp/result/${snapshot.lobbyId}/${playerId}` as Route);
  }, [snapshot, router, playerId]);

  useEffect(() => {
    if (game?.finishedAt != null && !winPending) {
      goToResult();
    }
  }, [game?.finishedAt, winPending, goToResult]);

  useEffect(() => {
    if (checkResult && !checkResult.solved && progress?.solved) {
      sendCheck();
    }
  }, [checkResult, progress?.solved, sendCheck]);

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

  function handleCheck() {
    sendCheck();
  }

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

  if (!started || !game || !answers) {
    const players = snapshot?.players ?? [];
    return (
      <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-12">
        <div className="hidden w-full items-center justify-end gap-2 md:flex">
          <LanguageSwitch />
          <SoundToggle />
        </div>

        <header className="text-center">
          <h1 className="text-3xl font-bold md:text-4xl">
            {started ? t("mp.gameStarting") : t("mp.waitingForHost")}
          </h1>
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
                  <span className="font-medium">
                    {player.name}
                    {player.id === playerId ? (
                      <span className="ml-2 badge badge-ghost badge-sm">{t("mp.you")}</span>
                    ) : null}
                  </span>
                  {player.isHost ? (
                    <span className="badge badge-primary gap-1">
                      <Crown className="size-3" />
                      {t("mp.host")}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
            <span className="loading loading-dots loading-lg mx-auto" />
          </div>
        </div>
      </main>
    );
  }

  const activeLeft = activeCell ? (game.board.left[activeCell.row] ?? null) : null;
  const activeTop = activeCell ? (game.board.top[activeCell.col] ?? null) : null;
  const startedAtLocal = game.startedAt === null ? null : game.startedAt + game.clockOffset;

  return (
    <main className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t(`op.${game.op}`)}</h1>
          <p className="text-sm text-base-content/60">
            {t(game.check === "input" ? "intro.instantCheck" : "intro.checkAtEnd")}
          </p>
        </div>
        <div className="hidden items-center gap-2 md:flex">
          <LanguageSwitch />
          <SoundToggle />
        </div>
      </header>

      <div className="flex items-start justify-center gap-6">
        <OpponentsPane selfId={playerId} startedAt={startedAtLocal} />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
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
                onClick={handleCheck}
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

        <Leaderboard selfId={playerId} check={game.check} />
      </div>

      <AnimatePresence>
        {showIntro && snapshot ? (
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
