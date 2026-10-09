import type { DeviceCategory, DeviceModule, ProjectState, TerminalRow } from "../types/project";
import type { LoxoneDeviceDefinition } from "../types/pinoutLayout";
import { pinoutToTerminalRows } from "../types/pinoutLayout";
import { getLoxoneModule, LOXONE_MODULES } from "./loxoneCatalog";

export interface DeviceCatalogEntry {
  id: string;
  typeName: string;
  category: DeviceCategory;
  description: string;
  idLabel: string;
  connectionNote?: string;
  /** Genera bornes por defecto (Q1, I1, …). */
  createTerminals: () => Omit<TerminalRow, "id">[];
}

/** Entradas/salidas programables: I/Q, AI/AQ, canales de dimmer. No alimentación ni bus. */
export function isProgrammableIoBorne(borne: string): boolean {
  const b = borne.trim();
  if (!b) return true;
  if (/^(AI|AQ|I|Q|A)\d+$/i.test(b)) return true;
  if (/^ch\s*\d+$/i.test(b)) return true;
  return false;
}

function onlyProgrammableIo<T extends { borne: string }>(rows: T[]): T[] {
  return rows.filter((row) => isProgrammableIoBorne(row.borne));
}

export function createEmptyTerminal(borne = ""): TerminalRow {
  return {
    id: crypto.randomUUID(),
    borne,
    connectedElement: "",
    room: "",
    loadType: "",
    cableRun: "",
    panelTerminal: "",
    protection: "",
    observaciones: "",
  };
}

const CATEGORY_MAP: Record<string, DeviceCategory> = {
  Controladores: "miniserver",
  "Extensiones DIN": "extension",
  "Módulos Empotrables (Nano)": "nano",
  "Pasarelas A/C (Clima)": "ac",
};

const LEGACY_CATALOG_IDS: Record<string, string> = {
  "ms-gen1": "ms-gen",
  "ms-gen2": "ms-gen",
  "miniserver-gen2": "ms-gen",
  "miniserver-extension": "ms-gen",
  "relay-extension": "ext-relay",
  "dimmer-extension": "ext-dimmer",
  "rgbw-dimmer-tree": "tree-rgbw-dimmer-24v",
  "rgbw-24v-dimmer-tree": "tree-rgbw-dimmer-24v",
  "compact-rgbw-dimmer-tree": "tree-rgbw-compact-dimmer-24v",
  "nano-io-air-tree": "nano-io-air",
  "nano-io-tree": "nano-io-air",
  "nano-dimmer": "nano-dimmer-air",
};

function categoryFor(mod: LoxoneDeviceDefinition): DeviceCategory {
  if (mod.id === "ext-relay") return "relay";
  if (mod.id === "ext-dimmer" || mod.id === "nano-dimmer-air") return "dimmer";
  if (mod.id.startsWith("tree-rgbw")) return "dimmer";
  if (mod.id.startsWith("nano-")) return "nano";
  if (mod.id.startsWith("ac-")) return "ac";
  return CATEGORY_MAP[mod.category] ?? "other";
}

function createTerminalsFor(mod: LoxoneDeviceDefinition): Omit<TerminalRow, "id">[] {
  return onlyProgrammableIo(pinoutToTerminalRows(mod.pinout));
}

function toCatalogEntry(mod: LoxoneDeviceDefinition): DeviceCatalogEntry {
  return {
    id: mod.id,
    typeName: mod.name,
    category: categoryFor(mod),
    description: mod.connectionNote
      ? `${mod.category} • ${mod.connectionNote}`
      : `${mod.category} • ${mod.technology} • ${createTerminalsFor(mod).length} E/S`,
    idLabel: mod.idLabel,
    connectionNote: mod.connectionNote,
    createTerminals: () => createTerminalsFor(mod),
  };
}

export const DEVICE_CATALOG: DeviceCatalogEntry[] = LOXONE_MODULES.map(toCatalogEntry);

export function getCatalogEntry(catalogId: string): DeviceCatalogEntry | undefined {
  const resolved = resolveCatalogId(catalogId);
  const fromList = DEVICE_CATALOG.find((e) => e.id === resolved);
  if (fromList) return fromList;
  const raw = getLoxoneModule(resolved);
  return raw ? toCatalogEntry(raw) : undefined;
}

/** ID canónico del catálogo (legacy incluido). */
export function resolveCatalogId(catalogId: string): string {
  return LEGACY_CATALOG_IDS[catalogId] ?? catalogId;
}

/** Módulo de vista previa (sin proyecto) para el bornero del catálogo. */
export function createPreviewModuleFromCatalog(catalogId: string): DeviceModule | null {
  const draft = createModuleFromCatalog(catalogId, "", "");
  if (!draft) return null;
  const entry = getCatalogEntry(catalogId);
  return {
    ...draft,
    id: "preview",
    alias: entry?.typeName ?? draft.typeName,
  };
}

export function createModuleFromCatalog(
  catalogId: string,
  alias: string,
  macOrSerial: string,
  zone = ""
): Omit<DeviceModule, "id"> | null {
  const entry = getCatalogEntry(catalogId);
  if (!entry) return null;
  const terminals = entry.createTerminals().map((t) => ({
    ...t,
    id: crypto.randomUUID(),
  }));
  return {
    catalogId: entry.id,
    typeName: entry.typeName,
    category: entry.category,
    alias,
    macOrSerial,
    zone: zone.trim(),
    panelName: "Cuadro Principal",
    terminals,
  };
}

type LegacyModule = DeviceModule & { ioMap?: unknown; extensionMap?: unknown };

function normalizeModuleList(modules: DeviceModule[]): DeviceModule[] {
  return modules.map((module) => {
    const { ioMap: _ioMap, extensionMap: _extensionMap, ...rest } = module as LegacyModule;
    return { ...rest, terminals: onlyProgrammableIo(module.terminals ?? []) };
  });
}

/** Deja solo E/S programables y descarta tablas antiguas (Nano IO / Extension) de proyectos previos. */
export function normalizeProject(state: ProjectState): ProjectState {
  if (state.projectKind === "building") {
    return {
      ...state,
      modules: [],
      subProjects: (state.subProjects ?? []).map((sp) => ({
        ...sp,
        modules: normalizeModuleList(sp.modules),
      })),
    };
  }
  return {
    ...state,
    modules: normalizeModuleList(state.modules),
  };
}

/** Texto bajo el selector del catálogo (modal añadir / explorador). */
export function getCatalogSelectorHint(catalogId: string): string | null {
  const entry = getCatalogEntry(catalogId);
  if (!entry) return null;
  if (entry.connectionNote) return entry.connectionNote;
  const count = entry.createTerminals().length;
  return `Genera ${count} entradas/salidas programables.`;
}

/** Subtítulo del bornero en vista previa del catálogo. */
export function getCatalogPreviewSubtitle(catalogId: string): string | undefined {
  const entry = getCatalogEntry(catalogId);
  const mod = getLoxoneModule(entry?.id ?? catalogId);
  if (!entry || !mod) return undefined;
  if (mod.connectionNote) return mod.connectionNote;
  return `${mod.technology} · ${entry.createTerminals().length} E/S programables`;
}
