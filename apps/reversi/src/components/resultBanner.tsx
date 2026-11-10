"use client";

import { score, type Board, type Color } from "@100masu/reversi";
import type { StateMessage } from "@100masu/reversi/protocol";
import { motion, useReducedMotion } from "motion/react";
import { useTranslation } from "react-i18next";

type ResultBannerProps = {
  board: Board;
  result: NonNullable<StateMessage["result"]>;
  you: Color | null;
  names: Record<Color, string>;
};

export default function ResultBanner({ board, result, you, names }: ResultBannerProps) {
  const { t } = useTranslation();
  const headline =
    result.winner === null
      ? t("reversi.draw")
      : you
        ? t(result.winner === you ? "reversi.win" : "reversi.lose")
        : t("reversi.wins", { name: names[result.winner] });
  const reason =
    result.reason === "resign"
      ? t("reversi.byResign")
      : result.reason === "timeout"
        ? t("reversi.byTimeout")
        : null;
  const { B, W } = score(board);
  const reduced = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <motion.span
        className="text-3xl font-black"
        initial={{ opacity: 0, scale: reduced ? 1 : 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.4, bounce: 0.25 }}
      >
        {headline}
      </motion.span>
      <motion.span
        className="text-base-content/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.08, duration: 0.3 }}
      >
        {B} – {W}
        {reason ? ` · ${reason}` : ""}
      </motion.span>
    </div>
  );
}
