"use client";

import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence } from "motion/react";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import CurrentCalculation from "@/components/currentCalculation";
import GameBoard from "@/components/gameBoard";
import { useSoundEffect } from "@/components/soundProvider";
import Stopwatch from "@/components/stopwatch";
import TitleScreen from "@/components/titleScreen";
import {
  CELL_COUNT,
  checkAnswer,
  emptyAnswers,
  GRID_SIZE,
  isAnswerable,
  OPERATION_LABEL,
} from "@/lib/game";
import { puzzleParser } from "@/lib/gameParams";
import { gameSignature, upsertSavedGame } from "@/lib/savedGames";

type ActiveCell = { row: number; col: number };

function PlayPageContent() {
  const [puzzle, setPuzzle] = useQueryState(
    "d",
    puzzleParser.withOptions({ history: "replace", throttleMs: 200 }),
  );
  const { play, muted, toggleMuted } = useSoundEffect();

  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [showResults, setShowResults] = useState(false);
  const celebrated = useRef(false);

  const started = puzzle !== null && puzzle.startedAt !== null;

  const handleStart = useCallback(() => {
    setPuzzle((prev) =>
      prev && prev.startedAt === null ? { ...prev, startedAt: Date.now() } : prev,
    );
  }, [setPuzzle]);

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
    const freshlyFinished =
      puzzle !== null && puzzle.startedAt !== null && puzzle.finishedAt === null;
    if (freshlyFinished) {
      toast.success("Finished — every answer is correct! 🎉");
      play("correct");
      setPuzzle((prev) =>
        prev && prev.finishedAt === null ? { ...prev, finishedAt: Date.now() } : prev,
      );
    }
  }, [solved, play, puzzle, setPuzzle]);

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
    setShowResults(true);
    const message = `${correctCount} / ${answerableCount} correct`;
    if (correctCount === answerableCount) {
      toast.success(message);
      play("correct");
    } else {
      toast.error(message);
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
        <h1 className="text-2xl font-bold">No puzzle to play</h1>
        <p className="text-base-content/70">
          This link has no valid puzzle data. Set up a grid first, then hit Play.
        </p>
        <Link href="/" className="btn btn-primary">
          Go to setup
        </Link>
      </main>
    );
  }

  const board = { top: puzzle.top, left: puzzle.left };
  const activeLeft = activeCell ? (puzzle.left[activeCell.row] ?? null) : null;
  const activeTop = activeCell ? (puzzle.top[activeCell.col] ?? null) : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{OPERATION_LABEL[puzzle.op]}</h1>
          <p className="text-sm text-base-content/60">
            Numbers {puzzle.start}–{puzzle.end} ·{" "}
            {puzzle.order === "rand" ? "Random" : "Sequential"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMuted}
            aria-label={muted ? "Unmute" : "Mute"}
            className="btn btn-ghost btn-square"
          >
            {muted ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
          </button>
          <Link href="/" className="btn btn-outline">
            New puzzle
          </Link>
        </div>
      </header>

      <CurrentCalculation op={puzzle.op} left={activeLeft} top={activeTop} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Stopwatch startedAt={puzzle.startedAt} finishedAt={puzzle.finishedAt} />
          <span className="text-sm font-medium">
            {revealed
              ? `${correctCount} / ${answerableCount} correct`
              : `${filledCount} / ${answerableCount} filled`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {puzzle.check === "end" ? (
            <button type="button" className="btn btn-primary btn-sm" onClick={handleCheck}>
              Check answers
            </button>
          ) : null}
          <button type="button" className="btn btn-ghost btn-sm" onClick={handleReset}>
            <RotateCcw className="size-4" />
            Reset
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
