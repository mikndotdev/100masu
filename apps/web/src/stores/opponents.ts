import { create } from "zustand";

export type PlayerProgress = {
  playerId: string;
  name: string;
  cells: string;
  filled: number;
  correct: number;
  finishedAt: number | null;
  placement: number | null;
};

type OpponentsState = {
  players: Record<string, PlayerProgress>;
  setAll: (players: PlayerProgress[]) => void;
  upsert: (player: PlayerProgress) => void;
  reset: () => void;
};

export const useOpponentsStore = create<OpponentsState>((set) => ({
  players: {},
  setAll: (players) =>
    set({
      players: Object.fromEntries(players.map((player) => [player.playerId, player])),
    }),
  upsert: (player) =>
    set((state) => ({
      players: { ...state.players, [player.playerId]: player },
    })),
  reset: () => set({ players: {} }),
}));
