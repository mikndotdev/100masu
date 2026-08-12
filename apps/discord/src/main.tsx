import UiProvider from "@100masu/ui/components/uiProvider";
import { initI18n } from "@100masu/ui/i18n";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { Toaster } from "sonner";

import App from "./App";
import { AVATAR_BASE, REALTIME_BASE, SOUND_BASE } from "./realtime";
import "./styles.css";

initI18n("en");

const container = document.getElementById("root");
if (!container) {
  throw new Error("missing #root");
}

createRoot(container).render(
  <StrictMode>
    <UiProvider
      realtimeBaseUrl={REALTIME_BASE}
      avatarBaseUrl={AVATAR_BASE}
      soundBaseUrl={SOUND_BASE}
      defaultLanguage="en"
    >
      <App />
      <Toaster richColors position="bottom-center" />
    </UiProvider>
  </StrictMode>,
);
