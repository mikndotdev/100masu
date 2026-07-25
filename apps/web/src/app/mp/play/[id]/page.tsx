"use client";

import { Crown, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@/components/languageSwitch";
import SoundToggle from "@/components/soundToggle";
import { useLobbyChannel } from "@/hooks/useLobbyChannel";
import { MAX_PLAYERS } from "@/lib/lobby";

export default function MultiplayerPlayPage() {
  const { t } = useTranslation();
  const params = useParams<{ id: string }>();
  const playerId = params.id;

  const { snapshot, connected } = useLobbyChannel({ playerId });
  const players = snapshot?.players ?? [];
  const started = snapshot?.status === "IN_PROGRESS";

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <header className="text-center">
        <h1 className="text-3xl font-bold md:text-4xl">
          {started ? t("mp.gameStarting") : t("mp.waitingForHost")}
        </h1>
        {!connected ? <p className="mt-2 text-base-content/60">{t("mp.connecting")}</p> : null}
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Users className="size-5" />
              {t("mp.players")}
            </span>
            <span className="text-sm text-base-content/60">
              {t("mp.playerCount", { count: players.length, max: MAX_PLAYERS })}
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {players.map((player) => (
              <li
                key={player.id}
                className="flex items-center justify-between rounded-box bg-base-100 px-4 py-3"
              >
                <span className="font-medium">
                  {player.name}
                  {player.id === playerId ? (
                    <span className="ml-2 badge badge-ghost badge-sm">{t("mp.you")}</span>
                  ) : null}
                </span>
                {player.isHost ? (
                  <span className="badge badge-primary gap-1">
                    <Crown className="size-3" />
                    {t("mp.host")}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>

          {started ? null : <span className="loading loading-dots loading-lg mx-auto" />}
        </div>
      </div>
    </main>
  );
}
