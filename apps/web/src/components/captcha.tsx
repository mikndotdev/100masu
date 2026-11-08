"use client";

import { env } from "@100masu/env/web";
import type { CapErrorEvent, CapSolveEvent, CapWidget } from "cap-widget";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

type CaptchaProps = {
  onVerify: (token: string) => void;
  onError?: () => void;
};

function captchaLanguage(language: string | undefined): string {
  return language === "en" ? "en" : "ja";
}

export default function Captcha({ onVerify, onError }: CaptchaProps) {
  const { i18n } = useTranslation();
  const widgetRef = useRef<CapWidget>(null);
  const handlersRef = useRef({ onVerify, onError });

  useEffect(() => {
    handlersRef.current = { onVerify, onError };
  }, [onVerify, onError]);

  useEffect(() => {
    const widget = widgetRef.current;
    if (!widget) {
      return;
    }

    const handleSolve = (event: CapSolveEvent) => handlersRef.current.onVerify(event.detail.token);
    const handleError = (event: CapErrorEvent) => {
      console.error(`captcha: ${event.detail.code} ${event.detail.message}`);
      handlersRef.current.onError?.();
    };

    widget.addEventListener("solve", handleSolve);
    widget.addEventListener("error", handleError);
    void import("cap-widget");

    return () => {
      widget.removeEventListener("solve", handleSolve);
      widget.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <div className="min-h-14">
      <cap-widget
        ref={widgetRef}
        data-cap-api-endpoint={env.NEXT_PUBLIC_CAP_API_ENDPOINT}
        data-cap-lang={captchaLanguage(i18n.resolvedLanguage)}
      />
    </div>
  );
}
