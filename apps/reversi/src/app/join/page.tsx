"use client";

import { INVITE_LENGTH } from "@100masu/reversi";
import type { Route } from "next";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import { Stagger, StaggerItem } from "@100masu/ui/components/stagger";

import { FlipCard, FlipLink } from "@/components/flipCard";
import TopBar from "@/components/topBar";
import { inviteCodeSchema } from "@/lib/game";

function JoinContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(
    searchParams.get("error") === "notFound" ? "reversi.notFound" : null,
  );

  const parsed = inviteCodeSchema.safeParse(code);

  function submit() {
    if (!parsed.success) {
      setError("reversi.invalidCode");
      return;
    }
    router.push(`/join/${parsed.data}` as Route);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-4 py-12">
      <TopBar />
      <Stagger className="contents">
        <StaggerItem>
          <header className="text-center">
            <h1 className="text-4xl font-bold">{t("reversi.joinTitle")}</h1>
            <p className="mt-2 text-base-content/70">{t("reversi.joinTagline")}</p>
          </header>
        </StaggerItem>
        <FlipCard className="w-full">
          <div className="card w-full bg-base-200 shadow-xl">
            <div className="card-body gap-6">
              <label className="flex flex-col">
                <span className="mb-1 font-semibold">{t("reversi.codeLabel")}</span>
                <input
                  type="text"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="characters"
                  maxLength={INVITE_LENGTH}
                  placeholder={t("reversi.codePlaceholder")}
                  className={`input w-full text-center font-mono text-3xl tracking-[0.3em] uppercase ${
                    error ? "input-error" : ""
                  }`}
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submit();
                    }
                  }}
                />
                {error ? <span className="mt-2 text-sm text-error">{t(error)}</span> : null}
              </label>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!parsed.success}
                onClick={submit}
              >
                {t("reversi.continue")}
              </button>
            </div>
          </div>
        </FlipCard>
        <StaggerItem>
          <FlipLink href="/mp" className="btn btn-ghost">
            {t("reversi.back")}
          </FlipLink>
        </StaggerItem>
      </Stagger>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense>
      <JoinContent />
    </Suspense>
  );
}
