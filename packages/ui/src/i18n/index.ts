import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./en";
import { ja } from "./ja";
import { mikochi } from "./mikochi";

export const LANGUAGE_STORAGE_KEY = "100masu:lang";

export type Language = "en" | "ja" | "mikochi";

function storedLanguage(): Language | null {
  if (typeof window === "undefined") {
    return null;
  }
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return stored === "en" || stored === "ja" || stored === "mikochi" ? stored : null;
}

export function initI18n(fallback: Language = "ja") {
  const initial = storedLanguage() ?? fallback;

  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources: {
        en: { translation: en },
        ja: { translation: ja },
        mikochi: { translation: mikochi },
      },
      lng: initial,
      fallbackLng: fallback,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
    return;
  }

  if (initial !== i18n.resolvedLanguage) {
    void i18n.changeLanguage(initial);
  }
}

initI18n();

export default i18n;
