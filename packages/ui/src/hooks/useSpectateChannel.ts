"use client";

import { useEffect, useRef, useState } from "react";

import type { Board, CheckMode, Operation } from "@100masu/game";
import { useUiConfig } from "../config";
import { channelUrl } from "../lib/channelUrl";
import { spectateMessageSchema, type SpectatePlayer } from "../protocol";

export type SpectateState = {
  board: Board;
  op: Operation;
  check: CheckMode;
  players: SpectatePlayer[];
};

export function useSpectateChannel(playerId: string | null, enabled: boolean) {
  const { realtimeBaseUrl } = useUiConfig();
  const [state, setState] = useState<SpectateState | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!enabled || !playerId) {
      return;
    }
    const url = channelUrl(realtimeBaseUrl, "/channels/spectate", { id: playerId });
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
  }, [playerId, enabled, realtimeBaseUrl]);

  return { state, connected };
}
