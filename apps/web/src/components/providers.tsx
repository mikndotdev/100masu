"use client";

import { NuqsAdapter } from "nuqs/adapters/next";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import { Toaster } from "sonner";

import MobileMenu from "@/components/mobileMenu";
import { SoundProvider } from "@/components/soundProvider";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/lib/i18n";

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored !== i18n.resolvedLanguage) {
      void i18n.changeLanguage(stored);
    }
  }, []);

  return (
    <I18nextProvider i18n={i18n}>
      <NuqsAdapter>
        <SoundProvider>
          {children}
          <MobileMenu />
          <Toaster richColors position={"bottom-center"} />
        </SoundProvider>
      </NuqsAdapter>
    </I18nextProvider>
  );
}
