"use client";

import { useTranslation } from "react-i18next";

import {
  GRID_SIZE,
  OPERATION_SYMBOL,
  OPERATIONS,
  type CheckMode,
  type Operation,
  type Order,
} from "@100masu/game";

const ORDER_VALUES = ["seq", "rand"] as const;
const CHECK_VALUES = ["input", "end"] as const;

export type GameSettings = {
  op: Operation;
  start: number;
  end: number;
  order: Order;
  check: CheckMode;
};

type SettingsFormProps = {
  settings: GameSettings;
  onChange: (next: Partial<GameSettings>) => void;
};

export default function SettingsForm({ settings, onChange }: SettingsFormProps) {
  const { t } = useTranslation();

  function setStart(next: number) {
    onChange({ start: next, end: next + GRID_SIZE - 1 });
  }

  function setEnd(next: number) {
    onChange({ start: next - GRID_SIZE + 1, end: next });
  }

  return (
    <>
      <div>
        <span className="mb-2 block font-semibold">{t("setup.operation")}</span>
        <div className="join flex flex-wrap">
          {OPERATIONS.map((operation) => (
            <button
              key={operation}
              type="button"
              aria-pressed={settings.op === operation}
              onClick={() => onChange({ op: operation })}
              className={`btn join-item ${settings.op === operation ? "btn-primary" : "btn-ghost"}`}
            >
              <span className="text-xl">{OPERATION_SYMBOL[operation]}</span>
              <span className="hidden md:inline">{t(`op.${operation}`)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="form-control">
          <span className="mb-1 font-semibold">{t("setup.startNumber")}</span>
          <input
            type="number"
            className="input input-bordered w-full"
            value={settings.start}
            onChange={(event) => setStart(Number.parseInt(event.target.value, 10) || 0)}
          />
        </label>
        <label className="form-control">
          <span className="mb-1 font-semibold">{t("setup.endNumber")}</span>
          <input
            type="number"
            className="input input-bordered w-full"
            value={settings.end}
            onChange={(event) => setEnd(Number.parseInt(event.target.value, 10) || 0)}
          />
        </label>
      </div>
      <p className="-mt-2 text-sm text-base-content/60">
        {t("setup.rangeHint", { start: settings.start, end: settings.end })}
      </p>

      <div>
        <span className="mb-2 block font-semibold">{t("setup.numberOrder")}</span>
        <div className="join">
          {ORDER_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.order === value}
              onClick={() => onChange({ order: value })}
              className={`btn join-item ${settings.order === value ? "btn-primary" : "btn-ghost"}`}
            >
              {t(`order.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="mb-2 block font-semibold">{t("setup.answerChecking")}</span>
        <div className="join">
          {CHECK_VALUES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={settings.check === value}
              onClick={() => onChange({ check: value })}
              className={`btn join-item ${settings.check === value ? "btn-primary" : "btn-ghost"}`}
            >
              {t(value === "input" ? "setup.checkInput" : "setup.checkEnd")}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
