import prisma from "@100masu/db";
import { computeCell, GRID_SIZE } from "@100masu/game";

export const HEADERS = Array.from({ length: GRID_SIZE }, (_, i) => i + 1);
export const CELL_TOTAL = GRID_SIZE * GRID_SIZE;

export function correctFor(index: number): string {
  const left = HEADERS[Math.floor(index / GRID_SIZE)]!;
  const top = HEADERS[index % GRID_SIZE]!;
  return String(computeCell("add", left, top));
}

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class Results {
  private passed: string[] = [];
  private failed: string[] = [];

  check(ok: boolean, label: string) {
    (ok ? this.passed : this.failed).push(label);
  }

  report(): number {
    console.log("\n=== PASS ===");
    for (const label of this.passed) {
      console.log("  ✓", label);
    }
    if (this.failed.length > 0) {
      console.log("\n=== FAIL ===");
      for (const label of this.failed) {
        console.log("  ✗", label);
      }
    }
    console.log(`\n${this.passed.length} passed, ${this.failed.length} failed`);
    return this.failed.length;
  }
}

export async function requireServer(base: string) {
  const http = base.replace(/^ws/, "http");
  try {
    const response = await fetch(http, { signal: AbortSignal.timeout(2000) });
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
  } catch (error) {
    console.error(
      `\nCannot reach the realtime server at ${http}.\n` +
        `Start it first:  cd apps/realtime && bun run dev\n` +
        `(reason: ${(error as Error).message})\n`,
    );
    process.exit(1);
  }
}

export type SeededLobby = Awaited<ReturnType<typeof seedLobby>>;

export async function seedLobby(check: "INPUT" | "END", names = ["Alice", "Bob"]) {
  const lobby = await prisma.lobby.create({
    data: {
      InviteCode: `T${Math.floor(Math.random() * 900000 + 100000)}`.slice(0, 6),
      Status: "IN_PROGRESS",
      Op: "ADD",
      StartNumber: 1,
      EndNumber: GRID_SIZE,
      Order: "SEQ",
      Check: check,
      TopHeaders: HEADERS,
      LeftHeaders: HEADERS,
      StartedAt: new Date(),
      Players: {
        create: names.map((Name, index) => ({
          Name,
          IsHost: index === 0,
          Status: "PLAYING" as const,
        })),
      },
    },
    include: { Players: { orderBy: { JoinedAt: "asc" } } },
  });

  return {
    lobby,
    players: lobby.Players,
    cleanup: () => prisma.lobby.delete({ where: { Id: lobby.Id } }).catch(() => undefined),
  };
}

export type TestSocket = {
  ws: WebSocket;
  msgs: Record<string, unknown>[];
  isClosed: () => boolean;
  ready: Promise<boolean>;
};

export function openSocket(base: string, path: string, id: string): TestSocket {
  const ws = new WebSocket(`${base}${path}?id=${id}`);
  const msgs: Record<string, unknown>[] = [];
  let closed = false;

  ws.onmessage = (event) => {
    try {
      msgs.push(JSON.parse(String(event.data)) as Record<string, unknown>);
    } catch {
      return;
    }
  };
  ws.onclose = () => {
    closed = true;
  };

  return {
    ws,
    msgs,
    isClosed: () => closed,
    ready: new Promise<boolean>((resolve) => {
      ws.onopen = () => resolve(true);
      setTimeout(() => resolve(false), 4000);
    }),
  };
}

export function fillBoard(socket: TestSocket) {
  for (let index = 0; index < CELL_TOTAL; index++) {
    socket.ws.send(JSON.stringify({ type: "cell", index, value: correctFor(index) }));
  }
}

export function lastProgressFor(socket: TestSocket, playerId: string) {
  return socket.msgs
    .filter((m) => m.type === "progress" && m.playerId === playerId)
    .at(-1) as { cells: string; correct: number; filled: number } | undefined;
}
