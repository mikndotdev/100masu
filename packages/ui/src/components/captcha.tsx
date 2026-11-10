"use client";

import type { CapErrorEvent, CapSolveEvent, CapWidget } from "cap-widget";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "cap-widget": DetailedHTMLProps<HTMLAttributes<CapWidget>, CapWidget>;
    }
  }
}

type CaptchaProps = {
  endpoint: string;
  onVerify: (token: string) => void;
  onError?: () => void;
};

function captchaLanguage(language: string | undefined): string {
  return language === "en" ? "en" : "ja";
}

export default function Captcha({ endpoint, onVerify, onError }: CaptchaProps) {
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
        data-cap-api-endpoint={endpoint}
        data-cap-lang={captchaLanguage(i18n.resolvedLanguage)}
      />
    </div>
  );
}
