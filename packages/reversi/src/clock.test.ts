import { describe, expect, test } from "bun:test";

import { chargeMove, deadline, flagged, remaining, type Clock } from "./clock";

function startClock(baseMs: number, incrementMs: number, turnStartedAt: number): Clock {
  return { B: baseMs, W: baseMs, incrementMs, turnStartedAt };
}

describe("clock", () => {
  test("only the side to move loses time", () => {
    const clock = startClock(180_000, 2_000, 1_000);
    expect(remaining(clock, "B", "B", 11_000)).toBe(170_000);
    expect(remaining(clock, "W", "B", 11_000)).toBe(180_000);
  });

  test("a move charges elapsed time, adds the increment and hands over", () => {
    const clock = chargeMove(startClock(180_000, 2_000, 0), "B", 30_000);
    expect(clock.B).toBe(152_000);
    expect(clock.W).toBe(180_000);
    expect(clock.turnStartedAt).toBe(30_000);
    expect(deadline(clock, "W")).toBe(210_000);
  });

  test("the side to move flags at zero", () => {
    const clock = startClock(300_000, 0, 0);
    expect(flagged(clock, "B", 299_999)).toBe(false);
    expect(flagged(clock, "B", 300_000)).toBe(true);
  });
});
