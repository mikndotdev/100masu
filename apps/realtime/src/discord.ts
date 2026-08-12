import { env } from "@100masu/env/server";

const TOKEN_URL = "https://discord.com/api/oauth2/token";

export type TokenResult =
  | { ok: true; accessToken: string }
  | { ok: false; error: "unconfigured" | "rejected" | "unreachable" };

export async function exchangeCode(code: string): Promise<TokenResult> {
  const clientId = env.DISCORD_CLIENT_ID;
  const clientSecret = env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return { ok: false, error: "unconfigured" };
  }

  let response: Response;
  try {
    response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });
  } catch (error) {
    console.error("discord: token endpoint unreachable", error);
    return { ok: false, error: "unreachable" };
  }

  if (!response.ok) {
    console.error("discord: token exchange rejected", response.status, await response.text());
    return { ok: false, error: "rejected" };
  }

  const payload = (await response.json()) as { access_token?: unknown };
  if (typeof payload.access_token !== "string") {
    console.error("discord: token response missing access_token");
    return { ok: false, error: "rejected" };
  }

  return { ok: true, accessToken: payload.access_token };
}
