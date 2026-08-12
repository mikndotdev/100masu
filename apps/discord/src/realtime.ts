const RAW_BASE = import.meta.env.VITE_REALTIME_BASE ?? "/rt";

export const REALTIME_BASE = RAW_BASE.replace(/\/$/, "");

export const AVATAR_BASE = import.meta.env.VITE_AVATAR_BASE ?? "/cdn";

export function httpUrl(path: string): string {
  return new URL(`${REALTIME_BASE}${path}`, window.location.origin).toString();
}

export function wsUrl(path: string): string {
  const url = new URL(`${REALTIME_BASE}${path}`, window.location.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export async function exchangeCode(code: string): Promise<string> {
  const response = await fetch(httpUrl("/discord/token"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!response.ok) {
    throw new Error(`token exchange failed: ${response.status} ${await response.text()}`);
  }
  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string") {
    throw new Error("token exchange returned no access_token");
  }
  return payload.access_token;
}
