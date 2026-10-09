import { useEffect, useRef } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

/**
 * Cubre Alt+F4 / cierre desde la barra de tareas: escribe el autoguardado
 * pendiente antes de que se cierre la ventana. No pregunta, porque el
 * proyecto ya queda guardado en LocalStorage.
 */
export function useCloseGuard(flushPendingSave: () => void): void {
  const flushRef = useRef(flushPendingSave);

  useEffect(() => {
    flushRef.current = flushPendingSave;
  }, [flushPendingSave]);

  useEffect(() => {
    if (!isTauri()) return;

    let unlisten: (() => void) | undefined;
    let disposed = false;

    getCurrentWindow()
      .onCloseRequested(() => {
        flushRef.current();
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });

    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);
}
