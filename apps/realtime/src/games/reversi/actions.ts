import prisma from "@100masu/db";
import { allocateInviteCode, clockColumn, newGameData, type GameUpdate } from "@100masu/db/reversi";
import {
  chargeMove,
  flagged,
  opponent,
  playMove,
  remaining,
  type Color,
  type GameResult,
} from "@100masu/reversi";
import type { ErrorMessage } from "@100masu/reversi/protocol";

import { clockOf, loadGame, type GameRow } from "./state";

type Failure = ErrorMessage["code"] | null;

const RESIGN_ATTEMPTS = 3;

function finishedFields(result: GameResult) {
  return {
    Status: "finished" as const,
    Turn: null,
    Winner: result.winner,
    EndReason: result.reason,
    FinishedAt: new Date(),
  };
}

async function commit(game: GameRow, data: GameUpdate) {
  const { count } = await prisma.reversiGame.updateMany({
    where: { Id: game.Id, Version: game.Version, Status: game.Status },
    data: { ...data, Version: { increment: 1 } },
  });
  return count === 1;
}

export async function settleTimeout(gameId: string): Promise<boolean> {
  const game = await loadGame(gameId);
  if (!game || game.Status !== "playing") {
    return false;
  }
  const clock = clockOf(game);
  const turn = game.Turn;
  if (!clock || !turn || !flagged(clock, turn, Date.now())) {
    return false;
  }
  return commit(game, {
    ...finishedFields({ winner: opponent(turn), reason: "timeout" }),
    [clockColumn(turn)]: 0,
  });
}

export async function move(
  gameId: string,
  color: Color,
  idx: number,
  version: number,
): Promise<Failure> {
  const game = await loadGame(gameId);
  if (!game || game.Status !== "playing") {
    return "not_playing";
  }
  if (version !== game.Version) {
    return "stale";
  }
  if (game.Turn !== color) {
    return "not_your_turn";
  }
  const now = Date.now();
  const clock = clockOf(game);
  if (clock && flagged(clock, color, now)) {
    await settleTimeout(gameId);
    return null;
  }
  const played = playMove(game.Board, color, idx);
  if (!played) {
    return "illegal";
  }
  const charged = clock ? chargeMove(clock, color, now) : null;
  const committed = await commit(game, {
    Board: played.board,
    LastMove: played.lastMove,
    ...(charged ? { BlackMs: charged.B, WhiteMs: charged.W, TurnStartedAt: new Date(now) } : {}),
    ...(played.result ? finishedFields(played.result) : { Turn: played.turn }),
  });
  return committed ? null : "stale";
}

export async function resign(gameId: string, color: Color): Promise<Failure> {
  for (let attempt = 0; attempt < RESIGN_ATTEMPTS; attempt++) {
    const game = await loadGame(gameId);
    if (!game || game.Status !== "playing") {
      return "not_playing";
    }
    const clock = clockOf(game);
    const turn = game.Turn;
    const committed = await commit(game, {
      ...finishedFields({ winner: opponent(color), reason: "resign" }),
      ...(clock && turn
        ? { [clockColumn(turn)]: Math.max(0, remaining(clock, turn, turn, Date.now())) }
        : {}),
    });
    if (committed) {
      return null;
    }
  }
  return "stale";
}

class RematchTaken extends Error {}

export async function requestRematch(gameId: string, playerId: string): Promise<Failure> {
  const game = await loadGame(gameId);
  if (!game || game.Status !== "finished" || game.NextGameId) {
    return "not_playing";
  }
  await prisma.reversiPlayer.update({ where: { Id: playerId }, data: { WantsRematch: true } });

  const players = await prisma.reversiPlayer.findMany({ where: { GameId: gameId } });
  if (players.length < 2 || !players.every((player) => player.WantsRematch)) {
    return null;
  }

  const data = newGameData({
    inviteCode: await allocateInviteCode(),
    clock:
      game.ClockBaseMs === null
        ? null
        : { baseMs: game.ClockBaseMs, incrementMs: game.IncrementMs },
    seats: players.map((player) => ({
      Color: opponent(player.Color),
      Name: player.Name,
      IdentityHash: player.IdentityHash,
    })),
    now: new Date(),
  });
  try {
    await prisma.$transaction(async (tx) => {
      const created = await tx.reversiGame.create({ data });
      const linked = await tx.reversiGame.updateMany({
        where: { Id: gameId, NextGameId: null },
        data: { NextGameId: created.Id, Version: { increment: 1 } },
      });
      if (linked.count === 0) {
        throw new RematchTaken();
      }
    });
  } catch (error) {
    if (!(error instanceof RematchTaken)) {
      throw error;
    }
  }
  return null;
}
