import type { DeviceModule, ProjectState, SearchHit, TerminalField, TerminalRow } from "../types/project";

export function formatBorneLabel(borne: string): string {
  const t = borne.trim();
  if (/^I\d+/i.test(t)) return `Entrada ${t}`;
  if (/^Q\d+/i.test(t)) return `Salida ${t}`;
  if (/^(Ch|AQ)\s*\d+/i.test(t)) return `Canal ${t}`;
  return t ? `Borne ${t}` : "Borne";
}

function elementNameOf(term: TerminalRow): string {
  return (
    term.connectedElement.trim() ||
    term.room?.trim() ||
    term.loadType?.trim() ||
    term.borne
  );
}

function pushHit(
  hits: SearchHit[],
  seen: Set<string>,
  mod: DeviceModule,
  term: TerminalRow
): void {
  const key = `${mod.id}:${term.id}`;
  if (seen.has(key)) return;
  seen.add(key);
  hits.push({
    moduleId: mod.id,
    terminalId: term.id,
    moduleAlias: mod.alias,
    borne: term.borne,
    borneLabel: formatBorneLabel(term.borne),
    connectedElement: term.connectedElement,
    elementName: elementNameOf(term),
    room: term.room,
    snippet: [term.borne, term.connectedElement, term.room].filter(Boolean).join(" · "),
  });
}

export function searchProject(state: ProjectState, query: string): SearchHit[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const mod of state.modules) {
    const hayMod = [mod.alias, mod.typeName, mod.macOrSerial, mod.zone ?? "", mod.panelName ?? ""]
      .join(" ")
      .toLowerCase();

    for (const term of mod.terminals) {
      const hay = [
        term.borne,
        formatBorneLabel(term.borne),
        term.connectedElement,
        term.loadType ?? "",
        term.cableRun ?? "",
        term.panelTerminal ?? "",
        term.observaciones ?? "",
        hayMod,
      ]
        .join(" ")
        .toLowerCase();
      if (hay.includes(q)) pushHit(hits, seen, mod, term);
    }
  }

  return hits.slice(0, 24);
}

export function countMappedTerminals(state: ProjectState): number {
  let n = 0;
  for (const mod of state.modules) {
    for (const t of mod.terminals) {
      if (t.connectedElement.trim()) n++;
    }
  }
  return n;
}

function addTerm(set: Set<string>, value: string | undefined) {
  const v = value?.trim() ?? "";
  if (v.length >= 2) set.add(v);
}

/** Valores ya escritos en una columna de la tabla de bornes (p. ej. estancia o tipo de carga). */
export function collectColumnTerms(state: ProjectState, field: TerminalField): string[] {
  const set = new Set<string>();
  for (const mod of state.modules) {
    for (const t of mod.terminals) {
      addTerm(set, t[field]);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}

/** Solo texto que el usuario ya escribió en este proyecto. Sin listas precargadas. */
export function collectAutocompleteTerms(state: ProjectState): string[] {
  const set = new Set<string>();
  for (const mod of state.modules) {
    for (const t of mod.terminals) {
      addTerm(set, t.connectedElement);
      addTerm(set, t.loadType);
      addTerm(set, t.cableRun);
      addTerm(set, t.observaciones);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"));
}
