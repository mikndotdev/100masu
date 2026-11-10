import { describe, expect, test } from "bun:test";

import { chooseMove, type BotLevel } from "./ai";
import {
  applyMove,
  initialBoard,
  legalMoves,
  nextTurn,
  score,
  type Board,
  type Color,
} from "./board";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playOut(black: BotLevel, white: BotLevel, seed: number) {
  const random = seeded(seed);
  let board: Board = initialBoard();
  let turn: Color | null = "B";
  while (turn) {
    const idx = chooseMove(board, turn, turn === "B" ? black : white, random);
    expect(idx).not.toBeNull();
    expect(legalMoves(board, turn)).toContain(idx!);
    board = applyMove(board, turn, idx!)!.board;
    turn = nextTurn(board, turn);
  }
  return score(board);
}

function winsFor(strong: BotLevel, weak: BotLevel, games: number) {
  let wins = 0;
  for (let game = 0; game < games; game++) {
    const strongIsBlack = game % 2 === 0;
    const result = strongIsBlack
      ? playOut(strong, weak, game + 1)
      : playOut(weak, strong, game + 1);
    const mine = strongIsBlack ? result.B : result.W;
    const theirs = strongIsBlack ? result.W : result.B;
    if (mine > theirs) wins++;
  }
  return wins;
}

describe("ai", () => {
  test("returns null without a legal move", () => {
    expect(chooseMove("B".repeat(64), "W", "hard")).toBeNull();
  });

  test("every level takes an available corner over an X-square", () => {
    const board = [
      "........",
      ".W......",
      "..B.....",
      "...BW...",
      "...WB...",
      "........",
      "........",
      "........",
    ].join("");
    expect(legalMoves(board, "B")).toContain(0);
    expect(chooseMove(board, "B", "normal")).toBe(0);
    expect(chooseMove(board, "B", "hard")).toBe(0);
  });

  test("normal beats easy most of the time", () => {
    expect(winsFor("normal", "easy", 20)).toBeGreaterThanOrEqual(14);
  });

  test("hard beats normal most of the time", () => {
    expect(winsFor("hard", "normal", 10)).toBeGreaterThanOrEqual(8);
  }, 120_000);
});
