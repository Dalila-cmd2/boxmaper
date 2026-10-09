import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface Props {
  open: boolean;
  borne: string;
  value: string;
  onClose: () => void;
  /** Enter o botón Guardar: guarda y cierra. */
  onSave: (connectedElement: string) => void;
  /** Tab: guarda y abre el borne siguiente (Shift+Tab = anterior). */
  onSaveAndMove?: (connectedElement: string, direction: 1 | -1) => void;
}

function borneRoleLabel(borne: string): string {
  const b = borne.trim().toUpperCase();
  if (/^I\d+$/.test(b)) return "Entrada";
  if (/^Q\d+$/.test(b)) return "Salida";
  if (/^CH\d+$/.test(b)) return "Canal";
  if (/^AI\d+$/.test(b)) return "Entrada analógica";
  return "Borne";
}

function borneAccentClass(borne: string): string {
  const b = borne.trim().toUpperCase();
  if (/^I\d+$|^AI\d+$/.test(b)) return "text-emerald-400 ring-emerald-500/40";
  if (/^Q\d+$/.test(b)) return "text-sky-300 ring-sky-500/40";
  if (/^CH\d+$/.test(b)) return "text-amber-300 ring-amber-500/40";
  return "text-emerald-400 ring-emerald-500/40";
}

/** Cartel rápido para «Elemento conectado» desde el plano pinout. */
export function PinoutTerminalEditorModal({
  open,
  borne,
  value,
  onClose,
  onSave,
  onSaveAndMove,
}: Props) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const displayBorne = borne.trim() || "—";
  const role = borneRoleLabel(displayBorne);
  const accent = borneAccentClass(displayBorne);

  useEffect(() => {
    if (!open) return;
    setDraft(value);
    const t = requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => cancelAnimationFrame(t);
  }, [open, value, borne]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        className="relative w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-4 pt-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pinout-editor-borne"
        aria-describedby="pinout-editor-title"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(draft);
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex flex-col items-center px-8 text-center">
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{role}</p>
          <p
            id="pinout-editor-borne"
            className={`mt-2 inline-flex min-w-[4.5rem] items-center justify-center rounded-lg bg-slate-950/80 px-5 py-2 font-mono text-3xl font-bold tracking-tight ring-2 sm:text-4xl ${accent}`}
          >
            {displayBorne}
          </p>
          <p id="pinout-editor-title" className="mt-3 text-sm text-slate-400">
            Elemento conectado
          </p>
        </div>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="sr-only">Descripción del elemento conectado a {displayBorne}</span>
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
                return;
              }
              if (e.key === "Tab" && onSaveAndMove) {
                e.preventDefault();
                onSaveAndMove(draft, e.shiftKey ? -1 : 1);
              }
            }}
            placeholder="Ej. Luz pasillo, persiana suite…"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-base text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </label>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            Guardar
          </button>
        </div>
        <p className="mt-2 text-center text-[10px] text-slate-500">
          Enter guarda · Tab siguiente · Shift+Tab anterior · Esc cancela
        </p>
      </form>
    </div>
  );
}
