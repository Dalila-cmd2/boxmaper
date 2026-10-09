import { isTauri } from "@tauri-apps/api/core";

/**
 * Registra el service worker (caché offline + actualizaciones automáticas).
 * - No se registra en la app de escritorio Tauri (ya trae sus archivos dentro).
 * - No se registra en `npm run dev` para no cachear código en desarrollo.
 * - Pide almacenamiento "persistente" para que el navegador no borre los
 *   proyectos guardados (localStorage) cuando falte espacio.
 */
export function setupPwa(): void {
  if (isTauri()) return;

  if (typeof navigator !== "undefined" && navigator.storage?.persist) {
    void navigator.storage.persist().catch(() => undefined);
  }

  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({
      immediate: true,
      onRegisterError(error) {
        console.error("No se pudo registrar el service worker:", error);
      },
    });
  });
}
