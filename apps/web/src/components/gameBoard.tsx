"use client";

import { Fragment, useRef, useState } from "react";

import {
  checkAnswer,
  GRID_SIZE,
  isAnswerable,
  OPERATION_SYMBOL,
  type Board,
  type CheckMode,
  type Operation,
} from "@/lib/game";

type GameBoardProps = {
  board: Board;
  op: Operation;
  answers: string[];
  check: CheckMode;
  showResults: boolean;
  onCellChange: (index: number, value: string) => void;
  onCellBlur: (index: number) => void;
  onActiveCell: (row: number, col: number) => void;
};

function inputStateClass(answerable: boolean, shouldShow: boolean, correct: boolean): string {
  if (!answerable || !shouldShow) {
    return "";
  }
  return correct ? "input-success" : "input-error";
}

function sanitizeNumber(raw: string): string {
  const cleaned = raw.replace(/[^\d.-]/g, "");
  const negative = cleaned.startsWith("-");
  const digitsAndDots = cleaned.replace(/-/g, "");
  const dotIndex = digitsAndDots.indexOf(".");
  const normalized =
    dotIndex === -1
      ? digitsAndDots
      : digitsAndDots.slice(0, dotIndex + 1) + digitsAndDots.slice(dotIndex + 1).replace(/\./g, "");
  return (negative ? "-" : "") + normalized;
}

const headerClass =
  "flex aspect-square items-center justify-center rounded-md bg-base-300 text-base font-bold tabular-nums sm:text-xl";

export default function GameBoard({
  board,
  op,
  answers,
  check,
  showResults,
  onCellChange,
  onCellBlur,
  onActiveCell,
}: GameBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [committed, setCommitted] = useState<ReadonlySet<number>>(() => {
    const initial = new Set<number>();
    answers.forEach((value, index) => {
      if (value.trim() !== "") {
        initial.add(index);
      }
    });
    return initial;
  });
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  function handleFocus(index: number, row: number, col: number) {
    setActiveIndex(index);
    onActiveCell(row, col);
  }

  function handleBlur(index: number) {
    setActiveIndex(null);
    setCommitted((prev) => {
      if (prev.has(index)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    onCellBlur(index);
  }

  function focusCell(row: number, col: number) {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return;
    }
    const target = containerRef.current?.querySelector<HTMLInputElement>(
      `[data-cell="${row}-${col}"]`,
    );
    target?.focus();
    target?.select();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    if (event.key === "Enter" || event.key === "ArrowDown") {
      event.preventDefault();
      focusCell(row + 1, col);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      focusCell(row - 1, col);
    }
  }

  return (
    <div ref={containerRef} className="grid w-full grid-cols-11 gap-1">
      <div className="flex aspect-square items-center justify-center rounded-md bg-primary text-lg font-bold text-primary-content sm:text-2xl">
        {OPERATION_SYMBOL[op]}
      </div>
      {board.top.map((value, col) => (
        <div key={`top-${col}`} className={headerClass}>
          {value}
        </div>
      ))}
      {board.left.map((rowValue, row) => (
        <Fragment key={`row-${row}`}>
          <div className={headerClass}>{rowValue}</div>
          {board.top.map((colValue, col) => {
            const index = row * GRID_SIZE + col;
            const value = answers[index] ?? "";
            const answerable = isAnswerable(op, rowValue, colValue);
            const filled = value.trim() !== "";
            const correct = checkAnswer(op, rowValue, colValue, value);
            const committedShow = filled && committed.has(index) && activeIndex !== index;
            const shouldShow = check === "input" ? committedShow : showResults;

            return (
              <div key={`cell-${row}-${col}`} className="aspect-square">
                <input
                  data-cell={`${row}-${col}`}
                  type="number"
                  autoComplete="off"
                  disabled={!answerable}
                  value={value}
                  onChange={(event) => onCellChange(index, sanitizeNumber(event.target.value))}
                  onBlur={() => handleBlur(index)}
                  onFocus={() => handleFocus(index, row, col)}
                  onKeyDown={(event) => handleKeyDown(event, row, col)}
                  className={`input input-bordered size-full min-w-0 rounded-md p-0 text-center text-3xl font-bold [appearance:textfield] [font-family:var(--font-gloria)] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none ${inputStateClass(
                    answerable,
                    shouldShow,
                    correct,
                  )}`}
                />
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
