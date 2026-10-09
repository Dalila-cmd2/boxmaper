import type { SaveStatus } from "../hooks/useProject";

interface Props {
  mappedCount: number;
  saveStatus: SaveStatus;
}

export function Footer({ mappedCount, saveStatus }: Props) {
  const saveLabel = saveStatus === "saving" ? "Guardando…" : "Guardado en este dispositivo";

  return (
    <footer className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-800/80 bg-slate-950 px-4 py-1 text-[11px] text-slate-500">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/80" />
          Edición rápida
        </span>
        <span className="hidden sm:inline">
          <kbd className="rounded bg-slate-800/80 px-1 text-slate-400">TAB</kbd> /{" "}
          <kbd className="rounded bg-slate-800/80 px-1 text-slate-400">ENTER</kbd>
        </span>
        <span className="truncate text-slate-600">{saveLabel}</span>
      </div>
      <div
        className="shrink-0 text-slate-500"
        title="BoxMaper es una herramienta independiente no afiliada a Loxone Electronics GmbH."
      >
        {mappedCount} puntos mapeados
      </div>
    </footer>
  );
}
