import type { Color } from "./board";

export type Clock = {
  B: number;
  W: number;
  incrementMs: number;
  turnStartedAt: number;
};

export const CLOCK_PRESETS = {
  untimed: null,
  "3+2": { baseMs: 180_000, incrementMs: 2_000 },
  "5+0": { baseMs: 300_000, incrementMs: 0 },
  "10+5": { baseMs: 600_000, incrementMs: 5_000 },
} as const;

export type ClockPreset = keyof typeof CLOCK_PRESETS;

export function remaining(clock: Clock, color: Color, turn: Color | null, now: number): number {
  if (color !== turn) {
    return clock[color];
  }
  return clock[color] - (now - clock.turnStartedAt);
}

export function deadline(clock: Clock, turn: Color): number {
  return clock.turnStartedAt + clock[turn];
}

export function flagged(clock: Clock, turn: Color, now: number): boolean {
  return remaining(clock, turn, turn, now) <= 0;
}

export function chargeMove(clock: Clock, mover: Color, now: number): Clock {
  return {
    ...clock,
    [mover]: remaining(clock, mover, mover, now) + clock.incrementMs,
    turnStartedAt: now,
  };
}
