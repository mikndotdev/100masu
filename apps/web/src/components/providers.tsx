"use client";

import { Toaster } from "sonner";
import { SoundProvider } from "@/components/soundProvider";
import { NuqsAdapter } from "nuqs/adapters/next";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NuqsAdapter>
      <SoundProvider>
        {children}
        <Toaster richColors />
      </SoundProvider>
    </NuqsAdapter>
  );
}
