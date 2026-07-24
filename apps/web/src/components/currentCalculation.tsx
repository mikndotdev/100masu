"use client";

import { OPERATION_DISPLAY_SYMBOL, type Operation } from "@/lib/game";

type CurrentCalculationProps = {
  op: Operation;
  left: number | null;
  top: number | null;
};

export default function CurrentCalculation({ op, left, top }: CurrentCalculationProps) {
  const active = left !== null && top !== null;

  return (
    <div className="flex min-h-20 items-center justify-center rounded-box bg-base-200 px-6 py-4 shadow">
      {active ? (
        <div className="flex items-baseline gap-3 text-3xl font-bold tabular-nums [font-family:var(--font-dseg)] md:text-5xl">
          <span>{left}</span>
          <span className="text-primary">{OPERATION_DISPLAY_SYMBOL[op]}</span>
          <span>{top}</span>
        </div>
      ) : null}
    </div>
  );
}
