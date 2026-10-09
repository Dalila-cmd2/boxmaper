import { Copy, FolderOpen, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { CreateProjectOptions, ProjectIndexEntry } from "../types/project";

export interface RecentProjectsModalProps {
  open: boolean;
  entries: ProjectIndexEntry[];
  activeId: string | null;
  onClose: () => void;
  onOpen: (id: string) => void;
  onNew: (
    nameOrOptions?: string | CreateProjectOptions,
    location?: string,
    miniserverIp?: string
  ) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
}

export function RecentProjectsModal({
  open,
  entries,
  activeId,
  onClose,
  onOpen,
  onNew,
  onDuplicate,
  onRename,
  onDelete,
}: RecentProjectsModalProps) {
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...entries].sort((a, b) =>
      String(b.lastModified).localeCompare(String(a.lastModified))
    );
    if (!q) return list;
    return list.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        String(e.client || "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (!open) return null;

  const submitNew = () => {
    onNew(newName.trim() || "Nuevo proyecto", newDesc.trim());
    setNewName("");
    setNewDesc("");
    setCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-h-[90dvh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="projects-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="projects-title" className="text-base font-semibold text-white">
            Proyectos
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            Nuevo proyecto
          </button>

          {creating && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/60 p-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Nombre</span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Vivienda Unifamiliar Andorra - Cuadro Principal"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <label className="mt-2 flex flex-col gap-1 text-sm">
                <span className="text-slate-400">Descripción / ubicación</span>
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Andorra, Escaldes, Canillo…"
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitNew}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                >
                  Crear proyecto
                </button>
              </div>
            </div>
          )}

          <label className="relative block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre…"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </label>
        </div>

        <div className="scrollbar-dark min-h-0 flex-1 overflow-y-auto p-3">
          {filtered.length === 0 ? (
            <p className="px-2 py-8 text-center text-sm text-slate-500">
              No hay proyectos que coincidan.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((entry) => (
                <li
                  key={entry.id}
                  className={`rounded-lg border p-3 ${
                    entry.id === activeId
                      ? "border-emerald-500/30 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-800/40"
                  }`}
                >
                  {renamingId === entry.id ? (
                    <form
                      className="flex gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onRename(entry.id, renameValue);
                        setRenamingId(null);
                      }}
                    >
                      <input
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-white focus:border-emerald-500 focus:outline-none"
                      />
                      <button type="submit" className="text-xs text-emerald-400">
                        Guardar
                      </button>
                    </form>
                  ) : (
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{entry.name}</div>
                      {entry.client ? (
                        <div className="mt-0.5 truncate text-xs text-slate-500">{entry.client}</div>
                      ) : null}
                      <div className="mt-1 text-xs text-slate-400">
                        Última edición: {new Date(entry.lastModified).toLocaleString("es-ES")}
                      </div>
                      <div className="mt-0.5 text-xs text-slate-500">
                        {entry.moduleCount} módulos • {entry.totalTerminals} bornes ocupados
                      </div>
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        onOpen(entry.id);
                        onClose();
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      <FolderOpen className="h-3 w-3" />
                      Abrir
                    </button>
                    <button
                      type="button"
                      onClick={() => onDuplicate(entry.id)}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      <Copy className="h-3 w-3" />
                      Duplicar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRenamingId(entry.id);
                        setRenameValue(entry.name);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      <Pencil className="h-3 w-3" />
                      Renombrar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar «${entry.name}» de recientes?`)) {
                          onDelete(entry.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-slate-800 hover:text-red-400"
                    >
                      <Trash2 className="h-3 w-3" />
                      Eliminar de recientes
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
