"use client";

import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence } from "motion/react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import CurrentCalculation from "@/components/currentCalculation";
import GameBoard from "@/components/gameBoard";
import LanguageSwitch from "@/components/languageSwitch";
import { useSoundEffect } from "@/components/soundProvider";
import Stopwatch from "@/components/stopwatch";
import TitleScreen from "@/components/titleScreen";
import WinScreen from "@/components/winScreen";
import { CELL_COUNT, checkAnswer, emptyAnswers, GRID_SIZE, isAnswerable } from "@/lib/game";
import { puzzleParser } from "@/lib/gameParams";
import { gameSignature, upsertSavedGame } from "@/lib/savedGames";

type ActiveCell = { row: number; col: number };

function PlayPageContent() {
  const { t } = useTranslation();
  const [puzzle, setPuzzle] = useQueryState(
    "d",
    puzzleParser.withOptions({ history: "replace", throttleMs: 200 }),
  );
  const { play, muted, toggleMuted } = useSoundEffect();
  const router = useRouter();

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [winToken, setWinToken] = useState<string | null>(null);
  const celebrated = useRef(false);
  const wonThisSession = useRef(false);

  const started = puzzle !== null && puzzle.startedAt !== null;

  const handleStart = useCallback(() => {
    setPuzzle((prev) =>
      prev && prev.startedAt === null ? { ...prev, startedAt: Date.now() } : prev,
    );
  }, [setPuzzle]);

  const handleWinComplete = useCallback(() => {
    if (winToken) {
      router.replace(`/result?d=${winToken}` as Route);
    }
  }, [winToken, router]);

  let answerableCount = 0;
  let filledCount = 0;
  let correctCount = 0;
  if (puzzle) {
    for (let index = 0; index < CELL_COUNT; index++) {
      const row = Math.floor(index / GRID_SIZE);
      const col = index % GRID_SIZE;
      const leftValue = puzzle.left[row];
      const topValue = puzzle.top[col];
      if (leftValue === undefined || topValue === undefined) {
        continue;
      }
      if (!isAnswerable(puzzle.op, leftValue, topValue)) {
        continue;
      }
      answerableCount += 1;
      const value = puzzle.answers[index] ?? "";
      if (value.trim() !== "") {
        filledCount += 1;
      }
      if (checkAnswer(puzzle.op, leftValue, topValue, value)) {
        correctCount += 1;
      }
    }
  }

  const revealed = puzzle?.check === "input" || showResults;
  const solved = answerableCount > 0 && correctCount === answerableCount && revealed;

  useEffect(() => {
    if (!solved) {
      celebrated.current = false;
      return;
    }
    if (celebrated.current) {
      return;
    }
    celebrated.current = true;
    if (puzzle !== null && puzzle.startedAt !== null && puzzle.finishedAt === null) {
      wonThisSession.current = true;
      const finished = { ...puzzle, finishedAt: Date.now() };
      setPuzzle(finished);
      setWinToken(puzzleParser.serialize(finished));
    }
  }, [solved, puzzle, setPuzzle]);

  useEffect(() => {
    if (!puzzle || filledCount === 0) {
      return;
    }
    upsertSavedGame({
      id: gameSignature(puzzle),
      d: puzzleParser.serialize(puzzle),
      updatedAt: Date.now(),
    });
  }, [puzzle, filledCount]);

  useEffect(() => {
    if (puzzle && puzzle.finishedAt !== null && !wonThisSession.current) {
      router.replace(`/result?d=${puzzleParser.serialize(puzzle)}` as Route);
    }
  }, [puzzle, router]);

  function handleCellChange(index: number, value: string) {
    const previous = puzzle?.answers[index] ?? "";
    setPuzzle((prev) => {
      if (!prev) {
        return prev;
      }
      const answers = [...prev.answers];
      answers[index] = value;
      return { ...prev, answers };
    });
    if (value.length > previous.length) {
      play("write");
    }
  }

  function handleCellBlur(index: number) {
    if (!puzzle || puzzle.check !== "input") {
      return;
    }
    const value = puzzle.answers[index] ?? "";
    if (value.trim() === "") {
      return;
    }
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const leftValue = puzzle.left[row];
    const topValue = puzzle.top[col];
    if (leftValue === undefined || topValue === undefined) {
      return;
    }
    if (!isAnswerable(puzzle.op, leftValue, topValue)) {
      return;
    }
    play(checkAnswer(puzzle.op, leftValue, topValue, value) ? "correct" : "incorrect");
  }

  function handleCheck() {
    if (filledCount < answerableCount) {
      return;
    }
    setShowResults(true);
    if (correctCount < answerableCount) {
      toast.error(t("play.correct", { correct: correctCount, answerable: answerableCount }));
      play("incorrect");
    }
  }

  function handleReset() {
    setPuzzle((prev) =>
      prev ? { ...prev, answers: emptyAnswers(), startedAt: Date.now(), finishedAt: null } : prev,
    );
    setShowResults(false);
    celebrated.current = false;
  }

  if (!puzzle) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold">{t("play.noPuzzleTitle")}</h1>
        <p className="text-base-content/70">{t("play.noPuzzleBody")}</p>
        <Link href="/" className="btn btn-primary">
          {t("play.goToSetup")}
        </Link>
      </main>
    );
  }

  if (puzzle.finishedAt !== null && !wonThisSession.current) {
    return null;
  }

  const board = { top: puzzle.top, left: puzzle.left };
  const activeLeft = activeCell ? (puzzle.left[activeCell.row] ?? null) : null;
  const activeTop = activeCell ? (puzzle.top[activeCell.col] ?? null) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t(`op.${puzzle.op}`)}</h1>
          <p className="text-sm text-base-content/60">
            {t("play.numbers", { start: puzzle.start, end: puzzle.end })} ·{" "}
            {t(`order.${puzzle.order}`)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LanguageSwitch />
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? t("play.unmute") : t("play.mute")}
            className="btn btn-ghost btn-square"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <Link href="/" className="btn btn-outline">
            {t("play.newPuzzle")}
          </Link>
        </div>
      </header>

      <CurrentCalculation op={puzzle.op} left={activeLeft} top={activeTop} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Stopwatch startedAt={puzzle.startedAt} finishedAt={puzzle.finishedAt} />
          <span className="text-sm font-medium">
            {revealed
              ? t("play.correct", { correct: correctCount, answerable: answerableCount })
              : t("play.filled", { filled: filledCount, answerable: answerableCount })}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {puzzle.check === "end" ? (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleCheck}
              disabled={filledCount < answerableCount}
            >
              {t("play.checkAnswers")}
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleReset}>
            <RotateCcw className="size-4" />
            {t("play.reset")}
          </button>
        </div>
      </div>

      <GameBoard
        board={board}
        op={puzzle.op}
        answers={puzzle.answers}
        check={puzzle.check}
        showResults={showResults}
        onCellChange={handleCellChange}
        onCellBlur={handleCellBlur}
        onActiveCell={(row, col) => setActiveCell({ row, col })}
      />

      <AnimatePresence>
        {started ? null : (
          <TitleScreen
            op={puzzle.op}
            start={puzzle.start}
            end={puzzle.end}
            order={puzzle.order}
            check={puzzle.check}
            onComplete={handleStart}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {winToken ? <WinScreen onComplete={handleWinComplete} /> : null}
      </AnimatePresence>
    </main>
  );
}

export default function PlayPage() {
  return (
    <Suspense>
      <PlayPageContent />
    </Suspense>
  );
}
