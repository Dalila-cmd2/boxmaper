import { isProgrammableIoBorne } from "../data/deviceCatalog";
import type { DeviceModule, TerminalRow } from "../types/project";
import { orderedModuleTerminals } from "./terminalNavigation";

export type PinKind = "power" | "bus" | "io";

export interface PinoutPin {
  terminal: TerminalRow;
  kind: PinKind;
}

export interface PinoutLayout {
  top: PinoutPin[];
  bottom: PinoutPin[];
}

const POWER_LOAD_KEYWORDS = ["alimentaci", "tierra"];
const BUS_LOAD_KEYWORDS = ["loxone link", "tree", "red"];

const POWER_BORNE_PATTERN = /^(l\+|l[−-]|24v\+?|24v[−-]?|gnd)$/i;
const BUS_BORNE_PATTERN = /^(link|tree\+?|tree[−-]?|lan)$/i;

function isInputBorneLabel(borne: string): boolean {
  const b = borne.trim();
  return /^(I|AI|A)\d+$/i.test(b);
}

function isOutputBorneLabel(borne: string): boolean {
  const b = borne.trim();
  return /^Q\d+$/i.test(b) || /^CH\s*\d+$/i.test(b) || /^AQ\d+$/i.test(b);
}

/** Clasifica un borne para diferenciar su serigrafía visual (alimentación/bus vs. E/S). */
export function classifyPin(term: TerminalRow): PinKind {
  const load = (term.loadType ?? "").toLowerCase();
  const borne = term.borne.trim();

  if (POWER_LOAD_KEYWORDS.some((k) => load.includes(k)) || POWER_BORNE_PATTERN.test(borne)) {
    return "power";
  }
  if (BUS_LOAD_KEYWORDS.some((k) => load.includes(k)) || BUS_BORNE_PATTERN.test(borne)) {
    return "bus";
  }
  return "io";
}

function toPin(term: TerminalRow): PinoutPin {
  return { terminal: term, kind: classifyPin(term) };
}

/**
 * Regleta superior / inferior (vista desde arriba del Nano):
 * entradas (I, AI…) arriba; salidas (Q, CH…) abajo.
 */
export function buildPinoutLayout(module: DeviceModule): PinoutLayout {
  const ordered = orderedModuleTerminals(module).filter((terminal) =>
    isProgrammableIoBorne(terminal.borne)
  );
  const pins = ordered.map(toPin);

  const inputs = pins.filter((p) => isInputBorneLabel(p.terminal.borne));
  const outputs = pins.filter((p) => isOutputBorneLabel(p.terminal.borne));

  if (inputs.length > 0 && outputs.length > 0) {
    const inputIds = new Set(inputs.map((p) => p.terminal.id));
    const outputIds = new Set(outputs.map((p) => p.terminal.id));
    const other = pins.filter((p) => !inputIds.has(p.terminal.id) && !outputIds.has(p.terminal.id));
    return {
      top: [...inputs, ...other],
      bottom: outputs,
    };
  }

  const mid = Math.ceil(pins.length / 2);
  return {
    top: pins.slice(0, mid),
    bottom: pins.slice(mid),
  };
}
