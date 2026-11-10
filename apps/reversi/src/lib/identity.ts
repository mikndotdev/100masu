import { createIdentity, hashIdentity } from "@100masu/reversi/identity";
import { cookies } from "next/headers";

const COOKIE = "reversi-id";
const MAX_AGE = 60 * 60 * 24 * 365;

export async function readIdentity(): Promise<string | null> {
  return (await cookies()).get(COOKIE)?.value ?? null;
}

export async function ensureIdentityHash(): Promise<string> {
  const store = await cookies();
  let identity = store.get(COOKIE)?.value;
  if (!identity) {
    identity = createIdentity();
    store.set(COOKIE, identity, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return hashIdentity(identity);
}
