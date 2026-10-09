import { downloadBlob } from "./downloadBlob";
import { isTauri } from "@tauri-apps/api/core";
import type { Row, Sheet } from "write-excel-file/browser";
import type { DeviceModule, ProjectState, TerminalRow } from "../types/project";
import { buildExportFilename } from "./exportFilename";
import { modulesInInstallOrder } from "./moduleInstallOrder";

export type ExcelExportResult = "saved" | "cancelled" | "empty";

const HEADER_STYLE = {
  fontWeight: "bold",
  textColor: "#FFFFFF",
  backgroundColor: "#0F172A",
  borderStyle: "thin",
  borderColor: "#334155",
} as const;

const TITLE_STYLE = { fontWeight: "bold", fontSize: 14, textColor: "#047857" } as const;

/** Mismas columnas y orden que la tabla de conexiones de pantalla. */
const TERMINAL_COLUMNS: { label: string; width: number; value: (t: TerminalRow) => string }[] = [
  { label: "Canal/Borne", width: 12, value: (t) => t.borne },
  { label: "Elemento Conectado", width: 32, value: (t) => t.connectedElement },
  { label: "Tipo de Carga/Tension", width: 22, value: (t) => t.loadType ?? "" },
  { label: "Alimentación", width: 18, value: (t) => t.cableRun ?? "" },
];

const SUMMARY_COLUMNS = [
  { label: "Dispositivo", width: 28 },
  { label: "Estancia/Zona", width: 22 },
  { label: "Tipo", width: 30 },
  { label: "MAC / Nº Serie", width: 24 },
  { label: "E/S", width: 8 },
  { label: "Asignadas", width: 11 },
];

export function hasExportableData(state: ProjectState): boolean {
  return state.modules.length > 0;
}

function headerRow(labels: string[]): Row {
  return labels.map((value) => ({ value, ...HEADER_STYLE }));
}

function assignedCount(mod: DeviceModule): number {
  return mod.terminals.filter((t) => t.connectedElement.trim()).length;
}

function buildSummarySheet(state: ProjectState, exportedAt: Date): Sheet<Blob> {
  const data: Row[] = [
    [{ value: state.projectName || "Proyecto BoxMaper", ...TITLE_STYLE }],
    ["Ubicación", state.location || "—"],
    ["Mini Server IP", state.miniserverIp || "—"],
    ["Fecha de exportación", exportedAt.toLocaleString("es-ES")],
    [],
    headerRow(SUMMARY_COLUMNS.map((c) => c.label)),
    ...modulesInInstallOrder(state.modules).map((mod) => [
      mod.alias,
      mod.zone ?? "",
      mod.typeName,
      mod.macOrSerial,
      { value: mod.terminals.length, type: Number },
      { value: assignedCount(mod), type: Number },
    ]),
  ];
  return {
    sheet: "Resumen",
    data,
    columns: SUMMARY_COLUMNS.map((c) => ({ width: c.width })),
  };
}

function buildModuleSheet(mod: DeviceModule, sheetName: string): Sheet<Blob> {
  const data: Row[] = [headerRow(TERMINAL_COLUMNS.map((c) => c.label))];
  if (mod.terminals.length === 0) {
    data.push([{ value: "Sin entradas/salidas físicas", fontStyle: "italic", textColor: "#64748B" }]);
  } else {
    for (const t of mod.terminals) data.push(TERMINAL_COLUMNS.map((c) => c.value(t)));
  }
  return {
    sheet: sheetName,
    data,
    columns: TERMINAL_COLUMNS.map((c) => ({ width: c.width })),
  };
}

/** Excel limita los nombres de hoja a 31 caracteres, sin \ / ? * [ ] : y sin repetir. */
function uniqueSheetName(raw: string, used: Set<string>): string {
  const cleaned = raw.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
  const base = (cleaned || "Dispositivo").slice(0, 31);
  let name = base;
  for (let n = 2; used.has(name.toLowerCase()); n++) {
    const suffix = ` (${n})`;
    name = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(name.toLowerCase());
  return name;
}

async function buildWorkbook(state: ProjectState, exportedAt: Date): Promise<Blob> {
  const { default: writeXlsxFile } = await import("write-excel-file/browser");
  const used = new Set<string>(["resumen"]);
  const sheets = [
    buildSummarySheet(state, exportedAt),
    ...modulesInInstallOrder(state.modules).map((mod) =>
      buildModuleSheet(mod, uniqueSheetName(mod.alias || mod.typeName, used))
    ),
  ];
  return writeXlsxFile(sheets, { fontFamily: "Calibri", fontSize: 11 }).toBlob();
}

/**
 * Exporta todo el proyecto a .xlsx: hoja «Resumen» + una hoja por dispositivo.
 * En escritorio abre «Guardar como»; en el navegador descarga el archivo.
 */
export async function exportProjectExcel(state: ProjectState): Promise<ExcelExportResult> {
  if (!hasExportableData(state)) return "empty";

  const exportedAt = new Date();
  const filename = buildExportFilename(state.projectName, exportedAt, "xlsx");
  const blob = await buildWorkbook(state, exportedAt);

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const targetPath = await save({
      title: "Exportar a Excel",
      defaultPath: filename,
      filters: [{ name: "Libro de Excel", extensions: ["xlsx"] }],
    });
    if (!targetPath) return "cancelled";
    await writeFile(targetPath, new Uint8Array(await blob.arrayBuffer()));
    return "saved";
  }

  downloadBlob(blob, filename);
  return "saved";
}
