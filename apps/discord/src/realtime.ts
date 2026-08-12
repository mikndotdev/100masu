const RAW_BASE = import.meta.env.VITE_REALTIME_BASE ?? "/rt";

export const REALTIME_BASE = RAW_BASE.replace(/\/$/, "");

export const AVATAR_BASE = import.meta.env.VITE_AVATAR_BASE ?? "/cdn";

export const SOUND_BASE = import.meta.env.VITE_SOUND_BASE ?? "/cdn-sounds/web/100masu";

export type Session = {
  playerId: string;
  lobbyId: string;
  accessToken: string;
  isHost: boolean;
  token: string;
};

function httpUrl(path: string): string {
  return new URL(`${REALTIME_BASE}${path}`, window.location.origin).toString();
}

async function send<T>(path: string, method: string, body: unknown): Promise<T> {
  const response = await fetch(httpUrl(path), {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `${method} ${path} failed (${response.status})`);
  }
  return (await response.json()) as T;
}

export function createSession(input: {
  code: string;
  instanceId: string;
  channelId?: string;
  guildId?: string;
}): Promise<Session> {
  return send<Session>("/discord/session", "POST", input);
}

export function pushSettings(input: {
  playerId: string;
  token: string;
  op: "add" | "sub" | "mul" | "div";
  start: number;
  order: "seq" | "rand";
  check: "input" | "end";
}): Promise<{ ok: true }> {
  return send("/discord/settings", "PATCH", input);
}

export function pushSettingsOpen(
  playerId: string,
  token: string,
  open: boolean,
): Promise<{ ok: true }> {
  return send("/discord/lobby", "PATCH", { playerId, token, open });
}

export function startGame(playerId: string, token: string): Promise<{ ok: true }> {
  return send("/discord/start", "POST", { playerId, token });
}

export function requestRematch(playerId: string, token: string): Promise<{ lobbyId: string }> {
  return send("/discord/rematch", "POST", { playerId, token });
}
