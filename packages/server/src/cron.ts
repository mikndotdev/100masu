import { env } from "@100masu/env/server";

export function isAuthorizedCron(request: Request): boolean {
  const secret = env.CRON_SECRET;
  return !!secret && request.headers.get("authorization") === `Bearer ${secret}`;
}
