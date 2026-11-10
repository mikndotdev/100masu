"use client";

import { CELLS, type Board as BoardString, type Color } from "@100masu/reversi";
import type { StateMessage } from "@100masu/reversi/protocol";

const RIPPLE_MS = 70;

type BoardProps = {
  board: BoardString;
  lastMove: StateMessage["lastMove"];
  hints: ReadonlySet<number>;
  hintColor: Color | null;
  onPlay: (idx: number) => void;
};

function cellLabel(idx: number) {
  return `${"ABCDEFGH"[idx % 8]}${Math.floor(idx / 8) + 1}`;
}

export default function Board({ board, lastMove, hints, hintColor, onPlay }: BoardProps) {
  const delays = new Map<number, number>();
  for (const line of lastMove?.flips ?? []) {
    line.forEach((idx, step) => delays.set(idx, (step + 1) * RIPPLE_MS));
  }

  return (
    <div className="grid aspect-square w-full max-w-[min(92vw,560px,calc(100dvh-19rem))] grid-cols-8 gap-[2px] rounded-box bg-emerald-950 p-[2px] shadow-2xl">
      {Array.from({ length: CELLS }, (_, idx) => {
        const cell = board[idx];
        const playable = hints.has(idx);
        return (
          <button
            key={idx}
            type="button"
            aria-label={cellLabel(idx)}
            disabled={!playable}
            onClick={() => onPlay(idx)}
            className={`relative flex items-center justify-center bg-emerald-600 ${
              playable ? "cursor-pointer hover:bg-emerald-500" : "cursor-default"
            }`}
          >
            {cell === "B" || cell === "W" ? (
              <div
                data-color={cell}
                className={`disc relative size-[82%] ${lastMove?.idx === idx ? "disc-placed" : ""}`}
                style={{ transitionDelay: `${delays.get(idx) ?? 0}ms` }}
              >
                <span className="disc-face absolute inset-0 rounded-full bg-neutral-900 shadow-[inset_0_-3px_0_rgba(255,255,255,0.15)]" />
                <span className="disc-face disc-face-white absolute inset-0 rounded-full bg-neutral-100 shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]" />
              </div>
            ) : null}
            {playable && hintColor ? (
              <span
                className={`size-[26%] rounded-full opacity-40 ${
                  hintColor === "B" ? "bg-neutral-900" : "bg-neutral-100"
                }`}
              />
            ) : null}
            {lastMove?.idx === idx ? (
              <span className="pointer-events-none absolute size-[16%] rounded-full bg-error" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
