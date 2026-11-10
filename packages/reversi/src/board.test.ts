import { describe, expect, test } from "bun:test";

import {
  applyMove,
  initialBoard,
  legalMoves,
  nextTurn,
  score,
  winnerOf,
  type Board,
} from "./board";

const at = (row: number, col: number) => row * 8 + col;

function boardFrom(rows: string[]): Board {
  return rows.join("");
}

describe("board", () => {
  test("black has the four standard opening moves", () => {
    expect(legalMoves(initialBoard(), "B")).toEqual([at(2, 3), at(3, 2), at(4, 5), at(5, 4)]);
  });

  test("an opening move flips exactly one disc", () => {
    const result = applyMove(initialBoard(), "B", at(2, 3))!;
    expect(result.flips).toEqual([[at(3, 3)]]);
    expect(score(result.board)).toEqual({ B: 4, W: 1 });
  });

  test("illegal moves are rejected", () => {
    expect(applyMove(initialBoard(), "B", at(0, 0))).toBeNull();
    expect(applyMove(initialBoard(), "B", at(3, 3))).toBeNull();
    expect(applyMove(initialBoard(), "B", -1)).toBeNull();
    expect(applyMove(initialBoard(), "B", 64)).toBeNull();
    expect(applyMove(initialBoard(), "B", 1.5)).toBeNull();
  });

  test("flips are grouped by direction", () => {
    const board = boardFrom([
      "B.B.B...",
      ".WWW....",
      "BW.WB...",
      ".WWW....",
      "B.B.B...",
      "........",
      "........",
      "........",
    ]);
    const result = applyMove(board, "B", at(2, 2))!;
    expect(result.flips).toHaveLength(8);
    expect(score(result.board)).toEqual({ B: 17, W: 0 });
  });

  test("a line not closed by the mover does not flip", () => {
    const board = boardFrom([
      ".WWB....",
      "........",
      "........",
      "........",
      "........",
      "........",
      "........",
      ".......W",
    ]);
    expect(applyMove(board, "B", at(0, 0))!.flips).toEqual([[at(0, 1), at(0, 2)]]);
    expect(applyMove(board, "B", at(7, 6))).toBeNull();
  });

  test("the opponent passes when they have no move", () => {
    const board = boardFrom([
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBW",
      "BBBBBW..",
    ]);
    expect(legalMoves(board, "W")).toEqual([]);
    expect(nextTurn(board, "B")).toBe("B");
  });

  test("the game ends when neither side can move", () => {
    const board = boardFrom([
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "BBBBBBBB",
      "........",
      "........",
      "........",
      "........",
    ]);
    expect(nextTurn(board, "B")).toBeNull();
    expect(winnerOf(board)).toBe("B");
  });

  test("a full board ends the game and can be a draw", () => {
    const board = "BW".repeat(32);
    expect(nextTurn(board, "W")).toBeNull();
    expect(winnerOf(board)).toBeNull();
  });
});
