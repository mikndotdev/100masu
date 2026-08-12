import { GRID_SIZE } from "@100masu/game";
import { z } from "zod";

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
  allowLateJoin: z.boolean().default(false),
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
  discordUserId: z.string().nullable().default(null),
  avatar: z.string().nullable().default(null),
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
  discordUserId: z.string().nullable().default(null),
  avatar: z.string().nullable().default(null),
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
