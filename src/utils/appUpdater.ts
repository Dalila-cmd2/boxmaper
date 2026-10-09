import { isTauri } from "@tauri-apps/api/core";
import { useSyncExternalStore } from "react";

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking"; manual: boolean }
  | { kind: "uptodate" }
  | { kind: "available"; version: string; notes: string }
  | { kind: "downloading"; version: string; percent: number | null }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string };

let status: UpdateStatus = { kind: "idle" };
const listeners = new Set<() => void>();
let pendingUpdate: import("@tauri-apps/plugin-updater").Update | null = null;
let hideTimer: ReturnType<typeof setTimeout> | undefined;

function setStatus(next: UpdateStatus) {
  status = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Estado actual de las actualizaciones (para mostrar en la interfaz). */
export function useUpdateStatus(): UpdateStatus {
  return useSyncExternalStore(subscribe, () => status);
}

export function dismissUpdateStatus() {
  setStatus({ kind: "idle" });
}

/**
 * Busca una versión nueva. Con `manual = true` avisa también si ya está al día
 * o si hubo un error; en la comprobación automática los errores se ignoran
 * (por ejemplo, si no hay Internet).
 */
export async function checkForUpdates(manual = false): Promise<void> {
  if (!isTauri()) return;
  if (status.kind === "checking" || status.kind === "downloading") return;
  clearTimeout(hideTimer);
  setStatus({ kind: "checking", manual });
  try {
    const { check } = await import("@tauri-apps/plugin-updater");
    const update = await check();
    if (!update) {
      if (manual) {
        setStatus({ kind: "uptodate" });
        hideTimer = setTimeout(dismissUpdateStatus, 4000);
      } else {
        setStatus({ kind: "idle" });
      }
      return;
    }
    pendingUpdate = update;
    setStatus({ kind: "available", version: update.version, notes: update.body ?? "" });
  } catch (error) {
    console.error("No se pudo buscar actualizaciones:", error);
    if (manual) {
      setStatus({
        kind: "error",
        message: "No se pudo comprobar si hay actualizaciones. Revisa tu conexión a Internet.",
      });
    } else {
      setStatus({ kind: "idle" });
    }
  }
}

/** Muestra la versión instalada y el aviso de independencia respecto a Loxone. */
export async function showAbout(): Promise<void> {
  let version = "1.0.0";
  if (isTauri()) {
    try {
      const { getVersion } = await import("@tauri-apps/api/app");
      version = await getVersion();
    } catch {
      /* se usa la versión por defecto */
    }
  }
  alert(
    `BoxMaper ${version}\n\nMapeador de instalaciones de domótica.\nHerramienta independiente no afiliada a Loxone Electronics GmbH.`,
  );
}

/** Descarga e instala la versión encontrada y reinicia la aplicación. */
export async function installUpdate(): Promise<void> {
  const update = pendingUpdate;
  if (!update) return;
  let total = 0;
  let downloaded = 0;
  setStatus({ kind: "downloading", version: update.version, percent: null });
  try {
    await update.downloadAndInstall((event) => {
      if (event.event === "Started") {
        total = event.data.contentLength ?? 0;
      } else if (event.event === "Progress") {
        downloaded += event.data.chunkLength;
        setStatus({
          kind: "downloading",
          version: update.version,
          percent: total > 0 ? Math.min(100, Math.round((downloaded / total) * 100)) : null,
        });
      }
    });
    setStatus({ kind: "ready", version: update.version });
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (error) {
    console.error("No se pudo instalar la actualización:", error);
    setStatus({
      kind: "error",
      message: "No se pudo instalar la actualización. Inténtalo de nuevo más tarde.",
    });
  }
}
