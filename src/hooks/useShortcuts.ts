import { useEffect } from "react";
import { isTauri } from "@tauri-apps/api/core";
import type { ProjectState } from "../types/project";
import { openProjectFile, saveProjectFile, saveProjectFileAs } from "../utils/fileSystem";
import { importBoxmaperFile } from "../utils/projectIndex";
import { downloadProjectJson } from "../utils/storage";
import { exportProjectPdf } from "../utils/pdfGenerator";

interface UseShortcutsOptions {
  /** Si hay un proyecto activo en el espacio de trabajo (no en la pantalla de inicio). */
  isProjectLoaded: boolean;
  state: ProjectState | null;
  currentFilePath: string | null;
  /** Abre el formulario de nuevo proyecto. */
  onNewProject: () => void;
  loadProject: (data: ProjectState, path: string | null) => void;
}

/**
 * Guarda el proyecto activo.
 * - Fuera de Tauri: descarga el JSON en el navegador.
 * - Dentro de Tauri: sobrescribe el archivo `.loxinstal` conocido, o abre el diálogo
 *   nativo "Guardar como" si el proyecto aún no está asociado a ninguna ruta.
 */
async function saveActiveProject(
  state: ProjectState,
  currentFilePath: string | null,
  loadProject: (data: ProjectState, path: string | null) => void
): Promise<void> {
  if (!isTauri()) {
    downloadProjectJson(state);
    return;
  }
  try {
    if (currentFilePath) {
      await saveProjectFile(currentFilePath, state);
    } else {
      const path = await saveProjectFileAs(state);
      if (path) loadProject(state, path);
    }
  } catch {
    alert("No se pudo guardar el proyecto.");
  }
}

/** Abre el diálogo nativo "Abrir proyecto" y activa el proyecto seleccionado. */
async function openProjectViaShortcut(
  loadProject: (data: ProjectState, path: string | null) => void
): Promise<void> {
  if (!isTauri()) {
    // En el navegador / PWA: selector de archivos del sistema.
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const imported = await importBoxmaperFile(file);
      if (imported) loadProject(imported, null);
      else alert("No se pudo abrir el archivo .boxmaper o .json.");
    };
    input.click();
    return;
  }
  try {
    const opened = await openProjectFile();
    if (opened) loadProject(opened.state, opened.path);
  } catch {
    alert("No se pudo abrir el proyecto.");
  }
}

/**
 * Atajos de teclado globales de BoxMaper.
 * Ctrl+S: guardar · Ctrl+N: nuevo proyecto · Ctrl+O: abrir proyecto · Ctrl+E / Ctrl+P: exportar PDF.
 * Todos bloquean el comportamiento por defecto del navegador (guardar página, imprimir, etc.).
 */
export function useShortcuts({
  isProjectLoaded,
  state,
  currentFilePath,
  onNewProject,
  loadProject,
}: UseShortcutsOptions): void {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isShortcutCombo = e.ctrlKey || e.metaKey;
      if (!isShortcutCombo) return;

      const key = e.key.toLowerCase();

      switch (key) {
        case "s": {
          e.preventDefault();
          if (isProjectLoaded && state) {
            void saveActiveProject(state, currentFilePath, loadProject);
          }
          break;
        }
        case "n": {
          e.preventDefault();
          onNewProject();
          break;
        }
        case "o": {
          e.preventDefault();
          void openProjectViaShortcut(loadProject);
          break;
        }
        case "e":
        case "p": {
          e.preventDefault();
          if (isProjectLoaded && state) {
            void exportProjectPdf(state).catch(() => alert("No se pudo exportar el PDF."));
          }
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProjectLoaded, state, currentFilePath, onNewProject, loadProject]);
}
