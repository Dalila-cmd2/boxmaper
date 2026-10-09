import { isTauri } from "@tauri-apps/api/core";
import type { ProjectState } from "../types/project";
import { migrateProjectState } from "./projectModel";
import { parseImportedProject } from "./projectIndex";

/** Extensiones de proyecto: nativo .boxmaper, JSON y legado .loxinstal. */
export const PROJECT_EXTENSION = "boxmaper";
const PROJECT_FILTERS = [
  { name: "Proyecto BoxMaper", extensions: ["boxmaper", "json", "loxinstal"] },
];

export interface OpenedProject {
  path: string;
  state: ProjectState;
}

function assertDesktop(): void {
  if (!isTauri()) {
    throw new Error(
      "Los archivos de proyecto solo se pueden abrir o guardar desde la app de escritorio.",
    );
  }
}

/**
 * Abre un proyecto .boxmaper, .json o .loxinstal.
 * - Sin `path`: muestra el diálogo nativo "Abrir" para que el usuario elija el archivo.
 * - Con `path`: lee directamente esa ruta conocida, sin mostrar ningún diálogo.
 */
export async function openProjectFile(
  path?: string,
): Promise<OpenedProject | null> {
  assertDesktop();

  let targetPath = path;
  if (!targetPath) {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({
      title: "Abrir proyecto BoxMaper",
      multiple: false,
      filters: PROJECT_FILTERS,
    });
    if (!selected) return null;
    targetPath = selected;
  }

  const { readTextFile } = await import("@tauri-apps/plugin-fs");
  try {
    const raw = await readTextFile(targetPath);
    const parsed = JSON.parse(raw);
    const state = parseImportedProject(parsed) ?? migrateProjectState(parsed);
    if (!state) return null;
    return { path: targetPath, state };
  } catch {
    return null;
  }
}

/** Abre el diálogo nativo "Guardar como" y escribe el proyecto en un nuevo archivo. */
export async function saveProjectFileAs(
  state: ProjectState,
): Promise<string | null> {
  assertDesktop();
  const { save } = await import("@tauri-apps/plugin-dialog");
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");

  const path = await save({
    title: "Guardar proyecto BoxMaper",
    defaultPath: `${sanitize(state.projectName)}.${PROJECT_EXTENSION}`,
    filters: PROJECT_FILTERS,
  });
  if (!path) return null;

  await writeTextFile(path, serializeProjectFile(path, state));
  return path;
}

/** Sobrescribe un archivo .loxinstal ya asociado al proyecto actual. */
export async function saveProjectFile(
  path: string,
  state: ProjectState,
): Promise<void> {
  assertDesktop();
  const { writeTextFile } = await import("@tauri-apps/plugin-fs");
  await writeTextFile(path, serializeProjectFile(path, state));
}

function serializeProjectFile(path: string, state: ProjectState): string {
  const lower = path.toLowerCase();
  if (lower.endsWith(".loxinstal") || lower.endsWith(".json")) {
    return JSON.stringify(state, null, 2);
  }
  return JSON.stringify(
    {
      format: "boxmaper",
      version: 1,
      exportedAt: new Date().toISOString(),
      project: state,
    },
    null,
    2
  );
}

function sanitize(name: string): string {
  return name.replace(/[^\w\s-]/g, "").trim() || "proyecto";
}
