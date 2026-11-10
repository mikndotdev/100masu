"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import { UiConfigProvider, type UiConfig } from "../config";
import i18n, { initI18n, type Language } from "../i18n";
import { SoundProvider } from "./soundProvider";

const LANGUAGE_DELAY_MS = 2000;

type UiProviderProps = Partial<UiConfig> & {
  children: React.ReactNode;
  defaultLanguage?: Language;
};

export default function UiProvider({ children, defaultLanguage, ...config }: UiProviderProps) {
  useEffect(() => {
    const apply = () => initI18n(defaultLanguage);
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(apply, { timeout: LANGUAGE_DELAY_MS });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(apply, 50);
    return () => clearTimeout(id);
  }, [defaultLanguage]);

  return (
    <UiConfigProvider {...config}>
      <I18nextProvider i18n={i18n}>
        <SoundProvider>{children}</SoundProvider>
      </I18nextProvider>
    </UiConfigProvider>
  );
}
