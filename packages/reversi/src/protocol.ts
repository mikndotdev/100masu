import { z } from "zod";

import { CELLS, type GameResult, type LastMove } from "./board";

export const GAME_EVENTS_CHANNEL = "reversi:events";

export type GameEvent = { gameId: string };

export const colorSchema = z.enum(["B", "W"]);

export const seatSchema = z.object({
  name: z.string(),
  online: z.boolean(),
  rematch: z.boolean(),
});

export const clockSchema = z.object({
  B: z.number(),
  W: z.number(),
  incrementMs: z.number(),
  turnStartedAt: z.number(),
});

export const lastMoveSchema: z.ZodType<LastMove> = z.object({
  idx: z.number(),
  color: colorSchema,
  flips: z.array(z.array(z.number())),
});

export const resultSchema: z.ZodType<GameResult> = z.object({
  winner: colorSchema.nullable(),
  reason: z.enum(["normal", "resign", "timeout"]),
});

export const stateMessageSchema = z.object({
  type: z.literal("state"),
  gameId: z.string(),
  inviteCode: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  board: z.string().length(CELLS),
  turn: colorSchema.nullable(),
  version: z.number(),
  seats: z.object({ B: seatSchema.nullable(), W: seatSchema.nullable() }),
  clock: clockSchema.nullable(),
  result: resultSchema.nullable(),
  lastMove: lastMoveSchema.nullable(),
  nextGameId: z.string().nullable(),
  you: colorSchema.nullable(),
  serverNow: z.number(),
});

export const errorMessageSchema = z.object({
  type: z.literal("error"),
  code: z.enum(["stale", "illegal", "not_your_turn", "not_playing", "spectator"]),
});

export const pongMessageSchema = z.object({
  type: z.literal("pong"),
  serverNow: z.number(),
});

export const serverMessageSchema = z.discriminatedUnion("type", [
  stateMessageSchema,
  errorMessageSchema,
  pongMessageSchema,
]);

export type StateMessage = z.infer<typeof stateMessageSchema>;
export type ErrorMessage = z.infer<typeof errorMessageSchema>;
export type ServerMessage = z.infer<typeof serverMessageSchema>;

export const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("move"), idx: z.number().int(), version: z.number().int() }),
  z.object({ type: z.literal("resign") }),
  z.object({ type: z.literal("rematch") }),
  z.object({ type: z.literal("ping") }),
]);

export type ClientMessage = z.infer<typeof clientMessageSchema>;
