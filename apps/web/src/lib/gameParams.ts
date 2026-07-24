import { createParser, createSerializer, parseAsInteger, parseAsStringLiteral } from "nuqs";
import { z } from "zod";

import { CELL_COUNT, GRID_SIZE, type CheckMode, type Operation, type Order } from "@/lib/game";

const ANSWER_DELIMITER = "~";

export const settingsParsers = {
  op: parseAsStringLiteral(["add", "sub", "mul", "div"] as const).withDefault("add"),
  start: parseAsInteger.withDefault(1),
  end: parseAsInteger.withDefault(10),
  order: parseAsStringLiteral(["seq", "rand"] as const).withDefault("seq"),
  check: parseAsStringLiteral(["input", "end"] as const).withDefault("input"),
};

export type PuzzleState = {
  op: Operation;
  start: number;
  end: number;
  order: Order;
  check: CheckMode;
  top: number[];
  left: number[];
  answers: string[];
  startedAt: number | null;
  finishedAt: number | null;
};

const puzzleSchema = z.object({
  o: z.enum(["add", "sub", "mul", "div"]),
  s: z.number().int(),
  e: z.number().int(),
  r: z.enum(["seq", "rand"]),
  c: z.enum(["input", "end"]),
  t: z.array(z.number().int()).length(GRID_SIZE),
  l: z.array(z.number().int()).length(GRID_SIZE),
  a: z.string(),
  w: z.number().int().nullable().default(null),
  f: z.number().int().nullable().default(null),
});

function toBase64Url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export const puzzleParser = createParser<PuzzleState>({
  parse(query) {
    try {
      const decoded: unknown = JSON.parse(fromBase64Url(query));
      const result = puzzleSchema.safeParse(decoded);
      if (!result.success) {
        return null;
      }
      const data = result.data;
      const answers = data.a.split(ANSWER_DELIMITER);
      return {
        op: data.o,
        start: data.s,
        end: data.e,
        order: data.r,
        check: data.c,
        top: data.t,
        left: data.l,
        answers: Array.from({ length: CELL_COUNT }, (_, index) => answers[index] ?? ""),
        startedAt: data.w,
        finishedAt: data.f,
      };
    } catch {
      return null;
    }
  },
  serialize(value) {
    const payload = {
      o: value.op,
      s: value.start,
      e: value.end,
      r: value.order,
      c: value.check,
      t: value.top,
      l: value.left,
      a: value.answers.join(ANSWER_DELIMITER),
      w: value.startedAt,
      f: value.finishedAt,
    };
    return toBase64Url(JSON.stringify(payload));
  },
});

export const serializePuzzle = createSerializer({ d: puzzleParser });
