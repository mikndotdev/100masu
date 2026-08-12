import { useTranslation } from "react-i18next";

import logo from "../assets/logo.png";

export default function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6">
      <img src={logo} alt="" className="w-56 max-w-[70%]" />
      <div role="status" className="flex flex-col items-center">
        <span className="loading loading-dots loading-lg" />
        <span className="sr-only">{t("mp.connecting")}</span>
      </div>
    </main>
  );
}
