"use client";

import { useTranslation } from "react-i18next";

import { LANGUAGE_STORAGE_KEY } from "@/lib/i18n";

const LANGUAGES = [
  ["en", "English"],
  ["ja", "日本語"],
  ["mikochi", "🌸"],
] as const;

export default function LanguageSwitch() {
  const { i18n } = useTranslation();

  function change(language: string) {
    void i18n.changeLanguage(language);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }
  }

  return (
    <div className="join">
      {LANGUAGES.map(([language, label]) => (
        <button
          key={language}
          type="button"
          aria-pressed={i18n.resolvedLanguage === language}
          onClick={() => change(language)}
          className={`btn join-item btn-sm ${
            i18n.resolvedLanguage === language ? "btn-primary" : "btn-ghost"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
