import prisma from "@100masu/db";
import { opponent } from "@100masu/reversi";
import { hashIdentity } from "@100masu/reversi/identity";
import { redirect } from "next/navigation";

import JoinForm from "@/components/joinForm";
import { readIdentity } from "@/lib/identity";
import { inviteCodeSchema } from "@/lib/game";

export default async function JoinCodePage({ params }: { params: Promise<{ code: string }> }) {
  const parsed = inviteCodeSchema.safeParse((await params).code);
  const game = parsed.success
    ? await prisma.reversiGame.findUnique({
        where: { InviteCode: parsed.data },
        include: { Players: true },
      })
    : null;

  if (!game) {
    redirect("/join?error=notFound");
  }

  const identity = await readIdentity();
  const host = game.Players[0];
  const seated = identity
    ? game.Players.some((player) => player.IdentityHash === hashIdentity(identity))
    : false;
  if (game.Status !== "waiting" || !host || seated) {
    redirect(`/g/${game.Id}`);
  }

  return <JoinForm code={game.InviteCode} hostName={host.Name} color={opponent(host.Color)} />;
}
