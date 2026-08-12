import prisma from "@100masu/db";
import { env } from "@100masu/env/server";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const MAX_AGE_MS = 1000 * 60 * 60 * 24;

export async function GET(request: NextRequest) {
  const secret = env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const cutoff = new Date(Date.now() - MAX_AGE_MS);

  const { count } = await prisma.lobby.deleteMany({
    where: {
      OR: [
        { Status: "COMPLETED", FinishedAt: { lt: cutoff } },
        {
          LastUpdated: { lt: cutoff },
          Players: { none: { LastPingAt: { gte: cutoff } } },
        },
      ],
    },
  });

  return Response.json({ deleted: count, cutoff: cutoff.toISOString() });
}
