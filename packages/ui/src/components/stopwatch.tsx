"use client";

import { Timer } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

type StopwatchProps = {
  startedAt: number | null;
  finishedAt: number | null;
};

export default function Stopwatch({ startedAt, finishedAt }: StopwatchProps) {
  const [now, setNow] = useState(0);
  const live = startedAt !== null && finishedAt === null;

  useEffect(() => {
    setNow(Date.now());
    if (!live) {
      return;
    }
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [live]);

  const elapsed = startedAt === null ? 0 : Math.max(0, (finishedAt ?? now) - startedAt);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2 rounded-box bg-base-200 px-3 py-1.5 font-mono text-lg font-semibold tabular-nums"
    >
      <Timer className="size-4 opacity-70" />
      <span>{formatTime(elapsed)}</span>
    </motion.div>
  );
}
