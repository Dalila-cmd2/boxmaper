import { Plus } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { DeviceModule, ProjectState, TerminalField } from "../types/project";
import { LOAD_TYPE_PRESETS, mergeSuggestions } from "../data/domainSuggestions";
import { collectAutocompleteTerms, collectColumnTerms } from "../utils/search";
import { CellAutocomplete } from "./CellAutocomplete";

const COLUMNS: { field: TerminalField; label: string; placeholder: string; mono?: boolean }[] = [
  { field: "borne", label: "Canal/Borne", placeholder: "Ej. Q1", mono: true },
  { field: "connectedElement", label: "Elemento Conectado", placeholder: "Descripción..." },
  { field: "loadType", label: "Tipo de Carga/Tension", placeholder: "Ej. Iluminación" },
  { field: "cableRun", label: "Alimentación", placeholder: "Ej. 24V / L+" },
];

interface Props {
  project: ProjectState;
  module: DeviceModule;
  highlightedTerminalId: string | null;
  onUpdate: (terminalId: string, field: TerminalField, value: string) => void;
  onHighlightDone: () => void;
  onAddRow: () => void;
  /** Modo Split: filas y tipografía más compactas. */
  dense?: boolean;
  /** Evita robar foco cuando el editor del pinout está abierto. */
  suppressHighlightFocus?: boolean;
}

export function ConnectionTable({
  project,
  module,
  highlightedTerminalId,
  onUpdate,
  onHighlightDone,
  onAddRow,
  dense = false,
  suppressHighlightFocus = false,
}: Props) {
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const focusNewRow = useRef(false);
  const suggestions = useMemo(() => collectAutocompleteTerms(project), [project]);
  const loadSuggestions = useMemo(
    () => mergeSuggestions(collectColumnTerms(project, "loadType"), LOAD_TYPE_PRESETS),
    [project]
  );
  const onHighlightDoneRef = useRef(onHighlightDone);
  onHighlightDoneRef.current = onHighlightDone;

  useEffect(() => {
    if (suppressHighlightFocus || !highlightedTerminalId) return;
    const el = inputRefs.current.get(`${highlightedTerminalId}:connectedElement`);
    el?.focus();
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(() => onHighlightDoneRef.current(), 2000);
    return () => clearTimeout(t);
  }, [highlightedTerminalId, suppressHighlightFocus]);

  const focusNext = (rowIndex: number, colIndex: number) => {
    const nextCol = colIndex + 1;
    if (nextCol < COLUMNS.length) {
      const term = module.terminals[rowIndex];
      inputRefs.current.get(`${term.id}:${COLUMNS[nextCol].field}`)?.focus();
      return;
    }
    const nextRow = module.terminals[rowIndex + 1];
    if (nextRow) {
      inputRefs.current.get(`${nextRow.id}:${COLUMNS[0].field}`)?.focus();
      return;
    }
    focusNewRow.current = true;
    onAddRow();
  };

  useEffect(() => {
    if (!focusNewRow.current) return;
    focusNewRow.current = false;
    const last = module.terminals[module.terminals.length - 1];
    if (!last) return;
    requestAnimationFrame(() => {
      inputRefs.current.get(`${last.id}:${COLUMNS[0].field}`)?.focus();
    });
  }, [module.terminals]);

  return (
    <div
      className={`flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-800/70 bg-slate-900/40 ${
        dense ? "h-full min-h-0 flex-1" : "max-h-none shrink-0 md:max-h-[24rem]"
      }`}
    >
      <div className="scrollbar-dark min-h-0 flex-1 overflow-x-auto overflow-y-auto">
      <table className={`block w-full text-left sm:table ${dense ? "sm:min-w-[640px] sm:text-xs" : "sm:min-w-[720px] sm:text-sm"}`}>
        <thead className="sticky top-0 z-10 hidden border-b border-slate-800/70 bg-slate-950/90 uppercase tracking-wider text-slate-500 sm:table-header-group">
          <tr>
            {COLUMNS.map((col) => (
              <th
                key={col.field}
                className={`sticky top-0 z-10 bg-slate-950/90 font-medium ${
                  dense ? "px-2 py-1 text-[9px]" : "px-3 py-2 text-[11px]"
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="block divide-y divide-slate-800/60 text-slate-200 sm:table-row-group">
          {module.terminals.map((term, rowIndex) => {
            const highlighted = term.id === highlightedTerminalId;

            return (
              <tr
                key={term.id}
                className={`grid grid-cols-2 gap-x-2 gap-y-1 px-2 py-2 transition hover:bg-slate-800/50 focus-within:bg-slate-800/80 sm:table-row sm:p-0 ${
                  highlighted ? "bg-emerald-500/10 ring-1 ring-inset ring-emerald-500/40" : ""
                }`}
              >
                {COLUMNS.map((col, colIndex) => {
                  const value = term[col.field] ?? "";
                  const columnLikeZone = col.field === "loadType";
                  const columnSuggestions =
                    col.field === "loadType" ? loadSuggestions : suggestions;
                  return (
                    <td
                      key={col.field}
                      className={`flex flex-col gap-0.5 sm:table-cell sm:gap-0 ${
                        colIndex < 2 ? "col-span-2" : "col-span-1"
                      } ${dense ? "sm:px-1.5 sm:py-0.5" : "sm:px-2 sm:py-1.5"}`}
                    >
                      <span className="px-1 text-[10px] font-medium uppercase tracking-wider text-slate-500 sm:hidden">
                        {col.label}
                      </span>
                      <CellAutocomplete
                        ref={(el) => {
                          const key = `${term.id}:${col.field}`;
                          if (el) inputRefs.current.set(key, el);
                          else inputRefs.current.delete(key);
                        }}
                        value={value}
                        suggestions={columnSuggestions}
                        showOnFocus={columnLikeZone}
                        onChange={(next) => onUpdate(term.id, col.field, next)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
                            e.preventDefault();
                            focusNext(rowIndex, colIndex);
                          }
                        }}
                        className={`w-full rounded bg-transparent text-slate-100 placeholder-slate-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                          dense ? "px-1.5 py-1.5 text-xs sm:py-0.5" : "px-2 py-2 sm:py-1"
                        } ${col.mono ? "font-mono font-bold text-emerald-400" : ""}`}
                        placeholder={col.placeholder}
                      />
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
      <button
        type="button"
        onClick={() => {
          focusNewRow.current = true;
          onAddRow();
        }}
        className="flex shrink-0 items-center justify-center gap-1.5 border-t border-slate-800/70 bg-slate-950/60 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-800/60 hover:text-emerald-400"
      >
        <Plus className="h-3.5 w-3.5" />
        Añadir fila
      </button>
    </div>
  );
}
