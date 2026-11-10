import { CLOCK_PRESETS, INVITE_LENGTH, type ClockPreset, type Color } from "@100masu/reversi";
import { z } from "zod";

export const MAX_NAME_LENGTH = 20;

export const CLOCK_PRESET_KEYS = Object.keys(CLOCK_PRESETS) as [ClockPreset, ...ClockPreset[]];

export const playerNameSchema = z.string().trim().min(1).max(MAX_NAME_LENGTH);

export const inviteCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(INVITE_LENGTH)
  .regex(/^[A-Z0-9]+$/);

export const COLOR_CHOICES = ["B", "random", "W"] as const;

export type ColorChoice = (typeof COLOR_CHOICES)[number];

export function resolveColor(choice: ColorChoice): Color {
  if (choice === "random") {
    return Math.random() < 0.5 ? "B" : "W";
  }
  return choice;
}
