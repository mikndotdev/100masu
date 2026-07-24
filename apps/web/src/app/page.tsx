"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useQueryStates } from "nuqs";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@/components/languageSwitch";
import RecentGames from "@/components/recentGames";
import { emptyAnswers, generateBoard, GRID_SIZE, OPERATION_SYMBOL, OPERATIONS } from "@/lib/game";
import { type PuzzleState, serializePuzzle, settingsParsers } from "@/lib/gameParams";

const ORDER_VALUES = ["seq", "rand"] as const;
const CHECK_VALUES = ["input", "end"] as const;

function HomePageContent() {
  const router = useRouter();
  const { t } = useTranslation();
  const [settings, setSettings] = useQueryStates(settingsParsers);

  function setStart(next: number) {
    setSettings({ start: next, end: next + GRID_SIZE - 1 });
  }

  function setEnd(next: number) {
    setSettings({ start: next - GRID_SIZE + 1, end: next });
  }

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

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center gap-8 px-4 py-12">
      <div className="flex w-full justify-end">
        <LanguageSwitch />
      </div>

      <header className="text-center">
        <h1 className="text-4xl font-bold sm:text-5xl">{t("app.title")}</h1>
        <p className="mt-2 text-base-content/70">{t("app.tagline")}</p>
      </header>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body gap-6">
          <div>
            <span className="mb-2 block font-semibold">{t("setup.operation")}</span>
            <div className="join flex flex-wrap">
              {OPERATIONS.map((operation) => (
                <button
                  key={operation}
                  type="button"
                  aria-pressed={settings.op === operation}
                  onClick={() => setSettings({ op: operation })}
                  className={`btn join-item ${settings.op === operation ? "btn-primary" : "btn-ghost"}`}
                >
                  <span className="text-xl">{OPERATION_SYMBOL[operation]}</span>
                  <span className="hidden sm:inline">{t(`op.${operation}`)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="form-control">
              <span className="mb-1 font-semibold">{t("setup.startNumber")}</span>
              <input
                type="number"
                className="input input-bordered w-full"
                value={settings.start}
                onChange={(event) => setStart(Number.parseInt(event.target.value, 10) || 0)}
              />
            </label>
            <label className="form-control">
              <span className="mb-1 font-semibold">{t("setup.endNumber")}</span>
              <input
                type="number"
                className="input input-bordered w-full"
                value={settings.end}
                onChange={(event) => setEnd(Number.parseInt(event.target.value, 10) || 0)}
              />
            </label>
          </div>
          <p className="-mt-2 text-sm text-base-content/60">
            {t("setup.rangeHint", { start: settings.start, end: settings.end })}
          </p>

          <div>
            <span className="mb-2 block font-semibold">{t("setup.numberOrder")}</span>
            <div className="join">
              {ORDER_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.order === value}
                  onClick={() => setSettings({ order: value })}
                  className={`btn join-item ${settings.order === value ? "btn-primary" : "btn-ghost"}`}
                >
                  {t(`order.${value}`)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block font-semibold">{t("setup.answerChecking")}</span>
            <div className="join">
              {CHECK_VALUES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.check === value}
                  onClick={() => setSettings({ check: value })}
                  className={`btn join-item ${settings.check === value ? "btn-primary" : "btn-ghost"}`}
                >
                  {t(value === "input" ? "setup.checkInput" : "setup.checkEnd")}
                </button>
              ))}
            </div>
          </div>

          <div className="card-actions mt-2 grid grid-cols-2 gap-4">
            <button type="button" className="btn btn-primary btn-lg" onClick={() => launch("play")}>
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
