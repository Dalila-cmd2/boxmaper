import { downloadBlob } from "./downloadBlob";
import { isTauri } from "@tauri-apps/api/core";
import type { DeviceModule, ProjectState, TerminalRow } from "../types/project";
import { buildExportFilename } from "./exportFilename";
import { modulesInInstallOrder } from "./moduleInstallOrder";

export type CsvExportResult = "saved" | "cancelled" | "empty";

/** `;` es el separador de listas de Excel en español: abre el archivo directamente en columnas. */
const SEPARATOR = ";";
const BOM = "\uFEFF";

const MODULE_COLUMNS: { label: string; value: (m: DeviceModule) => string }[] = [
  { label: "Dispositivo", value: (m) => m.alias },
  { label: "Estancia/Zona", value: (m) => m.zone ?? "" },
  { label: "Tipo", value: (m) => m.typeName },
  { label: "MAC / Nº Serie", value: (m) => m.macOrSerial },
];

/** Mismas columnas y orden que la tabla de conexiones de pantalla. */
const TERMINAL_COLUMNS: { label: string; value: (t: TerminalRow) => string }[] = [
  { label: "Canal/Borne", value: (t) => t.borne },
  { label: "Elemento Conectado", value: (t) => t.connectedElement },
  { label: "Tipo de Carga/Tension", value: (t) => t.loadType ?? "" },
  { label: "Alimentación", value: (t) => t.cableRun ?? "" },
];

/** Entrecomilla los valores con separadores, comas, comillas o saltos de línea (RFC 4180). */
function escapeCsvCell(value: string): string {
  if (!/[;,"\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function toLine(cells: string[]): string {
  return cells.map(escapeCsvCell).join(SEPARATOR);
}

export function hasCsvData(state: ProjectState): boolean {
  return state.modules.length > 0;
}

/** Una fila por borne; los equipos sin E/S físicas salen en una fila con las columnas de borne vacías. */
export function buildCsv(state: ProjectState): string {
  const lines = [toLine([...MODULE_COLUMNS, ...TERMINAL_COLUMNS].map((c) => c.label))];
  for (const mod of modulesInInstallOrder(state.modules)) {
    const moduleCells = MODULE_COLUMNS.map((c) => c.value(mod));
    if (mod.terminals.length === 0) {
      lines.push(toLine([...moduleCells, ...TERMINAL_COLUMNS.map(() => "")]));
      continue;
    }
    for (const t of mod.terminals) {
      lines.push(toLine([...moduleCells, ...TERMINAL_COLUMNS.map((c) => c.value(t))]));
    }
  }
  return lines.join("\r\n");
}

/**
 * Exporta todos los bornes del proyecto a .csv (UTF-8 con BOM).
 * En escritorio abre «Guardar como»; en el navegador descarga el archivo.
 */
export async function exportProjectCsv(state: ProjectState): Promise<CsvExportResult> {
  if (!hasCsvData(state)) return "empty";

  const filename = buildExportFilename(state.projectName, new Date(), "csv");
  const content = BOM + buildCsv(state);

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const targetPath = await save({
      title: "Exportar a CSV",
      defaultPath: filename,
      filters: [{ name: "Archivo CSV", extensions: ["csv"] }],
    });
    if (!targetPath) return "cancelled";
    await writeFile(targetPath, new TextEncoder().encode(content));
    return "saved";
  }

  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  downloadBlob(blob, filename);
  return "saved";
}
