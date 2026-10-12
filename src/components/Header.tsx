import {
  ArrowLeft,
  Check,
  Cpu,
  Database,
  FileDown,
  FileSpreadsheet,
  FolderKanban,
  FolderOutput,
  Info,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { ProjectState, SearchHit } from "../types/project";
import { exportProjectCsv } from "../utils/csvExport";
import { exportProjectExcel } from "../utils/excelExport";
import { saveProjectFile, saveProjectFileAs } from "../utils/fileSystem";
import { importBoxmaperFile } from "../utils/projectIndex";
import { downloadProjectJson } from "../utils/storage";
import { GlobalSearch } from "./GlobalSearch";
import { exportTechnicalPdf } from "../utils/pdfGenerator";
import { checkForUpdates, showAbout } from "../utils/appUpdater";
import { openSyncPanel } from "../sync/syncService";
import { MenuDropdown, menuItemClass } from "./WorkspaceMenuBar";

interface Props {
  rootState: ProjectState;
  workspaceState: ProjectState;
  filePath: string | null;
  onFilePathChange: (path: string | null) => void;
  onSearchSelect: (hit: SearchHit) => void;
  onAddCatalogModule: (catalogId: string, name: string) => void;
  onImport: (state: ProjectState) => void;
  onOpenRecents: () => void;
  lastSavedAt: Date | null;
  saveStatus: "saved" | "saving";
  subProjectName?: string;
  onBackToBuilding?: () => void;
  onEditSubProject?: () => void;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function Header({
  rootState,
  workspaceState,
  filePath,
  onFilePathChange,
  onSearchSelect,
  onAddCatalogModule,
  onImport,
  onOpenRecents,
  lastSavedAt,
  saveStatus,
  subProjectName,
  onBackToBuilding,
  onEditSubProject,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      const result = await exportProjectCsv(workspaceState);
      if (result === "empty") {
        alert("No existen datos para exportar. Añade al menos un dispositivo al proyecto.");
      }
    } catch (error) {
      console.error("Error al exportar a CSV:", error);
      alert("No se pudo generar el archivo CSV. Inténtalo de nuevo.");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const result = await exportProjectExcel(workspaceState);
      if (result === "empty") {
        alert("No existen datos para exportar. Añade al menos un dispositivo al proyecto.");
      }
    } catch (error) {
      console.error("Error al exportar a Excel:", error);
      alert("No se pudo generar el archivo Excel. Inténtalo de nuevo.");
    } finally {
      setExportingExcel(false);
    }
  };

  const handleSave = async () => {
    if (!isTauri()) {
      downloadProjectJson(rootState);
      return;
    }
    setSaving(true);
    try {
      if (filePath) {
        await saveProjectFile(filePath, rootState);
      } else {
        const path = await saveProjectFileAs(rootState);
        if (path) onFilePathChange(path);
      }
    } catch {
      alert("No se pudo guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAs = async () => {
    if (!isTauri()) {
      downloadProjectJson(rootState);
      return;
    }
    setSaving(true);
    try {
      const path = await saveProjectFileAs(rootState);
      if (path) onFilePathChange(path);
    } catch {
      alert("No se pudo guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  const titleLine = subProjectName
    ? `${rootState.projectName} › ${subProjectName}`
    : rootState.projectName;

  return (
    <header className="flex shrink-0 flex-col gap-1 border-b border-slate-800/80 bg-slate-950/80 px-3 py-1.5">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          {onBackToBuilding ? (
            <button
              type="button"
              onClick={onBackToBuilding}
              title="Volver al edificio"
              className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-emerald-400"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <Cpu className="h-4 w-4 shrink-0 text-emerald-400/90" />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold tracking-wide text-white">BoxMaper</h1>
            <p className="truncate text-[10px] text-slate-500">
              {titleLine}
              {rootState.location ? ` · ${rootState.location}` : ""}
              {filePath ? ` · ${baseName(filePath)}` : ""}
            </p>
          </div>
        </div>

        <nav
          className="flex shrink-0 flex-wrap items-center gap-0.5 border-l border-slate-800 pl-2"
          aria-label="Menú principal"
        >
          <MenuDropdown label="Archivo">
            <button type="button" disabled={saving} className={menuItemClass(saving)} onClick={() => void handleSave()}>
              <Save className="h-3.5 w-3.5" />
              Guardar
            </button>
            <button type="button" disabled={saving} className={menuItemClass(saving)} onClick={() => void handleSaveAs()}>
              <FolderOutput className="h-3.5 w-3.5" />
              Guardar como…
            </button>
            <button type="button" className={menuItemClass()} onClick={() => fileRef.current?.click()}>
              <Upload className="h-3.5 w-3.5" />
              Abrir…
            </button>
            <button type="button" className={menuItemClass()} onClick={onOpenRecents}>
              <FolderKanban className="h-3.5 w-3.5" />
              Proyectos recientes
            </button>
            {onEditSubProject ? (
              <button type="button" className={menuItemClass()} onClick={onEditSubProject}>
                <Pencil className="h-3.5 w-3.5" />
                Renombrar planta / piso…
              </button>
            ) : null}
          </MenuDropdown>

          <MenuDropdown label="Exportar">
            <button
              type="button"
              className={menuItemClass()}
              onClick={() =>
                exportTechnicalPdf(rootState).catch(() =>
                  alert("No se pudo generar la ficha técnica PDF."),
                )
              }
            >
              {onBackToBuilding ? "Ficha PDF (proyecto completo)" : "Ficha PDF"}
            </button>
            {onBackToBuilding && rootState.activeSubProjectId ? (
              <button
                type="button"
                className={menuItemClass()}
                onClick={() =>
                  exportTechnicalPdf(rootState, {
                    onlySubProjectId: rootState.activeSubProjectId,
                  }).catch(() => alert("No se pudo generar la ficha técnica PDF."))
                }
              >
                Ficha PDF (solo {subProjectName || "este subproyecto"})
              </button>
            ) : null}
            <button
              type="button"
              disabled={exportingCsv}
              className={menuItemClass(exportingCsv)}
              onClick={() => void handleExportCsv()}
            >
              {exportingCsv ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
              CSV
            </button>
            <button
              type="button"
              disabled={exportingExcel}
              className={menuItemClass(exportingExcel)}
              onClick={() => void handleExportExcel()}
            >
              {exportingExcel ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-3.5 w-3.5" />
              )}
              Excel
            </button>
          </MenuDropdown>

          <MenuDropdown label="Ayuda">
            {isTauri() ? (
              <button
                type="button"
                className={menuItemClass()}
                onClick={() => void checkForUpdates(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Buscar actualizaciones…
              </button>
            ) : null}
            <button type="button" className={menuItemClass()} onClick={openSyncPanel}>
              <Database className="h-3.5 w-3.5" />
              Datos y sincronización…
            </button>
            <button type="button" className={menuItemClass()} onClick={() => void showAbout()}>
              <Info className="h-3.5 w-3.5" />
              Acerca de BoxMaper
            </button>
          </MenuDropdown>
        </nav>

        <div className="min-w-[12rem] max-w-md flex-1">
          <GlobalSearch
            state={workspaceState}
            onSelectHit={onSearchSelect}
            onAddCatalogModule={onAddCatalogModule}
          />
        </div>

        <p className="ml-auto flex shrink-0 items-center gap-1 text-[10px] text-slate-500">
          {saveStatus === "saving" ? (
            <span>Guardando…</span>
          ) : lastSavedAt ? (
            <>
              <Check className="h-2.5 w-2.5 text-emerald-500/80" />
              <span>
                {lastSavedAt.toLocaleTimeString("es-ES", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </>
          ) : (
            <span>Autoguardado</span>
          )}
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".boxmaper,.json,application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const imported = await importBoxmaperFile(f);
          if (imported) onImport(imported);
          else alert("No se pudo abrir el archivo .boxmaper o .json.");
        }}
      />
    </header>
  );
}
