"use client";

import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import SpectatorBoard from "@/components/spectatorBoard";
import type { Board, CheckMode, Operation } from "@/lib/game";
import type { SpectatePlayer } from "@/lib/lobby";

type SpectateCarouselProps = {
  board: Board;
  op: Operation;
  check: CheckMode;
  players: SpectatePlayer[];
};

export default function SpectateCarousel({ board, op, check, players }: SpectateCarouselProps) {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  if (players.length === 0) {
    return (
      <p className="rounded-box bg-base-200 px-6 py-8 text-center text-base-content/60">
        {t("mp.spectateEmpty")}
      </p>
    );
  }

  const safeIndex = Math.min(index, players.length - 1);
  const player = players[safeIndex];
  if (!player) {
    return null;
  }

  function move(step: number) {
    setDirection(step);
    setIndex((prev) => (prev + step + players.length) % players.length);
  }

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          aria-label={t("mp.previous")}
          className="btn btn-circle btn-ghost btn-sm"
          onClick={() => move(-1)}
          disabled={players.length < 2}
        >
          <ChevronLeft className="size-5" />
        </button>

        <div className="flex flex-col items-center">
          <span className="font-semibold">{player.name}</span>
          <span className="text-xs text-base-content/60">
            {player.finishedAt !== null ? (
              <span className="inline-flex items-center gap-1">
                <Check className="size-3 text-success" />
                {t("mp.finished")}
              </span>
            ) : (
              t("mp.stillPlaying")
            )}
          </span>
        </div>

        <button
          type="button"
          aria-label={t("mp.next")}
          className="btn btn-circle btn-ghost btn-sm"
          onClick={() => move(1)}
          disabled={players.length < 2}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={player.playerId}
            initial={{ x: direction > 0 ? 60 : -60, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: direction > 0 ? -60 : 60, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <SpectatorBoard
              board={board}
              op={op}
              answers={player.answers}
              reveal={check === "input" || player.finishedAt !== null}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2">
        {players.map((entry, dot) => (
          <button
            key={entry.playerId}
            type="button"
            aria-label={entry.name}
            aria-current={dot === safeIndex}
            onClick={() => {
              setDirection(dot > safeIndex ? 1 : -1);
              setIndex(dot);
            }}
            className={`size-2 rounded-full ${dot === safeIndex ? "bg-primary" : "bg-base-300"}`}
          />
        ))}
      </div>
    </div>
  );
}
