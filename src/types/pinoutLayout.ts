import type { TerminalRow } from "./project";
import type { LoxoneFamily } from "../data/loxoneCatalog";

/** Definición de un borne en el catálogo maestro (plantilla, sin id de proyecto). */
export interface PinoutTerminal {
  /** Etiqueta del borne (I1, Q2, CH1, …). */
  label: string;
  loadType?: string;
}

/** Equipo Loxone con plantilla de bornes tipada. Compatible con `LOXONE_MODULES`. */
export interface LoxoneDeviceDefinition {
  id: string;
  name: string;
  category: LoxoneFamily;
  technology: string;
  /** Recuento informativo de E/S programables (coherente con `pinout`). */
  terminals: number;
  idLabel: string;
  connectionNote?: string;
  pinout: PinoutTerminal[];
}

/** Alias de catálogo exportado para selectores y documentación. */
export type HardwareCatalogEntry = LoxoneDeviceDefinition;

/** Convierte la plantilla de catálogo en filas de proyecto (sin id). */
export function pinoutToTerminalRows(pinout: PinoutTerminal[]): Omit<TerminalRow, "id">[] {
  return pinout.map(({ label, loadType }) => ({
    borne: label,
    connectedElement: "",
    room: "",
    loadType: loadType ?? "",
    cableRun: "",
    panelTerminal: "",
    protection: "",
    observaciones: "",
  }));
}
