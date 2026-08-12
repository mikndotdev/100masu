"use client";

import { createContext, useContext, useMemo } from "react";

export type UiConfig = {
  realtimeBaseUrl: string;
  soundBaseUrl: string;
  avatarBaseUrl: string;
};

const DEFAULTS: UiConfig = {
  realtimeBaseUrl: "",
  soundBaseUrl: "https://cdn.mikn.dev/web/100masu",
  avatarBaseUrl: "https://cdn.discordapp.com",
};

const UiConfigContext = createContext<UiConfig>(DEFAULTS);

export function UiConfigProvider({
  children,
  ...overrides
}: Partial<UiConfig> & { children: React.ReactNode }) {
  const value = useMemo<UiConfig>(
    () => ({
      realtimeBaseUrl: overrides.realtimeBaseUrl ?? DEFAULTS.realtimeBaseUrl,
      soundBaseUrl: overrides.soundBaseUrl ?? DEFAULTS.soundBaseUrl,
      avatarBaseUrl: overrides.avatarBaseUrl ?? DEFAULTS.avatarBaseUrl,
    }),
    [overrides.realtimeBaseUrl, overrides.soundBaseUrl, overrides.avatarBaseUrl],
  );

  return <UiConfigContext.Provider value={value}>{children}</UiConfigContext.Provider>;
}

export function useUiConfig(): UiConfig {
  return useContext(UiConfigContext);
}

export function avatarUrl(
  base: string,
  discordUserId: string | null,
  avatar: string | null,
): string | null {
  if (!discordUserId || !avatar) {
    return null;
  }
  return `${base.replace(/\/$/, "")}/avatars/${discordUserId}/${avatar}.png?size=64`;
}
