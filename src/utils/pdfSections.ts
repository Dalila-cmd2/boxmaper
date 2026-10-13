import type { DeviceModule, ProjectState } from "../types/project";
import { modulesInInstallOrder } from "./moduleInstallOrder";

export interface TechnicalPdfOptions {
  onlySubProjectId?: string | null;
}

export interface PdfSection {
  kind: string;
  title: string;
  modules: DeviceModule[];
  miniserverIp?: string;
  review?: boolean;
}

/** Lógica de agrupación de la ficha PDF (subproyecto / zona / revisión). */
export function buildPdfSections(state: ProjectState, options: TechnicalPdfOptions = {}): PdfSection[] {
  if (state.projectKind === "building") {
    let subs = state.subProjects ?? [];
    if (options.onlySubProjectId) subs = subs.filter((s) => s.id === options.onlySubProjectId);
    return subs.map((sub) => ({
      kind: "Subproyecto",
      title: sub.name?.trim() || "Subproyecto sin nombre",
      modules: modulesInInstallOrder(sub.modules ?? []),
      miniserverIp: sub.miniserverIp,
    }));
  }

  const modules = modulesInInstallOrder(state.modules ?? []);
  if (modules.length === 0) return [];

  const zones = new Map<string, DeviceModule[]>();
  const unzoned: DeviceModule[] = [];
  for (const mod of modules) {
    const zone = (mod.zone ?? "").trim();
    if (!zone) {
      unzoned.push(mod);
      continue;
    }
    zones.set(zone, [...(zones.get(zone) ?? []), mod]);
  }

  if (zones.size === 0) {
    return [
      {
        kind: "Instalación",
        title: "Instalación completa",
        modules: unzoned,
        miniserverIp: state.miniserverIp,
      },
    ];
  }

  const sections: PdfSection[] = [...zones].map(([zone, mods]) => ({
    kind: "Zona",
    title: zone,
    modules: mods,
    miniserverIp: state.miniserverIp,
  }));
  if (unzoned.length > 0) {
    sections.push({
      kind: "Zona",
      title: "Sin zona asignada",
      modules: unzoned,
      miniserverIp: state.miniserverIp,
      review: true,
    });
  }
  return sections;
}
