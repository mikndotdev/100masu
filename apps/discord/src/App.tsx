import { DiscordSDK } from "@discord/embedded-app-sdk";
import Avatar from "@100masu/ui/components/avatar";
import { useEffect, useRef, useState } from "react";

import { exchangeCode, REALTIME_BASE, wsUrl } from "./realtime";

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? "";

type StepState = "pending" | "running" | "ok" | "fail";

type Step = { key: string; label: string; state: StepState; detail?: string };

type Participant = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

const STEPS: { key: string; label: string }[] = [
  { key: "sdk", label: "SDK constructed (frame_id present)" },
  { key: "ready", label: "Handshake with Discord client" },
  { key: "authorize", label: "OAuth authorize() returned a code" },
  { key: "token", label: "Code exchanged server-side for a token" },
  { key: "authenticate", label: "authenticate() accepted the token" },
  { key: "participants", label: "Participants fetched" },
  { key: "socket", label: "WebSocket open through the proxy" },
  { key: "echo", label: "Echo frame received back" },
];

const DOT_CLASS: Record<StepState, string> = {
  pending: "bg-base-300",
  running: "bg-primary animate-pulse",
  ok: "bg-success",
  fail: "bg-error",
};

function displayName(participant: Participant): string {
  return participant.global_name || participant.username;
}

export default function App() {
  const [steps, setSteps] = useState<Step[]>(() =>
    STEPS.map((step) => ({ ...step, state: "pending" as StepState })),
  );
  const [ids, setIds] = useState<Record<string, string | null>>({});
  const [user, setUser] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [pongs, setPongs] = useState(0);
  const [fatal, setFatal] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;

    let socket: WebSocket | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    function mark(key: string, state: StepState, detail?: string) {
      setSteps((prev) =>
        prev.map((step) => (step.key === key ? { ...step, state, detail } : step)),
      );
    }

    async function run() {
      if (!CLIENT_ID) {
        setFatal("VITE_DISCORD_CLIENT_ID is not set. Add it to apps/discord/.env.local.");
        return;
      }

      let sdk: DiscordSDK;
      mark("sdk", "running");
      try {
        sdk = new DiscordSDK(CLIENT_ID);
      } catch (error) {
        mark("sdk", "fail", String(error));
        setFatal(
          "The SDK could not initialise, which almost always means this page was opened " +
            "directly in a browser. Launch it as an Activity from a Discord voice channel.",
        );
        return;
      }
      mark("sdk", "ok");
      setIds({
        instanceId: sdk.instanceId,
        channelId: sdk.channelId,
        guildId: sdk.guildId,
        platform: sdk.platform,
      });

      mark("ready", "running");
      try {
        await sdk.ready();
        mark("ready", "ok");
      } catch (error) {
        mark("ready", "fail", String(error));
        return;
      }

      mark("authorize", "running");
      let code: string;
      try {
        const result = await sdk.commands.authorize({
          client_id: CLIENT_ID,
          response_type: "code",
          state: "",
          prompt: "none",
          scope: ["identify", "guilds"],
        });
        code = result.code;
        mark("authorize", "ok");
      } catch (error) {
        mark("authorize", "fail", String(error));
        return;
      }

      mark("token", "running");
      let accessToken: string;
      try {
        accessToken = await exchangeCode(code);
        mark("token", "ok", `via ${REALTIME_BASE}/discord/token`);
      } catch (error) {
        mark("token", "fail", String(error));
        return;
      }

      mark("authenticate", "running");
      try {
        const auth = await sdk.commands.authenticate({ access_token: accessToken });
        setUser(auth.user.global_name || auth.user.username);
        mark("authenticate", "ok");
      } catch (error) {
        mark("authenticate", "fail", String(error));
        return;
      }

      mark("participants", "running");
      try {
        const result = await sdk.commands.getInstanceConnectedParticipants();
        setParticipants(result.participants);
        mark("participants", "ok", `${result.participants.length} connected`);
      } catch (error) {
        mark("participants", "fail", String(error));
      }

      void sdk
        .subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", (event) => {
          setParticipants(event.participants);
        })
        .catch((error: unknown) => {
          mark("participants", "fail", `subscribe failed: ${String(error)}`);
        });

      mark("socket", "running");
      const target = wsUrl("/channels/ping");
      socket = new WebSocket(target);
      socket.onopen = () => {
        mark("socket", "ok", target);
        mark("echo", "running");
        timer = setInterval(() => {
          if (socket?.readyState === WebSocket.OPEN) {
            socket.send(JSON.stringify({ at: Date.now() }));
          }
        }, 1000);
      };
      socket.onmessage = () => {
        setPongs((count) => count + 1);
        mark("echo", "ok");
      };
      socket.onerror = () => {
        mark("socket", "fail", `could not reach ${target}`);
      };
      socket.onclose = (event) => {
        if (event.code !== 1000 && event.code !== 1005) {
          mark("socket", "fail", `closed with code ${event.code}`);
        }
      };
    }

    void run();

    return () => {
      if (timer) {
        clearInterval(timer);
      }
      socket?.close();
    };
  }, []);

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-6">
      <header>
        <h1 className="text-xl font-bold">100masu — Discord Activity spike</h1>
        <p className="mt-1 text-sm text-base-content/60">
          Proves the SDK, OAuth, the proxied socket, and that @100masu/ui renders under Vite.
        </p>
      </header>

      {fatal ? (
        <div className="alert alert-error">
          <span>{fatal}</span>
        </div>
      ) : null}

      <ol className="flex flex-col gap-1.5">
        {steps.map((step) => (
          <li key={step.key} className="flex flex-col rounded-box bg-base-200 px-3 py-2">
            <span className="flex items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${DOT_CLASS[step.state]}`} />
              <span className={`text-sm ${step.state === "fail" ? "text-error" : ""}`}>
                {step.label}
              </span>
            </span>
            {step.detail ? (
              <span className="mt-1 pl-4 font-mono text-xs break-all text-base-content/60">
                {step.detail}
              </span>
            ) : null}
          </li>
        ))}
      </ol>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Instance
        </h2>
        {[...Object.entries(ids), ["authenticated as", user], ["echo frames", String(pongs)]].map(
          ([key, value]) => (
            <div key={key} className="flex gap-3 rounded-box bg-base-200 px-3 py-1.5">
              <span className="w-40 shrink-0 text-sm text-base-content/60">{key}</span>
              <span className="font-mono text-sm break-all">{value ?? "—"}</span>
            </div>
          ),
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          Participants ({participants.length})
        </h2>
        <ul className="flex flex-wrap gap-2">
          {participants.map((participant) => (
            <li
              key={participant.id}
              className="flex items-center gap-2 rounded-full bg-base-200 py-1 pr-3 pl-1"
            >
              <Avatar
                name={displayName(participant)}
                discordUserId={participant.id}
                avatar={participant.avatar}
                size="md"
              />
              <span className="text-sm">{displayName(participant)}</span>
            </li>
          ))}
          {participants.length === 0 ? (
            <li className="text-sm text-base-content/50">none yet</li>
          ) : null}
        </ul>
      </section>
    </main>
  );
}
