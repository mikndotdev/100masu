import { LOBBY_EVENTS_CHANNEL } from "@100masu/game";
import { publish } from "@100masu/server/redis";

export async function publishLobbyEvent(lobbyId: string) {
  await publish(LOBBY_EVENTS_CHANNEL, lobbyId);
}
