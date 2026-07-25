import { env } from "@100masu/env/server";
import Redis from "ioredis";

export const LOBBY_CHANNEL = "lobby:events";

const globalForRedis = globalThis as unknown as { lobbyPublisher?: Redis };

function publisher(): Redis {
  if (!globalForRedis.lobbyPublisher) {
    globalForRedis.lobbyPublisher = new Redis(env.REDIS_URL, { lazyConnect: true });
  }
  return globalForRedis.lobbyPublisher;
}

export async function publishLobbyEvent(lobbyId: string) {
  await publisher().publish(LOBBY_CHANNEL, lobbyId);
}
