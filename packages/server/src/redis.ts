import { env } from "@100masu/env/server";
import Redis from "ioredis";

const globalForRedis = globalThis as unknown as { redisPublisher?: Redis };

function publisher(): Redis {
  if (!globalForRedis.redisPublisher) {
    globalForRedis.redisPublisher = new Redis(env.REDIS_URL, { lazyConnect: true });
  }
  return globalForRedis.redisPublisher;
}

export async function publish(channel: string, message: string) {
  await publisher().publish(channel, message);
}
