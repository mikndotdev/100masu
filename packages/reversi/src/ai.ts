import { applyMove, CELLS, legalMoves, opponent, score, type Board, type Color } from "./board";

export const BOT_LEVELS = ["easy", "normal", "hard"] as const;

export type BotLevel = (typeof BOT_LEVELS)[number];

const WEIGHTS = [
  100, -20, 10, 5, 5, 10, -20, 100, -20, -50, -2, -2, -2, -2, -50, -20, 10, -2, 1, 1, 1, 1, -2, 10,
  5, -2, 1, 0, 0, 1, -2, 5, 5, -2, 1, 0, 0, 1, -2, 5, 10, -2, 1, 1, 1, 1, -2, 10, -20, -50, -2, -2,
  -2, -2, -50, -20, 100, -20, 10, 5, 5, 10, -20, 100,
];

const CORNER_NEIGHBORS: Record<number, number> = {
  1: 0,
  8: 0,
  9: 0,
  6: 7,
  14: 7,
  15: 7,
  48: 56,
  49: 56,
  57: 56,
  54: 63,
  55: 63,
  62: 63,
};

const HARD_DEPTH = 5;
const EXACT_ENDGAME_EMPTIES = 10;
const WIN = 10_000;

function weightAt(board: Board, idx: number): number {
  const corner = CORNER_NEIGHBORS[idx];
  if (corner !== undefined && board[corner] !== ".") {
    return 0;
  }
  return WEIGHTS[idx]!;
}

function positional(board: Board, color: Color): number {
  const other = opponent(color);
  let total = 0;
  for (let idx = 0; idx < CELLS; idx++) {
    if (board[idx] === color) total += weightAt(board, idx);
    else if (board[idx] === other) total -= weightAt(board, idx);
  }
  return total;
}

function evaluate(board: Board, color: Color): number {
  const mine = legalMoves(board, color).length;
  const theirs = legalMoves(board, opponent(color)).length;
  const mobility = mine + theirs === 0 ? 0 : (100 * (mine - theirs)) / (mine + theirs);
  return positional(board, color) + mobility;
}

function final(board: Board, color: Color): number {
  const discs = score(board);
  const diff = discs[color] - discs[opponent(color)];
  return diff === 0 ? 0 : Math.sign(diff) * WIN + diff;
}

function negamax(board: Board, color: Color, depth: number, alpha: number, beta: number): number {
  const moves = legalMoves(board, color);
  if (moves.length === 0) {
    if (legalMoves(board, opponent(color)).length === 0) {
      return final(board, color);
    }
    return -negamax(board, opponent(color), depth, -beta, -alpha);
  }
  if (depth === 0) {
    return evaluate(board, color);
  }
  moves.sort((a, b) => WEIGHTS[b]! - WEIGHTS[a]!);
  let best = -Infinity;
  for (const idx of moves) {
    const next = applyMove(board, color, idx)!.board;
    const value = -negamax(next, opponent(color), depth - 1, -beta, -alpha);
    if (value > best) best = value;
    if (value > alpha) alpha = value;
    if (alpha >= beta) break;
  }
  return best;
}

function pickBest(moves: number[], value: (idx: number) => number, random: () => number): number {
  let best: number[] = [];
  let bestValue = -Infinity;
  for (const idx of moves) {
    const v = value(idx);
    if (v > bestValue) {
      bestValue = v;
      best = [idx];
    } else if (v === bestValue) {
      best.push(idx);
    }
  }
  return best[Math.floor(random() * best.length)]!;
}

export function chooseMove(
  board: Board,
  color: Color,
  level: BotLevel,
  random: () => number = Math.random,
): number | null {
  const moves = legalMoves(board, color);
  if (moves.length === 0) {
    return null;
  }

  if (level === "easy") {
    if (random() < 0.5) {
      return moves[Math.floor(random() * moves.length)]!;
    }
    return pickBest(moves, (idx) => applyMove(board, color, idx)!.flips.flat().length, random);
  }

  if (level === "normal") {
    return pickBest(
      moves,
      (idx) => positional(applyMove(board, color, idx)!.board, color) + random() * 8,
      random,
    );
  }

  const empties = [...board].filter((cell) => cell === ".").length;
  const depth = empties <= EXACT_ENDGAME_EMPTIES ? empties : HARD_DEPTH;
  return pickBest(
    moves,
    (idx) =>
      -negamax(
        applyMove(board, color, idx)!.board,
        opponent(color),
        depth - 1,
        -Infinity,
        Infinity,
      ),
    random,
  );
}
