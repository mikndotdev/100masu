import type { PuzzleState } from "@/lib/gameParams";

const STORAGE_KEY = "100masu:saved-games";
const MAX_GAMES = 3;

export type SavedGame = {
  id: string;
  d: string;
  updatedAt: number;
};

export function gameSignature(puzzle: PuzzleState): string {
  return `${puzzle.op}:${puzzle.start}:${puzzle.top.join(",")}:${puzzle.left.join(",")}`;
}

function isSavedGame(value: unknown): value is SavedGame {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    typeof record.d === "string" &&
    typeof record.updatedAt === "number"
  );
}

export function loadSavedGames(): SavedGame[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isSavedGame).slice(0, MAX_GAMES);
  } catch {
    return [];
  }
}

function write(games: SavedGame[]): SavedGame[] {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(games));
  }
  return games;
}

export function upsertSavedGame(game: SavedGame): SavedGame[] {
  const rest = loadSavedGames().filter((existing) => existing.id !== game.id);
  return write([game, ...rest].slice(0, MAX_GAMES));
}

export function deleteSavedGame(id: string): SavedGame[] {
  return write(loadSavedGames().filter((existing) => existing.id !== id));
}
