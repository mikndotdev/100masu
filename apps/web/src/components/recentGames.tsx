"use client";

import type { TFunction } from "i18next";
import { Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { CELL_COUNT, GRID_SIZE, isAnswerable, OPERATION_SYMBOL } from "@/lib/game";
import { puzzleParser } from "@/lib/gameParams";
import { deleteSavedGame, loadSavedGames, type SavedGame } from "@/lib/savedGames";

function formatRelative(t: TFunction, timestamp: number): string {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) {
    return t("recent.justNow");
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return t("recent.minutesAgo", { value: minutes });
  }
  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return t("recent.hoursAgo", { value: hours });
  }
  const days = Math.round(hours / 24);
  return t("recent.daysAgo", { count: days });
}

export default function RecentGames() {
  const { t } = useTranslation();
  const [games, setGames] = useState<SavedGame[]>([]);

  useEffect(() => {
    setGames(loadSavedGames());
  }, []);

  function handleDelete(id: string) {
    setGames(deleteSavedGame(id));
  }

  if (games.length === 0) {
    return null;
  }

  return (
    <section className="w-full">
      <h2 className="mb-3 text-lg font-semibold">{t("recent.title")}</h2>
      <div className="flex flex-col gap-3">
        {games.map((game) => {
          const puzzle = puzzleParser.parse(game.d);
          if (!puzzle) {
            return null;
          }

          let answerable = 0;
          let filled = 0;
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
            answerable += 1;
            if ((puzzle.answers[index] ?? "").trim() !== "") {
              filled += 1;
            }
          }
          const completed = puzzle.finishedAt !== null;

          return (
            <div key={game.id} className="card card-sm bg-base-200">
              <div className="card-body flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 font-semibold">
                    <span className="text-xl text-primary">{OPERATION_SYMBOL[puzzle.op]}</span>
                    <span>{t(`op.${puzzle.op}`)}</span>
                    <span className="badge badge-outline badge-sm">
                      {puzzle.start}–{puzzle.end}
                    </span>
                    <span className="badge badge-outline badge-sm">
                      {t(`order.${puzzle.order}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-base-content/60">
                    {completed ? (
                      <span className="badge badge-success badge-sm">{t("recent.completed")}</span>
                    ) : (
                      <span>{t("recent.filled", { filled, answerable })}</span>
                    )}
                    <span>·</span>
                    <span>{formatRelative(t, game.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href={`/play?d=${game.d}` as Route} className="btn btn-primary btn-sm">
                    {t("recent.resume")}
                  </Link>
                  <button
                    type="button"
                    aria-label={t("recent.delete")}
                    className="btn btn-square btn-ghost btn-sm"
                    onClick={() => handleDelete(game.id)}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
