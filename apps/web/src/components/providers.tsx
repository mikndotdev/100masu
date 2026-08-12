"use client";

import { env } from "@100masu/env/web";
import MobileMenu from "@100masu/ui/components/mobileMenu";
import UiProvider from "@100masu/ui/components/uiProvider";
import { NuqsAdapter } from "nuqs/adapters/next";
import { Toaster } from "sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UiProvider realtimeBaseUrl={env.NEXT_PUBLIC_REALTIME_BACKEND_URL ?? ""}>
      <NuqsAdapter>
        {children}
        <MobileMenu />
        <Toaster richColors position={"bottom-center"} />
      </NuqsAdapter>
    </UiProvider>
  );
}
