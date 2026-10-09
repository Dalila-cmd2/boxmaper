import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { getCatalogEntry } from "../data/deviceCatalog";
import {
  LOXONE_FAMILIES,
  LOXONE_MODULES,
  searchLoxoneModules,
  type LoxoneFamily,
} from "../data/loxoneCatalog";
import type { LoxoneDeviceDefinition } from "../types/pinoutLayout";
import { iconForCategory } from "../utils/deviceIcons";

type FamilyFilter = LoxoneFamily | "all";

interface Props {
  selectedId: string;
  onSelect: (deviceId: string) => void;
  /** Altura máxima del listado de tarjetas (modal vs. pantalla completa). */
  listMaxHeightClass?: string;
  className?: string;
}

export function HardwareCatalogSelector({
  selectedId,
  onSelect,
  listMaxHeightClass = "max-h-56",
  className = "",
}: Props) {
  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<FamilyFilter>("all");

  const devices = useMemo(() => {
    let list = searchLoxoneModules(query);
    if (family !== "all") {
      list = list.filter((d) => d.category === family);
    }
    return list;
  }, [query, family]);

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nombre, tecnología o ID…"
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        <FamilyChip
          label="Todos"
          active={family === "all"}
          onClick={() => setFamily("all")}
        />
        {LOXONE_FAMILIES.map((f) => (
          <FamilyChip
            key={f}
            label={shortFamilyLabel(f)}
            active={family === f}
            onClick={() => setFamily(f)}
          />
        ))}
      </div>

      <div
        className={`grid gap-2 overflow-y-auto pr-0.5 sm:grid-cols-2 ${listMaxHeightClass}`}
        role="listbox"
        aria-label="Catálogo Loxone"
      >
        {devices.length === 0 ? (
          <p className="col-span-full rounded-lg border border-dashed border-slate-700 px-4 py-8 text-center text-xs text-slate-500">
            Ningún equipo coincide con la búsqueda.
          </p>
        ) : (
          devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              selected={device.id === selectedId}
              onSelect={() => onSelect(device.id)}
            />
          ))
        )}
      </div>

      <p className="text-[11px] text-slate-500">
        {devices.length} de {LOXONE_MODULES.length} equipos en catálogo.
      </p>
    </div>
  );
}

function shortFamilyLabel(family: LoxoneFamily): string {
  switch (family) {
    case "Controladores":
      return "Controladores";
    case "Extensiones DIN":
      return "Extensiones DIN";
    case "Módulos Empotrables (Nano)":
      return "Nano";
    case "Pasarelas A/C (Clima)":
      return "Pasarelas A/C";
    default:
      return family;
  }
}

function FamilyChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition ${
        active
          ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-500/40"
          : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

function DeviceCard({
  device,
  selected,
  onSelect,
}: {
  device: LoxoneDeviceDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  const entry = getCatalogEntry(device.id);
  const Icon = iconForCategory(entry?.category ?? "other");
  const ioCount = device.pinout.length;

  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
      className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition ${
        selected
          ? "border-emerald-500/60 bg-emerald-500/10 ring-1 ring-emerald-500/30"
          : "border-slate-800 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/80"
      }`}
    >
      <div className="flex items-start gap-2">
        <div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-1.5 text-emerald-400/90">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{device.name}</p>
          <p className="truncate text-[11px] text-slate-500">{device.category}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-slate-400">{device.technology}</span>
        {device.connectionNote ? (
          <span className="rounded-md bg-amber-500/10 px-1.5 py-0.5 text-amber-200/90">Sin bornes E/S</span>
        ) : (
          <span className="rounded-md bg-slate-900/80 px-1.5 py-0.5 text-slate-400">{ioCount} E/S</span>
        )}
      </div>
    </button>
  );
}
