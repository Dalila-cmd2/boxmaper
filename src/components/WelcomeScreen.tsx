import { CircuitBoard, Cpu, FilePlus, FolderOpen, History, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { InstallAppButton } from "./InstallAppButton";
import type { ProjectIndexEntry, ProjectState } from "../types/project";
import { importBoxmaperFile } from "../utils/projectIndex";
import { openProjectFile } from "../utils/fileSystem";
import { HardwareCatalogExplorerModal } from "./HardwareCatalogExplorerModal";

interface Props {
  /** Abre el formulario de nuevo proyecto. */
  onNewProject: () => void;
  loadProject: (data: ProjectState, path: string | null) => void;
  recentProjects: ProjectIndexEntry[];
  onOpenRecent: (id: string) => boolean;
  onDeleteRecent: (id: string) => void;
}

export function WelcomeScreen({
  onNewProject,
  loadProject,
  recentProjects,
  onOpenRecent,
  onDeleteRecent,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImportedFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const imported = await importBoxmaperFile(file);
      if (imported) {
        loadProject(imported, null);
        return;
      }
      setError("No se pudo abrir el archivo .boxmaper o .json.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el proyecto.");
    } finally {
      setBusy(false);
    }
  };

  const handleOpen = async () => {
    setError(null);
    // En el navegador / PWA se usa el selector de archivos del sistema.
    if (!isTauri()) {
      fileRef.current?.click();
      return;
    }
    setBusy(true);
    try {
      const opened = await openProjectFile();
      if (opened) {
        loadProject(opened.state, opened.path);
        return;
      }
    } catch {
      fileRef.current?.click();
      setBusy(false);
      return;
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-0 w-full flex-1 overflow-y-auto bg-slate-950">
    <div className="m-auto flex w-full flex-col items-center gap-6 p-4 sm:gap-8 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/20 p-2.5 text-emerald-400">
          <CircuitBoard className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">BoxMaper</h1>
          <p className="text-xs uppercase tracking-wide text-emerald-400/80">
            Mapeador de instalación de domótica
          </p>
          <p className="mt-1 max-w-xs text-[11px] leading-snug text-slate-500">
            Instalá una vez: los proyectos publicados en el repositorio central se actualizan solos en esta app.
          </p>
        </div>
      </div>

      <div className="grid w-full max-w-3xl gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={onNewProject}
            className="flex flex-col items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-left transition hover:border-emerald-500/60 hover:bg-emerald-500/20"
          >
            <FilePlus className="h-8 w-8 text-emerald-400" />
            <span className="text-base font-semibold text-white">Nuevo Proyecto</span>
            <span className="text-xs text-slate-400">
              Empieza a mapear un cuadro desde cero.
            </span>
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={handleOpen}
            className="flex flex-col items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900 p-6 text-left transition hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
          >
            <FolderOpen className="h-8 w-8 text-emerald-400" />
            <span className="text-base font-semibold text-white">Abrir Proyecto</span>
            <span className="text-xs text-slate-400">
              Importa un archivo .boxmaper o .json y lo añade a recientes.
            </span>
          </button>

          <button
            type="button"
            onClick={() => setCatalogOpen(true)}
            className="flex flex-col items-start gap-3 rounded-2xl border border-slate-700 bg-slate-900/80 p-6 text-left transition hover:border-emerald-500/40 hover:bg-slate-800"
          >
            <Cpu className="h-8 w-8 text-emerald-400" />
            <span className="text-base font-semibold text-white">Explorar Catálogo Loxone</span>
            <span className="text-xs text-slate-400">
              Filtra controladores, extensiones, Nano y pasarelas A/C con vista de bornes.
            </span>
          </button>
          <InstallAppButton variant="card" />
          <input
            ref={fileRef}
            type="file"
            accept=""
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void handleImportedFile(f);
            }}
          />

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center gap-2 text-slate-300">
            <History className="h-4 w-4 text-slate-500" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Proyectos Recientes
            </h2>
          </div>

          {recentProjects.length === 0 ? (
            <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500">
              Todavía no hay proyectos recientes.
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5 overflow-y-auto">
              {recentProjects.map((entry) => (
                <li key={entry.id}>
                  <div className="group flex items-center gap-2 rounded-lg border border-transparent bg-slate-800/40 p-2.5 text-left text-sm transition hover:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => {
                        if (!onOpenRecent(entry.id)) {
                          setError(`No se pudo abrir «${entry.name}».`);
                        }
                      }}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <FolderOpen className="h-4 w-4 shrink-0 text-slate-500" />
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-200">{entry.name}</div>
                        <div className="truncate text-xs text-slate-500">
                          {entry.projectKind === "building"
                            ? `Edificio • ${entry.subProjectCount ?? 0} subproyectos • `
                            : ""}
                          {entry.client ? `${entry.client} • ` : ""}
                          {entry.moduleCount} módulos • {entry.totalTerminals} bornes
                          {" • "}
                          {new Date(entry.lastModified).toLocaleString("es-ES")}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`¿Eliminar «${entry.name}» de recientes?`)) {
                          onDeleteRecent(entry.id);
                        }
                      }}
                      aria-label="Eliminar de recientes"
                      className="shrink-0 rounded p-2 text-slate-500 transition hover:bg-slate-700 hover:text-red-400 md:p-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <HardwareCatalogExplorerModal open={catalogOpen} onClose={() => setCatalogOpen(false)} />
    </div>
    </div>
  );
}
