import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CreateProjectOptions, ProjectInfo, ProjectState, TerminalField } from "../types/project";
import {
  createEmptyTerminal,
  createModuleFromCatalog,
  normalizeProject,
} from "../data/deviceCatalog";
import {
  createEmptySubProject,
  createProjectFromOptions,
} from "../data/sampleProject";
import {
  deleteIndexedProject,
  duplicateIndexedProject,
  ensureProjectId,
  listProjectIndex,
  loadIndexedProject,
  renameIndexedProject,
  saveIndexedProject,
} from "../utils/projectIndex";
import {
  applyWorkspaceUpdate,
  cloneSubProject,
  migrateProjectState,
} from "../utils/projectModel";
import { createDebouncedSaver } from "../utils/storage";
import { onProjectsApplied, setFlushHook } from "../sync/syncService";

export type SaveStatus = "saved" | "saving";

/** Tras una actualización remota, mantiene la pantalla donde estaba (subproyecto y aparato seleccionados). */
function keepViewPosition(fresh: ProjectState, prev: ProjectState): ProjectState {
  const stillThere = (list: { id: string }[] | undefined, id: string | null | undefined) =>
    Boolean(id) && Boolean(list?.some((x) => x.id === id));
  const next: ProjectState = { ...fresh };
  if (fresh.projectKind === "building") {
    next.activeSubProjectId = stillThere(fresh.subProjects, prev.activeSubProjectId)
      ? prev.activeSubProjectId
      : null;
    next.subProjects = (fresh.subProjects ?? []).map((sp) => {
      const before = prev.subProjects?.find((p) => p.id === sp.id);
      return before && stillThere(sp.modules, before.selectedModuleId)
        ? { ...sp, selectedModuleId: before.selectedModuleId }
        : sp;
    });
  } else if (stillThere(fresh.modules, prev.selectedModuleId)) {
    next.selectedModuleId = prev.selectedModuleId;
  }
  return next;
}

function prepareProject(data: ProjectState): ProjectState {
  const migrated = migrateProjectState(data) ?? data;
  return saveIndexedProject(ensureProjectId(normalizeProject(migrated)));
}

export function useProject() {
  const [state, setState] = useState<ProjectState | null>(null);
  const [isProjectLoaded, setIsProjectLoaded] = useState<boolean>(false);
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [recentTick, setRecentTick] = useState(0);
  const saverRef = useRef(createDebouncedSaver(500));

  const refreshRecents = useCallback(() => {
    setRecentTick((n) => n + 1);
  }, []);

  const flushPendingSave = useCallback(() => {
    saverRef.current.flushPending();
  }, []);

  const persist = useCallback(
    (next: ProjectState) => {
      setSaveStatus("saving");
      saverRef.current.schedule(ensureProjectId(next), () => {
        setSaveStatus("saved");
        setLastSavedAt(new Date());
        refreshRecents();
      });
    },
    [refreshRecents]
  );

  const update = useCallback(
    (recipe: (prev: ProjectState) => ProjectState) => {
      setState((prev) => {
        if (!prev) return prev;
        const next = recipe(prev);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const activate = useCallback(
    (data: ProjectState, path: string | null = null) => {
      saverRef.current.flushPending();
      const stored = prepareProject(data);
      setState(stored);
      setCurrentFilePath(path);
      setIsProjectLoaded(true);
      setSaveStatus("saved");
      setLastSavedAt(new Date());
      refreshRecents();
    },
    [refreshRecents]
  );

  const createNewProject = useCallback(
    (
      nameOrOptions?: string | CreateProjectOptions,
      location?: string,
      miniserverIp?: string
    ) => {
      if (typeof nameOrOptions === "object" && nameOrOptions !== null) {
        activate(createProjectFromOptions(nameOrOptions));
        return;
      }
      activate(
        createProjectFromOptions({
          projectKind: "standalone",
          standaloneScope: "flat",
          projectName: nameOrOptions || "Nuevo proyecto",
          location: location || "",
          miniserverIp: miniserverIp || "",
        })
      );
    },
    [activate]
  );

  const loadProject = useCallback(
    (data: ProjectState, path: string | null = null) => {
      activate(data, path);
    },
    [activate]
  );

  const openRecentProject = useCallback(
    (id: string) => {
      saverRef.current.flushPending();
      const data = loadIndexedProject(id);
      if (!data) return false;
      const migrated = migrateProjectState(data);
      if (!migrated) return false;
      activate({ ...migrated, activeSubProjectId: null });
      return true;
    },
    [activate]
  );

  const duplicateRecentProject = useCallback(
    (id: string) => {
      saverRef.current.flushPending();
      const copy = duplicateIndexedProject(id);
      if (!copy) return false;
      activate(copy);
      return true;
    },
    [activate]
  );

  const renameRecentProject = useCallback(
    (id: string, name: string) => {
      saverRef.current.flushPending();
      const next = renameIndexedProject(id, name);
      if (!next) return false;
      setState((prev) => (prev?.id === id ? next : prev));
      refreshRecents();
      return true;
    },
    [refreshRecents]
  );

  const deleteRecentProject = useCallback(
    (id: string) => {
      saverRef.current.flushPending();
      deleteIndexedProject(id);
      refreshRecents();
      setState((prev) => {
        if (prev?.id !== id) return prev;
        setIsProjectLoaded(false);
        setCurrentFilePath(null);
        return null;
      });
    },
    [refreshRecents]
  );

  const closeProject = useCallback(() => {
    saverRef.current.flushPending();
    setIsProjectLoaded(false);
    setState(null);
    setCurrentFilePath(null);
  }, []);

  // La sincronización puede actualizar en disco el proyecto que está abierto:
  // se escribe antes lo pendiente y después se recarga sin perder la posición.
  useEffect(() => {
    const saver = saverRef.current;
    setFlushHook(() => saver.flushPending());
    const off = onProjectsApplied((ids) => {
      setState((prev) => {
        if (!prev?.id || !ids.includes(prev.id)) return prev;
        const stored = loadIndexedProject(prev.id);
        const migrated = stored ? migrateProjectState(stored) : null;
        if (!migrated) return prev;
        return keepViewPosition(normalizeProject(migrated), prev);
      });
      refreshRecents();
    });
    return () => {
      off();
      setFlushHook(undefined);
    };
  }, [refreshRecents]);

  useEffect(() => {
    const saver = saverRef.current;
    window.addEventListener("beforeunload", saver.flushPending);
    return () => {
      window.removeEventListener("beforeunload", saver.flushPending);
      saver.flushPending();
    };
  }, []);

  const recentProjects = useMemo(
    () => listProjectIndex(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [recentTick]
  );

  const updateProjectInfo = (info: ProjectInfo) => {
    update((s) => ({
      ...s,
      projectName: info.projectName.trim() || s.projectName,
      location: info.location.trim(),
      miniserverIp:
        s.projectKind === "standalone" ? info.miniserverIp.trim() : s.miniserverIp,
      installerCompany: info.installerCompany?.trim() ?? "",
      installerTechnician: info.installerTechnician?.trim() ?? "",
    }));
  };

  const openSubProject = (subProjectId: string) => {
    update((s) => ({ ...s, activeSubProjectId: subProjectId }));
  };

  const exitSubProject = () => {
    update((s) => ({ ...s, activeSubProjectId: null }));
  };

  const addSubProject = (name: string, miniserverIp: string) => {
    const sub = createEmptySubProject(name, miniserverIp);
    update((s) => ({
      ...s,
      subProjects: [...(s.subProjects ?? []), sub],
      activeSubProjectId: sub.id,
    }));
  };

  const duplicateSubProject = (subProjectId: string) => {
    update((s) => {
      const source = s.subProjects?.find((sp) => sp.id === subProjectId);
      if (!source) return s;
      const copy = cloneSubProject(source, `${source.name} (copia)`);
      return {
        ...s,
        subProjects: [...(s.subProjects ?? []), copy],
      };
    });
  };

  const removeSubProject = (subProjectId: string) => {
    update((s) => ({
      ...s,
      subProjects: (s.subProjects ?? []).filter((sp) => sp.id !== subProjectId),
      activeSubProjectId:
        s.activeSubProjectId === subProjectId ? null : s.activeSubProjectId,
    }));
  };

  const renameSubProject = (subProjectId: string, name: string) => {
    update((s) => ({
      ...s,
      subProjects: (s.subProjects ?? []).map((sp) =>
        sp.id === subProjectId ? { ...sp, name: name.trim() || sp.name } : sp
      ),
    }));
  };

  const updateSubProjectMiniserverIp = (subProjectId: string, miniserverIp: string) => {
    update((s) => ({
      ...s,
      subProjects: (s.subProjects ?? []).map((sp) =>
        sp.id === subProjectId ? { ...sp, miniserverIp: miniserverIp.trim() } : sp
      ),
    }));
  };

  const selectModule = (moduleId: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        selectedModuleId: moduleId,
        highlightedTerminalId: null,
      }))
    );
  };

  const highlightTerminal = (terminalId: string | null) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({ ...ws, highlightedTerminalId: terminalId }))
    );
  };

  const addDevice = (catalogId: string, alias: string, macOrSerial: string, zone = "") => {
    const base = createModuleFromCatalog(catalogId, alias, macOrSerial, zone);
    if (!base) return;
    const mod = { ...base, id: crypto.randomUUID() };
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: [...ws.modules, mod],
        selectedModuleId: mod.id,
        highlightedTerminalId: null,
      }))
    );
  };

  const renameModule = (moduleId: string, alias: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: ws.modules.map((m) => (m.id === moduleId ? { ...m, alias } : m)),
      }))
    );
  };

  const updateModuleZone = (moduleId: string, zone: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: ws.modules.map((m) => (m.id === moduleId ? { ...m, zone: zone.trim() } : m)),
      }))
    );
  };

  const updateModuleSerial = (moduleId: string, macOrSerial: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: ws.modules.map((m) => (m.id === moduleId ? { ...m, macOrSerial } : m)),
      }))
    );
  };

  const removeModule = (moduleId: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: ws.modules.filter((m) => m.id !== moduleId),
        selectedModuleId: ws.selectedModuleId === moduleId ? null : ws.selectedModuleId,
        highlightedTerminalId:
          ws.selectedModuleId === moduleId ? null : ws.highlightedTerminalId,
      }))
    );
  };

  const updateTerminal = (
    moduleId: string,
    terminalId: string,
    field: TerminalField,
    value: string
  ) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: ws.modules.map((m) =>
          m.id !== moduleId
            ? m
            : {
                ...m,
                terminals: m.terminals.map((t) =>
                  t.id === terminalId ? { ...t, [field]: value } : t
                ),
              }
        ),
      }))
    );
  };

  const appendTerminal = (moduleId: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        modules: ws.modules.map((m) => {
          if (m.id !== moduleId) return m;
          return { ...m, terminals: [...m.terminals, createEmptyTerminal()] };
        }),
      }))
    );
  };

  const jumpToSearchHit = (moduleId: string, terminalId: string) => {
    update((s) =>
      applyWorkspaceUpdate(s, (ws) => ({
        ...ws,
        selectedModuleId: moduleId,
        highlightedTerminalId: terminalId,
      }))
    );
  };

  return {
    state,
    isProjectLoaded,
    currentFilePath,
    saveStatus,
    lastSavedAt,
    recentProjects,
    createNewProject,
    loadProject,
    openRecentProject,
    duplicateRecentProject,
    renameRecentProject,
    deleteRecentProject,
    closeProject,
    flushPendingSave,
    updateProjectInfo,
    openSubProject,
    exitSubProject,
    addSubProject,
    duplicateSubProject,
    removeSubProject,
    renameSubProject,
    updateSubProjectMiniserverIp,
    selectModule,
    highlightTerminal,
    addDevice,
    renameModule,
    updateModuleZone,
    updateModuleSerial,
    removeModule,
    updateTerminal,
    appendTerminal,
    jumpToSearchHit,
  };
}
