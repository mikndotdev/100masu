export function channelUrl(
  base: string,
  path: string,
  params: Record<string, string>,
): string | null {
  if (!base) {
    return null;
  }

  const origin = typeof window === "undefined" ? undefined : window.location.origin;
  const target = `${base.replace(/\/$/, "")}${path}`;

  let url: URL;
  try {
    url = new URL(target, origin);
  } catch {
    return null;
  }

  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}
