import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { isTauri } from "@tauri-apps/api/core";
import type { DeviceModule, ProjectState, TerminalRow } from "../types/project";
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

/* ───────────── Geometría de la página (mm) ───────────── */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

const FIRST_HEADER_H = 44;
const RUNNING_HEADER_H = 12;
const FOOTER_H = 16;

const FIRST_START_Y = FIRST_HEADER_H + 8;
const NEXT_START_Y = RUNNING_HEADER_H + 8;
const BOTTOM_Y = PAGE_H - FOOTER_H - 6;

const COL_GAP = 6;
const BLOCK_GAP = 6;
const TITLE_GAP = 1.6;
/** Margen de seguridad para que ninguna tabla llegue a forzar un salto de página propio. */
const SAFETY = 0.6;

/* ───────────── Tipografía ───────────── */
const BODY_FONT = 8;
const TITLE_FONT = 9.5;
const META_FONT = 7.5;
const LINE_HEIGHT = 1.15;
const MM_PER_PT = 25.4 / 72;
const CELL_PADDING = { top: 1.7, right: 2, bottom: 1.7, left: 2 };
const MIN_ROW_H = 6;

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

/* ───────────── Cabeceras y pies ───────────── */

function fitFontSize(doc: jsPDF, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  doc.setFontSize(size);
  while (size > min && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

function drawFirstHeader(doc: jsPDF, state: ProjectState, generatedAt: string) {
  doc.setFillColor(...FILL_HEADER);
  doc.rect(0, 0, PAGE_W, FIRST_HEADER_H, "F");
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.line(0, FIRST_HEADER_H, PAGE_W, FIRST_HEADER_H);

  const boxW = 62;
  const boxX = PAGE_W - MARGIN - boxW;
  const textMaxW = boxX - MARGIN - 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...INK_SOFT);
  doc.text("FICHA TÉCNICA DE INSTALACIÓN DE DOMÓTICA", MARGIN, 8);

  // El nombre del proyecto se reduce si es largo para no invadir el cuadro de la empresa.
  const projectName = state.projectName || "Proyecto BoxMaper";
  doc.setFont("helvetica", "bold");
  fitFontSize(doc, projectName, textMaxW, 15, 9);
  doc.setTextColor(...INK);
  doc.text(projectName, MARGIN, 17);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...INK_SOFT);
  const locationLine = `Ubicación: ${state.location || "—"}${
    state.miniserverIp ? `  ·  Miniserver IP: ${state.miniserverIp}` : ""
  }`;
  const locationLines = doc.splitTextToSize(locationLine, textMaxW) as string[];
  doc.text(locationLines.slice(0, 2), MARGIN, 25, { baseline: "top" });
  const afterLocation = 25 + Math.min(locationLines.length, 2) * 9 * MM_PER_PT * LINE_HEIGHT;

  doc.text(`Fecha: ${generatedAt}`, MARGIN, afterLocation + 1.5, { baseline: "top" });

  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text("BoxMaper v1.0  ·  Documentación para cliente y contrapuerta", MARGIN, 41);

  const boxY = 7;
  const boxH = 26;
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.25);
  doc.setFillColor(...WHITE);
  doc.roundedRect(boxX, boxY, boxW, boxH, 1, 1, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(...INK);
  doc.text("Empresa instaladora", boxX + 3, boxY + 5);

  const company = state.installerCompany?.trim();
  const technician = state.installerTechnician?.trim();
  const valueW = boxW - 19;

  const field = (label: string, value: string | undefined, baseY: number) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...INK_MUTED);
    doc.text(label, boxX + 3, baseY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    if (value) {
      doc.setTextColor(...INK);
      const lines = (doc.splitTextToSize(value, valueW) as string[]).slice(0, 2);
      doc.text(lines, boxX + 16, baseY, { lineHeightFactor: 1.1 });
    } else {
      doc.setTextColor(...INK_SOFT);
      doc.text("______________________", boxX + 16, baseY);
    }
  };
  field("Nombre:", company, boxY + 11);
  field("Técnico:", technician, boxY + 19);
}

/** Cabecera estrecha de las páginas 2 en adelante. */
function drawRunningHeader(doc: jsPDF, state: ProjectState) {
  doc.setFillColor(...FILL_HEADER);
  doc.rect(0, 0, PAGE_W, RUNNING_HEADER_H, "F");
  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.line(0, RUNNING_HEADER_H, PAGE_W, RUNNING_HEADER_H);

  const title = "FICHA TÉCNICA DE INSTALACIÓN DE DOMÓTICA";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_SOFT);
  doc.text(title, MARGIN, 7.4);
  const titleW = doc.getTextWidth(title);

  const projectName = state.projectName || "Proyecto BoxMaper";
  doc.setTextColor(...INK);
  fitFontSize(doc, projectName, CONTENT_W - titleW - 8, 9, 6);
  doc.text(projectName, PAGE_W - MARGIN, 7.4, { align: "right" });
}

function stampFooters(doc: jsPDF, generatedAt: string) {
  const total = doc.getNumberOfPages();

  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFillColor(...FILL_FOOTER);
    doc.rect(0, PAGE_H - FOOTER_H, PAGE_W, FOOTER_H, "F");
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, PAGE_H - FOOTER_H, PAGE_W - MARGIN, PAGE_H - FOOTER_H);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK_MUTED);
    doc.text(`Generado: ${generatedAt}`, MARGIN, PAGE_H - 6);
    doc.text(`Página ${i} de ${total}`, PAGE_W - MARGIN, PAGE_H - 6, {
      align: "right",
    });
    doc.setFontSize(6.5);
    doc.text(LEGAL, PAGE_W / 2, PAGE_H - 11, { align: "center" });
  }
}

/* ───────────── Contenido de las tablas ───────────── */

interface ColumnSpec {
  header: string;
  /** Ancho fijo en mm; `null` = el resto del ancho disponible. */
  width: number | null;
  value: (t: TerminalRow) => string;
  bold?: boolean;
}

interface Layout {
  columnCount: 1 | 2;
  colWidth: number;
  /** x izquierda de cada columna de la página. */
  colLeft: number[];
  columns: ColumnSpec[];
}

function hasValue(modules: DeviceModule[], pick: (t: TerminalRow) => string | undefined) {
  return modules.some((m) => (m.terminals ?? []).some((t) => (pick(t) ?? "").trim() !== ""));
}

/**
 * Dos columnas por página cuando solo hay «Borne / Elemento» (el caso habitual).
 * Si algún borne tiene tipo de carga o alimentación, una sola columna a ancho
 * completo para que quepan todos los datos sin recortar.
 */
function chooseLayout(modules: DeviceModule[]): Layout {
  const withLoad = hasValue(modules, (t) => t.loadType);
  const withCable = hasValue(modules, (t) => t.cableRun);

  if (!withLoad && !withCable) {
    const colWidth = (CONTENT_W - COL_GAP) / 2;
    return {
      columnCount: 2,
      colWidth,
      colLeft: [MARGIN, MARGIN + colWidth + COL_GAP],
      columns: [
        { header: "Borne", width: 16, value: (t) => t.borne || "—", bold: true },
        { header: "Elemento", width: null, value: (t) => t.connectedElement || "—" },
      ],
    };
  }

  const columns: ColumnSpec[] = [
    { header: "Borne", width: 20, value: (t) => t.borne || "—", bold: true },
    { header: "Elemento conectado", width: null, value: (t) => t.connectedElement || "—" },
  ];
  if (withLoad) {
    columns.push({ header: "Tipo de carga / tensión", width: 42, value: (t) => t.loadType ?? "" });
  }
  if (withCable) {
    columns.push({ header: "Alimentación", width: 34, value: (t) => t.cableRun ?? "" });
  }
  return { columnCount: 1, colWidth: CONTENT_W, colLeft: [MARGIN], columns };
}

function moduleMetaLine(mod: DeviceModule): string {
  return [
    mod.zone ? `Estancia/Zona: ${mod.zone}` : null,
    mod.macOrSerial ? `Nº Serie: ${mod.macOrSerial}` : null,
    mod.panelName ? `Ubicación: ${mod.panelName}` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
}

function moduleTitle(mod: DeviceModule): string {
  return `${mod.alias} — ${mod.typeName}`;
}

type Cell = string | { content: string; colSpan: number; styles: Record<string, unknown> };

function bodyRows(mod: DeviceModule, layout: Layout, from: number, count: number): Cell[][] {
  const terminals = mod.terminals ?? [];
  if (terminals.length === 0) {
    return [
      [
        {
          content: "Sin entradas/salidas físicas",
          colSpan: layout.columns.length,
          styles: { fontStyle: "italic", textColor: INK_MUTED },
        },
      ],
    ];
  }
  return terminals
    .slice(from, from + count)
    .map((t) => layout.columns.map((c) => c.value(t)));
}

function tableOptions(layout: Layout) {
  const fixed = layout.columns.reduce((sum, c) => sum + (c.width ?? 0), 0);
  const columnStyles: Record<number, Record<string, unknown>> = {};
  layout.columns.forEach((c, i) => {
    columnStyles[i] = {
      cellWidth: c.width ?? layout.colWidth - fixed,
      ...(c.bold ? { fontStyle: "bold" } : {}),
    };
  });

  return {
    theme: "grid" as const,
    tableWidth: layout.colWidth,
    head: [layout.columns.map((c) => c.header)],
    styles: {
      font: "helvetica",
      fontSize: BODY_FONT,
      cellPadding: CELL_PADDING,
      overflow: "linebreak" as const,
      valign: "middle" as const,
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.2,
      minCellHeight: MIN_ROW_H,
    },
    headStyles: {
      fillColor: FILL_HEADER,
      textColor: INK,
      fontStyle: "bold" as const,
      fontSize: BODY_FONT,
      halign: "left" as const,
    },
    alternateRowStyles: { fillColor: FILL_ALT },
    columnStyles,
    showHead: "everyPage" as const,
    rowPageBreak: "avoid" as const,
  };
}

/* ───────────── Medición exacta ───────────── */

interface Measured {
  titleLines: string[];
  titleH: number;
  metaLines: string[];
  metaH: number;
  contTitleLines: string[];
  contTitleH: number;
  headH: number;
  rowHs: number[];
}

function textHeight(lines: number, fontSize: number) {
  return lines * fontSize * MM_PER_PT * LINE_HEIGHT;
}

function wrap(doc: jsPDF, text: string, width: number, fontSize: number, bold: boolean) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, width) as string[];
}

/**
 * Mide el bloque real de cada módulo (título, datos y tabla) renderizándolo
 * en una página auxiliar muy alta. Así la maquetación usa alturas exactas,
 * no estimaciones, y las filas nunca se pisan.
 */
function measureModule(scratch: jsPDF, mod: DeviceModule, layout: Layout): Measured {
  const titleLines = wrap(scratch, moduleTitle(mod), layout.colWidth, TITLE_FONT, true);
  const contTitleLines = wrap(
    scratch,
    `${moduleTitle(mod)} (continuación)`,
    layout.colWidth,
    TITLE_FONT - 1,
    true
  );
  const meta = moduleMetaLine(mod);
  const metaLines = meta ? wrap(scratch, meta, layout.colWidth, META_FONT, false) : [];

  autoTable(scratch, {
    ...tableOptions(layout),
    startY: 0,
    margin: { left: 0, right: PAGE_W - layout.colWidth, top: 0, bottom: 0 },
    body: bodyRows(mod, layout, 0, Number.MAX_SAFE_INTEGER),
  });
  const table = scratch.lastAutoTable;

  return {
    titleLines,
    titleH: textHeight(titleLines.length, TITLE_FONT),
    metaLines,
    metaH: metaLines.length ? textHeight(metaLines.length, META_FONT) + 0.8 : 0,
    contTitleLines,
    contTitleH: textHeight(contTitleLines.length, TITLE_FONT - 1),
    headH: table.head[0]?.height ?? MIN_ROW_H,
    rowHs: (mod.terminals ?? []).length === 0 ? [] : table.body.map((r) => r.height),
  };
}

function sum(values: number[], from = 0, to = values.length) {
  let total = 0;
  for (let i = from; i < to; i++) total += values[i];
  return total;
}

/* ───────────── Maquetación ───────────── */

interface Cursor {
  page: number;
  col: number;
  y: number;
}

function pageTop(page: number) {
  return page === 1 ? FIRST_START_Y : NEXT_START_Y;
}

function advanceColumn(doc: jsPDF, state: ProjectState, cur: Cursor, layout: Layout) {
  if (cur.col + 1 < layout.columnCount) {
    cur.col += 1;
    cur.y = pageTop(cur.page);
    return;
  }
  doc.addPage();
  cur.page = doc.getNumberOfPages();
  cur.col = 0;
  cur.y = NEXT_START_Y;
  drawRunningHeader(doc, state);
}

function drawChunk(
  doc: jsPDF,
  mod: DeviceModule,
  m: Measured,
  layout: Layout,
  cur: Cursor,
  from: number,
  count: number
) {
  const left = layout.colLeft[cur.col];
  const isFirst = from === 0;
  let y = cur.y;

  doc.setPage(cur.page);
  doc.setTextColor(...INK);
  if (isFirst) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TITLE_FONT);
    doc.text(m.titleLines, left, y, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
    y += m.titleH;
    if (m.metaLines.length) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(META_FONT);
      doc.setTextColor(...INK_MUTED);
      doc.text(m.metaLines, left, y + 0.4, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
      y += m.metaH;
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(TITLE_FONT - 1);
    doc.text(m.contTitleLines, left, y, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
    y += m.contTitleH;
  }
  y += TITLE_GAP;

  autoTable(doc, {
    ...tableOptions(layout),
    startY: y,
    margin: { left, right: PAGE_W - left - layout.colWidth, top: y, bottom: 0 },
    body: bodyRows(mod, layout, from, count),
  });

  if (doc.getNumberOfPages() !== cur.page) {
    // No debería ocurrir (alturas medidas), pero si pasa se vuelve a la página actual.
    console.warn("La tabla forzó un salto de página inesperado:", mod.alias);
  }
}

function layoutModules(
  doc: jsPDF,
  scratch: jsPDF,
  state: ProjectState,
  modules: DeviceModule[],
  layout: Layout
) {
  const cur: Cursor = { page: 1, col: 0, y: FIRST_START_Y };

  for (const mod of modules) {
    const m = measureModule(scratch, mod, layout);
    const total = (mod.terminals ?? []).length;
    // Un módulo sin bornes se dibuja con una única fila de aviso.
    const rowHs = total === 0 ? [MIN_ROW_H] : m.rowHs;
    let start = 0;

    for (;;) {
      const top = pageTop(cur.page);
      const atTop = cur.y <= top + 0.01;
      const avail = BOTTOM_Y - cur.y - SAFETY;
      const colH = BOTTOM_Y - top;
      const isFirst = start === 0;
      const head = isFirst ? m.titleH + m.metaH + TITLE_GAP + m.headH : m.contTitleH + TITLE_GAP + m.headH;
      const remaining = rowHs.length - start;
      const fullH = head + sum(rowHs, start);

      if (fullH <= avail) {
        drawChunk(doc, mod, m, layout, cur, start, remaining);
        cur.y += fullH + BLOCK_GAP;
        break;
      }

      if (!atTop) {
        // Se exige que queden al menos 3 filas junto al título para no dejarlo huérfano.
        const keep = Math.min(3, remaining);
        const minH = head + sum(rowHs, start, start + keep);
        const fitsInOneColumn = fullH <= colH;
        const littleRoomLeft = avail < colH * 0.3;
        if (minH > avail || (isFirst && fitsInOneColumn && littleRoomLeft)) {
          advanceColumn(doc, state, cur, layout);
          continue;
        }
      }

      // La tabla se parte entre filas completas; la siguiente parte repite el encabezado.
      let count = 0;
      let used = head;
      while (count < remaining && used + rowHs[start + count] <= avail) {
        used += rowHs[start + count];
        count += 1;
      }
      if (count === 0) count = 1;

      drawChunk(doc, mod, m, layout, cur, start, count);
      start += count;
      if (start >= rowHs.length) {
        cur.y += used + BLOCK_GAP;
        break;
      }
      advanceColumn(doc, state, cur, layout);
    }
  }
}

/**
 * Construye la ficha técnica A4: una tabla por módulo, en dos columnas
 * (o una si hay datos de carga/alimentación). Las tablas largas continúan
 * en la columna o página siguiente repitiendo el encabezado.
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
    doc.text("No hay módulos configurados en esta instalación.", MARGIN, FIRST_START_Y);
    stampFooters(doc, generatedAt);
    return doc;
  }

  const layout = chooseLayout(modules);
  // Página auxiliar muy alta (máximo permitido por jsPDF): sirve para obtener las alturas reales.
  const scratch = new jsPDF({ orientation: "portrait", unit: "mm", format: [PAGE_W, 5000] });

  layoutModules(doc, scratch, state, modules, layout);

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
