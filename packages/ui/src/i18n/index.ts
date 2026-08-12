import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { en } from "./en";
import { ja } from "./ja";
import { mikochi } from "./mikochi";

export const LANGUAGE_STORAGE_KEY = "100masu:lang";

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      mikochi: { translation: mikochi },
    },
    lng: "ja",
    fallbackLng: "ja",
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export default i18n;
