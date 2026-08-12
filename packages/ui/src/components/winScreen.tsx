"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { useSoundEffect } from "./soundProvider";

const WIN_MS = 2500;

export default function WinScreen({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation();
  const { play } = useSoundEffect();

  useEffect(() => {
    play("perfect");
    const timer = setTimeout(onComplete, WIN_MS);
    return () => clearTimeout(timer);
  }, [play, onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-base-100/90 px-6 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 12 }}
        className="text-center text-4xl font-black text-balance text-primary md:text-7xl"
      >
        {t("win.title")}
      </motion.div>
    </motion.div>
  );
}
