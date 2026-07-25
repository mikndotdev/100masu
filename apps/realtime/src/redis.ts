import { env } from "@100masu/env/server";
import { RedisClient } from "bun";

export const LOBBY_CHANNEL = "lobby:events";
export const GAME_CHANNEL = "game:events";

export const INSTANCE_ID = crypto.randomUUID();

const RESUBSCRIBE_MS = 2000;

export const subscriber = new RedisClient(env.REDIS_URL);

const publisher = await subscriber.duplicate();

export type GameEvent = {
  origin: string;
  lobbyId: string;
  playerId: string;
  name: string;
  cells: string;
  answers: string[];
  filled: number;
  correct: number;
  finishedAt: number | null;
  placement: number | null;
  timeMs: number | null;
};

async function keepSubscribed(channel: string, onMessage: (message: string) => void) {
  const attempt = async () => {
    try {
      await subscriber.subscribe(channel, onMessage);
    } catch (error) {
      console.error(`redis: subscribe to ${channel} failed, retrying`, error);
      setTimeout(() => void attempt(), RESUBSCRIBE_MS);
    }
  };
  await attempt();
}

export async function subscribeToLobbyEvents(onLobbyEvent: (lobbyId: string) => void) {
  await keepSubscribed(LOBBY_CHANNEL, (message) => {
    onLobbyEvent(message);
  });
}

export async function subscribeToGameEvents(onGameEvent: (event: GameEvent) => void) {
  await keepSubscribed(GAME_CHANNEL, (message) => {
    try {
      onGameEvent(JSON.parse(message) as GameEvent);
    } catch {
      return;
    }
  });
}

export async function publishGameEvent(event: GameEvent) {
  await publisher.publish(GAME_CHANNEL, JSON.stringify(event));
}

export async function touchPresence(playerId: string) {
  await publisher.send("SET", [`presence:player:${playerId}`, "1", "EX", "90"]);
}
