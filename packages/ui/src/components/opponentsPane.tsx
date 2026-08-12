"use client";

import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatDuration, GRID_SIZE } from "@100masu/game";
import { useOpponentsStore, type PlayerProgress } from "../store/opponents";
import Avatar from "./avatar";

function cellClass(state: string): string {
  if (state === "2") {
    return "bg-success";
  }
  if (state === "3") {
    return "bg-error";
  }
  if (state === "1") {
    return "bg-primary/70";
  }
  return "bg-base-300";
}

function OpponentCard({ player, startedAt }: { player: PlayerProgress; startedAt: number | null }) {
  const { t } = useTranslation();
  const finished = player.finishedAt !== null;
  const elapsed =
    finished && startedAt !== null ? formatDuration((player.finishedAt ?? 0) - startedAt) : null;

  return (
    <div className="card card-sm bg-base-200">
      <div className="card-body gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <Avatar
              name={player.name}
              discordUserId={player.discordUserId}
              avatar={player.avatar}
            />
            <span className="truncate text-sm font-semibold">{player.name}</span>
          </span>
          {player.placement !== null ? (
            <span className="badge badge-primary badge-sm">#{player.placement}</span>
          ) : null}
        </div>

        {finished ? (
          <div className="flex flex-col items-center gap-1 py-4">
            <Check className="size-10 text-success" />
            {elapsed ? <span className="font-mono text-sm tabular-nums">{elapsed}</span> : null}
          </div>
        ) : (
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, minmax(0, 1fr))` }}
            aria-label={t("mp.opponents")}
          >
            {Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, index) => (
              <div
                key={index}
                className={`aspect-square rounded-[1px] ${cellClass(player.cells[index] ?? "0")}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OpponentsPane({
  selfId,
  startedAt,
}: {
  selfId: string;
  startedAt: number | null;
}) {
  const { t } = useTranslation();
  const players = useOpponentsStore((state) => state.players);
  const opponents = Object.values(players).filter((player) => player.playerId !== selfId);

  if (opponents.length === 0) {
    return null;
  }

  return (
    <aside className="hidden w-48 shrink-0 flex-col gap-3 md:flex">
      <h2 className="text-sm font-semibold text-base-content/70">{t("mp.opponents")}</h2>
      {opponents.map((player) => (
        <OpponentCard key={player.playerId} player={player} startedAt={startedAt} />
      ))}
    </aside>
  );
}
