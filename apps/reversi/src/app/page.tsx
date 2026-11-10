"use client";

import { BOT_LEVELS, type BotLevel } from "@100masu/reversi";
import { Stagger, StaggerItem } from "@100masu/ui/components/stagger";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { FlipCard, FlipLink } from "@/components/flipCard";
import Segmented from "@/components/segmented";
import { ColorPicker } from "@/components/setupPickers";
import StartHeader from "@/components/startHeader";
import TopBar from "@/components/topBar";
import { resolveColor, type ColorChoice } from "@/lib/game";

export default function HomePage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [color, setColor] = useState<ColorChoice>("B");
  const [level, setLevel] = useState<BotLevel>("normal");

  function start() {
    router.push(`/bot?level=${level}&color=${resolveColor(color)}` as Route);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-8 px-4 py-12">
      <TopBar />
      <Stagger className="contents">
        <StaggerItem>
          <StartHeader tagline={t("reversi.soloTagline")} />
        </StaggerItem>

        <FlipCard className="w-full">
          <div className="card w-full bg-base-200 shadow-xl">
            <div className="card-body gap-6">
              <h2 className="card-title">{t("reversi.botTitle")}</h2>
              <Segmented
                label={t("reversi.levelLabel")}
                options={BOT_LEVELS}
                value={level}
                onChange={setLevel}
                render={(option) => t(`reversi.${option}`)}
              />
              <ColorPicker value={color} onChange={setColor} />
              <button type="button" className="btn btn-primary btn-lg" onClick={start}>
                {t("reversi.playBot")}
              </button>
            </div>
          </div>
        </FlipCard>

        <StaggerItem className="w-full">
          <FlipLink href="/mp" className="btn btn-accent btn-lg w-full">
            {t("reversi.playFriend")}
          </FlipLink>
        </StaggerItem>
      </Stagger>
    </main>
  );
}
