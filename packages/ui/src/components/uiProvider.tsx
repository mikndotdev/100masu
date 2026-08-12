"use client";

import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";

import { UiConfigProvider, type UiConfig } from "../config";
import i18n, { initI18n, type Language } from "../i18n";
import { SoundProvider } from "./soundProvider";

type UiProviderProps = Partial<UiConfig> & {
  children: React.ReactNode;
  defaultLanguage?: Language;
};

export default function UiProvider({ children, defaultLanguage, ...config }: UiProviderProps) {
  useEffect(() => {
    initI18n(defaultLanguage);
  }, [defaultLanguage]);

  return (
    <UiConfigProvider {...config}>
      <I18nextProvider i18n={i18n}>
        <SoundProvider>{children}</SoundProvider>
      </I18nextProvider>
    </UiConfigProvider>
  );
}
