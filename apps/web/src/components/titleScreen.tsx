"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { useSoundEffect } from "@/components/soundProvider";
import { OPERATION_SYMBOL, type Operation, type Order } from "@/lib/game";

const TITLE_MS = 2200;
const STEP_MS = 800;
const COUNTDOWN = ["3", "2", "1", "go"];

type TitleScreenProps = {
  op: Operation;
  start: number;
  end: number;
  order: Order;
  check: "input" | "end";
  onComplete: () => void;
};

export default function TitleScreen({
  op,
  start,
  end,
  order,
  check,
  onComplete,
}: TitleScreenProps) {
  const { t } = useTranslation();
  const { play } = useSoundEffect();
  const [stage, setStage] = useState<"title" | "countdown">("title");
  const [step, setStep] = useState(0);

  useEffect(() => {
    play("start");
    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        setStage("countdown");
        play("countdown");
      }, TITLE_MS),
    );

    COUNTDOWN.forEach((_, index) => {
      if (index === 0) {
        return;
      }
      timers.push(setTimeout(() => setStep(index), TITLE_MS + index * STEP_MS));
    });

    timers.push(setTimeout(onComplete, TITLE_MS + COUNTDOWN.length * STEP_MS));

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
    };
  }, [play, onComplete]);

  const countdownLabel = step === COUNTDOWN.length - 1 ? t("intro.go") : (COUNTDOWN[step] ?? "");

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-100/90 backdrop-blur-sm"
    >
      <AnimatePresence mode="wait">
        {stage === "title" ? (
          <motion.div
            key="title"
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.1, opacity: 0, transition: { duration: 0.25 } }}
            transition={{ type: "spring", stiffness: 220, damping: 18 }}
            className="flex flex-col items-center gap-5 px-6 text-center"
          >
            <span className="text-4xl font-bold text-balance md:text-6xl">{t("app.title")}</span>
            <div className="flex items-center gap-3 text-2xl font-bold md:text-3xl">
              <span className="text-primary">{OPERATION_SYMBOL[op]}</span>
              <span>{t(`op.${op}`)}</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <span className="badge badge-lg badge-outline">
                {t("play.numbers", { start, end })}
              </span>
              <span className="badge badge-lg badge-outline">{t(`order.${order}`)}</span>
              <span className="badge badge-lg badge-outline">
                {check === "input" ? t("intro.instantCheck") : t("intro.checkAtEnd")}
              </span>
            </div>
          </motion.div>
        ) : step < COUNTDOWN.length ? (
          <motion.div
            key={`count-${step}`}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2.2, opacity: 0, transition: { duration: 0.2 } }}
            transition={{ type: "spring", stiffness: 260, damping: 15 }}
            className="text-5xl font-black whitespace-nowrap text-primary md:text-9xl"
          >
            {countdownLabel}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}
