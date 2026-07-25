import { z } from "zod";

import { GRID_SIZE, type CheckMode, type Operation, type Order } from "@/lib/game";

export const MAX_PLAYERS = 10;
export const MIN_PLAYERS = 2;
export const INVITE_CODE_LENGTH = 6;
export const MAX_NAME_LENGTH = 20;

const INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const PUBLIC_ORIGIN = "https://100masu.mikn.dev";

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_CODE_LENGTH));
  let code = "";
  for (const byte of bytes) {
    code += INVITE_ALPHABET[byte % INVITE_ALPHABET.length];
  }
  return code;
}

export function normalizeInviteCode(value: string): string {
  return value.trim().toUpperCase();
}

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(INVITE_CODE_LENGTH)
  .regex(/^[A-Z0-9]+$/);

export const playerNameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);

export const OPERATION_TO_DB = {
  add: "ADD",
  sub: "SUB",
  mul: "MUL",
  div: "DIV",
} as const satisfies Record<Operation, string>;

export const ORDER_TO_DB = {
  seq: "SEQ",
  rand: "RAND",
} as const satisfies Record<Order, string>;

export const CHECK_TO_DB = {
  input: "INPUT",
  end: "END",
} as const satisfies Record<CheckMode, string>;

export const OPERATION_FROM_DB = {
  ADD: "add",
  SUB: "sub",
  MUL: "mul",
  DIV: "div",
} as const satisfies Record<string, Operation>;

export const ORDER_FROM_DB = {
  SEQ: "seq",
  RAND: "rand",
} as const satisfies Record<string, Order>;

export const CHECK_FROM_DB = {
  INPUT: "input",
  END: "end",
} as const satisfies Record<string, CheckMode>;

export const lobbyPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  isHost: z.boolean(),
  finishedAt: z.number().nullable().default(null),
  correctCount: z.number().default(0),
  filledCount: z.number().default(0),
});

export const lobbySnapshotSchema = z.object({
  type: z.literal("lobby"),
  lobbyId: z.string(),
  inviteCode: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "COMPLETED"]),
  startedAt: z.number().nullable(),
  op: z.enum(["add", "sub", "mul", "div"]).default("add"),
  check: z.enum(["input", "end"]).default("input"),
  startNumber: z.number().default(1),
  endNumber: z.number().default(10),
  order: z.enum(["seq", "rand"]).default("seq"),
  players: z.array(lobbyPlayerSchema),
});

export type LobbyPlayer = z.infer<typeof lobbyPlayerSchema>;
export type LobbySnapshot = z.infer<typeof lobbySnapshotSchema>;

const boardSchema = z.object({
  top: z.array(z.number()).length(GRID_SIZE),
  left: z.array(z.number()).length(GRID_SIZE),
});

export const progressSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  cells: z.string(),
  filled: z.number(),
  correct: z.number(),
  finishedAt: z.number().nullable(),
  placement: z.number().nullable(),
});

export const playMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("game"),
    board: boardSchema,
    op: z.enum(["add", "sub", "mul", "div"]),
    check: z.enum(["input", "end"]),
    startedAt: z.number().nullable(),
    serverNow: z.number(),
    you: z.object({
      id: z.string(),
      answers: z.array(z.string()),
      finishedAt: z.number().nullable(),
    }),
    players: z.array(progressSchema),
  }),
  progressSchema.extend({ type: z.literal("progress") }),
  z.object({
    type: z.literal("checkResult"),
    cells: z.string(),
    correct: z.number(),
    answerable: z.number(),
    solved: z.boolean(),
  }),
  z.object({
    type: z.literal("finished"),
    playerId: z.string(),
    name: z.string(),
    placement: z.number(),
    timeMs: z.number(),
  }),
]);

export const spectatePlayerSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  answers: z.array(z.string()),
  filled: z.number(),
  correct: z.number(),
  finishedAt: z.number().nullable(),
});

export const spectateMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("spectate"),
    board: boardSchema,
    op: z.enum(["add", "sub", "mul", "div"]),
    check: z.enum(["input", "end"]),
    startedAt: z.number().nullable(),
    players: z.array(spectatePlayerSchema),
  }),
  spectatePlayerSchema.extend({ type: z.literal("spectateProgress") }),
]);

export type SpectatePlayer = z.infer<typeof spectatePlayerSchema>;

export function inviteUrl(code: string): string {
  return `${PUBLIC_ORIGIN}/invite/${code}`;
}
