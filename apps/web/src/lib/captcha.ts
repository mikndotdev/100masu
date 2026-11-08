import { env } from "@100masu/env/server";
import { env as webEnv } from "@100masu/env/web";

export async function verifyCaptcha(token: string): Promise<boolean> {
  if (!token) {
    return false;
  }

  const url = `${webEnv.NEXT_PUBLIC_CAP_API_ENDPOINT}siteverify`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: env.CAP_SECRET, response: token }),
    });

    const result = (await response.json().catch(() => null)) as {
      success?: boolean;
      error?: string;
    } | null;

    if (!response.ok || result?.success !== true) {
      console.error(`captcha: rejected (HTTP ${response.status} ${result?.error ?? ""})`);
      return false;
    }

    return true;
  } catch (error) {
    console.error("captcha: request failed", error);
    return false;
  }
}
