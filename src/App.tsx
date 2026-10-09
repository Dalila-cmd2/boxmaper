import { useCallback, useEffect, useMemo, useState } from "react";
import { AddModuleModal } from "./components/AddModuleModal";
import { BuildingHub } from "./components/BuildingHub";
import { ConnectionTable } from "./components/ConnectionTable";
import { ModulePinoutView } from "./components/ModulePinoutView";
import { PinoutTerminalEditorModal } from "./components/PinoutTerminalEditorModal";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { ModuleBanner } from "./components/ModuleBanner";
import { ProjectInfoModal } from "./components/ProjectInfoModal";
import { Sidebar } from "./components/Sidebar";
import { SubProjectModal } from "./components/SubProjectModal";
import { Titlebar } from "./components/Titlebar";
import { ViewModeToggle, type WorkspaceViewMode } from "./components/ViewModeToggle";
import { RecentProjectsModal } from "./components/RecentProjectsModal";
import { WelcomeScreen } from "./components/WelcomeScreen";
import { checkForUpdates } from "./utils/appUpdater";
import { modulesInInstallOrder } from "./utils/moduleInstallOrder";
import { useCloseGuard } from "./hooks/useCloseGuard";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { useProject } from "./hooks/useProject";
import { useShortcuts } from "./hooks/useShortcuts";
import type { CreateProjectOptions, TerminalField } from "./types/project";
import {
  getActiveSubProject,
  getWorkspace,
  isBuildingHub,
  toWorkspaceProjectState,
} from "./utils/projectModel";
import { countMappedTerminals } from "./utils/search";
import { adjacentTerminalId } from "./utils/terminalNavigation";

export default function App() {
  const {
    state,
    isProjectLoaded,
    currentFilePath,
    saveStatus,
    lastSavedAt,
    createNewProject,
    loadProject,
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
    recentProjects,
    openRecentProject,
    duplicateRecentProject,
    renameRecentProject,
    deleteRecentProject,
  } = useProject();

  const [projectInfoMode, setProjectInfoMode] = useState<"create" | "edit" | null>(null);
  const [moduleModalOpen, setModuleModalOpen] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [requestedViewMode, setViewMode] = useState<WorkspaceViewMode>("split");
  const [pinoutEditorTerminalId, setPinoutEditorTerminalId] = useState<string | null>(null);
  const [subProjectEditOpen, setSubProjectEditOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** Móvil / tablet vertical: sin panel lateral fijo ni vista dividida. */
  const isCompact = useMediaQuery("(max-width: 767px)");
  const viewMode: WorkspaceViewMode =
    isCompact && requestedViewMode === "split" ? "pinout" : requestedViewMode;

  // Si se agranda la pantalla, el cajón lateral deja de tener sentido.
  useEffect(() => {
    if (!isCompact) setSidebarOpen(false);
  }, [isCompact]);

  // Busca actualizaciones una sola vez al abrir la app (en silencio).
  useEffect(() => {
    const timer = setTimeout(() => void checkForUpdates(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  const openNewProject = useCallback(() => setProjectInfoMode("create"), []);

  useShortcuts({
    isProjectLoaded,
    state,
    currentFilePath,
    onNewProject: openNewProject,
    loadProject,
  });
  useCloseGuard(flushPendingSave);

  const workspace = state ? getWorkspace(state) : null;
  const activeSub = state ? getActiveSubProject(state) : null;

  useEffect(() => {
    setPinoutEditorTerminalId(null);
  }, [workspace?.selectedModuleId]);
  const workspaceState = useMemo(() => {
    if (!state || !workspace) return null;
    return toWorkspaceProjectState(state, workspace);
  }, [state, workspace]);

  const modulesForList = useMemo(
    () => (workspace ? modulesInInstallOrder(workspace.modules) : []),
    [workspace]
  );

  const projectInfoModal = (
    <ProjectInfoModal
      open={projectInfoMode !== null}
      mode={projectInfoMode ?? "create"}
      initialKind={state?.projectKind}
      initialScope={state?.standaloneScope}
      initial={
        projectInfoMode === "edit" && state
          ? {
              projectName: state.projectName,
              location: state.location,
              miniserverIp: state.miniserverIp ?? "",
              installerCompany: state.installerCompany ?? "",
              installerTechnician: state.installerTechnician ?? "",
            }
          : undefined
      }
      onClose={() => setProjectInfoMode(null)}
      onSubmitCreate={(options: CreateProjectOptions) => createNewProject(options)}
      onSubmitEdit={(info) => updateProjectInfo(info)}
    />
  );

  const selectTerminalFromPinout = (terminalId: string) => {
    setPinoutEditorTerminalId(terminalId);
    if (viewMode === "table" || viewMode === "split") {
      highlightTerminal(terminalId);
    }
  };

  const closePinoutEditor = () => {
    setPinoutEditorTerminalId(null);
    highlightTerminal(null);
  };

  const recentProjectsModal = (
    <RecentProjectsModal
      open={recentsOpen}
      entries={recentProjects}
      activeId={state?.id ?? null}
      onClose={() => setRecentsOpen(false)}
      onOpen={openRecentProject}
      onNew={createNewProject}
      onDuplicate={duplicateRecentProject}
      onRename={renameRecentProject}
      onDelete={deleteRecentProject}
    />
  );

  if (!isProjectLoaded || !state) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
        <Titlebar onBeforeClose={flushPendingSave} />
        <WelcomeScreen
          onNewProject={openNewProject}
          loadProject={loadProject}
          recentProjects={recentProjects}
          onOpenRecent={openRecentProject}
          onDeleteRecent={deleteRecentProject}
        />
        {projectInfoModal}
        {recentProjectsModal}
      </div>
    );
  }

  if (isBuildingHub(state)) {
    return (
      <div className="flex h-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
        <Titlebar onHome={closeProject} onBeforeClose={flushPendingSave} />
        <BuildingHub
          state={state}
          filePath={currentFilePath}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          onFilePathChange={(path) => loadProject(state, path)}
          onCloseProject={closeProject}
          onEditBuildingInfo={() => setProjectInfoMode("edit")}
          onOpenSubProject={openSubProject}
          onAddSubProject={addSubProject}
          onDuplicateSubProject={duplicateSubProject}
          onRemoveSubProject={removeSubProject}
          onEditSubProject={(id, name, miniserverIp) => {
            renameSubProject(id, name);
            updateSubProjectMiniserverIp(id, miniserverIp);
          }}
          onOpenRecents={() => setRecentsOpen(true)}
        />
        {projectInfoModal}
        {recentProjectsModal}
      </div>
    );
  }

  if (!workspace || !workspaceState) {
    return null;
  }

  const selected =
    workspace.modules.find((m) => m.id === workspace.selectedModuleId) ??
    workspace.modules[0] ??
    null;

  const isSplit = viewMode === "split";
  const pinoutHighlightId = pinoutEditorTerminalId ?? workspace.highlightedTerminalId;
  const pinoutEditingTerminal = pinoutEditorTerminalId
    ? selected.terminals.find((t) => t.id === pinoutEditorTerminalId)
    : undefined;

  const savePinoutAndMove = (draft: string, direction: 1 | -1) => {
    if (!pinoutEditorTerminalId) return;
    updateTerminal(selected.id, pinoutEditorTerminalId, "connectedElement", draft.trim());
    const nextId = adjacentTerminalId(selected, pinoutEditorTerminalId, direction);
    if (!nextId) {
      closePinoutEditor();
      return;
    }
    setPinoutEditorTerminalId(nextId);
    if (viewMode === "table" || viewMode === "split") {
      highlightTerminal(nextId);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      <Titlebar onHome={closeProject} onBeforeClose={flushPendingSave} />
      <Header
        rootState={state}
        workspaceState={workspaceState}
        filePath={currentFilePath}
        onFilePathChange={(path) => loadProject(state, path)}
        subProjectName={activeSub?.name}
        onBackToBuilding={activeSub ? exitSubProject : undefined}
        onEditSubProject={activeSub ? () => setSubProjectEditOpen(true) : undefined}
        onSearchSelect={(hit) => {
          jumpToSearchHit(hit.moduleId, hit.terminalId);
          setSidebarOpen(false);
        }}
        onAddCatalogModule={(catalogId, name) => {
          addDevice(catalogId, name, "");
          if (viewMode === "table") setViewMode("pinout");
        }}
        onImport={(data) => loadProject(data, null)}
        onOpenRecents={() => setRecentsOpen(true)}
        lastSavedAt={lastSavedAt}
        saveStatus={saveStatus}
      />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <Sidebar
          modules={modulesForList}
          selectedId={selected?.id ?? null}
          onSelect={(id) => {
            selectModule(id);
            setSidebarOpen(false);
          }}
          onEditProjectClick={() => setProjectInfoMode("edit")}
          onAddDeviceClick={() => setModuleModalOpen(true)}
          onRemove={removeModule}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-2 py-2 sm:px-4 sm:py-3">
          {selected ? (
            <>
              <div className="flex shrink-0 flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <ModuleBanner
                    module={selected}
                    dense={isSplit}
                    onRename={(alias) => renameModule(selected.id, alias)}
                    onZoneChange={(zone) => updateModuleZone(selected.id, zone)}
                    onSerialChange={(serial) => updateModuleSerial(selected.id, serial)}
                  />
                </div>
                <ViewModeToggle value={viewMode} onChange={setViewMode} hideSplit={isCompact} />
              </div>

              <div
                className={`flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden ${
                  isSplit ? "gap-0" : "gap-3"
                }`}
              >
                {(viewMode === "pinout" || viewMode === "split") && (
                  <div
                    className={
                      viewMode === "split"
                        ? "flex h-[65%] min-h-0 shrink-0 flex-col overflow-hidden"
                        : "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
                    }
                  >
                    <ModulePinoutView
                      module={selected}
                      highlightedTerminalId={pinoutHighlightId}
                      onSelectTerminal={selectTerminalFromPinout}
                      compact={viewMode === "split"}
                      showLegend
                      className={viewMode === "split" ? "h-full min-h-0" : undefined}
                    />
                  </div>
                )}

                {(viewMode === "table" || viewMode === "split") && (
                  <div
                    className={
                      viewMode === "split"
                        ? "flex h-[35%] min-h-0 shrink-0 flex-col overflow-hidden"
                        : "flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto"
                    }
                  >
                    <ConnectionTable
                      project={workspaceState}
                      module={selected}
                      dense={isSplit}
                      suppressHighlightFocus={Boolean(pinoutEditorTerminalId)}
                      highlightedTerminalId={workspace.highlightedTerminalId}
                      onUpdate={(terminalId: string, field: TerminalField, value: string) =>
                        updateTerminal(selected.id, terminalId, field, value)
                      }
                      onHighlightDone={() => highlightTerminal(null)}
                      onAddRow={() => appendTerminal(selected.id)}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500 sm:p-12">
              <p>Añade un dispositivo para empezar a mapear bornes.</p>
              <button
                type="button"
                onClick={() => setModuleModalOpen(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                Añadir dispositivo
              </button>
            </div>
          )}
        </main>
      </div>

      <Footer mappedCount={countMappedTerminals(workspaceState)} saveStatus={saveStatus} />

      {projectInfoModal}
      <AddModuleModal
        open={moduleModalOpen}
        onClose={() => setModuleModalOpen(false)}
        onAdd={(catalogId, name, serial, zone) => {
          addDevice(catalogId, name, serial ?? "", zone ?? "");
          if (viewMode === "table") setViewMode("pinout");
        }}
      />
      <PinoutTerminalEditorModal
        open={Boolean(pinoutEditingTerminal)}
        borne={pinoutEditingTerminal?.borne ?? ""}
        value={pinoutEditingTerminal?.connectedElement ?? ""}
        onClose={closePinoutEditor}
        onSave={(connectedElement) => {
          if (!pinoutEditingTerminal) return;
          updateTerminal(
            selected.id,
            pinoutEditingTerminal.id,
            "connectedElement",
            connectedElement.trim()
          );
          closePinoutEditor();
        }}
        onSaveAndMove={savePinoutAndMove}
      />
      {recentProjectsModal}
      {activeSub ? (
        <SubProjectModal
          open={subProjectEditOpen}
          mode="edit"
          initial={{
            name: activeSub.name,
            miniserverIp: activeSub.miniserverIp ?? "",
          }}
          onClose={() => setSubProjectEditOpen(false)}
          onSubmit={(name, miniserverIp) => {
            renameSubProject(activeSub.id, name);
            updateSubProjectMiniserverIp(activeSub.id, miniserverIp);
          }}
        />
      ) : null}
    </div>
  );
}
