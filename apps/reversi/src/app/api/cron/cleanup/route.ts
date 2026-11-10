import prisma from "@100masu/db";
import { isAuthorizedCron } from "@100masu/server/cron";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const MAX_AGE_MS = 1000 * 60 * 60 * 24;

export async function GET(request: NextRequest) {
  if (!isAuthorizedCron(request)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - MAX_AGE_MS);
  const { count } = await prisma.reversiGame.deleteMany({
    where: { LastUpdated: { lt: cutoff } },
  });

  return Response.json({ deleted: count, cutoff: cutoff.toISOString() });
}
