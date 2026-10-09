import type {
  DeviceModule,
  ProjectState,
  ProjectStateV1,
  SubProject,
  TerminalRow,
} from "../types/project";

export type WorkspaceSlice = Pick<
  SubProject,
  "modules" | "selectedModuleId" | "highlightedTerminalId" | "miniserverIp"
> & { id?: string; name?: string };

export function isBuildingProject(state: ProjectState): boolean {
  return state.projectKind === "building";
}

export function isBuildingHub(state: ProjectState): boolean {
  return isBuildingProject(state) && !state.activeSubProjectId;
}

export function getActiveSubProject(state: ProjectState): SubProject | null {
  if (!isBuildingProject(state) || !state.activeSubProjectId) return null;
  return state.subProjects?.find((sp) => sp.id === state.activeSubProjectId) ?? null;
}

/** Workspace activo: raíz en standalone o subproyecto abierto. */
export function getWorkspace(state: ProjectState): WorkspaceSlice | null {
  if (isBuildingHub(state)) return null;
  const sub = getActiveSubProject(state);
  if (sub) {
    return {
      id: sub.id,
      name: sub.name,
      modules: sub.modules,
      selectedModuleId: sub.selectedModuleId,
      highlightedTerminalId: sub.highlightedTerminalId,
      miniserverIp: sub.miniserverIp,
    };
  }
  return {
    modules: state.modules,
    selectedModuleId: state.selectedModuleId,
    highlightedTerminalId: state.highlightedTerminalId,
    miniserverIp: state.miniserverIp,
  };
}

/** Estado plano para búsqueda, tabla y export de un solo workspace. */
export function toWorkspaceProjectState(
  root: ProjectState,
  workspace: WorkspaceSlice
): ProjectState {
  const sub = getActiveSubProject(root);
  const title = sub
    ? `${root.projectName} — ${sub.name}`
    : root.projectName;
  return {
    ...root,
    projectName: title,
    miniserverIp: workspace.miniserverIp ?? root.miniserverIp,
    modules: workspace.modules,
    selectedModuleId: workspace.selectedModuleId,
    highlightedTerminalId: workspace.highlightedTerminalId,
  };
}

export function subProjectToExportState(root: ProjectState, sub: SubProject): ProjectState {
  return {
    ...root,
    projectKind: "standalone",
    projectName: `${root.projectName} — ${sub.name}`,
    location: root.location,
    miniserverIp: sub.miniserverIp,
    modules: sub.modules,
    selectedModuleId: sub.selectedModuleId,
    highlightedTerminalId: sub.highlightedTerminalId,
    subProjects: undefined,
    activeSubProjectId: null,
  };
}

export function migrateProjectState(raw: unknown): ProjectState | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  if (obj.version === 2 && (obj.projectKind === "standalone" || obj.projectKind === "building")) {
    return normalizeBuildingFields(obj as unknown as ProjectState);
  }
  if (obj.version === 1 && Array.isArray(obj.modules)) {
    const v1 = obj as unknown as ProjectStateV1;
    return {
      version: 2,
      id: v1.id,
      projectKind: "standalone",
      standaloneScope: "flat",
      projectName: v1.projectName,
      location: v1.location,
      miniserverIp: v1.miniserverIp,
      modules: v1.modules,
      selectedModuleId: v1.selectedModuleId,
      highlightedTerminalId: v1.highlightedTerminalId,
      subProjects: undefined,
      activeSubProjectId: null,
    };
  }
  return null;
}

function normalizeBuildingFields(state: ProjectState): ProjectState {
  if (state.projectKind !== "building") {
    return { ...state, activeSubProjectId: null, subProjects: undefined };
  }
  return {
    ...state,
    modules: [],
    selectedModuleId: null,
    highlightedTerminalId: null,
    subProjects: state.subProjects ?? [],
    activeSubProjectId: state.activeSubProjectId ?? null,
  };
}

export function applyWorkspaceUpdate(
  state: ProjectState,
  recipe: (ws: WorkspaceSlice) => WorkspaceSlice
): ProjectState {
  const sub = getActiveSubProject(state);
  if (sub) {
    const nextSub = recipe({
      id: sub.id,
      name: sub.name,
      modules: sub.modules,
      selectedModuleId: sub.selectedModuleId,
      highlightedTerminalId: sub.highlightedTerminalId,
      miniserverIp: sub.miniserverIp,
    });
    return {
      ...state,
      subProjects: (state.subProjects ?? []).map((sp) =>
        sp.id === sub.id
          ? {
              ...sp,
              modules: nextSub.modules,
              selectedModuleId: nextSub.selectedModuleId,
              highlightedTerminalId: nextSub.highlightedTerminalId,
              miniserverIp: nextSub.miniserverIp,
            }
          : sp
      ),
    };
  }
  const next = recipe({
    modules: state.modules,
    selectedModuleId: state.selectedModuleId,
    highlightedTerminalId: state.highlightedTerminalId,
    miniserverIp: state.miniserverIp,
  });
  return {
    ...state,
    modules: next.modules,
    selectedModuleId: next.selectedModuleId,
    highlightedTerminalId: next.highlightedTerminalId,
    miniserverIp: next.miniserverIp,
  };
}

function cloneTerminalRow(t: TerminalRow): TerminalRow {
  return { ...t, id: crypto.randomUUID() };
}

function cloneModule(mod: DeviceModule): DeviceModule {
  return {
    ...mod,
    id: crypto.randomUUID(),
    terminals: mod.terminals.map(cloneTerminalRow),
  };
}

export function cloneSubProject(source: SubProject, name: string): SubProject {
  return {
    id: crypto.randomUUID(),
    name,
    miniserverIp: source.miniserverIp,
    modules: source.modules.map(cloneModule),
    selectedModuleId: null,
    highlightedTerminalId: null,
  };
}

export function countProjectModules(state: ProjectState): number {
  if (isBuildingProject(state)) {
    return (state.subProjects ?? []).reduce((n, sp) => n + sp.modules.length, 0);
  }
  return state.modules.length;
}

export function countProjectMappedTerminals(state: ProjectState): number {
  const modules = isBuildingProject(state)
    ? (state.subProjects ?? []).flatMap((sp) => sp.modules)
    : state.modules;
  let n = 0;
  for (const mod of modules) {
    for (const t of mod.terminals) {
      if (t.connectedElement.trim()) n++;
    }
  }
  return n;
}
