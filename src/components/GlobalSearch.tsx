import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { searchLoxoneModules, type LoxoneModule } from "../data/loxoneCatalog";
import type { ProjectState, SearchHit } from "../types/project";
import { searchProject } from "../utils/search";

interface Props {
  state: ProjectState;
  onSelectHit: (hit: SearchHit) => void;
  onAddCatalogModule: (catalogId: string, name: string) => void;
}

function highlightMatch(name: string, query: string) {
  const q = query.trim();
  if (!q) return name;
  const i = name.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return name;
  return (
    <>
      {name.slice(0, i)}
      <span className="font-semibold text-emerald-400">{name.slice(i, i + q.length)}</span>
      {name.slice(i + q.length)}
    </>
  );
}

export function GlobalSearch({ state, onSelectHit, onAddCatalogModule }: Props) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const catalogMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return searchLoxoneModules(q);
  }, [query]);

  const hits = useMemo(() => searchProject(state, query), [state, query]);
  const showMenu = isOpen && query.trim() !== "";

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const pickModule = (item: LoxoneModule) => {
    onAddCatalogModule(item.id, item.name);
    setQuery("");
    setIsOpen(false);
  };

  const pickHit = (hit: SearchHit) => {
    onSelectHit(hit);
    setQuery("");
    setIsOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Buscar en la instalación…"
        className="w-full rounded-md border border-slate-800 bg-slate-900/60 py-1.5 pl-9 pr-3 text-sm text-slate-200 placeholder-slate-500 transition-colors focus:border-emerald-500/60 focus:outline-none focus:ring-1 focus:ring-emerald-500/40"
      />
      {showMenu && (
        <div className="scrollbar-dark absolute left-0 top-full z-50 mt-1 max-h-80 w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
          {hits.length > 0 && (
            <>
              <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                En la instalación
              </div>
              {hits.map((h) => (
                <button
                  key={`${h.moduleId}-${h.terminalId}-${h.elementName}`}
                  type="button"
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-slate-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickHit(h)}
                >
                  <span className="text-sm text-slate-100">
                    {highlightMatch(h.elementName, query)}
                  </span>
                  <span className="text-xs text-slate-400">{h.moduleAlias}</span>
                  <span className="font-mono text-xs text-emerald-400">{h.borneLabel}</span>
                </button>
              ))}
            </>
          )}
          {catalogMatches.length > 0 && (
            <>
              <div className="border-t border-slate-700 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Añadir módulo del catálogo
              </div>
              {catalogMatches.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-sm text-slate-200 hover:bg-slate-700"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pickModule(item)}
                >
                  <span>{highlightMatch(item.name, query)}</span>
                  <span className="text-xs text-slate-400">{item.category}</span>
                </button>
              ))}
            </>
          )}
          {hits.length === 0 && catalogMatches.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">Sin resultados</div>
          )}
        </div>
      )}
    </div>
  );
}
