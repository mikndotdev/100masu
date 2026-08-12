"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import RecentGames from "@/components/recentGames";
import SettingsForm from "@100masu/ui/components/settingsForm";
import SoundToggle from "@100masu/ui/components/soundToggle";
import { emptyAnswers, generateBoard } from "@/lib/game";
import {
  type PuzzleState,
  serializePuzzle,
  serializeSettings,
  settingsParsers,
} from "@/lib/gameParams";

function HomePageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const [settings, setSettings] = useQueryStates(settingsParsers);

  function launch(mode: "play" | "print") {
    const board = generateBoard(settings);
    const puzzle: PuzzleState = {
      ...settings,
      top: board.top,
      left: board.left,
      answers: emptyAnswers(),
      startedAt: null,
      finishedAt: null,
    };
    const query = serializePuzzle({ d: puzzle });
    router.push(`/${mode}${query}` as Route);
  }

  function goToMultiplayer() {
    router.push(serializeSettings("/mp", settings) as Route);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col items-center gap-8 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-bold md:text-5xl">{t("app.title")}</h1>
        <p className="mt-2 text-base-content/70">{t("app.tagline")}</p>
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <SettingsForm settings={settings} onChange={(next) => void setSettings(next)} />

          <div className="card-actions mt-2 flex-col gap-4">
            <div className="grid w-full grid-cols-2 gap-4">
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => launch("play")}
              >
                {t("setup.play")}
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => launch("print")}
              >
                {t("setup.print")}
              </button>
            </div>
            <button
              type="button"
              className="btn btn-accent btn-lg w-full"
              onClick={goToMultiplayer}
            >
              {t("setup.multiplayer")}
            </button>
          </div>
        </div>
      </div>

      <RecentGames />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense>
      <HomePageContent />
    </Suspense>
  );
}
