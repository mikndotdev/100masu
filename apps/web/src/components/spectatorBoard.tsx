"use client";

import { Fragment } from "react";

import {
  checkAnswer,
  GRID_SIZE,
  isAnswerable,
  OPERATION_SYMBOL,
  type Board,
  type Operation,
} from "@/lib/game";

const headerClass =
  "flex aspect-square items-center justify-center rounded-md bg-base-300 text-xs font-bold tabular-nums md:text-base";

export default function SpectatorBoard({
  board,
  op,
  answers,
  reveal,
}: {
  board: Board;
  op: Operation;
  answers: string[];
  reveal: boolean;
}) {
  return (
    <div className="grid w-full grid-cols-11 gap-1">
      <div className="flex aspect-square items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-content md:text-lg">
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
            const tone =
              !answerable || !filled || !reveal
                ? "bg-base-100"
                : correct
                  ? "bg-success/25"
                  : "bg-error/25";

            return (
              <div
                key={`cell-${row}-${col}`}
                className={`flex aspect-square items-center justify-center rounded-md border border-base-300 text-sm font-bold tabular-nums [font-family:var(--font-gloria)] md:text-lg ${tone}`}
              >
                {value}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
