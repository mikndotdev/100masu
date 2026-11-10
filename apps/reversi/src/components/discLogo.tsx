"use client";

import type { Color } from "@100masu/reversi";
import { motion, useReducedMotion } from "motion/react";

function Disc({ color, delay }: { color: Color; delay: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="size-9"
      style={{ transformStyle: "preserve-3d", transformPerspective: 400 }}
      initial={{ rotateY: 0 }}
      animate={{ rotateY: reduced ? 0 : 180 }}
      transition={{ delay, duration: 0.6, ease: [0.77, 0, 0.175, 1] }}
    >
      <div data-color={color} className="disc relative size-full">
        <span className="disc-face absolute inset-0 rounded-full bg-neutral-900 shadow-[inset_0_-3px_0_rgba(255,255,255,0.15)] ring-1 ring-neutral-600" />
        <span className="disc-face disc-face-white absolute inset-0 rounded-full bg-neutral-100 shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]" />
      </div>
    </motion.div>
  );
}

export default function DiscLogo() {
  return (
    <div aria-hidden className="flex gap-1">
      <Disc color="B" delay={0.3} />
      <Disc color="W" delay={0.42} />
    </div>
  );
}
