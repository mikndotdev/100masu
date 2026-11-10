import { LOBBY_EVENTS_CHANNEL } from "@100masu/game";

import { publish, publishJson, subscribe, subscribeJson } from "../../shared/pubsub";

const GAME_CHANNEL = "game:events";

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
  discordUserId: string | null;
  avatar: string | null;
};

export async function subscribeToLobbyEvents(onLobbyEvent: (lobbyId: string) => void) {
  await subscribe(LOBBY_EVENTS_CHANNEL, onLobbyEvent);
}

export async function subscribeToGameEvents(onGameEvent: (event: GameEvent) => void) {
  await subscribeJson(GAME_CHANNEL, onGameEvent);
}

export async function publishGameEvent(event: GameEvent) {
  await publishJson(GAME_CHANNEL, event);
}

export async function publishLobbyEvent(lobbyId: string) {
  await publish(LOBBY_EVENTS_CHANNEL, lobbyId);
}
