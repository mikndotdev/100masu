"use client";

import {
  serverMessageSchema,
  type ClientMessage,
  type ErrorMessage,
  type StateMessage,
} from "@100masu/reversi/protocol";
import { useReconnectingSocket, useUiConfig } from "@100masu/ui";
import { channelUrl } from "@100masu/ui/lib/channelUrl";
import { useCallback, useMemo, useState } from "react";

const PING_MS = 25_000;

export type GameState = StateMessage & { clockOffset: number };

export function useReversiChannel(
  gameId: string,
  identity: string | null,
  onError: (code: ErrorMessage["code"]) => void,
) {
  const { realtimeBaseUrl } = useUiConfig();
  const [state, setState] = useState<GameState | null>(null);

  const url = useMemo(
    () =>
      channelUrl(realtimeBaseUrl, "/reversi/channels/game", {
        game: gameId,
        ...(identity ? { id: identity } : {}),
      }),
    [realtimeBaseUrl, gameId, identity],
  );

  const onMessage = useCallback(
    (data: unknown) => {
      const parsed = serverMessageSchema.safeParse(data);
      if (!parsed.success) {
        return;
      }
      const message = parsed.data;
      if (message.type === "state") {
        setState((previous) =>
          previous && previous.gameId === message.gameId && previous.version > message.version
            ? previous
            : { ...message, clockOffset: Date.now() - message.serverNow },
        );
        return;
      }
      if (message.type === "error") {
        onError(message.code);
      }
    },
    [onError],
  );

  const { connected, send } = useReconnectingSocket<ClientMessage>(url, {
    pingMs: PING_MS,
    onMessage,
  });

  const move = useCallback(
    (idx: number) => {
      if (state) {
        send({ type: "move", idx, version: state.version });
      }
    },
    [send, state],
  );
  const resign = useCallback(() => send({ type: "resign" }), [send]);
  const rematch = useCallback(() => send({ type: "rematch" }), [send]);

  return { state, connected, move, resign, rematch };
}
