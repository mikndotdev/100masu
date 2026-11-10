"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSoundEffect } from "../components/soundProvider";
import { useUiConfig } from "../config";
import { channelUrl } from "../lib/channelUrl";
import { lobbySnapshotSchema, type LobbySnapshot } from "../protocol";
import { useReconnectingSocket } from "./useReconnectingSocket";

type ChannelTarget = { lobbyId?: string; playerId?: string };

function lobbyUrl(base: string, target: ChannelTarget): string | null {
  if (target.lobbyId) {
    return channelUrl(base, "/masu/channels/lobby", { id: target.lobbyId });
  }
  if (target.playerId) {
    return channelUrl(base, "/masu/channels/lobby", { player: target.playerId });
  }
  return null;
}

export function useLobbyChannel(target: ChannelTarget) {
  const { realtimeBaseUrl } = useUiConfig();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const playerCountRef = useRef<number | null>(null);
  const { play } = useSoundEffect();
  const { lobbyId, playerId } = target;

  useEffect(() => {
    if (!snapshot) {
      return;
    }
    const count = snapshot.players.length;
    const previous = playerCountRef.current;
    playerCountRef.current = count;
    if (previous !== null && count > previous) {
      play("join");
    }
  }, [snapshot, play]);

  const onMessage = useCallback((data: unknown) => {
    const parsed = lobbySnapshotSchema.safeParse(data);
    if (parsed.success) {
      setSnapshot(parsed.data);
    }
  }, []);

  const { connected } = useReconnectingSocket(lobbyUrl(realtimeBaseUrl, { lobbyId, playerId }), {
    onMessage,
  });

  return { snapshot, connected };
}
