import { z } from "zod";

import { type CheckMode, type Operation, type Order } from "@/lib/game";

export * from "@100masu/ui/protocol";

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

export function inviteUrl(code: string): string {
  return `${PUBLIC_ORIGIN}/invite/${code}`;
}

export function inviteErrorKey(error: "notFound" | "closed" | "full"): string {
  if (error === "notFound") {
    return "mp.lobbyNotFound";
  }
  return error === "closed" ? "mp.lobbyClosed" : "mp.lobbyFull";
}
