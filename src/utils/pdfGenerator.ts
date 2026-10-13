import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { isTauri } from "@tauri-apps/api/core";
import type { DeviceModule, ProjectState, TerminalRow } from "../types/project";
import { buildPdfSections, type TechnicalPdfOptions } from "./pdfSections";

type Rgb = [number, number, number];

/** Paleta en escala de grises: legible en impresión blanco y negro. */
const INK: Rgb = [0, 0, 0];
const INK_SOFT: Rgb = [55, 55, 55];
const INK_MUTED: Rgb = [105, 105, 105];
const LINE: Rgb = [160, 160, 160];
const FILL_HEADER: Rgb = [235, 235, 235];
const FILL_ALT: Rgb = [246, 246, 246];
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

const FIRST_START_Y = FIRST_HEADER_H + 9;
const NEXT_START_Y = RUNNING_HEADER_H + 9;
const BOTTOM_Y = PAGE_H - FOOTER_H - 6;

const BLOCK_GAP = 7;
const CAPTION_GAP = 1.8;
/** Margen para que ninguna tabla llegue a forzar un salto de página propio. */
const SAFETY = 0.6;

/* ───────────── Tipografía ───────────── */
const BODY_FONT = 8;
const CAPTION_FONT = 9;
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

function textHeight(lines: number, fontSize: number) {
  return lines * fontSize * MM_PER_PT * LINE_HEIGHT;
}

function wrap(doc: jsPDF, text: string, width: number, fontSize: number, bold: boolean) {
  doc.setFont("helvetica", bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(text, width) as string[];
}

function fitFontSize(doc: jsPDF, text: string, maxWidth: number, start: number, min: number) {
  let size = start;
  doc.setFontSize(size);
  while (size > min && doc.getTextWidth(text) > maxWidth) {
    size -= 0.5;
    doc.setFontSize(size);
  }
  return size;
}

/** Recorta con «…» solo para la cabecera decorativa de las páginas interiores. */
function ellipsize(doc: jsPDF, text: string, maxWidth: number) {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let out = text;
  while (out.length > 1 && doc.getTextWidth(`${out}…`) > maxWidth) out = out.slice(0, -1);
  return `${out.trimEnd()}…`;
}

/* ───────────── Cabeceras y pies ───────────── */

/** Cabecera de la portada: título, proyecto, ubicación, fecha y empresa instaladora. */
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
    state.projectKind !== "building" && state.miniserverIp
      ? `  ·  Miniserver IP: ${state.miniserverIp}`
      : ""
  }`;
  const locationLines = doc.splitTextToSize(locationLine, textMaxW) as string[];
  doc.text(locationLines.slice(0, 2), MARGIN, 25, { baseline: "top" });
  const afterLocation = 25 + Math.min(locationLines.length, 2) * 9 * MM_PER_PT * LINE_HEIGHT;

  doc.text(`Fecha: ${generatedAt}`, MARGIN, afterLocation + 1.5, { baseline: "top" });

  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text("BoxMaper  ·  Documentación para cliente y contrapuerta", MARGIN, 41);

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

/** Cabecera estrecha de las páginas interiores: indica proyecto y subproyecto. */
function drawRunningHeader(doc: jsPDF, state: ProjectState, label: string) {
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

  const full = [state.projectName || "Proyecto BoxMaper", label].filter(Boolean).join("  ·  ");
  const maxW = CONTENT_W - titleW - 8;
  doc.setTextColor(...INK);
  doc.setFontSize(8.5);
  const size = fitFontSize(doc, full, maxW, 8.5, 6.5);
  doc.setFontSize(size);
  doc.text(ellipsize(doc, full, maxW), PAGE_W - MARGIN, 7.4, { align: "right" });
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

/* ───────────── Organización por subproyecto ───────────── */

export type { TechnicalPdfOptions } from "./pdfSections";

type Section = ReturnType<typeof buildPdfSections>[number];

function originLabel(mod: DeviceModule): string {
  const alias = (mod.alias ?? "").trim();
  const type = (mod.typeName ?? "").trim();
  if (alias && type) return `${alias} · ${type}`;
  return alias || type || "Aparato sin nombre";
}

/** Todos los datos libres del borne que no tienen columna propia, sin perder ninguno. */
function observationsOf(t: TerminalRow): string {
  return [
    t.observaciones?.trim() ? t.observaciones.trim() : null,
    t.loadType?.trim() ? `Carga/tensión: ${t.loadType.trim()}` : null,
    t.cableRun?.trim() ? `Alimentación: ${t.cableRun.trim()}` : null,
    t.panelTerminal?.trim() ? `Borna cuadro: ${t.panelTerminal.trim()}` : null,
    t.protection?.trim() ? `Protección: ${t.protection.trim()}` : null,
    t.room?.trim() ? `Estancia: ${t.room.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function countTerminals(modules: DeviceModule[]) {
  let total = 0;
  let assigned = 0;
  for (const mod of modules) {
    for (const t of mod.terminals ?? []) {
      total += 1;
      if (t.connectedElement?.trim()) assigned += 1;
    }
  }
  return { total, assigned };
}

/* ───────────── Tablas con maquetación medida ───────────── */

interface TableSpec {
  head: string[];
  widths: number[];
  rows: string[][];
  /** Grupo de cada fila (aparato): se sombrea alternando grupos y se destaca la primera fila. */
  groups?: number[];
  /** Columnas que se muestran en negrita. */
  boldColumns?: number[];
  /** Columna con el aparato de origen: negrita en la primera fila del grupo, gris en el resto. */
  originColumn?: number;
}

interface Env {
  doc: jsPDF;
  scratch: jsPDF;
  state: ProjectState;
  page: number;
  y: number;
  /** Texto de la cabecera de las páginas interiores. */
  label: string;
}

function tableOptions(spec: TableSpec, from: number) {
  const columnStyles: Record<number, Record<string, unknown>> = {};
  spec.widths.forEach((w, i) => {
    columnStyles[i] = { cellWidth: w };
  });

  return {
    theme: "grid" as const,
    tableWidth: spec.widths.reduce((a, b) => a + b, 0),
    head: [spec.head],
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
    columnStyles,
    showHead: "everyPage" as const,
    rowPageBreak: "avoid" as const,
    // El mismo criterio de estilo se usa al medir y al dibujar: las alturas coinciden.
    didParseCell: (data: {
      section: string;
      column: { index: number };
      row: { index: number };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      cell: { styles: Record<string, any> };
    }) => {
      if (data.section !== "body") return;
      const global = from + data.row.index;
      const group = spec.groups?.[global];
      if (group !== undefined && group % 2 === 1) data.cell.styles.fillColor = FILL_ALT;
      const col = data.column.index;
      if (spec.originColumn === col) {
        const first = global === 0 || spec.groups?.[global - 1] !== group;
        data.cell.styles.fontStyle = first ? "bold" : "normal";
        data.cell.styles.textColor = first ? INK : INK_MUTED;
      } else if (spec.boldColumns?.includes(col)) {
        data.cell.styles.fontStyle = "bold";
      }
    },
  };
}

/** Altura real de la cabecera y de cada fila, medida renderizando en una página auxiliar muy alta. */
function measureTable(scratch: jsPDF, spec: TableSpec) {
  autoTable(scratch, {
    ...tableOptions(spec, 0),
    startY: 0,
    margin: { left: 0, right: PAGE_W - spec.widths.reduce((a, b) => a + b, 0), top: 0, bottom: 0 },
    body: spec.rows,
  });
  const table = scratch.lastAutoTable;
  return {
    headH: table.head[0]?.height ?? MIN_ROW_H,
    rowHs: table.body.map((r) => r.height),
  };
}

function sum(values: number[], from = 0, to = values.length) {
  let total = 0;
  for (let i = from; i < to; i++) total += values[i];
  return total;
}

function newPage(env: Env) {
  env.doc.addPage();
  env.page = env.doc.getNumberOfPages();
  env.y = NEXT_START_Y;
  drawRunningHeader(env.doc, env.state, env.label);
}

function drawCaption(env: Env, lines: string[], height: number) {
  env.doc.setFont("helvetica", "bold");
  env.doc.setFontSize(CAPTION_FONT);
  env.doc.setTextColor(...INK);
  env.doc.text(lines, MARGIN, env.y, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
  env.y += height + CAPTION_GAP;
}

/**
 * Dibuja una tabla a ancho completo. Si no entra, continúa en la página siguiente
 * partiendo solo entre filas completas y repitiendo título y encabezado.
 */
function flowTable(env: Env, caption: string, continuation: string, spec: TableSpec) {
  const { headH, rowHs } = measureTable(env.scratch, spec);
  const total = spec.rows.length;
  let start = 0;

  while (start < total) {
    const isFirst = start === 0;
    const lines = wrap(env.doc, isFirst ? caption : continuation, CONTENT_W, CAPTION_FONT, true);
    const capH = textHeight(lines.length, CAPTION_FONT);
    const head = capH + CAPTION_GAP + headH;
    const avail = BOTTOM_Y - env.y - SAFETY;
    const atTop = env.y <= NEXT_START_Y + 0.01 || env.y <= FIRST_START_Y + 0.01;
    const remaining = total - start;
    const fullH = head + sum(rowHs, start);

    if (fullH > avail && !atTop) {
      // Se exigen al menos 3 filas junto al título para no dejarlo huérfano al final de la página.
      const keep = Math.min(3, remaining);
      if (head + sum(rowHs, start, start + keep) > avail) {
        newPage(env);
        continue;
      }
    }

    let count = 0;
    let used = head;
    while (count < remaining && used + rowHs[start + count] <= avail) {
      used += rowHs[start + count];
      count += 1;
    }
    if (count === 0) count = 1;
    used = head + sum(rowHs, start, start + count);

    env.doc.setPage(env.page);
    drawCaption(env, lines, capH);
    autoTable(env.doc, {
      ...tableOptions(spec, start),
      startY: env.y,
      margin: { left: MARGIN, right: PAGE_W - MARGIN - CONTENT_W, top: env.y, bottom: 0 },
      body: spec.rows.slice(start, start + count),
    });
    if (env.doc.getNumberOfPages() !== env.page) {
      console.warn("La tabla forzó un salto de página inesperado:", caption);
    }

    start += count;
    if (start < total) {
      newPage(env);
    } else {
      env.y += used + BLOCK_GAP;
    }
  }
}

/* ───────────── Contenido de cada parte ───────────── */

const SUBPROJECT_COLUMNS = {
  withObs: [56, 16, 72, 38],
  withoutObs: [60, 18, 104],
};

function projectKindLabel(state: ProjectState, sections: Section[]): string {
  if (state.projectKind === "building") {
    const n = (state.subProjects ?? []).length;
    return `Edificio (${n} ${n === 1 ? "subproyecto" : "subproyectos"})`;
  }
  if (state.standaloneScope === "house") return "Casa";
  if (state.standaloneScope === "flat") return "Piso";
  return sections.length > 1 ? `Instalación (${sections.length} zonas)` : "Instalación";
}

function drawCover(env: Env, sections: Section[], generatedAt: string, startPages: number[]) {
  const { state } = env;
  const allModules = sections.flatMap((s) => s.modules);
  const counts = countTerminals(allModules);
  const sectionKind = state.projectKind === "building" ? "subproyectos" : "apartados";

  const data: string[][] = [
    ["Proyecto", state.projectName || "—"],
    ["Tipo de proyecto", projectKindLabel(state, sections)],
    ["Ubicación", state.location || "—"],
  ];
  if (state.projectKind !== "building") data.push(["Miniserver IP", state.miniserverIp || "—"]);
  data.push(
    ["Empresa instaladora", state.installerCompany?.trim() || "—"],
    ["Técnico responsable", state.installerTechnician?.trim() || "—"],
    ["Fecha", generatedAt],
    ["Aparatos", String(allModules.length)],
    ["Bornes con asignación", `${counts.assigned} de ${counts.total}`]
  );
  flowTable(env, "Datos generales del proyecto", "Datos generales del proyecto (continuación)", {
    head: ["Dato", "Valor"],
    widths: [52, CONTENT_W - 52],
    rows: data,
    boldColumns: [0],
  });

  if (sections.length === 0) return;

  const index: string[][] = sections.map((s, i) => {
    const c = countTerminals(s.modules);
    return [
      String(i + 1),
      s.review ? `${s.title} — REVISAR` : s.title,
      String(s.modules.length),
      `${c.assigned} de ${c.total}`,
      String(startPages[i] ?? "—"),
    ];
  });
  flowTable(
    env,
    `Índice de ${sectionKind}`,
    `Índice de ${sectionKind} (continuación)`,
    {
      head: ["Nº", sections[0]?.kind ?? "Apartado", "Aparatos", "Bornes asignados", "Página"],
      widths: [12, CONTENT_W - 12 - 24 - 36 - 22, 24, 36, 22],
      rows: index,
      boldColumns: [1],
    }
  );
}

/** Dibuja un apartado completo en páginas nuevas y devuelve la página donde empieza. */
function drawSection(env: Env, section: Section, index: number, total: number): number {
  const { doc } = env;
  newPage(env);
  const startPage = env.page;

  const counts = countTerminals(section.modules);
  const kindUpper = section.kind.toUpperCase();

  // Bloque de título del apartado
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text(`${kindUpper} ${index + 1} DE ${total}`, MARGIN, env.y, { baseline: "top" });
  env.y += textHeight(1, 7.5) + 1.2;

  const titleLines = wrap(doc, section.title, CONTENT_W, 15, true);
  doc.setTextColor(...INK);
  doc.text(titleLines, MARGIN, env.y, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
  env.y += textHeight(titleLines.length, 15) + 1.6;

  const info = [
    section.miniserverIp ? `Miniserver IP: ${section.miniserverIp}` : null,
    `Aparatos: ${section.modules.length}`,
    `Bornes asignados: ${counts.assigned} de ${counts.total}`,
  ]
    .filter(Boolean)
    .join("  ·  ");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...INK_SOFT);
  const infoLines = doc.splitTextToSize(info, CONTENT_W) as string[];
  doc.text(infoLines, MARGIN, env.y, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
  env.y += textHeight(infoLines.length, 8.5) + 2;

  doc.setDrawColor(...INK);
  doc.setLineWidth(0.35);
  doc.line(MARGIN, env.y, PAGE_W - MARGIN, env.y);
  env.y += 3;

  if (section.review) {
    const note =
      "REVISAR: estos aparatos no tienen zona asignada, por lo que no se pudo determinar a qué parte de la instalación pertenecen. Confirmar con el instalador.";
    const noteLines = wrap(doc, note, CONTENT_W - 6, 8, true);
    const h = textHeight(noteLines.length, 8) + 4;
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.3);
    doc.setFillColor(...FILL_HEADER);
    doc.rect(MARGIN, env.y, CONTENT_W, h, "FD");
    doc.setTextColor(...INK);
    doc.text(noteLines, MARGIN + 3, env.y + 2, { baseline: "top", lineHeightFactor: LINE_HEIGHT });
    env.y += h + 4;
  }

  if (section.modules.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...INK_MUTED);
    doc.text(
      `Este ${section.kind.toLowerCase()} no tiene aparatos configurados.`,
      MARGIN,
      env.y,
      { baseline: "top" }
    );
    env.y += textHeight(1, 9) + BLOCK_GAP;
    return startPage;
  }

  // 1) Aparatos que forman el apartado: conserva Nº de serie, zona y ubicación de cada uno.
  const devices: string[][] = section.modules.map((mod) => [
    originLabel(mod),
    mod.macOrSerial?.trim() || "—",
    [mod.zone?.trim(), mod.panelName?.trim()].filter(Boolean).join(" · ") || "—",
    `${countTerminals([mod]).assigned} de ${mod.terminals?.length ?? 0}`,
  ]);
  flowTable(
    env,
    `Aparatos de ${section.title}`,
    `Aparatos de ${section.title} (continuación)`,
    {
      head: ["Aparato de origen", "Nº de serie / MAC", "Estancia / ubicación", "Bornes asignados"],
      widths: [62, 40, 56, CONTENT_W - 62 - 40 - 56],
      rows: devices,
      boldColumns: [0],
    }
  );

  // 2) Asignaciones de todos los aparatos juntas, una sola tabla por apartado.
  const hasObs = section.modules.some((m) => (m.terminals ?? []).some((t) => observationsOf(t)));
  const widths = hasObs ? SUBPROJECT_COLUMNS.withObs : SUBPROJECT_COLUMNS.withoutObs;
  const rows: string[][] = [];
  const groups: number[] = [];
  section.modules.forEach((mod, g) => {
    const origin = originLabel(mod);
    const terminals = mod.terminals ?? [];
    if (terminals.length === 0) {
      rows.push(hasObs ? [origin, "—", "Sin entradas/salidas físicas", ""] : [origin, "—", "Sin entradas/salidas físicas"]);
      groups.push(g);
      return;
    }
    for (const t of terminals) {
      const base = [origin, t.borne || "—", t.connectedElement || "—"];
      rows.push(hasObs ? [...base, observationsOf(t)] : base);
      groups.push(g);
    }
  });

  flowTable(
    env,
    `Asignaciones — ${section.kind}: ${section.title}`,
    `Asignaciones — ${section.kind}: ${section.title} (continuación)`,
    {
      head: hasObs
        ? ["Aparato de origen", "Borne", "Elemento o función", "Observaciones"]
        : ["Aparato de origen", "Borne", "Elemento o función"],
      widths,
      rows,
      groups,
      originColumn: 0,
      boldColumns: [1],
    }
  );
  return startPage;
}

/* ───────────── Construcción del documento ───────────── */

function buildPass(
  state: ProjectState,
  options: TechnicalPdfOptions,
  generatedAt: string,
  startPages: number[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  // Página auxiliar muy alta (máximo de jsPDF): sirve para obtener las alturas reales.
  const scratch = new jsPDF({ orientation: "portrait", unit: "mm", format: [PAGE_W, 5000] });
  const sections = buildPdfSections(state, options);

  drawFirstHeader(doc, state, generatedAt);
  const env: Env = { doc, scratch, state, page: 1, y: FIRST_START_Y, label: "Índice" };

  if (sections.length === 0) {
    drawCover(env, sections, generatedAt, startPages);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...INK_MUTED);
    doc.text("No hay aparatos configurados en esta instalación.", MARGIN, env.y, {
      baseline: "top",
    });
    stampFooters(doc, generatedAt);
    return { doc, starts: [] as number[] };
  }

  drawCover(env, sections, generatedAt, startPages);

  const starts: number[] = [];
  sections.forEach((section, i) => {
    env.label = `${section.kind} ${i + 1}: ${section.title}`;
    // Cada apartado empieza en página nueva; drawSection devuelve esa página.
    starts.push(drawSection(env, section, i, sections.length));
  });

  stampFooters(doc, generatedAt);
  return { doc, starts };
}

/**
 * Construye la ficha técnica A4 organizada por subproyecto:
 * portada con datos generales e índice, y un apartado independiente por subproyecto
 * con todas sus asignaciones juntas, indicando el aparato de origen de cada una.
 */
export function buildTechnicalPdf(state: ProjectState, options: TechnicalPdfOptions = {}) {
  const generatedAt = formatWhen(new Date());
  const sectionCount = buildPdfSections(state, options).length;

  // Pasada 1: averigua en qué página empieza cada apartado.
  // Pasada 2: imprime el índice con esos números (el resto del diseño no cambia).
  const first = buildPass(state, options, generatedAt, Array(sectionCount).fill(0));
  return buildPass(state, options, generatedAt, first.starts).doc;
}

/**
 * Exporta la ficha técnica.
 * Tauri: diálogo nativo Guardar como. Navegador: descarga del PDF.
 */
export async function exportTechnicalPdf(state: ProjectState, options: TechnicalPdfOptions = {}) {
  const doc = buildTechnicalPdf(state, options);
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
