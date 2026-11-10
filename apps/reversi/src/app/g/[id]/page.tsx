import prisma from "@100masu/db";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import GameView from "@/components/gameView";
import { readIdentity } from "@/lib/identity";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const players = await prisma.reversiPlayer.findMany({
    where: { GameId: id },
    orderBy: { Color: "asc" },
    select: { Name: true },
  });
  return players.length === 2
    ? { title: `${players[0]!.Name} vs ${players[1]!.Name} | リバーシ` }
    : { title: "リバーシ" };
}

export default async function GamePage({ params }: Params) {
  const { id } = await params;
  const game = await prisma.reversiGame.findUnique({ where: { Id: id }, select: { Id: true } });
  if (!game) {
    notFound();
  }

  return <GameView key={id} gameId={id} identity={await readIdentity()} />;
}
