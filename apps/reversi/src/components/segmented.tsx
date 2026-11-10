"use client";

import { motion, useReducedMotion } from "motion/react";
import { useId, type ReactNode } from "react";

export default function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  render,
  hint,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  render: (option: T) => ReactNode;
  hint?: string;
}) {
  const pillId = useId();
  const reduced = useReducedMotion();
  return (
    <div className="flex flex-col gap-1">
      <span className="font-semibold">{label}</span>
      <div className="join w-full">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            className={`btn relative join-item flex-1 ${value === option ? "text-primary-content" : ""}`}
            onClick={() => onChange(option)}
          >
            {value === option ? (
              <motion.span
                layoutId={pillId}
                className="absolute inset-0 rounded-[inherit] bg-primary"
                transition={
                  reduced ? { duration: 0 } : { type: "spring", duration: 0.3, bounce: 0.15 }
                }
              />
            ) : null}
            <span className="relative">{render(option)}</span>
          </button>
        ))}
      </div>
      {hint ? <span className="text-sm text-base-content/60">{hint}</span> : null}
    </div>
  );
}
