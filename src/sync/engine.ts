import type { ProjectState } from "../types/project";
import { contentHash, serializeEnvelope, serializeManifest } from "./canonical";
import type { KeyValueStore } from "./kv";
import { sha256Hex } from "./sha256";
import type { RemoteSource } from "./sources";
import {
  MANIFEST_PATH,
  PROJECTS_DIR,
  SUPPORTED_SCHEMA,
  SyncError,
  type BackupInfo,
  type CheckResult,
  type Conflict,
  type HistoryEntry,
  type Link,
  type Manifest,
  type PendingChange,
  type SyncConfig,
  type SyncState,
} from "./types";
import { parseEnvelope, parseManifest, validateProject } from "./validate";

/** Cómo el motor lee y escribe los proyectos de este equipo. */
export interface ProjectRepo {
  get(id: string): ProjectState | null;
  /** Guarda el proyecto en este equipo SIN cambiar cuál es el proyecto activo. */
  save(state: ProjectState): void;
  list(): Array<{ id: string; name: string }>;
}

export interface EngineDeps {
  kv: KeyValueStore;
  repo: ProjectRepo;
  getConfig: () => SyncConfig;
  createSource: (cfg: SyncConfig) => RemoteSource;
  /** Normaliza un proyecto recién descargado igual que lo hace la app al abrirlo. */
  prepare: (state: ProjectState) => ProjectState;
  /** Escribe de inmediato lo que haya pendiente de autoguardar (se llama antes de aplicar cambios). */
  flush?: () => void;
  /** Avisa a la interfaz de que estos proyectos cambiaron en disco. */
  onApplied?: (ids: string[]) => void;
  now?: () => Date;
}

const STATE_KEY = "boxmaper.sync.state.v1";
const BACKUP_PREFIX = "boxmaper.sync.backup.v1.";
const MAX_BACKUPS_PER_PROJECT = 5;

interface StoredBackup {
  at: string;
  reason: string;
  name: string;
  text: string;
}

function emptyState(): SyncState {
  return { dataVersion: null, lastCheckAt: null, lastOkAt: null, links: {}, conflicts: {} };
}

export class SyncEngine {
  constructor(private readonly deps: EngineDeps) {}

  // ------------------------------------------------------------ estado
  private now(): Date {
    return this.deps.now ? this.deps.now() : new Date();
  }

  readState(): SyncState {
    try {
      const raw = this.deps.kv.get(STATE_KEY);
      if (!raw) return emptyState();
      return { ...emptyState(), ...(JSON.parse(raw) as Partial<SyncState>) };
    } catch {
      return emptyState();
    }
  }

  /** Si cambió la fuente de datos, se olvidan los vínculos de la anterior (los proyectos locales se conservan). */
  private alignSource(state: SyncState): SyncState {
    const cfg = this.deps.getConfig();
    const key = `${cfg.owner}/${cfg.repo}@${cfg.branch}`;
    if (state.source && state.source !== key) {
      state.links = {};
      state.conflicts = {};
      state.dataVersion = null;
    }
    state.source = key;
    return state;
  }

  private writeState(state: SyncState) {
    this.deps.kv.set(STATE_KEY, JSON.stringify(state));
  }

  private source(requireWrite = false): RemoteSource {
    const cfg = this.deps.getConfig();
    if (!cfg.enabled) throw new SyncError("disabled", "La sincronización está desactivada.");
    const src = this.deps.createSource(cfg);
    if (requireWrite && !src.canWrite) {
      throw new SyncError("no-write", "Para publicar hace falta una clave de acceso con permiso de escritura.");
    }
    return src;
  }

  // ------------------------------------------------------------ copias de seguridad locales
  private backupKey(projectId: string) {
    return `${BACKUP_PREFIX}${projectId}`;
  }

  private readBackups(projectId: string): StoredBackup[] {
    try {
      const raw = this.deps.kv.get(this.backupKey(projectId));
      return raw ? (JSON.parse(raw) as StoredBackup[]) : [];
    } catch {
      return [];
    }
  }

  /** Guarda una copia del estado actual antes de cambiarlo. Si no hay espacio, descarta las más viejas. */
  backup(project: ProjectState, reason: string) {
    if (!project.id) return;
    const entry: StoredBackup = {
      at: this.now().toISOString(),
      reason,
      name: project.projectName,
      text: JSON.stringify(project),
    };
    let list = [entry, ...this.readBackups(project.id)].slice(0, MAX_BACKUPS_PER_PROJECT);
    for (;;) {
      try {
        this.deps.kv.set(this.backupKey(project.id), JSON.stringify(list));
        return;
      } catch {
        if (list.length <= 1) throw new Error("No hay espacio para guardar la copia de seguridad.");
        list = list.slice(0, list.length - 1);
      }
    }
  }

  listBackups(): BackupInfo[] {
    const out: BackupInfo[] = [];
    for (const key of this.deps.kv.keys(BACKUP_PREFIX)) {
      const projectId = key.slice(BACKUP_PREFIX.length);
      for (const b of this.readBackups(projectId)) {
        out.push({ projectId, at: b.at, reason: b.reason, name: b.name });
      }
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }

  /** Recupera una copia local anterior de un proyecto (guarda antes el estado actual). */
  restoreBackup(projectId: string, at: string): void {
    const found = this.readBackups(projectId).find((b) => b.at === at);
    if (!found) throw new SyncError("not-found", "No se encontró esa copia de seguridad.");
    const restored = JSON.parse(found.text) as ProjectState;
    const errors = validateProject(restored);
    if (errors.length) throw new SyncError("invalid", `La copia está dañada: ${errors[0]}`);
    this.deps.flush?.();
    const current = this.deps.repo.get(projectId);
    if (current) this.backup(current, "Antes de recuperar una copia anterior");
    this.deps.repo.save(restored);
    this.deps.onApplied?.([projectId]);
  }

  // ------------------------------------------------------------ cambios locales
  private isDiverged(project: ProjectState, link: Link): boolean {
    return contentHash(project) !== link.baseHash;
  }

  pendingChanges(): PendingChange[] {
    const state = this.readState();
    const out: PendingChange[] = [];
    for (const { id, name } of this.deps.repo.list()) {
      const project = this.deps.repo.get(id);
      if (!project) continue;
      const link = state.links[id];
      if (!link) out.push({ id, name, kind: "new" });
      else if (this.isDiverged(project, link)) out.push({ id, name, kind: "modified" });
    }
    return out;
  }

  // ------------------------------------------------------------ descargar y aplicar
  private async fetchManifest(src: RemoteSource, ref?: string): Promise<Manifest | null> {
    const text = await src.readText(MANIFEST_PATH, ref);
    if (text === null) return null;
    try {
      return parseManifest(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new SyncError(message.includes("más nuevo") ? "schema" : "invalid", message);
    }
  }

  /**
   * Busca cambios y los aplica. Es «todo o nada»: primero se descarga y se
   * valida todo; si algo falla, no se toca ningún dato del equipo.
   */
  async check(): Promise<CheckResult> {
    const src = this.source();
    const state = this.alignSource(this.readState());
    state.lastCheckAt = this.now().toISOString();

    const manifest = await this.fetchManifest(src).catch((error) => {
      this.writeState(state);
      throw error;
    });
    if (!manifest) {
      this.writeState(state);
      // Repositorio vacío o aún sin índice: no es un error para quien solo lee.
      if (state.dataVersion === null) {
        return { applied: [], conflicts: [], unlinked: [], dataVersion: null, upToDate: true };
      }
      throw new SyncError(
        "not-found",
        "No se encontraron datos publicados. Si el repositorio es privado, falta la clave de acceso.",
      );
    }

    // Una versión más vieja que la ya aplicada es una respuesta atrasada (caché): se ignora.
    if (state.dataVersion !== null && manifest.dataVersion < state.dataVersion) {
      this.writeState(state);
      return { applied: [], conflicts: [], unlinked: [], dataVersion: state.dataVersion, upToDate: true };
    }

    type Fetched = { id: string; name: string; rev: number; sha: string; text: string; project: ProjectState };
    const fetched: Fetched[] = [];
    for (const entry of manifest.projects) {
      const link = state.links[entry.id];
      const local = this.deps.repo.get(entry.id);
      const alreadyKnownConflict = state.conflicts[entry.id]?.remoteSha === entry.sha256;
      if (link && local && link.remoteSha === entry.sha256) continue;
      if (alreadyKnownConflict) continue;

      const text = await src.readText(entry.path);
      if (text === null) throw new SyncError("invalid", `Falta el archivo «${entry.path}» en el servidor.`);
      if (sha256Hex(text) !== entry.sha256) {
        throw new SyncError("invalid", `El archivo «${entry.path}» no coincide con su huella (descarga incompleta o dañada).`);
      }
      let project: ProjectState;
      try {
        const envelope = parseEnvelope(text);
        project = envelope.project;
      } catch (error) {
        throw new SyncError("invalid", `«${entry.name}»: ${error instanceof Error ? error.message : String(error)}`);
      }
      if (project.id !== entry.id) throw new SyncError("invalid", `«${entry.name}»: el id no coincide con el índice.`);
      fetched.push({ id: entry.id, name: entry.name, rev: entry.rev, sha: entry.sha256, text, project });
    }

    // ---- todo descargado y validado: ahora sí se aplica
    const result: CheckResult = {
      applied: [],
      conflicts: [],
      unlinked: [],
      dataVersion: manifest.dataVersion,
      upToDate: fetched.length === 0 && manifest.dataVersion === state.dataVersion,
    };
    if (fetched.length) this.deps.flush?.();

    for (const f of fetched) {
      const prepared = this.deps.prepare(f.project);
      const local = this.deps.repo.get(f.id);
      const link = state.links[f.id];
      const remoteLink: Link = {
        name: f.name,
        rev: f.rev,
        remoteSha: f.sha,
        baseHash: contentHash(prepared),
      };

      if (!local) {
        this.deps.repo.save(prepared);
        state.links[f.id] = remoteLink;
        delete state.conflicts[f.id];
        result.applied.push(f.id);
        continue;
      }
      // Mismo contenido: solo se vincula.
      if (contentHash(local) === remoteLink.baseHash) {
        state.links[f.id] = remoteLink;
        delete state.conflicts[f.id];
        continue;
      }
      const hasLocalChanges = !link || this.isDiverged(local, link);
      if (!hasLocalChanges) {
        this.backup(local, `Antes de actualizar desde el servidor (v${f.rev})`);
        this.deps.repo.save(prepared);
        state.links[f.id] = remoteLink;
        delete state.conflicts[f.id];
        result.applied.push(f.id);
      } else {
        const conflict: Conflict = {
          name: f.name,
          rev: f.rev,
          remoteSha: f.sha,
          text: f.text,
          detectedAt: this.now().toISOString(),
        };
        state.conflicts[f.id] = conflict;
        result.conflicts.push(f.id);
      }
    }

    // Proyectos que ya no están publicados: se conservan en este equipo, solo se desvinculan.
    const published = new Set(manifest.projects.map((p) => p.id));
    for (const id of Object.keys(state.links)) {
      if (!published.has(id)) {
        delete state.links[id];
        delete state.conflicts[id];
        result.unlinked.push(id);
      }
    }

    state.dataVersion = manifest.dataVersion;
    state.lastOkAt = this.now().toISOString();
    this.writeState(state);
    if (result.applied.length) this.deps.onApplied?.(result.applied);
    return result;
  }

  getConflicts(): Array<{ id: string } & Conflict> {
    return Object.entries(this.readState().conflicts).map(([id, c]) => ({ id, ...c }));
  }

  /** Resuelve un conflicto: usar la versión del servidor o conservar la local. */
  resolveConflict(id: string, choice: "server" | "mine"): void {
    const state = this.readState();
    const conflict = state.conflicts[id];
    if (!conflict) return;
    const envelope = parseEnvelope(conflict.text);
    const prepared = this.deps.prepare(envelope.project);
    if (choice === "server") {
      this.deps.flush?.();
      const local = this.deps.repo.get(id);
      if (local) this.backup(local, "Antes de usar la versión del servidor");
      this.deps.repo.save(prepared);
      state.links[id] = {
        name: conflict.name,
        rev: conflict.rev,
        remoteSha: conflict.remoteSha,
        baseHash: contentHash(prepared),
      };
      delete state.conflicts[id];
      this.writeState(state);
      this.deps.onApplied?.([id]);
      return;
    }
    // «mine»: se reconoce la versión del servidor como base, pero se conserva el contenido local
    // (queda como «cambio sin publicar» para poder publicarlo encima).
    const existing = state.links[id];
    state.links[id] = {
      name: conflict.name,
      rev: conflict.rev,
      remoteSha: conflict.remoteSha,
      baseHash: existing?.baseHash ?? "",
    };
    delete state.conflicts[id];
    this.writeState(state);
  }

  // ------------------------------------------------------------ publicar
  async publish(ids: string[], message: string): Promise<{ commit: string; dataVersion: number; published: string[] }> {
    const cfg = this.deps.getConfig();
    const src = this.source(true);
    const state = this.alignSource(this.readState());
    if (!ids.length) throw new SyncError("invalid", "No hay proyectos seleccionados para publicar.");
    if (Object.keys(state.conflicts).some((id) => ids.includes(id))) {
      throw new SyncError("conflict", "Resolvé primero el conflicto de ese proyecto (servidor o tu versión).");
    }

    this.deps.flush?.();
    const head = await src.head();
    const manifestText = await src.readText(MANIFEST_PATH, head);
    const current: Manifest = manifestText
      ? parseManifest(manifestText)
      : {
          format: "boxmaper-manifest",
          schema: SUPPORTED_SCHEMA,
          dataVersion: 0,
          publishedAt: this.now().toISOString(),
          projects: [],
        };

    const files: Array<{ path: string; text: string | null }> = [];
    const projects = new Map(current.projects.map((p) => [p.id, p]));
    const publishedIds: string[] = [];
    const newLinks: Record<string, Link> = {};

    for (const id of ids) {
      const local = this.deps.repo.get(id);
      if (!local) throw new SyncError("not-found", "Un proyecto seleccionado ya no existe en este equipo.");
      const errors = validateProject(local);
      if (errors.length) {
        throw new SyncError("invalid", `«${local.projectName}» no se puede publicar: ${errors.slice(0, 3).join(" ")}`);
      }
      const remote = projects.get(id);
      const link = state.links[id];
      if (remote && (!link || link.rev !== remote.rev)) {
        throw new SyncError(
          "conflict",
          `«${local.projectName}» cambió en el servidor desde tu última actualización. Actualizá primero para no pisar esos cambios.`,
        );
      }
      const text = serializeEnvelope(local);
      const sha = sha256Hex(text);
      if (remote && remote.sha256 === sha) continue; // sin cambios reales
      const rev = (remote?.rev ?? 0) + 1;
      files.push({ path: `${PROJECTS_DIR}/${id}.json`, text });
      projects.set(id, {
        id,
        name: local.projectName,
        path: `${PROJECTS_DIR}/${id}.json`,
        sha256: sha,
        rev,
        updatedAt: this.now().toISOString(),
      });
      publishedIds.push(id);
      newLinks[id] = { name: local.projectName, rev, remoteSha: sha, baseHash: contentHash(local) };
    }

    if (!publishedIds.length) {
      throw new SyncError("invalid", "No hay cambios reales para publicar.");
    }

    const next: Manifest = {
      format: "boxmaper-manifest",
      schema: SUPPORTED_SCHEMA,
      dataVersion: current.dataVersion + 1,
      publishedAt: this.now().toISOString(),
      publishedBy: cfg.author || undefined,
      message,
      projects: [...projects.values()].sort((a, b) => a.name.localeCompare(b.name, "es")),
    };
    files.push({ path: MANIFEST_PATH, text: serializeManifest(next) });

    const commit = await src.commit(files, message, head, cfg.author || undefined);
    const fresh = this.readState();
    Object.assign(fresh.links, newLinks);
    fresh.dataVersion = next.dataVersion;
    fresh.lastOkAt = this.now().toISOString();
    this.writeState(fresh);
    return { commit, dataVersion: next.dataVersion, published: publishedIds };
  }

  // ------------------------------------------------------------ historial y vuelta atrás
  async history(limit = 30): Promise<HistoryEntry[]> {
    return this.source().history(MANIFEST_PATH, limit);
  }

  /**
   * Vuelve a una versión anterior publicando un cambio NUEVO que repone ese
   * contenido. No se borra nada del historial, y los demás equipos reciben
   * la versión repuesta como cualquier otra actualización.
   */
  async restoreFromHistory(commitId: string): Promise<{ dataVersion: number; changed: string[] }> {
    const cfg = this.deps.getConfig();
    const src = this.source(true);
    const oldText = await src.readText(MANIFEST_PATH, commitId);
    if (!oldText) throw new SyncError("not-found", "Esa versión no tiene datos publicados.");
    const old = parseManifest(oldText);

    // Se valida TODO lo de la versión antigua antes de publicar nada.
    const oldFiles = new Map<string, string>();
    for (const entry of old.projects) {
      const text = await src.readText(entry.path, commitId);
      if (text === null || sha256Hex(text) !== entry.sha256) {
        throw new SyncError("invalid", `La versión elegida está incompleta («${entry.name}»).`);
      }
      parseEnvelope(text);
      oldFiles.set(entry.id, text);
    }

    const head = await src.head();
    const headText = await src.readText(MANIFEST_PATH, head);
    const current = headText ? parseManifest(headText) : null;
    const currentById = new Map((current?.projects ?? []).map((p) => [p.id, p]));

    const files: Array<{ path: string; text: string | null }> = [];
    const entries: Manifest["projects"] = [];
    const changed: string[] = [];
    for (const entry of old.projects) {
      const now = currentById.get(entry.id);
      if (now && now.sha256 === entry.sha256) {
        entries.push(now);
        continue;
      }
      files.push({ path: entry.path, text: oldFiles.get(entry.id)! });
      entries.push({ ...entry, rev: (now?.rev ?? 0) + 1, updatedAt: this.now().toISOString() });
      changed.push(entry.id);
    }
    for (const now of current?.projects ?? []) {
      if (!old.projects.some((p) => p.id === now.id)) {
        files.push({ path: now.path, text: null });
        changed.push(now.id);
      }
    }
    if (!changed.length) throw new SyncError("invalid", "Esa versión es idéntica a la actual.");

    const next: Manifest = {
      format: "boxmaper-manifest",
      schema: SUPPORTED_SCHEMA,
      dataVersion: (current?.dataVersion ?? 0) + 1,
      publishedAt: this.now().toISOString(),
      publishedBy: cfg.author || undefined,
      message: `Restaurar versión ${commitId.slice(0, 7)} (datos v${old.dataVersion})`,
      projects: entries,
    };
    files.push({ path: MANIFEST_PATH, text: serializeManifest(next) });
    await src.commit(files, next.message!, head, cfg.author || undefined);
    return { dataVersion: next.dataVersion, changed };
  }
}
