"use client";

import { useTranslation } from "react-i18next";

import DiscLogo from "@/components/discLogo";

export default function StartHeader({ tagline }: { tagline: string }) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col items-center text-center">
      <div className="flex items-center gap-3">
        <DiscLogo />
        <h1 className="text-5xl font-black">{t("reversi.title")}</h1>
      </div>
      <p className="mt-2 text-base-content/70">{tagline}</p>
    </header>
  );
}
