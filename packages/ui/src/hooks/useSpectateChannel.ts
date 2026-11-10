"use client";

import { useCallback, useState } from "react";

import type { Board, CheckMode, Operation } from "@100masu/game";
import { useUiConfig } from "../config";
import { channelUrl } from "../lib/channelUrl";
import { spectateMessageSchema, type SpectatePlayer } from "../protocol";
import { useReconnectingSocket } from "./useReconnectingSocket";

export type SpectateState = {
  board: Board;
  op: Operation;
  check: CheckMode;
  players: SpectatePlayer[];
};

export function useSpectateChannel(playerId: string | null, enabled: boolean) {
  const { realtimeBaseUrl } = useUiConfig();
  const [state, setState] = useState<SpectateState | null>(null);

  const onMessage = useCallback((data: unknown) => {
    const result = spectateMessageSchema.safeParse(data);
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
        ? prev.players.map((player) => (player.playerId === message.playerId ? message : player))
        : [...prev.players, message];
      return { ...prev, players };
    });
  }, []);

  const url =
    enabled && playerId
      ? channelUrl(realtimeBaseUrl, "/masu/channels/spectate", { id: playerId })
      : null;
  const { connected } = useReconnectingSocket(url, { onMessage });

  return { state, connected };
}
