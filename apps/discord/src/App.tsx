import { useLobbyChannel } from "@100masu/ui/hooks/useLobbyChannel";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import LoadingScreen from "./components/LoadingScreen";
import Play from "./screens/Play";
import Result from "./screens/Result";
import Setup from "./screens/Setup";
import { useDiscordSession } from "./useDiscordSession";

export default function App() {
  const { t } = useTranslation();
  const { session, stage, error, instanceId, presenceEnabled, setPresence, rebind } =
    useDiscordSession();
  const { snapshot, connected } = useLobbyChannel(session ? { playerId: session.playerId } : {});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setFinished(false);
  }, [session?.lobbyId]);

  useEffect(() => {
    console.debug(
      `[100masu] session=${stage} lobby=${connected ? "open" : "connecting"} presence=${
        presenceEnabled ? "on" : "off"
      }`,
    );
  }, [stage, connected, presenceEnabled]);

  useEffect(() => {
    return () => setPresence(null);
  }, [setPresence]);

  const handleRematch = useCallback(() => {
    setFinished(false);
    rebind();
  }, [rebind]);

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="text-lg font-bold">{t("mp.createFailed")}</h1>
        <p className="font-mono text-xs break-all text-base-content/60">{error}</p>
      </main>
    );
  }

  if (!session || !snapshot) {
    return <LoadingScreen />;
  }

  const presence = { instanceId: instanceId ?? snapshot.lobbyId, setPresence };

  if (snapshot.status === "OPEN") {
    return <Setup session={session} snapshot={snapshot} presence={presence} />;
  }

  const self = snapshot.players.find((player) => player.id === session.playerId);
  const showResult = finished || self?.finishedAt != null;

  if (showResult) {
    return (
      <Result session={session} snapshot={snapshot} presence={presence} onRematch={handleRematch} />
    );
  }

  return (
    <Play
      session={session}
      snapshot={snapshot}
      presence={presence}
      onFinished={() => setFinished(true)}
    />
  );
}
