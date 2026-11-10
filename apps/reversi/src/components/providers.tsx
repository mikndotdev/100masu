"use client";

import { env } from "@100masu/env/web";
import MobileMenu from "@100masu/ui/components/mobileMenu";
import UiProvider from "@100masu/ui/components/uiProvider";
import { Toaster } from "sonner";

import { FlipProvider } from "@/components/flipCard";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UiProvider realtimeBaseUrl={env.NEXT_PUBLIC_REALTIME_BACKEND_URL ?? ""}>
      <FlipProvider>{children}</FlipProvider>
      <MobileMenu />
      <Toaster richColors position={"bottom-center"} />
    </UiProvider>
  );
}
