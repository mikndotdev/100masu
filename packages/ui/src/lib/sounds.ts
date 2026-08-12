export const SOUND_FILES = {
  incorrect: "incorrect_2.mp3",
  correct: "correct_2.mp3",
  write: "write.mp3",
  start: "start.mp3",
  countdown: "countdown.mp3",
  perfect: "perfect.mp3",
  applaud: "applaud.mp3",
  join: "join.mp3",
  opponent_done: "opponent-done.mp3",
} as const;

export type SoundKey = keyof typeof SOUND_FILES;

export function soundUrl(base: string, key: SoundKey): string {
  return `${base.replace(/\/$/, "")}/${SOUND_FILES[key]}`;
}
