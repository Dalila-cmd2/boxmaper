/** Equipos con plano SVG estilo documentación Loxone (Anschlussplan). */
export const PINOUT_DIAGRAM_CATALOG_IDS = [
  "ms-gen",
  "ms-compact",
  "ext-relay",
  "ext-dimmer",
  "tree-rgbw-dimmer-24v",
  "tree-rgbw-compact-dimmer-24v",
  "ext-multi-air",
  "nano-io-air",
  "nano-di-tree",
  "nano-dimmer-air",
  "nano-2relay-tree",
] as const;

export type PinoutDiagramCatalogId = (typeof PINOUT_DIAGRAM_CATALOG_IDS)[number];

export function hasPinoutDiagram(catalogId: string): catalogId is PinoutDiagramCatalogId {
  return (PINOUT_DIAGRAM_CATALOG_IDS as readonly string[]).includes(catalogId);
}

export function isAirOrAcOnlyDevice(catalogId: string): boolean {
  return catalogId === "ms-go" || catalogId.startsWith("ac-");
}
