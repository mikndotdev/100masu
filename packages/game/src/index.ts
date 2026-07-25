export const GRID_SIZE = 10;
export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

export type Operation = "add" | "sub" | "mul" | "div";
export type Order = "seq" | "rand";
export type CheckMode = "input" | "end";

export type Settings = {
  op: Operation;
  start: number;
  end: number;
  order: Order;
  check: CheckMode;
};

export type Board = {
  top: number[];
  left: number[];
};

export const OPERATIONS: readonly Operation[] = ["add", "sub", "mul", "div"];

export const OPERATION_SYMBOL: Record<Operation, string> = {
  add: "+",
  sub: "−",
  mul: "×",
  div: "÷",
};

export const OPERATION_DISPLAY_SYMBOL: Record<Operation, string> = {
  add: "+",
  sub: "-",
  mul: "x",
  div: "/",
};

function shuffle(values: number[]): number[] {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

export function generateHeaders(start: number, order: Order): number[] {
  const headers = Array.from({ length: GRID_SIZE }, (_, i) => start + i);
  return order === "rand" ? shuffle(headers) : headers;
}

export function generateBoard(settings: Settings): Board {
  return {
    top: generateHeaders(settings.start, settings.order),
    left: generateHeaders(settings.start, settings.order),
  };
}

export function computeCell(op: Operation, left: number, top: number): number | null {
  switch (op) {
    case "add":
      return left + top;
    case "sub":
      return left - top;
    case "mul":
      return left * top;
    case "div":
      return top === 0 ? null : left / top;
  }
}

export function isAnswerable(op: Operation, left: number, top: number): boolean {
  return computeCell(op, left, top) !== null;
}

export function checkAnswer(op: Operation, left: number, top: number, input: string): boolean {
  const expected = computeCell(op, left, top);
  if (expected === null) {
    return false;
  }

  const trimmed = input.trim();
  if (trimmed === "") {
    return false;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value)) {
    return false;
  }

  return Math.abs(value - expected) < 0.005;
}

export function formatAnswer(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(Math.round(value * 100) / 100);
}

export function emptyAnswers(): string[] {
  return Array.from({ length: CELL_COUNT }, () => "");
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export const CELL_EMPTY = "0";
export const CELL_FILLED = "1";
export const CELL_CORRECT = "2";
export const CELL_INCORRECT = "3";

export function buildCellStates(
  board: Board,
  op: Operation,
  answers: string[],
  reveal: boolean,
  committed?: ReadonlySet<number>,
): string {
  let cells = "";
  for (let index = 0; index < CELL_COUNT; index++) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const leftValue = board.left[row];
    const topValue = board.top[col];
    const value = answers[index] ?? "";

    if (
      leftValue === undefined ||
      topValue === undefined ||
      !isAnswerable(op, leftValue, topValue) ||
      value.trim() === ""
    ) {
      cells += CELL_EMPTY;
      continue;
    }
    if (!reveal || (committed !== undefined && !committed.has(index))) {
      cells += CELL_FILLED;
      continue;
    }
    cells += checkAnswer(op, leftValue, topValue, value) ? CELL_CORRECT : CELL_INCORRECT;
  }
  return cells;
}

export function countProgress(board: Board, op: Operation, answers: string[]) {
  let answerable = 0;
  let filled = 0;
  let correct = 0;

  for (let index = 0; index < CELL_COUNT; index++) {
    const row = Math.floor(index / GRID_SIZE);
    const col = index % GRID_SIZE;
    const leftValue = board.left[row];
    const topValue = board.top[col];
    if (leftValue === undefined || topValue === undefined) {
      continue;
    }
    if (!isAnswerable(op, leftValue, topValue)) {
      continue;
    }
    answerable += 1;
    const value = answers[index] ?? "";
    if (value.trim() !== "") {
      filled += 1;
    }
    if (checkAnswer(op, leftValue, topValue, value)) {
      correct += 1;
    }
  }

  return { answerable, filled, correct, solved: answerable > 0 && correct === answerable };
}
