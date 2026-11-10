import { env } from "@100masu/env/server";
import { RedisClient } from "bun";

export const INSTANCE_ID = crypto.randomUUID();

const RESUBSCRIBE_MS = 2000;

const subscriber = new RedisClient(env.REDIS_URL);

const publisher = await subscriber.duplicate();

export async function subscribe(channel: string, onMessage: (message: string) => void) {
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

export async function subscribeJson<T>(channel: string, onMessage: (payload: T) => void) {
  await subscribe(channel, (message) => {
    let payload: T;
    try {
      payload = JSON.parse(message) as T;
    } catch {
      return;
    }
    onMessage(payload);
  });
}

export async function publish(channel: string, message: string) {
  await publisher.publish(channel, message);
}

export async function publishJson(channel: string, payload: unknown) {
  await publish(channel, JSON.stringify(payload));
}

export async function touchPresence(playerId: string): Promise<boolean> {
  const previous = await publisher.send("SET", [
    `presence:player:${playerId}`,
    "1",
    "EX",
    "90",
    "GET",
  ]);
  return previous === null;
}

export async function clearPresence(playerId: string) {
  await publisher.send("DEL", [`presence:player:${playerId}`]);
}

export async function isPresent(playerId: string): Promise<boolean> {
  return (await publisher.exists(`presence:player:${playerId}`)) === true;
}
