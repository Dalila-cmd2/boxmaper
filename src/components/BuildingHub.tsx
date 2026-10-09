import {
  ArrowLeft,
  Building2,
  Copy,
  FileDown,
  FileSpreadsheet,
  FolderOutput,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { ProjectState, SubProject } from "../types/project";
import { exportEntireBuilding } from "../utils/buildingExport";
import { saveProjectFile, saveProjectFileAs } from "../utils/fileSystem";
import { downloadProjectJson } from "../utils/storage";
import { SubProjectModal } from "./SubProjectModal";

interface Props {
  state: ProjectState;
  filePath: string | null;
  saveStatus: "saved" | "saving";
  lastSavedAt: Date | null;
  onFilePathChange: (path: string | null) => void;
  onCloseProject: () => void;
  onEditBuildingInfo: () => void;
  onOpenSubProject: (id: string) => void;
  onAddSubProject: (name: string, miniserverIp: string) => void;
  onDuplicateSubProject: (id: string) => void;
  onRemoveSubProject: (id: string) => void;
  onEditSubProject: (id: string, name: string, miniserverIp: string) => void;
  onOpenRecents: () => void;
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export function BuildingHub({
  state,
  filePath,
  saveStatus,
  lastSavedAt,
  onFilePathChange,
  onCloseProject,
  onEditBuildingInfo,
  onOpenSubProject,
  onAddSubProject,
  onDuplicateSubProject,
  onRemoveSubProject,
  onEditSubProject,
  onOpenRecents,
}: Props) {
  const [subModalOpen, setSubModalOpen] = useState(false);
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [exportBusy, setExportBusy] = useState<string | null>(null);

  const subs = state.subProjects ?? [];

  const handleSave = async () => {
    if (!isTauri()) {
      downloadProjectJson(state);
      return;
    }
    setSaving(true);
    try {
      if (filePath) await saveProjectFile(filePath, state);
      else {
        const path = await saveProjectFileAs(state);
        if (path) onFilePathChange(path);
      }
    } catch {
      alert("No se pudo guardar el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  const exportAll = async (format: "csv" | "excel" | "pdf") => {
    setExportBusy(format);
    try {
      const result = await exportEntireBuilding(state, format);
      if (result === "empty") {
        alert("No hay subproyectos con dispositivos para exportar.");
      }
    } catch {
      alert("No se pudo exportar el edificio completo.");
    } finally {
      setExportBusy(null);
    }
  };

  const ghostBtn =
    "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:bg-slate-800/70 hover:text-slate-200 disabled:opacity-50";

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950 text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800/80 px-4 py-3">
        <button
          type="button"
          onClick={onCloseProject}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Inicio
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <Building2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <div className="min-w-0">
            <h1 className="truncate text-sm font-semibold text-white">{state.projectName}</h1>
            <p className="truncate text-xs text-slate-500">
              Edificio
              {state.location ? ` · ${state.location}` : ""}
              {filePath ? ` · ${baseName(filePath)}` : ""}
            </p>
          </div>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1">
          <button type="button" onClick={onOpenRecents} className={ghostBtn}>
            Proyectos
          </button>
          <button type="button" disabled={saving} onClick={() => void handleSave()} className={ghostBtn}>
            <Save className="h-3.5 w-3.5" />
            Guardar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!isTauri()) downloadProjectJson(state);
              else {
                const path = await saveProjectFileAs(state);
                if (path) onFilePathChange(path);
              }
            }}
            className={ghostBtn}
          >
            <FolderOutput className="h-3.5 w-3.5" />
            Como…
          </button>
          <div className="mx-1 h-4 w-px bg-slate-800" />
          <button
            type="button"
            className={ghostBtn}
            disabled={exportBusy === "pdf"}
            onClick={() => void exportAll("pdf")}
          >
            {exportBusy === "pdf" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            PDF todo
          </button>
          <button
            type="button"
            className={ghostBtn}
            disabled={exportBusy === "csv"}
            onClick={() => void exportAll("csv")}
          >
            {exportBusy === "csv" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}
            CSV todo
          </button>
          <button
            type="button"
            className={ghostBtn}
            disabled={exportBusy === "excel"}
            onClick={() => void exportAll("excel")}
          >
            {exportBusy === "excel" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            Excel todo
          </button>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 overflow-y-auto p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Subproyectos</h2>
            <p className="text-sm text-slate-500">
              Cada planta o local tiene su propia pantalla de cuadro y Miniserver.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onEditBuildingInfo}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800"
            >
              Datos del edificio
            </button>
            <button
              type="button"
              onClick={() => setSubModalOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Añadir subproyecto
            </button>
          </div>
        </div>

        {subs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 p-12 text-center text-sm text-slate-500">
            Aún no hay subproyectos. Crea uno por cada piso, local o instalación del edificio.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {subs.map((sub) => (
              <SubProjectCard
                key={sub.id}
                sub={sub}
                onOpen={() => onOpenSubProject(sub.id)}
                onEdit={() => setEditSubId(sub.id)}
                onDuplicate={() => onDuplicateSubProject(sub.id)}
                onRemove={() => {
                  if (window.confirm(`¿Eliminar «${sub.name}» y todos sus módulos?`)) {
                    onRemoveSubProject(sub.id);
                  }
                }}
              />
            ))}
          </ul>
        )}

        <p className="text-center text-[11px] text-slate-600">
          {saveStatus === "saving"
            ? "Guardando…"
            : lastSavedAt
              ? `Guardado ${lastSavedAt.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`
              : "Autoguardado activo"}
        </p>
      </main>

      <SubProjectModal
        open={subModalOpen}
        onClose={() => setSubModalOpen(false)}
        onSubmit={onAddSubProject}
      />
      <SubProjectModal
        open={editSubId !== null}
        mode="edit"
        initial={
          editSubId
            ? {
                name: subs.find((s) => s.id === editSubId)?.name ?? "",
                miniserverIp: subs.find((s) => s.id === editSubId)?.miniserverIp ?? "",
              }
            : undefined
        }
        onClose={() => setEditSubId(null)}
        onSubmit={(name, miniserverIp) => {
          if (editSubId) onEditSubProject(editSubId, name, miniserverIp);
        }}
      />
    </div>
  );
}

function SubProjectCard({
  sub,
  onOpen,
  onEdit,
  onDuplicate,
  onRemove,
}: {
  sub: SubProject;
  onOpen: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
}) {
  const mapped = sub.modules.reduce(
    (n, mod) => n + mod.terminals.filter((t) => t.connectedElement.trim()).length,
    0
  );

  return (
    <li className="flex flex-col rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <button type="button" onClick={onOpen} className="flex flex-1 flex-col items-start gap-2 text-left">
        <span className="text-base font-semibold text-white">{sub.name}</span>
        <span className="text-xs text-slate-500">
          {sub.modules.length} módulos · {mapped} bornes asignados
          {sub.miniserverIp ? ` · IP ${sub.miniserverIp}` : ""}
        </span>
      </button>
      <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-800/80 pt-3">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <Pencil className="h-3.5 w-3.5" />
          Renombrar
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-400 hover:bg-slate-800 hover:text-slate-200"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicar
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-500 hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      </div>
    </li>
  );
}
