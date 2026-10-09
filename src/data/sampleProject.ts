import type { CreateProjectOptions, ProjectState, SubProject } from "../types/project";

/** Proyecto vacío standalone (casa o piso). */
export function createEmptyProject(
  projectName: string,
  location: string,
  miniserverIp = "",
  standaloneScope: CreateProjectOptions["standaloneScope"] = "flat",
  installerCompany = "",
  installerTechnician = ""
): ProjectState {
  return {
    version: 2,
    id: crypto.randomUUID(),
    projectKind: "standalone",
    standaloneScope,
    projectName: projectName.trim() || "Nuevo proyecto",
    location: location.trim(),
    miniserverIp: miniserverIp.trim(),
    installerCompany: installerCompany.trim(),
    installerTechnician: installerTechnician.trim(),
    modules: [],
    selectedModuleId: null,
    highlightedTerminalId: null,
    activeSubProjectId: null,
  };
}

export function createEmptyBuilding(
  projectName: string,
  location: string,
  installerCompany = "",
  installerTechnician = ""
): ProjectState {
  return {
    version: 2,
    id: crypto.randomUUID(),
    projectKind: "building",
    projectName: projectName.trim() || "Nuevo edificio",
    location: location.trim(),
    installerCompany: installerCompany.trim(),
    installerTechnician: installerTechnician.trim(),
    modules: [],
    selectedModuleId: null,
    highlightedTerminalId: null,
    subProjects: [],
    activeSubProjectId: null,
  };
}

export function createEmptySubProject(name: string, miniserverIp = ""): SubProject {
  return {
    id: crypto.randomUUID(),
    name: name.trim() || "Subproyecto",
    miniserverIp: miniserverIp.trim(),
    modules: [],
    selectedModuleId: null,
    highlightedTerminalId: null,
  };
}

export function createProjectFromOptions(options: CreateProjectOptions): ProjectState {
  const company = options.installerCompany ?? "";
  const technician = options.installerTechnician ?? "";
  if (options.projectKind === "building") {
    return createEmptyBuilding(options.projectName, options.location, company, technician);
  }
  return createEmptyProject(
    options.projectName,
    options.location,
    options.miniserverIp ?? "",
    options.standaloneScope ?? "flat",
    company,
    technician
  );
}
