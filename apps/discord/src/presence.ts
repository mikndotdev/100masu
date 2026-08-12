import { formatDuration, type CheckMode, type Operation } from "@100masu/game";
import type { TFunction } from "i18next";

export type Activity = {
  type?: number;
  details?: string | null;
  state?: string | null;
  timestamps?: { start?: number; end?: number } | null;
  party?: { id?: string | null; size?: number[] | null } | null;
  instance?: boolean | null;
};

const PLAYING = 0;

function party(instanceId: string, players: number, max: number) {
  return { id: instanceId, size: [players, max] };
}

export function lobbyActivity(
  t: TFunction,
  instanceId: string,
  players: number,
  max: number,
): Activity {
  return {
    type: PLAYING,
    details: t("presence.lobby"),
    state: t("presence.waiting"),
    party: party(instanceId, players, max),
    instance: true,
  };
}

export function playingActivity(
  t: TFunction,
  instanceId: string,
  input: {
    op: Operation;
    start: number;
    end: number;
    check: CheckMode;
    correct: number;
    filled: number;
    answerable: number;
    startedAt: number | null;
    players: number;
    max: number;
  },
): Activity {
  const score =
    input.check === "input"
      ? t("play.correct", { correct: input.correct, answerable: input.answerable })
      : t("play.filled", { filled: input.filled, answerable: input.answerable });

  return {
    type: PLAYING,
    details: `${t(`op.${input.op}`)} · ${input.start}–${input.end}`,
    state: score,
    timestamps: input.startedAt === null ? null : { start: Math.round(input.startedAt) },
    party: party(instanceId, input.players, input.max),
    instance: true,
  };
}

export function finishedActivity(
  t: TFunction,
  instanceId: string,
  input: { placement: number; elapsedMs: number | null; players: number; max: number },
): Activity {
  return {
    type: PLAYING,
    details: t("presence.finished", { place: t("mp.place", { n: input.placement }) }),
    state:
      input.elapsedMs === null
        ? null
        : t("presence.inTime", { time: formatDuration(input.elapsedMs) }),
    party: party(instanceId, input.players, input.max),
    instance: true,
  };
}
