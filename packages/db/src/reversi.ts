import { generateInviteCode, initialBoard, type Color } from "@100masu/reversi";

import type { Prisma } from "../prisma/generated/client";
import prisma from "./index";

export type GameUpdate = Prisma.ReversiGameUpdateManyMutationInput;

type SeatInput = { Color: Color; Name: string; IdentityHash: string };

export async function allocateInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await prisma.reversiGame.findUnique({ where: { InviteCode: code } });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Could not allocate an invite code");
}

export function clockColumn(color: Color) {
  return color === "B" ? ("BlackMs" as const) : ("WhiteMs" as const);
}

export function startedFields(clockBaseMs: number | null, now: Date) {
  return {
    Status: "playing" as const,
    Turn: "B" as const,
    StartedAt: now,
    TurnStartedAt: clockBaseMs === null ? null : now,
  };
}

export function newGameData(options: {
  inviteCode: string;
  clock: { baseMs: number; incrementMs: number } | null;
  seats: SeatInput[];
  now: Date;
}): Prisma.ReversiGameCreateInput {
  const baseMs = options.clock?.baseMs ?? null;
  return {
    InviteCode: options.inviteCode,
    Board: initialBoard(),
    ClockBaseMs: baseMs,
    IncrementMs: options.clock?.incrementMs ?? 0,
    BlackMs: baseMs,
    WhiteMs: baseMs,
    ...(options.seats.length === 2 ? startedFields(baseMs, options.now) : {}),
    Players: { create: options.seats },
  };
}
