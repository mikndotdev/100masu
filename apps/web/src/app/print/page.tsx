"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SoundToggle from "@100masu/ui/components/soundToggle";
import { puzzleParser } from "@/lib/gameParams";

const PrintWorksheet = dynamic(() => import("@/components/printWorksheet"), {
  ssr: false,
  loading: () => <div className="skeleton h-[80vh] w-full rounded-box" />,
});

function PrintPageContent() {
  const { t } = useTranslation();
  const [puzzle] = useQueryState("d", puzzleParser);
  const [withAnswers, setWithAnswers] = useState(false);

  if (!puzzle) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold">{t("print.noWorksheetTitle")}</h1>
        <p className="text-base-content/70">{t("print.noWorksheetBody")}</p>
        <Link href="/" className="btn btn-primary">
          {t("print.goToSetup")}
        </Link>
      </main>
    );
  }

  const board = { top: puzzle.top, left: puzzle.left };

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("print.title")}</h1>
          <p className="text-sm text-base-content/60">
            {t(`op.${puzzle.op}`)} · {puzzle.start}–{puzzle.end}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="hidden items-center gap-2 md:flex">
            <LanguageSwitch />
            <SoundToggle />
          </div>
          <label className="label cursor-pointer gap-2">
            <span>{t("print.answerKey")}</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={withAnswers}
              onChange={(event) => setWithAnswers(event.target.checked)}
            />
          </label>
          <Link href="/" className="btn btn-outline">
            {t("print.backToSetup")}
          </Link>
        </div>
      </header>

      <PrintWorksheet
        board={board}
        op={puzzle.op}
        range={`${puzzle.start}–${puzzle.end}`}
        withAnswers={withAnswers}
      />
    </main>
  );
}

export default function PrintPage() {
  return (
    <Suspense>
      <PrintPageContent />
    </Suspense>
  );
}
