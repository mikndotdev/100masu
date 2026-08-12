"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import { UiConfigProvider, type UiConfig } from "../config";
import i18n, { LANGUAGE_STORAGE_KEY } from "../i18n";
import { SoundProvider } from "./soundProvider";

export default function UiProvider({
  children,
  ...config
}: Partial<UiConfig> & { children: React.ReactNode }) {
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(stored);
    }
  }, []);

  return (
    <UiConfigProvider {...config}>
      <I18nextProvider i18n={i18n}>
        <SoundProvider>{children}</SoundProvider>
      </I18nextProvider>
    </UiConfigProvider>
  );
}
