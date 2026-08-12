"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";

import type { Board, CheckMode, Operation } from "@100masu/game";
import { useUiConfig } from "../config";
import { channelUrl } from "../lib/channelUrl";
import { playMessageSchema } from "../protocol";
import { useOpponentsStore } from "../store/opponents";

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
export type FinishEvent = { playerId: string; name: string; placement: number; timeMs: number };

export function usePlayChannel(playerId: string | null, enabled: boolean) {
  const { realtimeBaseUrl } = useUiConfig();
  const [game, setGame] = useState<PlayGame | null>(null);
  const [checkResult, setCheckResult] = useState<CheckResult | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const finishRef = useRef<((event: FinishEvent) => void) | null>(null);
  const outbox = useRef<Map<number, string>>(new Map());
  const setAll = useOpponentsStore((state) => state.setAll);
  const upsert = useOpponentsStore((state) => state.upsert);

  const onFinish = useCallback((handler: (event: FinishEvent) => void) => {
    finishRef.current = handler;
  }, []);

  useEffect(() => {
    if (!enabled || !playerId) {
      return;
    }
    const url = channelUrl(realtimeBaseUrl, "/channels/play", { id: playerId });
    if (!url) {
      return;
    }

    let closed = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let ping: ReturnType<typeof setInterval> | undefined;

    function connect() {
      if (closed || !url) {
        return;
      }
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
        for (const [index, value] of outbox.current) {
          socket.send(JSON.stringify({ type: "cell", index, value }));
        }
        outbox.current.clear();
        ping = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ type: "ping" }));
          }
        }, PING_MS);
      };

      socket.onmessage = (event) => {
        let parsed: z.infer<typeof playMessageSchema>;
        try {
          const result = playMessageSchema.safeParse(JSON.parse(String(event.data)));
          if (!result.success) {
            return;
          }
          parsed = result.data;
        } catch {
          return;
        }

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
      };

      socket.onclose = () => {
        setConnected(false);
        if (ping) {
          clearInterval(ping);
        }
        if (closed) {
          return;
        }
        attempt += 1;
        retry = setTimeout(connect, Math.min(1000 * 2 ** (attempt - 1), 10000));
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      closed = true;
      if (retry) {
        clearTimeout(retry);
      }
      if (ping) {
        clearInterval(ping);
      }
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [playerId, enabled, setAll, upsert, realtimeBaseUrl]);

  const sendCell = useCallback((index: number, value: string) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "cell", index, value }));
      return;
    }
    outbox.current.set(index, value);
  }, []);

  const sendCommit = useCallback((index: number) => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "commit", index }));
    }
  }, []);

  const sendCheck = useCallback(() => {
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "check" }));
    }
  }, []);

  return { game, checkResult, connected, sendCell, sendCommit, sendCheck, onFinish };
}
