export type Color = "B" | "W";
export type Cell = Color | ".";
export type Board = string;

export const SIZE = 8;
export const CELLS = SIZE * SIZE;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

export function opponent(color: Color): Color {
  return color === "B" ? "W" : "B";
}

export function initialBoard(): Board {
  const cells: Cell[] = Array.from({ length: CELLS }, () => ".");
  cells[3 * SIZE + 3] = "W";
  cells[3 * SIZE + 4] = "B";
  cells[4 * SIZE + 3] = "B";
  cells[4 * SIZE + 4] = "W";
  return cells.join("");
}

export function flipsFor(board: Board, color: Color, idx: number): number[][] {
  if (!Number.isInteger(idx) || idx < 0 || idx >= CELLS || board[idx] !== ".") {
    return [];
  }
  const row = Math.floor(idx / SIZE);
  const col = idx % SIZE;
  const other = opponent(color);
  const groups: number[][] = [];
  for (const [dr, dc] of DIRECTIONS) {
    const line: number[] = [];
    let r = row + dr;
    let c = col + dc;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r * SIZE + c] === other) {
      line.push(r * SIZE + c);
      r += dr;
      c += dc;
    }
    if (
      line.length > 0 &&
      r >= 0 &&
      r < SIZE &&
      c >= 0 &&
      c < SIZE &&
      board[r * SIZE + c] === color
    ) {
      groups.push(line);
    }
  }
  return groups;
}

export function legalMoves(board: Board, color: Color): number[] {
  const moves: number[] = [];
  for (let idx = 0; idx < CELLS; idx++) {
    if (flipsFor(board, color, idx).length > 0) {
      moves.push(idx);
    }
  }
  return moves;
}

export function applyMove(
  board: Board,
  color: Color,
  idx: number,
): { board: Board; flips: number[][] } | null {
  const flips = flipsFor(board, color, idx);
  if (flips.length === 0) {
    return null;
  }
  const cells = board.split("");
  cells[idx] = color;
  for (const line of flips) {
    for (const flipped of line) {
      cells[flipped] = color;
    }
  }
  return { board: cells.join(""), flips };
}

export function nextTurn(board: Board, mover: Color): Color | null {
  const other = opponent(mover);
  if (legalMoves(board, other).length > 0) {
    return other;
  }
  if (legalMoves(board, mover).length > 0) {
    return mover;
  }
  return null;
}

export function score(board: Board): Record<Color, number> {
  let b = 0;
  let w = 0;
  for (const cell of board) {
    if (cell === "B") b++;
    else if (cell === "W") w++;
  }
  return { B: b, W: w };
}

export function winnerOf(board: Board): Color | null {
  const { B, W } = score(board);
  if (B === W) {
    return null;
  }
  return B > W ? "B" : "W";
}

export type LastMove = { idx: number; color: Color; flips: number[][] };
export type GameResult = { winner: Color | null; reason: "normal" | "resign" | "timeout" };

export function playMove(
  board: Board,
  color: Color,
  idx: number,
): { board: Board; turn: Color | null; lastMove: LastMove; result: GameResult | null } | null {
  const moved = applyMove(board, color, idx);
  if (!moved) {
    return null;
  }
  const turn = nextTurn(moved.board, color);
  return {
    board: moved.board,
    turn,
    lastMove: { idx, color, flips: moved.flips },
    result: turn ? null : { winner: winnerOf(moved.board), reason: "normal" },
  };
}
