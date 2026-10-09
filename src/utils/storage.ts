import { downloadBlob } from "./downloadBlob";
import type { ProjectState } from "../types/project";
import { saveIndexedProject } from "./projectIndex";

export const AUTOSAVE_DEBOUNCE_MS = 500;

export interface DebouncedSaver {
  schedule(state: ProjectState, onDone?: () => void): void;
  flushPending(): void;
}

/**
 * Guarda el estado en LocalStorage con debounce (por defecto 500 ms)
 * para no escribir en cada tecla.
 */
export function createDebouncedSaver(delayMs = AUTOSAVE_DEBOUNCE_MS): DebouncedSaver {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let pendingState: ProjectState | null = null;
  let pendingDone: (() => void) | null = null;

  function run() {
    const state = pendingState;
    const done = pendingDone;
    timer = null;
    pendingState = null;
    pendingDone = null;
    if (state) saveIndexedProject(state);
    done?.();
  }

  return {
    schedule(state, onDone) {
      if (timer) clearTimeout(timer);
      pendingState = state;
      pendingDone = onDone ?? null;
      timer = setTimeout(run, delayMs);
    },
    flushPending() {
      if (!timer) return;
      clearTimeout(timer);
      run();
    },
  };
}

function sanitize(name: string) {
  return String(name || "")
    .replace(/[^\w\s-]/g, "")
    .trim() || "boxmaper";
}

/** Descarga una copia de seguridad JSON de toda la instalación. */
export function downloadProjectJson(state: ProjectState) {
  const payload = {
    ...state,
    exportedAt: new Date().toISOString(),
    exportKind: "boxmaper-backup",
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, `${sanitize(state.projectName)}-copia-seguridad.json`);
}
