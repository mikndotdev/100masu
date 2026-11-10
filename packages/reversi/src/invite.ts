const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const INVITE_LENGTH = 6;

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(INVITE_LENGTH));
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}
