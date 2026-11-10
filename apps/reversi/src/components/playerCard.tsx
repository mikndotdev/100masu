"use client";

import { remaining, type Color } from "@100masu/reversi";
import type { StateMessage } from "@100masu/reversi/protocol";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type PlayerCardProps = {
  color: Color;
  seat: StateMessage["seats"]["B"];
  discs: number;
  isYou: boolean;
  active: boolean;
  clock: StateMessage["clock"];
  turn: Color | null;
  clockOffset: number;
};

function formatClock(ms: number) {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.ceil(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (clamped < 10_000) {
    return `${(clamped / 1000).toFixed(1)}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function useServerNow(clockOffset: number, ticking: boolean) {
  const [now, setNow] = useState(() => Date.now() - clockOffset);
  useEffect(() => {
    setNow(Date.now() - clockOffset);
    if (!ticking) {
      return;
    }
    const timer = setInterval(() => setNow(Date.now() - clockOffset), 100);
    return () => clearInterval(timer);
  }, [clockOffset, ticking]);
  return now;
}

export default function PlayerCard({
  color,
  seat,
  discs,
  isYou,
  active,
  clock,
  turn,
  clockOffset,
}: PlayerCardProps) {
  const { t } = useTranslation();
  const now = useServerNow(clockOffset, active && clock !== null);
  const left = clock ? remaining(clock, color, turn, now) : null;

  return (
    <div
      className={`flex w-full items-center gap-3 rounded-box bg-base-200 px-4 py-3 shadow transition-shadow ${
        active ? "ring-2 ring-primary" : ""
      }`}
    >
      <span
        className={`size-8 shrink-0 rounded-full shadow-inner ${
          color === "B" ? "bg-neutral-900 ring-1 ring-neutral-600" : "bg-neutral-100"
        }`}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <span className="truncate font-bold">{seat?.name ?? "…"}</span>
          {isYou ? <span className="badge badge-sm badge-primary">{t("reversi.you")}</span> : null}
          {seat && !seat.online ? (
            <span className="badge badge-sm badge-ghost">{t("reversi.offline")}</span>
          ) : null}
        </div>
        <span className="text-sm text-base-content/70">{discs}</span>
      </div>
      {left !== null ? (
        <span
          className={`rounded-field px-2 py-1 font-mono text-xl tabular-nums ${
            active ? "bg-primary text-primary-content" : "bg-base-300"
          } ${left < 10_000 ? "text-error" : ""}`}
        >
          {formatClock(left)}
        </span>
      ) : null}
    </div>
  );
}
