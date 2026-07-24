"use client";

import { OPERATION_SYMBOL, type Operation } from "@/lib/game";

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
        <div className="flex items-baseline gap-3 font-mono text-4xl font-bold tabular-nums sm:text-5xl">
          <span>{left}</span>
          <span className="text-primary">{OPERATION_SYMBOL[op]}</span>
          <span>{top}</span>
          <span className="text-base-content/40">=</span>
        </div>
      ) : (
        <span className="text-lg text-base-content/50">Select a cell to see its calculation</span>
      )}
    </div>
  );
}
