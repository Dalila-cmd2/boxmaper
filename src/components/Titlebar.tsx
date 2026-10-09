import { CircuitBoard, Home, Minus, Square, X } from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { UpdateBadge } from "./UpdateBadge";

interface Props {
  /** Si se indica, muestra un botón para volver al menú principal (cierra el proyecto activo). */
  onHome?: () => void;
  /** Se llama antes de cerrar la ventana (p. ej. escribir el autoguardado pendiente). */
  onBeforeClose?: () => void;
}

export function Titlebar({ onHome, onBeforeClose }: Props) {
  // En el navegador / PWA no hay ventana nativa que minimizar o cerrar.
  if (!isTauri()) return null;

  const handleClose = async () => {
    try {
      onBeforeClose?.();
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Error al intentar cerrar la ventana:", error);
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="relative z-50 flex h-8 w-full select-none items-center justify-between bg-slate-950"
    >
      <div className="flex items-center gap-2 pl-3">
        <CircuitBoard size={14} className="text-slate-500" />
        <span className="select-none text-xs font-medium text-slate-400">
          BoxMaper
        </span>
        {onHome && (
          <button
            type="button"
            aria-label="Volver al menú principal"
            title="Volver al menú principal"
            onClick={onHome}
            className="ml-1 flex items-center justify-center rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <Home size={12} />
          </button>
        )}
      </div>

      <div data-tauri-drag-region className="flex h-full flex-1 items-center justify-center">
        <UpdateBadge />
      </div>

      <div className="flex h-full items-stretch">
        <button
          type="button"
          aria-label="Minimizar"
          onClick={() => void getCurrentWindow().minimize()}
          className="flex h-full w-11 items-center justify-center text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <Minus size={14} />
        </button>
        <button
          type="button"
          aria-label="Maximizar"
          onClick={() => void getCurrentWindow().toggleMaximize()}
          className="flex h-full w-11 items-center justify-center text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
        >
          <Square size={12} />
        </button>
        <button
          type="button"
          aria-label="Cerrar"
          onClick={() => void handleClose()}
          className="flex h-full w-11 items-center justify-center text-slate-400 transition-colors hover:bg-red-600 hover:text-slate-100"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
