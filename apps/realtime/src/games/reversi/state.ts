import prisma from "@100masu/db";
import type { Clock, Color } from "@100masu/reversi";
import { lastMoveSchema, type StateMessage } from "@100masu/reversi/protocol";

import { isPresent } from "../../shared/pubsub";

export async function loadGame(gameId: string) {
  return prisma.reversiGame.findUnique({ where: { Id: gameId }, include: { Players: true } });
}

export type GameRow = NonNullable<Awaited<ReturnType<typeof loadGame>>>;

export function clockOf(game: GameRow): Clock | null {
  if (game.BlackMs === null || game.WhiteMs === null) {
    return null;
  }
  return {
    B: game.BlackMs,
    W: game.WhiteMs,
    incrementMs: game.IncrementMs,
    turnStartedAt: game.TurnStartedAt?.getTime() ?? Date.now(),
  };
}

type SharedState = Omit<StateMessage, "you" | "serverNow">;

export async function buildState(game: GameRow): Promise<SharedState> {
  const seat = async (color: Color) => {
    const player = game.Players.find((candidate) => candidate.Color === color);
    if (!player) {
      return null;
    }
    return { name: player.Name, online: await isPresent(player.Id), rematch: player.WantsRematch };
  };
  const lastMove = lastMoveSchema.safeParse(game.LastMove);
  const [B, W] = await Promise.all([seat("B"), seat("W")]);

  return {
    type: "state",
    gameId: game.Id,
    inviteCode: game.InviteCode,
    status: game.Status,
    board: game.Board,
    turn: game.Turn,
    version: game.Version,
    seats: { B, W },
    clock: clockOf(game),
    result:
      game.Status === "finished" && game.EndReason
        ? { winner: game.Winner, reason: game.EndReason }
        : null,
    lastMove: lastMove.success ? lastMove.data : null,
    nextGameId: game.NextGameId,
  };
}
