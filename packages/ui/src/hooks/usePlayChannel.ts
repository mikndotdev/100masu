"use client";

import { useCallback, useRef, useState } from "react";

import type { Board, CheckMode, Operation } from "@100masu/game";
import { useUiConfig } from "../config";
import { channelUrl } from "../lib/channelUrl";
import { playMessageSchema } from "../protocol";
import { useOpponentsStore } from "../store/opponents";
import { useReconnectingSocket } from "./useReconnectingSocket";

const PING_MS = 25_000;

export type PlayGame = {
  board: Board;
  op: Operation;
  check: CheckMode;
  startedAt: number | null;
  clockOffset: number;
  answers: string[];
  finishedAt: number | null;
  syncedAt: number;
};

export type CheckResult = {
  cells: string;
  correct: number;
  answerable: number;
  solved: boolean;
  at: number;
};
type PlayClientMessage =
  | { type: "cell"; index: number; value: string }
  | { type: "commit"; index: number }
  | { type: "check" };

export type FinishEvent = { playerId: string; name: string; placement: number; timeMs: number };

export function usePlayChannel(playerId: string | null, enabled: boolean) {
  const { realtimeBaseUrl } = useUiConfig();
  const [game, setGame] = useState<PlayGame | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const finishRef = useRef<((event: FinishEvent) => void) | null>(null);
  const outbox = useRef<Map<number, string>>(new Map());
  const setAll = useOpponentsStore((state) => state.setAll);
  const upsert = useOpponentsStore((state) => state.upsert);

  const onFinish = useCallback((handler: (event: FinishEvent) => void) => {
    finishRef.current = handler;
  }, []);

  const onMessage = useCallback(
    (data: unknown) => {
      const result = playMessageSchema.safeParse(data);
      if (!result.success) {
        return;
      }
      const parsed = result.data;

      if (parsed.type === "game") {
        setGame({
          board: parsed.board,
          op: parsed.op,
          check: parsed.check,
          startedAt: parsed.startedAt,
          clockOffset: Date.now() - parsed.serverNow,
          answers: parsed.you.answers,
          finishedAt: parsed.you.finishedAt,
          syncedAt: Date.now(),
        });
        setAll(parsed.players);
        return;
      }

      if (parsed.type === "progress") {
        upsert(parsed);
        return;
      }

      if (parsed.type === "checkResult") {
        setCheckResult({ ...parsed, at: Date.now() });
        return;
      }

      if (parsed.type === "finished") {
        finishRef.current?.(parsed);
      }
    },
    [setAll, upsert],
  );

  const url =
    enabled && playerId
      ? channelUrl(realtimeBaseUrl, "/masu/channels/play", { id: playerId })
      : null;

  const { connected, send } = useReconnectingSocket<PlayClientMessage>(url, {
    pingMs: PING_MS,
    onMessage,
    onOpen: () => {
      for (const [index, value] of outbox.current) {
        send({ type: "cell", index, value });
      }
      outbox.current.clear();
    },
  });

  const sendCell = useCallback(
    (index: number, value: string) => {
      if (!send({ type: "cell", index, value })) {
        outbox.current.set(index, value);
      }
    },
    [send],
  );

  const sendCommit = useCallback((index: number) => send({ type: "commit", index }), [send]);

  const sendCheck = useCallback(() => send({ type: "check" }), [send]);

  return { game, checkResult, connected, sendCell, sendCommit, sendCheck, onFinish };
}
