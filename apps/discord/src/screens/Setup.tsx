import { MAX_PLAYERS } from "@100masu/game";
import type { LobbySnapshot } from "@100masu/ui/protocol";
import Avatar from "@100masu/ui/components/avatar";
import LanguageSwitch from "@100masu/ui/components/languageSwitch";
import SettingsForm from "@100masu/ui/components/settingsForm";
import { Crown } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { lobbyActivity, type Activity } from "../presence";
import { pushSettings, pushSettingsOpen, startGame, type Session } from "../realtime";

type SetupProps = {
  session: Session;
  snapshot: LobbySnapshot;
  presence: { instanceId: string; setPresence: (activity: Activity | null) => void };
};

export default function Setup({ session, snapshot, presence }: SetupProps) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { instanceId, setPresence } = presence;
  const playerCount = snapshot.players.length;

  useEffect(() => {
    setPresence(lobbyActivity(t, instanceId, playerCount, MAX_PLAYERS));
  }, [t, instanceId, playerCount, setPresence]);

  const self = snapshot.players.find((player) => player.id === session.playerId);
  const isHost = self?.isHost ?? false;
  const canEdit = isHost || snapshot.settingsOpen;

  const settings = {
    op: snapshot.op,
    start: snapshot.startNumber,
    end: snapshot.endNumber,
    order: snapshot.order,
    check: snapshot.check,
  };

  async function guard(action: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-5 px-4 py-6">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{t("mp.title")}</h1>
          <p className="mt-1 text-sm text-base-content/60">{t("mp.tagline")}</p>
        </div>
        <LanguageSwitch />
      </header>

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-wider text-base-content/60 uppercase">
          {t("mp.players")} ({snapshot.players.length})
        </h2>
        <ul className="flex flex-wrap gap-2">
          {snapshot.players.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-2 rounded-full bg-base-200 py-1 pr-3 pl-1"
            >
              <Avatar name={player.name} size="md" />
              <span className="text-sm">{player.name}</span>
              {player.isHost ? (
                <Crown
                  role="img"
                  aria-label={t("mp.host")}
                  className="size-3.5 shrink-0 text-primary"
                />
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <fieldset disabled={!canEdit} className={`card bg-base-200 ${canEdit ? "" : "opacity-60"}`}>
        <div className="card-body gap-5">
          <SettingsForm
            settings={settings}
            onChange={(next) =>
              void guard(() =>
                pushSettings({
                  playerId: session.playerId,
                  token: session.token,
                  op: next.op ?? settings.op,
                  start: next.start ?? settings.start,
                  order: next.order ?? settings.order,
                  check: next.check ?? settings.check,
                }),
              )
            }
          />
        </div>
      </fieldset>

      {isHost ? (
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-box bg-base-200 px-4 py-3">
          <span className="font-semibold">{t("mp.openSettings")}</span>
          <input
            type="checkbox"
            className="toggle toggle-primary"
            checked={snapshot.settingsOpen}
            disabled={busy}
            onChange={(event) =>
              void guard(() =>
                pushSettingsOpen(session.playerId, session.token, event.target.checked),
              )
            }
          />
        </label>
      ) : null}

      {error ? <p className="text-sm text-error">{error}</p> : null}

      {isHost ? (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          disabled={busy}
          onClick={() => void guard(() => startGame(session.playerId, session.token))}
        >
          {t("mp.startGame")}
        </button>
      ) : (
        <p className="text-center text-sm text-base-content/60">{t("mp.waitingForHost")}</p>
      )}
    </main>
  );
}
