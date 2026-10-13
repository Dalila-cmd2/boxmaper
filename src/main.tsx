import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "@fontsource/inter/latin-700.css";
import App from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SyncModal } from "./components/SyncModal";
import "./index.css";
import { setupPwa } from "./pwa/registerServiceWorker";
import { startAutoSync } from "./sync/syncService";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <SyncModal />
    </ErrorBoundary>
  </StrictMode>
);

setupPwa();
startAutoSync();
