import { env } from "@100masu/env/server";
import { RedisClient } from "bun";

export const LOBBY_CHANNEL = "lobby:events";

export const subscriber = new RedisClient(env.REDIS_URL);

export async function subscribeToLobbyEvents(onLobbyEvent: (lobbyId: string) => void) {
  await subscriber.subscribe(LOBBY_CHANNEL, (message) => {
    onLobbyEvent(message);
  });
}
