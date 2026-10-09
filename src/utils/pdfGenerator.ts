import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { isTauri } from "@tauri-apps/api/core";
import type { DeviceModule, ProjectState } from "../types/project";
import { modulesInInstallOrder } from "./moduleInstallOrder";

type Rgb = [number, number, number];

/** Paleta en escala de grises: legible en impresión blanco y negro. */
const INK: Rgb = [0, 0, 0];
const INK_SOFT: Rgb = [55, 55, 55];
const INK_MUTED: Rgb = [105, 105, 105];
const LINE: Rgb = [160, 160, 160];
const FILL_HEADER: Rgb = [235, 235, 235];
const FILL_ALT: Rgb = [248, 248, 248];
const FILL_FOOTER: Rgb = [245, 245, 245];
const WHITE: Rgb = [255, 255, 255];

const MARGIN = 14;
const FIRST_HEADER_H = 44;
const FOOTER_H = 16;
const PAGE_HEIGHT_MM = 297;
const PAGE_WIDTH_MM = 210;
const COL_GAP = 5;
const MODULE_GAP = 5;
const CONTENT_START_Y = FIRST_HEADER_H + 8;

const MIN_FONT_SIZE = 6;
const MAX_FONT_SIZE = 8;
const MIN_CELL_PADDING = 1.1;
const DEFAULT_CELL_PADDING = 2.4;

const LEGAL =
  "BoxMaper es una herramienta independiente no afiliada a Loxone Electronics GmbH.";

function sanitize(name: string) {
  return name.replace(/[^\w\s-]/g, "").trim() || "proyecto";
}

function formatWhen(date: Date) {
  return date.toLocaleDateString("es-ES", {
    dateStyle: "short",
  });
}

function columnLayout() {
  const contentW = PAGE_WIDTH_MM - MARGIN * 2;
  const colWidth = (contentW - COL_GAP) / 2;
  return {
    colWidth,
    margins: [
      { left: MARGIN, right: PAGE_WIDTH_MM - MARGIN - colWidth },
      { left: MARGIN + colWidth + COL_GAP, right: MARGIN },
    ] as const,
  };
}

function contentBottomY() {
  return PAGE_HEIGHT_MM - FOOTER_H - 4;
}

function drawFirstHeader(doc: jsPDF, state: ProjectState, generatedAt: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...FILL_HEADER);
  doc.rect(0, 0, pageWidth, FIRST_HEADER_H, "F");
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.line(0, FIRST_HEADER_H, pageWidth, FIRST_HEADER_H);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK_SOFT);
  doc.text("FICHA TÉCNICA DE INSTALACIÓN DE DOMÓTICA", MARGIN, 8);

  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text(state.projectName || "Proyecto BoxMaper", MARGIN, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK_SOFT);
  doc.text(
    `Ubicación: ${state.location || "—"}${state.miniserverIp ? `  ·  Miniserver IP: ${state.miniserverIp}` : ""}`,
    MARGIN,
    25
  );
  doc.text(`Fecha: ${generatedAt}`, MARGIN, 31);
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text("BoxMaper v1.0  ·  Documentación para cliente y contrapuerta", MARGIN, 37);

  const boxX = pageWidth - MARGIN - 62;
  const boxY = 7;
  const boxW = 62;
  const boxH = 26;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.25);
  doc.setFillColor(...WHITE);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...INK);
  doc.text("Empresa instaladora", boxX + 3, boxY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...INK_SOFT);

  const company = state.installerCompany?.trim();
  const technician = state.installerTechnician?.trim();

  if (company) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...INK_MUTED);
    doc.text("Nombre:", boxX + 3, boxY + 11);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(company, boxX + 16, boxY + 11, { maxWidth: boxW - 19 });
  } else {
    doc.text("Nombre: ______________________", boxX + 3, boxY + 11);
  }

  if (technician) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...INK_MUTED);
    doc.text("Técnico:", boxX + 3, boxY + 18);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...INK);
    doc.text(technician, boxX + 16, boxY + 18, { maxWidth: boxW - 19 });
  } else {
    doc.text("Técnico: _____________________", boxX + 3, boxY + 18);
  }
}

function stampFooters(doc: jsPDF, generatedAt: string) {
  const total = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...FILL_FOOTER);
    doc.rect(0, pageHeight - FOOTER_H, pageWidth, FOOTER_H, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, pageHeight - FOOTER_H, pageWidth - MARGIN, pageHeight - FOOTER_H);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK_MUTED);
    doc.text(`Generado: ${generatedAt}`, MARGIN, pageHeight - 6);
    doc.text(`Página ${i} de ${total}`, pageWidth - MARGIN, pageHeight - 6, {
      align: "right",
    });
    doc.setFontSize(6.5);
    doc.setTextColor(...INK_MUTED);
    doc.text(LEGAL, pageWidth / 2, pageHeight - 11, { align: "center" });
  }
}

function moduleMetaLine(mod: DeviceModule): string {
  return [
    mod.macOrSerial ? `Nº Serie: ${mod.macOrSerial}` : null,
    mod.panelName ? `Ubicación: ${mod.panelName}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

function estimateModuleBlockHeight(mod: DeviceModule, fontSize: number, cellPadding: number): number {
  const rowBodyH = cellPadding * 2 + fontSize * 0.42;
  const rowHeadH = cellPadding * 2 + fontSize * 0.48;
  const titleBlock = fontSize <= 6.5 ? 9 : 11;
  const metaBlock = moduleMetaLine(mod) ? (fontSize <= 6.5 ? 3 : 3.5) : 0;
  const terminalCount = mod.terminals?.length ?? 0;
  return titleBlock + metaBlock + rowHeadH + terminalCount * rowBodyH + MODULE_GAP;
}

/** Simula el empaquetado en 2 columnas y devuelve cuántas páginas harían falta. */
function estimateTwoColumnPageCount(
  modules: DeviceModule[],
  fontSize: number,
  cellPadding: number,
  firstPageStartY: number
): number {
  const bottom = contentBottomY();
  const newPageStart = MARGIN;
  let colY: [number, number] = [firstPageStartY, firstPageStartY];
  let pages = 1;

  for (const mod of modules) {
    const blockH = estimateModuleBlockHeight(mod, fontSize, cellPadding);
    let col: 0 | 1 = colY[0] <= colY[1] ? 0 : 1;

    if (colY[col] + blockH > bottom) {
      const other: 0 | 1 = col === 0 ? 1 : 0;
      if (colY[other] + blockH <= bottom) {
        col = other;
      } else {
        pages += 1;
        colY = [newPageStart, newPageStart];
        col = 0;
      }
    }
    colY[col] += blockH;
  }

  return pages;
}

function pickCompactLayout(modules: DeviceModule[]) {
  const firstPageStartY = CONTENT_START_Y;

  for (let fs = MAX_FONT_SIZE; fs >= MIN_FONT_SIZE; fs -= 0.5) {
    const pad =
      fs <= MIN_FONT_SIZE + 0.25
        ? MIN_CELL_PADDING
        : Math.max(MIN_CELL_PADDING, DEFAULT_CELL_PADDING * (fs / MAX_FONT_SIZE));
    if (estimateTwoColumnPageCount(modules, fs, pad, firstPageStartY) <= 1) {
      return { fontSize: fs, cellPadding: pad };
    }
  }

  return {
    fontSize: MIN_FONT_SIZE,
    cellPadding: MIN_CELL_PADDING,
  };
}

function tableStyles(fontSize: number, cellPadding: number, tableInnerWidth: number) {
  const borneW = Math.min(17, Math.max(12, tableInnerWidth * 0.2));
  return {
    theme: "grid" as const,
    styles: {
      font: "helvetica",
      fontSize,
      cellPadding,
      overflow: "linebreak" as const,
      valign: "middle" as const,
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.25,
    },
    headStyles: {
      fillColor: FILL_HEADER,
      textColor: INK,
      fontStyle: "bold" as const,
      fontSize,
      halign: "left" as const,
    },
    alternateRowStyles: { fillColor: FILL_ALT },
    columnStyles: {
      0: { cellWidth: borneW, fontStyle: "bold" as const },
      1: { cellWidth: tableInnerWidth - borneW },
    },
    showHead: "firstPage" as const,
  };
}

type ColumnSlot = { y: number; page: number };

function pickColumnForBlock(cols: [ColumnSlot, ColumnSlot], blockH: number): 0 | 1 {
  const bottom = contentBottomY();
  let col: 0 | 1 = cols[0].y <= cols[1].y ? 0 : 1;

  if (cols[col].y + blockH > bottom) {
    const other: 0 | 1 = col === 0 ? 1 : 0;
    if (cols[other].y + blockH <= bottom) return other;
    return col;
  }
  return col;
}

function startNewPage(cols: [ColumnSlot, ColumnSlot], doc: jsPDF) {
  doc.addPage();
  const page = doc.getNumberOfPages();
  cols[0] = { y: MARGIN, page };
  cols[1] = { y: MARGIN, page };
}

function drawModuleBlock(
  doc: jsPDF,
  mod: DeviceModule,
  cols: [ColumnSlot, ColumnSlot],
  layout: { fontSize: number; cellPadding: number },
  state: ProjectState,
  generatedAt: string,
  colWidth: number,
  margins: readonly [{ left: number; right: number }, { left: number; right: number }]
) {
  const blockH = estimateModuleBlockHeight(mod, layout.fontSize, layout.cellPadding);
  let col = pickColumnForBlock(cols, blockH);
  if (cols[col].y + blockH > contentBottomY()) {
    const other: 0 | 1 = col === 0 ? 1 : 0;
    if (cols[other].y + blockH <= contentBottomY()) {
      col = other;
    } else {
      startNewPage(cols, doc);
      col = cols[0].y <= cols[1].y ? 0 : 1;
    }
  }

  const slot = cols[col];
  doc.setPage(slot.page);
  const margin = margins[col];
  const textX = margin.left;
  let y = slot.y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(Math.max(7, layout.fontSize + 0.5));
  doc.setTextColor(...INK);
  const title = `${mod.alias} — ${mod.typeName}`;
  doc.text(title, textX, y, { maxWidth: colWidth });
  y += layout.fontSize <= 6.5 ? 3.5 : 4.5;

  const meta = moduleMetaLine(mod);
  if (meta) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(layout.fontSize - 0.5);
    doc.setTextColor(...INK_MUTED);
    doc.text(meta, textX, y, { maxWidth: colWidth });
    y += layout.fontSize <= 6.5 ? 3 : 3.5;
  }

  const tableInnerWidth = colWidth - 2;
  const tableOpts = tableStyles(layout.fontSize, layout.cellPadding, tableInnerWidth);

  autoTable(doc, {
    startY: y,
    tableWidth: colWidth,
    margin: {
      left: margin.left,
      right: margin.right,
      top: slot.page === 1 ? FIRST_HEADER_H + 6 : MARGIN,
      bottom: FOOTER_H + 6,
    },
    head: [["Borne", "Elemento"]],
    body: (mod.terminals ?? []).map((t) => [t.borne || "—", t.connectedElement || "—"]),
    ...tableOpts,
    willDrawPage: (data) => {
      data.settings.margin.left = margin.left;
      data.settings.margin.right = margin.right;
      data.settings.margin.top = data.pageNumber === 1 ? FIRST_HEADER_H + 6 : MARGIN;
    },
    didDrawPage: (data) => {
      if (data.pageNumber === 1) {
        drawFirstHeader(doc, state, generatedAt);
      }
    },
  });

  const finalY = doc.lastAutoTable.finalY + MODULE_GAP;
  const finalPage =
    typeof doc.lastAutoTable.pageNumber === "number"
      ? doc.lastAutoTable.pageNumber
      : doc.getNumberOfPages();

  cols[col] = { y: finalY, page: finalPage };
}

/**
 * Construye la ficha técnica A4: una tabla por módulo, disposición en 2 columnas.
 */
export function buildTechnicalPdf(state: ProjectState) {
  const generatedAt = formatWhen(new Date());
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const modules = modulesInInstallOrder(state.modules ?? []);
  drawFirstHeader(doc, state, generatedAt);

  if (modules.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...INK_MUTED);
    doc.text("No hay módulos configurados en esta instalación.", MARGIN, CONTENT_START_Y);
    stampFooters(doc, generatedAt);
    return doc;
  }

  const layout = pickCompactLayout(modules);
  const { colWidth, margins } = columnLayout();
  const cols: [ColumnSlot, ColumnSlot] = [
    { y: CONTENT_START_Y, page: 1 },
    { y: CONTENT_START_Y, page: 1 },
  ];

  for (const mod of modules) {
    drawModuleBlock(doc, mod, cols, layout, state, generatedAt, colWidth, margins);
  }

  stampFooters(doc, generatedAt);
  return doc;
}

/**
 * Exporta la ficha técnica.
 * Tauri: diálogo nativo Guardar como. Navegador: descarga del PDF.
 */
export async function exportTechnicalPdf(state: ProjectState) {
  const doc = buildTechnicalPdf(state);
  const filename = `${sanitize(state.projectName)}-ficha-instalacion-domotica.pdf`;

  if (isTauri()) {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const targetPath = await save({
      title: "Guardar ficha de instalación de domótica (PDF)",
      defaultPath: filename,
      filters: [{ name: "Documento PDF", extensions: ["pdf"] }],
    });
    if (!targetPath) return;
    const bytes = new Uint8Array(doc.output("arraybuffer"));
    await writeFile(targetPath, bytes);
    return;
  }

  doc.save(filename);
}

/** Alias pedido por el flujo de exportación de BoxMaper. */
export const exportProjectPdf = exportTechnicalPdf;
