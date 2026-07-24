"use client";

import { SiX } from "@icons-pack/react-simple-icons";
import type { Route } from "next";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Suspense, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@/components/languageSwitch";
import { useSoundEffect } from "@/components/soundProvider";
import SoundToggle from "@/components/soundToggle";
import { emptyAnswers, formatDuration, OPERATION_SYMBOL } from "@/lib/game";
import { puzzleParser } from "@/lib/gameParams";

function ResultContent() {
  const { t } = useTranslation();
  const [puzzle] = useQueryState("d", puzzleParser);
  const { play } = useSoundEffect();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [freshToken, setFreshToken] = useState<string | null>(null);

  useEffect(() => {
    if (!puzzle || puzzle.startedAt === null || puzzle.finishedAt === null) {
      return;
    }
    play("applaud");
    let cancelled = false;
    void import("canvas-confetti").then((module) => {
      if (cancelled) {
        return;
      }
      const confetti = module.default;
      confetti({ particleCount: 140, spread: 75, origin: { y: 0.6 } });
      setTimeout(() => {
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.2, y: 0.6 } });
        confetti({ particleCount: 80, spread: 100, origin: { x: 0.8, y: 0.6 } });
      }, 300);
    });
    return () => {
      cancelled = true;
    };
  }, [puzzle, play]);

  useEffect(() => {
    if (!puzzle) {
      return;
    }
    const token = puzzleParser.serialize({
      ...puzzle,
      answers: emptyAnswers(),
      startedAt: null,
      finishedAt: null,
    });
    setFreshToken(token);
    setShareUrl(`${window.location.origin}/play?d=${token}`);
  }, [puzzle]);

  if (!puzzle || puzzle.startedAt === null || puzzle.finishedAt === null) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold">{t("result.noResult")}</h1>
        <Link href="/" className="btn btn-primary">
          {t("play.goToSetup")}
        </Link>
      </main>
    );
  }

  const time = formatDuration(puzzle.finishedAt - puzzle.startedAt);
  const shareText = t("result.shareText", { operation: t(`op.${puzzle.op}`), time });
  const twitterHref = shareUrl
    ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`
    : null;
  const playAgainHref = (freshToken ? `/play?d=${freshToken}` : "/") as Route;

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 px-4 py-12">
      <div className="hidden w-full items-center justify-end gap-2 md:flex">
        <LanguageSwitch />
        <SoundToggle />
      </div>

      <div className="card w-full bg-base-200 shadow-xl">
        <div className="card-body items-center gap-6 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("result.title")}</h1>

          <div className="flex flex-wrap justify-center gap-2">
            <span className="badge badge-lg badge-outline gap-1">
              <span className="text-primary">{OPERATION_SYMBOL[puzzle.op]}</span>
              {t(`op.${puzzle.op}`)}
            </span>
            <span className="badge badge-lg badge-outline">
              {t("play.numbers", { start: puzzle.start, end: puzzle.end })}
            </span>
            <span className="badge badge-lg badge-outline">{t(`order.${puzzle.order}`)}</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-sm text-base-content/60">{t("result.time")}</span>
            <span className="text-5xl font-bold tabular-nums [font-family:var(--font-dseg)] sm:text-6xl">
              {time}
            </span>
          </div>

          <div className="card-actions w-full flex-col gap-3">
            <a
              href={twitterHref ?? undefined}
              target="_blank"
              rel="noreferrer"
              aria-disabled={twitterHref === null}
              className={`btn btn-primary w-full ${twitterHref ? "" : "btn-disabled"}`}
            >
              <SiX size={18} color="default" />
              {t("result.share")}
            </a>
            <div className="flex w-full gap-3">
              <Link href={playAgainHref} className="btn flex-1 btn-outline">
                {t("result.playAgain")}
              </Link>
              <Link href="/" className="btn flex-1 btn-ghost">
                {t("play.newPuzzle")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense>
      <ResultContent />
    </Suspense>
  );
}
