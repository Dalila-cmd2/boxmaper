import type { ProjectState } from "../types/project";

/**
 * Formato de los datos publicados en el repositorio central.
 *
 *   boxmaper-data.json        <- manifiesto (índice + huellas de verificación)
 *   proyectos/<id>.json       <- un archivo por proyecto
 *
 * `schema` permite que, en el futuro, el formato cambie sin romper las
 * apps instaladas: una app antigua rechaza datos de un schema que no conoce
 * y pide actualizar la aplicación en vez de aplicar algo que no entiende.
 */
export const MANIFEST_PATH = "boxmaper-data.json";
export const PROJECTS_DIR = "proyectos";
export const SUPPORTED_SCHEMA = 1;

export interface ManifestProject {
  id: string;
  name: string;
  /** Ruta del archivo dentro del repositorio. */
  path: string;
  /** SHA-256 del texto exacto del archivo (detecta descargas corruptas o a medias). */
  sha256: string;
  /** Contador que sube cada vez que el proyecto cambia. */
  rev: number;
  updatedAt: string;
}

export interface Manifest {
  format: "boxmaper-manifest";
  schema: number;
  /** Sube en 1 con cada publicación. */
  dataVersion: number;
  publishedAt: string;
  publishedBy?: string;
  message?: string;
  projects: ManifestProject[];
}

export interface ProjectEnvelope {
  format: "boxmaper-project";
  schema: number;
  project: ProjectState;
}

export interface SyncConfig {
  enabled: boolean;
  owner: string;
  repo: string;
  branch: string;
  /** Clave de acceso de GitHub (opcional en repos públicos; necesaria en privados y para publicar). */
  token: string;
  /** Cada cuántos minutos se buscan cambios. */
  intervalMinutes: number;
  /** Nombre que se guarda como autor al publicar. */
  author: string;
}

export interface Link {
  name: string;
  rev: number;
  /** Huella del archivo remoto aplicado la última vez. */
  remoteSha: string;
  /** Huella del contenido local en el momento de sincronizar (para detectar cambios locales). */
  baseHash: string;
}

export interface Conflict {
  name: string;
  rev: number;
  remoteSha: string;
  /** Texto del archivo remoto, guardado para poder aplicarlo si el usuario lo decide. */
  text: string;
  detectedAt: string;
}

export interface SyncState {
  /** Fuente a la que corresponde este estado (owner/repo@rama). Si cambia, se reinicia. */
  source?: string;
  dataVersion: number | null;
  lastCheckAt: string | null;
  lastOkAt: string | null;
  links: Record<string, Link>;
  conflicts: Record<string, Conflict>;
}

export interface HistoryEntry {
  id: string;
  message: string;
  date: string;
  author: string;
}

export interface BackupInfo {
  projectId: string;
  at: string;
  reason: string;
  name: string;
}

export interface PendingChange {
  id: string;
  name: string;
  kind: "modified" | "new";
}

export interface CheckResult {
  /** Proyectos creados o actualizados en este equipo. */
  applied: string[];
  /** Proyectos con cambios locales y remotos a la vez (no se tocaron). */
  conflicts: string[];
  /** Proyectos que ya no están en el servidor (se conservan localmente). */
  unlinked: string[];
  dataVersion: number | null;
  /** true si no había nada nuevo en el servidor. */
  upToDate: boolean;
}

export class SyncError extends Error {
  constructor(
    public readonly code:
      | "auth"
      | "network"
      | "not-found"
      | "invalid"
      | "conflict"
      | "schema"
      | "no-write"
      | "disabled",
    message: string,
  ) {
    super(message);
    this.name = "SyncError";
  }
}
