import type { DeviceModule, TerminalRow } from "../types/project";

function borneSortKey(borne: string): [string, number, string] {
  const m = borne.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (m) return [m[1], Number.parseInt(m[2], 10), ""];
  const ch = borne.trim().toUpperCase().match(/^CH\s*(\d+)$/);
  if (ch) return ["CH", Number.parseInt(ch[1], 10), ""];
  return ["~", 0, borne.trim().toUpperCase()];
}

function compareTerminals(a: TerminalRow, b: TerminalRow): number {
  const ka = borneSortKey(a.borne);
  const kb = borneSortKey(b.borne);
  for (let i = 0; i < 3; i += 1) {
    if (ka[i] < kb[i]) return -1;
    if (ka[i] > kb[i]) return 1;
  }
  return 0;
}

/** Orden lógico del plano: I1…, Q1…, CH1…, AI1… */
export function orderedModuleTerminals(module: DeviceModule): TerminalRow[] {
  return [...module.terminals].sort(compareTerminals);
}

export function adjacentTerminalId(
  module: DeviceModule,
  currentId: string,
  direction: 1 | -1
): string | null {
  const ordered = orderedModuleTerminals(module);
  const idx = ordered.findIndex((t) => t.id === currentId);
  if (idx === -1) return null;
  return ordered[idx + direction]?.id ?? null;
}
