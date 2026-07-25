"use server";

import prisma from "@100masu/db";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { verifyCaptcha } from "@/lib/captcha";
import { generateHeaders, GRID_SIZE } from "@/lib/game";
import {
  CHECK_TO_DB,
  generateInviteCode,
  inviteCodeSchema,
  MAX_PLAYERS,
  MIN_PLAYERS,
  OPERATION_TO_DB,
  ORDER_FROM_DB,
  ORDER_TO_DB,
  playerNameSchema,
} from "@/lib/lobby";
import { publishLobbyEvent } from "@/lib/redis";
import { actionClient } from "@/lib/safe-action";

const PLAYER_COOKIE = "mp-player";
const LOBBY_COOKIE = "mp-lobby";
const COOKIE_MAX_AGE = 60 * 60 * 6;
const LOBBY_TTL_MS = 1000 * 60 * 60 * 6;
const INTRO_MS = 5400;

async function clientIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return (forwarded.split(",")[0] ?? "").trim() || "127.0.0.1";
  }
  return headerList.get("x-real-ip") ?? "127.0.0.1";
}

async function setSessionCookies(playerId: string, lobbyId: string) {
  const cookieStore = await cookies();
  const options = {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  } as const;
  cookieStore.set(PLAYER_COOKIE, playerId, options);
  cookieStore.set(LOBBY_COOKIE, lobbyId, options);
}

async function notifyLobby(lobbyId: string) {
  try {
    await publishLobbyEvent(lobbyId);
  } catch {
    return;
  }
}

async function createUniqueInviteCode(): Promise<string> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateInviteCode();
    const existing = await prisma.lobby.findUnique({ where: { InviteCode: code } });
    if (!existing) {
      return code;
    }
  }
  throw new Error("Could not allocate an invite code");
}

export const createLobby = actionClient
  .inputSchema(
    z.object({
      name: playerNameSchema,
      ticket: z.string().min(1),
      randstr: z.string().min(1),
      op: z.enum(["add", "sub", "mul", "div"]),
      start: z.number().int(),
      end: z.number().int(),
      order: z.enum(["seq", "rand"]),
      check: z.enum(["input", "end"]),
    }),
  )
  .action(async ({ parsedInput }) => {
    const passed = await verifyCaptcha(parsedInput.ticket, parsedInput.randstr, await clientIp());
    if (!passed) {
      return { ok: false as const, error: "captcha" as const };
    }

    const inviteCode = await createUniqueInviteCode();

    const lobby = await prisma.lobby.create({
      data: {
        InviteCode: inviteCode,
        MaxPlayers: MAX_PLAYERS,
        ExpiresAt: new Date(Date.now() + LOBBY_TTL_MS),
        Op: OPERATION_TO_DB[parsedInput.op],
        StartNumber: parsedInput.start,
        EndNumber: parsedInput.start + GRID_SIZE - 1,
        Order: ORDER_TO_DB[parsedInput.order],
        Check: CHECK_TO_DB[parsedInput.check],
        Players: {
          create: {
            Name: parsedInput.name,
            IsHost: true,
          },
        },
      },
      include: { Players: true },
    });

    const host = lobby.Players[0];
    if (!host) {
      return { ok: false as const, error: "unknown" as const };
    }

    await setSessionCookies(host.Id, lobby.Id);
    redirect(`/mp/lobby/${lobby.Id}`);
  });

export const lookupInvite = actionClient
  .inputSchema(z.object({ code: inviteCodeSchema }))
  .action(async ({ parsedInput }) => {
    const lobby = await prisma.lobby.findUnique({
      where: { InviteCode: parsedInput.code },
      select: { Status: true, MaxPlayers: true, _count: { select: { Players: true } } },
    });

    if (!lobby) {
      return { ok: false as const, error: "notFound" as const };
    }
    if (lobby.Status !== "OPEN") {
      return { ok: false as const, error: "closed" as const };
    }
    if (lobby._count.Players >= lobby.MaxPlayers) {
      return { ok: false as const, error: "full" as const };
    }
    return { ok: true as const };
  });

export const joinLobby = actionClient
  .inputSchema(
    z.object({
      code: inviteCodeSchema,
      name: playerNameSchema,
    }),
  )
  .action(async ({ parsedInput }) => {
    const lobby = await prisma.lobby.findUnique({
      where: { InviteCode: parsedInput.code },
      include: { Players: true },
    });

    if (!lobby) {
      return { ok: false as const, error: "notFound" as const };
    }
    if (lobby.Status !== "OPEN") {
      return { ok: false as const, error: "closed" as const };
    }
    if (lobby.Players.length >= lobby.MaxPlayers) {
      return { ok: false as const, error: "full" as const };
    }

    const player = await prisma.player.create({
      data: {
        LobbyId: lobby.Id,
        Name: parsedInput.name,
      },
    });

    await setSessionCookies(player.Id, lobby.Id);
    await notifyLobby(lobby.Id);
    redirect(`/mp/play/${player.Id}`);
  });

export const startGame = actionClient
  .inputSchema(z.object({ lobbyId: z.string().min(1) }))
  .action(async ({ parsedInput }) => {
    const cookieStore = await cookies();
    const playerId = cookieStore.get(PLAYER_COOKIE)?.value;
    if (!playerId) {
      return { ok: false as const, error: "notHost" as const };
    }

    const lobby = await prisma.lobby.findUnique({
      where: { Id: parsedInput.lobbyId },
      include: { Players: true },
    });

    if (!lobby) {
      return { ok: false as const, error: "notFound" as const };
    }

    const host = lobby.Players.find((player) => player.Id === playerId);
    if (!host?.IsHost) {
      return { ok: false as const, error: "notHost" as const };
    }
    if (lobby.Players.length < MIN_PLAYERS) {
      return { ok: false as const, error: "tooFewPlayers" as const };
    }
    if (lobby.Status !== "OPEN") {
      return { ok: false as const, error: "closed" as const };
    }

    const order = ORDER_FROM_DB[lobby.Order];
    const board = {
      top: generateHeaders(lobby.StartNumber, order),
      left: generateHeaders(lobby.StartNumber, order),
    };

    await prisma.lobby.update({
      where: { Id: lobby.Id },
      data: {
        Status: "IN_PROGRESS",
        StartedAt: new Date(Date.now() + INTRO_MS),
        TopHeaders: board.top,
        LeftHeaders: board.left,
        Players: {
          updateMany: {
            where: { LobbyId: lobby.Id },
            data: { Status: "PLAYING" },
          },
        },
      },
    });

    await notifyLobby(lobby.Id);
    redirect(`/mp/play/${host.Id}`);
  });
