export type DeviceCategory =
  | "miniserver"
  | "extension"
  | "relay"
  | "dimmer"
  | "nano"
  | "audio"
  | "ac"
  | "other";

export type TerminalField =
  | "borne"
  | "connectedElement"
  | "room"
  | "loadType"
  | "cableRun"
  | "panelTerminal"
  | "protection";

export interface TerminalRow {
  id: string;
  borne: string;
  connectedElement: string;
  room?: string;
  loadType?: string;
  /** Nº de manguera / cable (ej. M-03). */
  cableRun?: string;
  /** Borna física del cuadro (ej. X1:14). */
  panelTerminal?: string;
  /** Magnetotérmico / protección (ej. PIA 10A Luz). */
  protection?: string;
  /** Notas libres de la plantilla de módulo. */
  observaciones?: string;
}

export interface DeviceModule {
  id: string;
  catalogId: string;
  typeName: string;
  category: DeviceCategory;
  alias: string;
  macOrSerial: string;
  /** Estancia / zona / cuadro (se define al añadir el dispositivo). */
  zone?: string;
  panelName?: string;
  terminals: TerminalRow[];
}

export type ProjectKind = "standalone" | "building";

/** Casa o piso: un solo workspace directo. */
export type StandaloneScope = "house" | "flat";

/** Instalación dentro de un edificio (planta, local, piso…). */
export interface SubProject {
  id: string;
  name: string;
  miniserverIp?: string;
  modules: DeviceModule[];
  selectedModuleId: string | null;
  highlightedTerminalId: string | null;
}

export interface ProjectIndexEntry {
  id: string;
  name: string;
  client?: string;
  lastModified: string;
  moduleCount: number;
  totalTerminals: number;
  projectKind?: ProjectKind;
  subProjectCount?: number;
}

/** Datos generales editables desde «Añadir Datos Generales Del Proyecto». */
export interface ProjectInfo {
  projectName: string;
  location: string;
  miniserverIp: string;
  /** Empresa instaladora (ficha PDF). */
  installerCompany?: string;
  /** Técnico responsable (ficha PDF). */
  installerTechnician?: string;
}

export interface CreateProjectOptions {
  projectKind: ProjectKind;
  standaloneScope?: StandaloneScope;
  projectName: string;
  location: string;
  /** Solo proyectos standalone (casa/piso). */
  miniserverIp?: string;
  installerCompany?: string;
  installerTechnician?: string;
}

export interface ProjectState {
  version: 2;
  id?: string;
  projectKind: ProjectKind;
  standaloneScope?: StandaloneScope;
  projectName: string;
  location: string;
  /** IP del Miniserver en proyectos standalone. */
  miniserverIp?: string;
  /** Empresa instaladora (aparece en ficha PDF). */
  installerCompany?: string;
  /** Técnico (aparece en ficha PDF). */
  installerTechnician?: string;
  modules: DeviceModule[];
  selectedModuleId: string | null;
  highlightedTerminalId: string | null;
  /** Subproyectos cuando `projectKind === "building"`. */
  subProjects?: SubProject[];
  /** `null` = pantalla hub del edificio; id = workspace del subproyecto. */
  activeSubProjectId?: string | null;
}

export interface SearchHit {
  moduleId: string;
  terminalId: string;
  moduleAlias: string;
  borne: string;
  /** Etiqueta de canal para el desplegable (ej. «Entrada I6»). */
  borneLabel: string;
  connectedElement: string;
  /** Nombre visible del elemento encontrado. */
  elementName: string;
  room?: string;
  snippet: string;
}

/** Formato legacy v1 (solo migración). */
export interface ProjectStateV1 {
  version: 1;
  id?: string;
  projectName: string;
  location: string;
  miniserverIp?: string;
  modules: DeviceModule[];
  selectedModuleId: string | null;
  highlightedTerminalId: string | null;
}
