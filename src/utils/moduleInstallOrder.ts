import { LOXONE_MODULES } from "../data/loxoneCatalog";
import { resolveCatalogId } from "../data/deviceCatalog";
import type { DeviceCategory, DeviceModule } from "../types/project";

/** Orden de bloques en ficha / listados: Miniserver → extensiones DIN → Nano → clima → resto. */
const CATEGORY_TIER: Record<DeviceCategory, number> = {
  miniserver: 0,
  extension: 1,
  relay: 1,
  dimmer: 1,
  nano: 2,
  ac: 3,
  audio: 4,
  other: 5,
};

const CATALOG_ORDER = new Map(LOXONE_MODULES.map((mod, index) => [mod.id, index]));

function catalogSortIndex(catalogId: string): number {
  const resolved = resolveCatalogId(catalogId);
  return CATALOG_ORDER.get(resolved) ?? 9999;
}

/** Comparador para orden «libreta de cuadro»: familia Loxone y orden del catálogo. */
export function compareModulesByInstallOrder(a: DeviceModule, b: DeviceModule): number {
  const tierA = CATEGORY_TIER[a.category] ?? 5;
  const tierB = CATEGORY_TIER[b.category] ?? 5;
  if (tierA !== tierB) return tierA - tierB;

  const catA = catalogSortIndex(a.catalogId);
  const catB = catalogSortIndex(b.catalogId);
  if (catA !== catB) return catA - catB;

  return a.alias.localeCompare(b.alias, "es", { sensitivity: "base" });
}

export function modulesInInstallOrder(modules: readonly DeviceModule[]): DeviceModule[] {
  return [...modules].sort(compareModulesByInstallOrder);
}
