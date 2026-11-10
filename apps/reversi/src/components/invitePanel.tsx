"use client";

import { Copy } from "lucide-react";
import QRCode from "react-qr-code";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

export default function InvitePanel({ code }: { code: string }) {
  const { t } = useTranslation();
  const url = `${window.location.origin}/join/${code}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    toast.success(t("reversi.copied"));
  }

  return (
    <div className="card w-full bg-base-200 shadow-xl">
      <div className="card-body items-center gap-4 text-center">
        <h2 className="card-title text-2xl">{t("reversi.waitingTitle")}</h2>
        <p className="text-base-content/70">{t("reversi.inviteStep")}</p>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-semibold">{t("reversi.inviteCode")}</span>
          <span className="font-mono text-5xl font-bold tracking-[0.2em]">{code}</span>
        </div>
        <div className="rounded-box bg-white p-3">
          <QRCode value={url} size={180} />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => void copy()}>
          <Copy className="size-4" />
          {t("reversi.copyLink")}
        </button>
        <span className="loading loading-dots loading-md text-primary" />
      </div>
    </div>
  );
}
