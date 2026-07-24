"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useQueryState } from "nuqs";
import { Suspense, useState } from "react";

import { OPERATION_LABEL } from "@/lib/game";
import { puzzleParser } from "@/lib/gameParams";

const PrintWorksheet = dynamic(() => import("@/components/printWorksheet"), {
  ssr: false,
  loading: () => <div className="skeleton h-[80vh] w-full rounded-box" />,
});

function PrintPageContent() {
  const [puzzle] = useQueryState("d", puzzleParser);
  const [withAnswers, setWithAnswers] = useState(false);

  if (!puzzle) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-4 text-center">
        <h1 className="text-2xl font-bold">No worksheet to print</h1>
        <p className="text-base-content/70">
          This link has no valid puzzle data. Set up a grid first, then hit Print.
        </p>
        <Link href="/" className="btn btn-primary">
          Go to setup
        </Link>
      </main>
    );
  }

  const board = { top: puzzle.top, left: puzzle.left };

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Printable worksheet</h1>
          <p className="text-sm text-base-content/60">
            {OPERATION_LABEL[puzzle.op]} · {puzzle.start}–{puzzle.end}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <label className="label cursor-pointer gap-2">
            <span className="label-text">Answer key</span>
            <input
              type="checkbox"
              className="toggle toggle-primary"
              checked={withAnswers}
              onChange={(event) => setWithAnswers(event.target.checked)}
            />
          </label>
          <Link href="/" className="btn btn-outline">
            Back to setup
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
