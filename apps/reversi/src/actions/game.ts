"use server";

import prisma from "@100masu/db";
import { allocateInviteCode, newGameData, startedFields } from "@100masu/db/reversi";
import { CLOCK_PRESETS, opponent } from "@100masu/reversi";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyCaptcha } from "@100masu/server/captcha";
import { actionClient } from "@100masu/server/safe-action";
import {
  CLOCK_PRESET_KEYS,
  COLOR_CHOICES,
  inviteCodeSchema,
  playerNameSchema,
  resolveColor,
} from "@/lib/game";
import { ensureIdentityHash } from "@/lib/identity";
import { notifyGame } from "@/lib/redis";

class SeatTaken extends Error {}

export const createGame = actionClient
  .inputSchema(
    z.object({
      name: playerNameSchema,
      color: z.enum(COLOR_CHOICES),
      clock: z.enum(CLOCK_PRESET_KEYS),
      captchaToken: z.string().min(1),
    }),
  )
  .action(async ({ parsedInput }) => {
    if (!(await verifyCaptcha(parsedInput.captchaToken))) {
      return { ok: false as const, error: "captcha" as const };
    }

    const identityHash = await ensureIdentityHash();
    const color = resolveColor(parsedInput.color);
    const game = await prisma.reversiGame.create({
      data: newGameData({
        inviteCode: await allocateInviteCode(),
        clock: CLOCK_PRESETS[parsedInput.clock],
        seats: [{ Color: color, Name: parsedInput.name, IdentityHash: identityHash }],
        now: new Date(),
      }),
    });

    redirect(`/g/${game.Id}`);
  });

export const joinGame = actionClient
  .inputSchema(z.object({ code: inviteCodeSchema, name: playerNameSchema }))
  .action(async ({ parsedInput }) => {
    const game = await prisma.reversiGame.findUnique({
      where: { InviteCode: parsedInput.code },
      include: { Players: true },
    });
    if (!game) {
      return { ok: false as const, error: "notFound" as const };
    }

    const identityHash = await ensureIdentityHash();
    const host = game.Players[0];
    if (game.Status !== "waiting" || !host || host.IdentityHash === identityHash) {
      redirect(`/g/${game.Id}`);
    }

    try {
      await prisma.$transaction(async (tx) => {
        await tx.reversiPlayer.create({
          data: {
            GameId: game.Id,
            Color: opponent(host.Color),
            Name: parsedInput.name,
            IdentityHash: identityHash,
          },
        });
        const started = await tx.reversiGame.updateMany({
          where: { Id: game.Id, Status: "waiting" },
          data: { ...startedFields(game.ClockBaseMs, new Date()), Version: { increment: 1 } },
        });
        if (started.count === 0) {
          throw new SeatTaken();
        }
      });
    } catch (error) {
      const taken =
        error instanceof SeatTaken ||
        (typeof error === "object" && error !== null && "code" in error && error.code === "P2002");
      if (!taken) {
        throw error;
      }
      redirect(`/g/${game.Id}`);
    }

    await notifyGame(game.Id);
    redirect(`/g/${game.Id}`);
  });
