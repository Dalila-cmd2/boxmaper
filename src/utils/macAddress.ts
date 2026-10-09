/** Octetos máximos: MAC IEEE (6) o nº de serie Loxone (8). */
const MAX_HEX_CHARS = 16;

/** Deja solo hex y agrupa de 2 en 2 con dos puntos: 50:4F:94:FF:FE:BD */
export function formatMacAddress(raw: string): string {
  const hex = raw.replace(/[^0-9a-fA-F]/g, "").toUpperCase().slice(0, MAX_HEX_CHARS);
  return hex.replace(/(.{2})(?=.)/g, "$1:");
}
