"use client";

import { env } from "@100masu/env/web";
import { useEffect, useRef, useState } from "react";

import type { Board, CheckMode, Operation } from "@/lib/game";
import { spectateMessageSchema, type SpectatePlayer } from "@/lib/lobby";

function channelUrl(playerId: string): string | null {
  const base = env.NEXT_PUBLIC_REALTIME_BACKEND_URL;
  if (!base) {
    return null;
  }
  const url = new URL("/channels/spectate", base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("id", playerId);
  return url.toString();
}

export type SpectateState = {
  board: Board;
  op: Operation;
  check: CheckMode;
  players: SpectatePlayer[];
};

export function useSpectateChannel(playerId: string | null, enabled: boolean) {
  const [state, setState] = useState<SpectateState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !playerId) {
      return;
    }
    const url = channelUrl(playerId);
    if (!url) {
      return;
    }

    let closed = false;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;

    function connect() {
      if (closed || !url) {
        return;
      }
      const socket = new WebSocket(url);
      socketRef.current = socket;

      socket.onopen = () => {
        attempt = 0;
        setConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const result = spectateMessageSchema.safeParse(JSON.parse(String(event.data)));
          if (!result.success) {
            return;
          }
          const message = result.data;
          if (message.type === "spectate") {
            setState({
              board: message.board,
              op: message.op,
              check: message.check,
              players: message.players,
            });
            return;
          }
          setState((prev) => {
            if (!prev) {
              return prev;
            }
            const players = prev.players.some((player) => player.playerId === message.playerId)
              ? prev.players.map((player) =>
                  player.playerId === message.playerId ? message : player,
                )
              : [...prev.players, message];
            return { ...prev, players };
          });
        } catch {
          return;
        }
      };

      socket.onclose = () => {
        setConnected(false);
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
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [playerId, enabled]);

  return { state, connected };
}
