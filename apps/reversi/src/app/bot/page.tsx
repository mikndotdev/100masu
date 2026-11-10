"use client";

import { BOT_LEVELS, type BotLevel } from "@100masu/reversi";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import BotGame from "@/components/botGame";

function BotContent() {
  const params = useSearchParams();
  const levelParam = params.get("level");
  const level: BotLevel = BOT_LEVELS.find((candidate) => candidate === levelParam) ?? "normal";
  const you = params.get("color") === "W" ? "W" : "B";
  return <BotGame key={`${level}-${you}`} level={level} you={you} />;
}

export default function BotPage() {
  return (
    <Suspense>
      <BotContent />
    </Suspense>
  );
}
