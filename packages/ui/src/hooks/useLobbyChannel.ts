"use client";

import { useEffect, useRef, useState } from "react";

import { useSoundEffect } from "../components/soundProvider";
import { useUiConfig } from "../config";
import { channelUrl } from "../lib/channelUrl";
import { lobbySnapshotSchema, type LobbySnapshot } from "../protocol";

type ChannelTarget = { lobbyId?: string; playerId?: string };

function lobbyUrl(base: string, target: ChannelTarget): string | null {
  if (target.lobbyId) {
    return channelUrl(base, "/channels/lobby", { id: target.lobbyId });
  }
  if (target.playerId) {
    return channelUrl(base, "/channels/lobby", { player: target.playerId });
  }
  return null;
}

export function useLobbyChannel(target: ChannelTarget) {
  const { realtimeBaseUrl } = useUiConfig();
  const [snapshot, setSnapshot] = useState<LobbySnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
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

  useEffect(() => {
    const url = lobbyUrl(realtimeBaseUrl, { lobbyId, playerId });
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
          const parsed = lobbySnapshotSchema.safeParse(JSON.parse(String(event.data)));
          if (parsed.success) {
            setSnapshot(parsed.data);
          }
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

      socket.onerror = () => {
        socket.close();
      };
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
  }, [lobbyId, playerId, realtimeBaseUrl]);

  return { snapshot, connected };
}
