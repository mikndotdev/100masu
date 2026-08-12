"use client";

import { Menu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Drawer } from "vaul";

import LanguageSwitch from "./languageSwitch";
import SoundToggle from "./soundToggle";

export default function MobileMenu() {
  const { t } = useTranslation();

  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>
        <button
          type="button"
          aria-label={t("menu.title")}
          className="btn btn-circle btn-primary fixed right-4 bottom-4 z-40 shadow-lg md:hidden"
        >
          <Menu className="size-6" />
        </button>
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-4 rounded-t-box bg-base-100 p-4 pb-8">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-base-300" />
          <Drawer.Title className="text-lg font-bold">{t("menu.title")}</Drawer.Title>
          <Drawer.Description className="sr-only">{t("menu.title")}</Drawer.Description>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{t("language.label")}</span>
            <LanguageSwitch />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="font-medium">{t("sound.label")}</span>
            <SoundToggle />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
