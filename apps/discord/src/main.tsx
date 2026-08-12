import UiProvider from "@100masu/ui/components/uiProvider";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { AVATAR_BASE, REALTIME_BASE } from "./realtime";
import "./styles.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("missing #root");
}

createRoot(container).render(
  <StrictMode>
    <UiProvider realtimeBaseUrl={REALTIME_BASE} avatarBaseUrl={AVATAR_BASE}>
      <App />
    </UiProvider>
  </StrictMode>,
);
