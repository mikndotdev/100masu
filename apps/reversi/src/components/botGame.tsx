"use client";

import {
  chooseMove,
  initialBoard,
  legalMoves,
  opponent,
  playMove,
  score,
  type Board as BoardString,
  type BotLevel,
  type Color,
  type GameResult,
  type LastMove,
} from "@100masu/reversi";
import { useSoundEffect } from "@100masu/ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

import Board from "@/components/board";
import PlayerCard from "@/components/playerCard";
import ResultBanner from "@/components/resultBanner";
import TopBar from "@/components/topBar";

const BOT_DELAY_MS = 450;

type LocalGame = {
  board: BoardString;
  turn: Color | null;
  lastMove: LastMove | null;
  result: GameResult | null;
};

function newGame(): LocalGame {
  return { board: initialBoard(), turn: "B", lastMove: null, result: null };
}

export default function BotGame({ level, you }: { level: BotLevel; you: Color }) {
  const { t } = useTranslation();
  const { play } = useSoundEffect();
  const [game, setGame] = useState(newGame);
  const bot = opponent(you);
  const botName = t("reversi.cpu", { level: t(`reversi.${level}`) });

  function commit(color: Color, idx: number) {
    const next = playMove(game.board, color, idx);
    if (!next) {
      play("incorrect");
      toast.error(t("reversi.illegal"));
      return;
    }
    setGame(next);
    play("write");
    if (next.result) {
      if (next.result.winner === you) {
        play("applaud");
      }
      return;
    }
    if (next.turn === color) {
      const passer = opponent(color) === you ? t("reversi.player") : botName;
      toast(t("reversi.passed", { name: passer }));
    }
  }

  useEffect(() => {
    if (game.turn !== bot) {
      return;
    }
    const timer = setTimeout(() => {
      const idx = chooseMove(game.board, bot, level);
      if (idx !== null) {
        commit(bot, idx);
      }
    }, BOT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [game, bot, level]);

  const player = t("reversi.player");
  const names: Record<Color, string> =
    you === "B" ? { B: player, W: botName } : { B: botName, W: player };
  const discs = score(game.board);
  const hints = game.turn === you ? new Set(legalMoves(game.board, you)) : new Set<number>();

  const card = (color: Color) => (
    <PlayerCard
      color={color}
      seat={{ name: names[color], online: true, rematch: false }}
      discs={discs[color]}
      isYou={color === you}
      active={game.turn === color}
      clock={null}
      turn={game.turn}
      clockOffset={0}
    />
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-[600px] flex-col items-center gap-3 px-4 py-4">
      <TopBar />
      <div className="flex w-full items-center justify-between">
        <h1 className="text-2xl font-bold">{t("reversi.title")}</h1>
        <span className="badge badge-secondary">{t(`reversi.${level}`)}</span>
      </div>

      {card(bot)}

      <div className="flex w-full justify-center">
        <Board
          board={game.board}
          lastMove={game.lastMove}
          hints={hints}
          hintColor={you}
          onPlay={(idx) => commit(you, idx)}
        />
      </div>

      {card(you)}

      <div className="flex min-h-12 w-full flex-col items-center gap-3">
        {game.result ? (
          <>
            <ResultBanner board={game.board} result={game.result} you={you} names={names} />
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" className="btn btn-primary" onClick={() => setGame(newGame())}>
                {t("reversi.playAgain")}
              </button>
              <Link href="/" className="btn btn-ghost">
                {t("reversi.changeSettings")}
              </Link>
            </div>
          </>
        ) : (
          <span className="flex items-center gap-2 text-lg font-semibold">
            {game.turn === you ? (
              t("reversi.yourTurn")
            ) : (
              <>
                <span className="loading loading-dots loading-sm" />
                {t("reversi.thinking")}
              </>
            )}
          </span>
        )}
      </div>
    </main>
  );
}
