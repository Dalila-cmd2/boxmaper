/** Sugerencias de dominio BoxMaper (cuadro Loxone: cargas, tensiones y zonas). */

export const LOAD_TYPE_PRESETS = [
  "Iluminación",
  "Iluminación LED",
  "Regulación",
  "Dimmer",
  "230V / Relé",
  "24V",
  "0-10V",
  "Salida digital",
  "Entrada digital",
  "Contacto seco",
  "Persiana (Motor)",
  "Persiana subir",
  "Persiana bajar",
  "Ventilación",
  "Climatización",
  "Calefacción",
  "Bomba",
  "Válvula",
  "Enchufe",
  "Señal / Avisador",
  "Audio / Altavoz",
  "RGBW",
  "Relé",
  "Alimentación",
  "Loxone Link",
  "Tree",
] as const;

export const ROOM_PRESETS = [
  "Salón",
  "Cocina",
  "Dormitorio",
  "Suite",
  "Baño",
  "Aseo",
  "Entrada",
  "Pasillo",
  "Terraza",
  "Garaje",
  "Lavadero",
  "Despacho",
  "Cuadro",
  "Cuarto técnico",
  "General",
] as const;

export const PROTECTION_PRESETS = [
  "PIA 10A",
  "PIA 16A",
  "PIA 20A",
  "PIA 25A",
  "Diferencial 30mA",
  "Magnetotérmico",
] as const;

export function mergeSuggestions(
  projectTerms: string[],
  presets: readonly string[]
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (value: string) => {
    const t = value.trim();
    const key = t.toLowerCase();
    if (t.length < 2 || seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  for (const t of presets) add(t);
  for (const t of projectTerms) add(t);
  return out;
}
