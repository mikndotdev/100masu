import { DiscordSDK } from "@discord/embedded-app-sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Activity } from "./presence";
import { createSession, type Session } from "./realtime";

const CLIENT_ID = import.meta.env.VITE_DISCORD_CLIENT_ID ?? "";
const PRESENCE_MIN_INTERVAL_MS = 5000;

const BASE_SCOPES = ["identify", "guilds"] as const;
const PRESENCE_SCOPE = "rpc.activities.write" as const;

export type Participant = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

export type SessionStage =
  | "starting"
  | "handshake"
  | "authorizing"
  | "exchanging"
  | "authenticating"
  | "ready";

export type SessionState = {
  session: Session | null;
  participants: Participant[];
  stage: SessionStage;
  error: string | null;
  instanceId: string | null;
  presenceEnabled: boolean;
  setPresence: (activity: Activity | null) => void;
  rebind: () => void;
};

export function useDiscordSession(): SessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stage, setStage] = useState<SessionStage>("starting");
  const [error, setError] = useState<string | null>(null);
  const [instanceId, setInstanceId] = useState<string | null>(null);
  const [presenceEnabled, setPresenceEnabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const sdkRef = useRef<DiscordSDK | null>(null);
  const readyRef = useRef<Promise<void> | null>(null);
  const bootstrappedFor = useRef(-1);

  const presenceAllowed = useRef(false);
  const lastSentAt = useRef(0);
  const lastPayload = useRef<string | null>(null);
  const pending = useRef<Activity | null>(null);
  const flushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const push = useCallback((activity: Activity | null) => {
    const sdk = sdkRef.current;
    if (!sdk || !presenceAllowed.current) {
      return;
    }
    lastSentAt.current = Date.now();
    void sdk.commands.setActivity({ activity }).catch((caught: unknown) => {
      console.debug("[100masu] setActivity failed", caught);
    });
  }, []);

  const setPresence = useCallback(
    (activity: Activity | null) => {
      if (!presenceAllowed.current) {
        return;
      }

      const payload = JSON.stringify(activity);
      if (payload === lastPayload.current) {
        return;
      }
      lastPayload.current = payload;

      const elapsed = Date.now() - lastSentAt.current;
      if (elapsed >= PRESENCE_MIN_INTERVAL_MS) {
        push(activity);
        return;
      }

      pending.current = activity;
      if (flushTimer.current) {
        return;
      }
      flushTimer.current = setTimeout(() => {
        flushTimer.current = null;
        const queued = pending.current;
        pending.current = null;
        if (queued !== undefined) {
          push(queued);
        }
      }, PRESENCE_MIN_INTERVAL_MS - elapsed);
    },
    [push],
  );

  useEffect(() => {
    if (bootstrappedFor.current === attempt) {
      return;
    }
    bootstrappedFor.current = attempt;

    async function authorize(sdk: DiscordSDK, withPresence: boolean) {
      const scope = withPresence ? [...BASE_SCOPES, PRESENCE_SCOPE] : [...BASE_SCOPES];
      return sdk.commands.authorize({
        client_id: CLIENT_ID,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: scope as Parameters<typeof sdk.commands.authorize>[0]["scope"],
      });
    }

    async function run() {
      if (!CLIENT_ID) {
        setError("VITE_DISCORD_CLIENT_ID is not set.");
        return;
      }

      if (!sdkRef.current) {
        try {
          sdkRef.current = new DiscordSDK(CLIENT_ID);
        } catch {
          setError("Launch this from a Discord voice channel.");
          return;
        }
      }
      const sdk = sdkRef.current;

      try {
        setStage("handshake");
        if (!readyRef.current) {
          readyRef.current = sdk.ready();
        }
        await readyRef.current;
        setInstanceId(sdk.instanceId);

        setStage("authorizing");
        let code: string;
        let granted = true;
        try {
          code = (await authorize(sdk, true)).code;
        } catch (caught) {
          console.warn("[100masu] presence scope refused, continuing without it", caught);
          granted = false;
          code = (await authorize(sdk, false)).code;
        }
        presenceAllowed.current = granted;
        setPresenceEnabled(granted);

        setStage("exchanging");
        const next = await createSession({
          code,
          instanceId: sdk.instanceId,
          channelId: sdk.channelId ?? undefined,
          guildId: sdk.guildId ?? undefined,
        });
        setSession(next);
        setError(null);

        setStage("authenticating");
        await sdk.commands.authenticate({ access_token: next.accessToken });

        const current = await sdk.commands.getInstanceConnectedParticipants();
        setParticipants(current.participants);
        void sdk.subscribe("ACTIVITY_INSTANCE_PARTICIPANTS_UPDATE", (event) => {
          setParticipants(event.participants);
        });

        setStage("ready");
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : String(caught));
      }
    }

    void run();
  }, [attempt]);

  useEffect(() => {
    return () => {
      if (flushTimer.current) {
        clearTimeout(flushTimer.current);
      }
    };
  }, []);

  return {
    session,
    participants,
    stage,
    error,
    instanceId,
    presenceEnabled,
    setPresence,
    rebind: () => setAttempt((n) => n + 1),
  };
}
