"use client";

import { env } from "@100masu/env/web";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const SCRIPT_SRC = "https://ca.turing.captcha.qcloud.com/TJNCaptcha-global.js";

type CaptchaProps = {
  onVerify: (ticket: string, randstr: string) => void;
  onError?: () => void;
};

function captchaLanguage(language: string | undefined): string {
  return language === "en" ? "en" : "ja";
}

export default function Captcha({ onVerify, onError }: CaptchaProps) {
  const { i18n } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<TencentCaptchaInstance | null>(null);
  const handlersRef = useRef({ onVerify, onError });
  const [ready, setReady] = useState(false);

  const language = captchaLanguage(i18n.resolvedLanguage);

  useEffect(() => {
    handlersRef.current = { onVerify, onError };
  }, [onVerify, onError]);

  useEffect(() => {
    const container = containerRef.current;
    const CaptchaConstructor = window.TencentCaptcha;
    if (!ready || !container || !CaptchaConstructor || instanceRef.current) {
      return;
    }

    const instance = new CaptchaConstructor(
      container,
      env.NEXT_PUBLIC_CAPTCHA_SITEKEY,
      (result) => {
        if (result.ret === 0 && result.ticket && result.randstr) {
          handlersRef.current.onVerify(result.ticket, result.randstr);
          return;
        }
        if (result.errorCode) {
          handlersRef.current.onError?.();
        }
      },
      { type: "Embed", enableDarkMode: "force", userLanguage: language },
    );
    instanceRef.current = instance;
    instance.show();

    return () => {
      instance.destroy();
      instanceRef.current = null;
    };
  }, [ready, language]);

  return (
    <>
      <Script src={SCRIPT_SRC} strategy="afterInteractive" onReady={() => setReady(true)} />
      <div ref={containerRef} className="min-h-14" />
    </>
  );
}
