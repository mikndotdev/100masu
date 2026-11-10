"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MAX_BACKOFF_MS = 10_000;

type Options = {
  pingMs?: number;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
};

export function useReconnectingSocket<TSend = unknown>(
  url: string | null,
  { pingMs, onMessage, onOpen }: Options,
) {
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  const onOpenRef = useRef(onOpen);

  useEffect(() => {
    onMessageRef.current = onMessage;
    onOpenRef.current = onOpen;
  }, [onMessage, onOpen]);

  useEffect(() => {
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
        onOpenRef.current?.();
        if (pingMs) {
          ping = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: "ping" }));
            }
          }, pingMs);
        }
      };

      socket.onmessage = (event) => {
        let data: unknown;
        try {
          data = JSON.parse(String(event.data));
        } catch {
          return;
        }
        onMessageRef.current(data);
      };

      socket.onclose = () => {
        setConnected(false);
        clearInterval(ping);
        if (closed) {
          return;
        }
        attempt += 1;
        retry = setTimeout(connect, Math.min(1000 * 2 ** (attempt - 1), MAX_BACKOFF_MS));
      };

      socket.onerror = () => socket.close();
    }

    connect();

    return () => {
      closed = true;
      clearTimeout(retry);
      clearInterval(ping);
      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [url, pingMs]);

  const send = useCallback((message: TSend) => {
    const socket = socketRef.current;
    if (socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    socket.send(JSON.stringify(message));
    return true;
  }, []);

  return { connected, send };
}
