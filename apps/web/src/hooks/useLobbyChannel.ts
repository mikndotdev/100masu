"use client";

import { env } from "@100masu/env/web";
import { useEffect, useRef, useState } from "react";

import { useSoundEffect } from "@/components/soundProvider";
import { lobbySnapshotSchema, type LobbySnapshot } from "@/lib/lobby";

type ChannelTarget = { lobbyId?: string; playerId?: string };

function channelUrl(target: ChannelTarget): string | null {
  const base = env.NEXT_PUBLIC_REALTIME_BACKEND_URL;
  if (!base || (!target.lobbyId && !target.playerId)) {
    return null;
  }
  const url = new URL("/channels/lobby", base);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  if (target.lobbyId) {
    url.searchParams.set("id", target.lobbyId);
  } else if (target.playerId) {
    url.searchParams.set("player", target.playerId);
  }
  return url.toString();
}

export function useLobbyChannel(target: ChannelTarget) {
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
    const url = channelUrl({ lobbyId, playerId });
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
  }, [lobbyId, playerId]);

  return { snapshot, connected };
}
