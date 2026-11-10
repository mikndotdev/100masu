import { GAME_EVENTS_CHANNEL, type GameEvent } from "@100masu/reversi/protocol";
import { publish } from "@100masu/server/redis";

export async function notifyGame(gameId: string) {
  const event: GameEvent = { gameId };
  try {
    await publish(GAME_EVENTS_CHANNEL, JSON.stringify(event));
  } catch (error) {
    console.error("reversi: notify failed", error);
  }
}
