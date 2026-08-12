"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import type { CheckMode } from "@100masu/game";
import { useOpponentsStore } from "../store/opponents";
import Avatar from "./avatar";

export default function Leaderboard({ selfId, check }: { selfId: string; check: CheckMode }) {
  const { t } = useTranslation();
  const players = useOpponentsStore((state) => state.players);
  const rankByCorrect = check === "input";

  const ranked = Object.values(players).sort((a, b) => {
    if (a.finishedAt !== null || b.finishedAt !== null) {
      if (a.finishedAt === null) return 1;
      if (b.finishedAt === null) return -1;
      return a.finishedAt - b.finishedAt;
    }
    return rankByCorrect ? b.correct - a.correct : b.filled - a.filled;
  });

  if (ranked.length === 0) {
    return null;
  }

  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-3 md:flex">
      <h2 className="text-sm font-semibold text-base-content/70">{t("mp.leaderboard")}</h2>
      <ol className="flex flex-col gap-2">
        {ranked.map((player, index) => (
          <li
            key={player.playerId}
            className={`flex items-center gap-2 rounded-box px-3 py-2 ${
              player.playerId === selfId ? "bg-primary/20" : "bg-base-200"
            }`}
          >
            <span className="w-5 text-sm font-bold tabular-nums opacity-60">{index + 1}</span>
            <Avatar
              name={player.name}
              discordUserId={player.discordUserId}
              avatar={player.avatar}
            />
            <span className="flex-1 truncate text-sm font-medium">{player.name}</span>
            {player.finishedAt !== null ? (
              <Check className="size-4 text-success" />
            ) : (
              <span className="font-mono text-sm tabular-nums">
                {rankByCorrect ? player.correct : player.filled}
              </span>
            )}
          </li>
        ))}
      </ol>
    </aside>
  );
}
