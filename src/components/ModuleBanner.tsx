import { Layers } from "lucide-react";
import type { DeviceModule } from "../types/project";
import { getCatalogEntry } from "../data/deviceCatalog";
import { formatMacAddress } from "../utils/macAddress";

interface Props {
  module: DeviceModule;
  /** Modo Split: cabecera más baja. */
  dense?: boolean;
  onRename?: (alias: string) => void;
  onZoneChange?: (zone: string) => void;
  onSerialChange?: (serial: string) => void;
}

export function ModuleBanner({
  module,
  dense = false,
  onRename,
  onZoneChange,
  onSerialChange,
}: Props) {
  const entry = getCatalogEntry(module.catalogId);
  const idLabel = entry?.idLabel ?? "MAC / Nº Serie";
  const used = module.terminals.filter((t) => t.connectedElement.trim()).length;
  const total = module.terminals.length;
  const allUsed = total > 0 && used === total;

  if (dense) {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          <Layers className="h-3.5 w-3.5 shrink-0 text-emerald-400/80" />
          {onRename ? (
            <input
              type="text"
              value={module.alias}
              onChange={(e) => onRename(e.target.value)}
              aria-label="Alias del módulo"
              className="min-w-0 max-w-[10rem] rounded bg-transparent text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          ) : (
            <span className="text-xs font-semibold text-white">{module.alias}</span>
          )}
          <span className="truncate text-[10px] text-slate-500">{entry?.typeName ?? module.typeName}</span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5 text-[10px] text-slate-500">
            <span className="h-1 w-1 rounded-full bg-emerald-400/80" />
            <span className="text-slate-400">
              {total === 0 ? "Sin E/S" : `${used}/${total} bornes`}
            </span>
          </span>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0 pl-5 text-[10px] text-slate-500">
          <label className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-[45%]">
            <span className="shrink-0">Estancia/Zona</span>
            <input
              type="text"
              value={module.zone ?? ""}
              onChange={(e) => onZoneChange?.(e.target.value)}
              placeholder="Cuadro…"
              className="min-w-0 flex-1 border-b border-slate-800/80 bg-transparent py-0 text-slate-300 focus:border-emerald-500/60 focus:outline-none"
            />
          </label>
          <label className="flex min-w-0 flex-1 items-center gap-1 sm:max-w-[45%]">
            <span className="shrink-0">{idLabel}</span>
            <input
              type="text"
              value={formatMacAddress(module.macOrSerial)}
              onChange={(e) => onSerialChange?.(formatMacAddress(e.target.value))}
              placeholder="MAC…"
              spellCheck={false}
              className="min-w-0 flex-1 border-b border-slate-800/80 bg-transparent py-0 font-mono text-[10px] text-emerald-400/90 focus:border-emerald-500/60 focus:outline-none"
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1.5">
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <Layers className="h-4 w-4 shrink-0 text-emerald-400/80" />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
            {onRename ? (
              <input
                type="text"
                value={module.alias}
                onChange={(e) => onRename(e.target.value)}
                aria-label="Alias o nombre del módulo"
                className="min-w-0 max-w-xs rounded bg-transparent text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            ) : (
              <h2 className="text-sm font-semibold text-white">{module.alias}</h2>
            )}
            <p className="truncate text-xs text-slate-500">{entry?.typeName ?? module.typeName}</p>
          </div>
          <label className="mt-0.5 flex max-w-md items-center gap-2 text-[11px] text-slate-500">
            <span className="shrink-0">Estancia/Zona</span>
            <input
              type="text"
              value={module.zone ?? ""}
              onChange={(e) => onZoneChange?.(e.target.value)}
              placeholder="Ej. Cuadro principal, Garaje"
              aria-label="Estancia o zona del dispositivo"
              className="min-w-0 flex-1 border-b border-slate-800 bg-transparent px-0 py-0.5 text-slate-300 placeholder-slate-600 focus:border-emerald-500/60 focus:outline-none"
            />
          </label>
          <label className="mt-0.5 flex max-w-sm items-center gap-2 text-[11px] text-slate-500">
            <span className="shrink-0">{idLabel}</span>
            <input
              type="text"
              value={formatMacAddress(module.macOrSerial)}
              onChange={(e) => onSerialChange?.(formatMacAddress(e.target.value))}
              placeholder="Ej. 50:4F:94:FF:FE:BD"
              spellCheck={false}
              autoComplete="off"
              aria-label={idLabel}
              className="min-w-0 flex-1 border-b border-slate-800 bg-transparent px-0 py-0.5 font-mono text-emerald-400/90 placeholder-slate-600 focus:border-emerald-500/60 focus:outline-none"
            />
          </label>
          {entry?.connectionNote && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{entry.connectionNote}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          <span className="text-slate-300">{allUsed ? "Asignado" : used > 0 ? "En curso" : "Pendiente"}</span>
        </span>
        <span>{total === 0 ? "Sin E/S físicas" : `${used}/${total} bornes`}</span>
      </div>
    </div>
  );
}
