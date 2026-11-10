import { createHash, randomBytes } from "node:crypto";

export function createIdentity(): string {
  return randomBytes(24).toString("base64url");
}

export function hashIdentity(identity: string): string {
  return createHash("sha256").update(identity).digest("hex");
}
