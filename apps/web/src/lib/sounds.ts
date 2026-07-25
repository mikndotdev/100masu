export const SOUND_EFFECTS = {
  incorrect: "https://cdn.mikn.dev/web/100masu/incorrect_2.mp3",
  correct: "https://cdn.mikn.dev/web/100masu/correct_2.mp3",
  write: "https://cdn.mikn.dev/web/100masu/write.mp3",
  start: "https://cdn.mikn.dev/web/100masu/start.mp3",
  countdown: "https://cdn.mikn.dev/web/100masu/countdown.mp3",
  perfect: "https://cdn.mikn.dev/web/100masu/perfect.mp3",
  applaud: "https://cdn.mikn.dev/web/100masu/applaud.mp3",
  join: "https://cdn.mikn.dev/web/100masu/join.mp3",
  opponent_done: "https://cdn.mikn.dev/web/100masu/opponent-done.mp3",
} as const;

export type SoundKey = keyof typeof SOUND_EFFECTS;
