import type { ProjectIndexEntry, ProjectState, ProjectStateV1 } from "../types/project";

const LEGACY_STORAGE_KEY = "loxone-boxmapper-v1";
const FRESH_INSTALL_FLAG = "boxmaper_fresh_install_v1";
export const PROJECTS_INDEX_KEY = "boxmaper_projects_index";
export const ACTIVE_PROJECT_KEY = "boxmaper_active_project_id";

/** Marca que esta instalación ya pasó por el arranque inicial (sin borrar proyectos). */
function markInstallReadyOnce() {
  try {
    if (localStorage.getItem(FRESH_INSTALL_FLAG) === "1") return;
    localStorage.setItem(FRESH_INSTALL_FLAG, "1");
  } catch {
    /* ignore */
  }
}

markInstallReadyOnce();

function projectBodyKey(id: string) {
  return `boxmaper_project_${id}`;
}

type StoredProject = ProjectState | ProjectStateV1;

function isRawProject(value: unknown): value is StoredProject {
  if (!value || typeof value !== "object") return false;
  const v = value as { version?: number; projectKind?: string; modules?: unknown };
  if (v.version === 2) {
    return v.projectKind === "standalone" || v.projectKind === "building";
  }
  return v.version === 1 && Array.isArray(v.modules);
}

function countConfiguredTerminals(state: StoredProject) {
  let n = 0;
  const moduleLists =
    state.version === 2 && state.projectKind === "building"
      ? (state.subProjects ?? []).flatMap((sp) => sp.modules ?? [])
      : (state.modules ?? []);
  for (const mod of moduleLists) {
    for (const t of mod.terminals ?? []) {
      if ((t.connectedElement ?? "").trim()) n++;
    }
  }
  return n;
}

function countModules(state: StoredProject) {
  if (state.version === 2 && state.projectKind === "building") {
    return (state.subProjects ?? []).reduce((acc, sp) => acc + (sp.modules?.length ?? 0), 0);
  }
  return state.modules?.length ?? 0;
}

export function buildIndexEntry(state: ProjectState): ProjectIndexEntry {
  const isBuilding = state.projectKind === "building";
  return {
    id: state.id!,
    name: state.projectName || "Proyecto sin nombre",
    client: state.location || "",
    lastModified: new Date().toISOString(),
    moduleCount: countModules(state),
    totalTerminals: countConfiguredTerminals(state),
    projectKind: state.projectKind ?? "standalone",
    subProjectCount: isBuilding ? (state.subProjects?.length ?? 0) : undefined,
  };
}

export function listProjectIndex(): ProjectIndexEntry[] {
  try {
    const raw = localStorage.getItem(PROJECTS_INDEX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ProjectIndexEntry[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(entries: ProjectIndexEntry[]) {
  const sorted = [...entries].sort((a, b) =>
    String(b.lastModified).localeCompare(String(a.lastModified))
  );
  localStorage.setItem(PROJECTS_INDEX_KEY, JSON.stringify(sorted));
}

export function getActiveProjectId(): string | null {
  return localStorage.getItem(ACTIVE_PROJECT_KEY);
}

export function setActiveProjectId(id: string | null) {
  if (id) localStorage.setItem(ACTIVE_PROJECT_KEY, id);
  else localStorage.removeItem(ACTIVE_PROJECT_KEY);
}

export function ensureProjectId(state: ProjectState): ProjectState {
  if (state.id) return state;
  return { ...state, id: crypto.randomUUID() };
}

export function loadIndexedProject(id: string): ProjectState | null {
  if (!id) return null;
  try {
    const raw = localStorage.getItem(projectBodyKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isRawProject(parsed) ? (parsed as ProjectState) : null;
  } catch {
    return null;
  }
}

/**
 * Guarda el proyecto y actualiza el índice SIN marcarlo como proyecto activo.
 * Lo usa la sincronización, que escribe en segundo plano.
 */
export function storeIndexedProject(state: ProjectState): ProjectState {
  const next = ensureProjectId(state);
  localStorage.setItem(projectBodyKey(next.id!), JSON.stringify(next));
  const entry = buildIndexEntry(next);
  const rest = listProjectIndex().filter((e) => e.id !== next.id);
  writeIndex([entry, ...rest]);
  return next;
}

export function saveIndexedProject(state: ProjectState): ProjectState {
  const next = storeIndexedProject(state);
  setActiveProjectId(next.id!);
  return next;
}

export function renameIndexedProject(id: string, name: string): ProjectState | null {
  const data = loadIndexedProject(id);
  if (!data) return null;
  const next = { ...data, projectName: name.trim() || data.projectName };
  return saveIndexedProject(next);
}

export function duplicateIndexedProject(id: string): ProjectState | null {
  const data = loadIndexedProject(id);
  if (!data) return null;
  const copy = structuredClone(data);
  copy.id = crypto.randomUUID();
  copy.projectName = `${data.projectName || "Proyecto"} (copia)`;
  return saveIndexedProject(copy);
}

export function parseImportedProject(parsed: unknown): ProjectState | null {
  if (parsed && typeof parsed === "object") {
    const box = parsed as { format?: string; project?: unknown };
    if (box.format === "boxmaper" && isRawProject(box.project)) {
      return ensureProjectId({
        ...(box.project as ProjectState),
        id: crypto.randomUUID(),
      });
    }
  }
  if (isRawProject(parsed)) {
    const { exportedAt: _e, exportKind: _k, format: _f, ...project } = parsed as ProjectState & {
      exportedAt?: string;
      exportKind?: string;
      format?: string;
    };
    return ensureProjectId({ ...project, id: crypto.randomUUID() });
  }
  return null;
}

export async function importBoxmaperFile(file: File): Promise<ProjectState | null> {
  try {
    const text = await file.text();
    return parseImportedProject(JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

export function deleteIndexedProject(id: string) {
  localStorage.removeItem(projectBodyKey(id));
  writeIndex(listProjectIndex().filter((e) => e.id !== id));
  if (getActiveProjectId() === id) setActiveProjectId(null);
}

/** Migra el proyecto único antiguo al índice de obras y elimina la clave antigua. */
function migrateLegacyProject() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return;
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    const parsed = JSON.parse(raw) as unknown;
    if (!isRawProject(parsed)) return;
    const legacy = parsed as ProjectState;
    if (legacy.id && loadIndexedProject(legacy.id)) return;
    saveIndexedProject(ensureProjectId(legacy));
  } catch {
    /* ignore */
  }
}

migrateLegacyProject();
