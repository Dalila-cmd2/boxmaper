import { useSyncExternalStore } from "react";
import { normalizeProject } from "../data/deviceCatalog";
import type { ProjectState } from "../types/project";
import {
  listProjectIndex,
  loadIndexedProject,
  storeIndexedProject,
} from "../utils/projectIndex";
import { migrateProjectState } from "../utils/projectModel";
import { readConfig, writeConfig } from "./config";
import { SyncEngine } from "./engine";
import { localStorageKv } from "./kv";
import { GitHubSource } from "./sources";
import { SyncError, type CheckResult, type SyncConfig } from "./types";

/**
 * Servicio de sincronización de la app: une el motor con la interfaz.
 * - Busca cambios al abrir, cada pocos minutos, al volver a la ventana y al recuperar Internet.
 * - Muestra un estado sencillo (al día / sincronizando / error / conflictos).
 */

export interface SyncStatus {
  phase: "idle" | "checking" | "publishing" | "ok" | "error";
  message: string;
  errorCode: SyncError["code"] | null;
  lastOkAt: string | null;
  dataVersion: number | null;
  conflictCount: number;
  pendingCount: number;
  /** Aviso corto y temporal («Se actualizaron 2 proyectos»). */
  notice: string | null;
}

const kv = localStorageKv();
let flushHook: (() => void) | undefined;
const appliedListeners = new Set<(ids: string[]) => void>();

export function prepareRemoteProject(state: ProjectState): ProjectState {
  const migrated = migrateProjectState(state) ?? state;
  return normalizeProject(migrated);
}

export const engine = new SyncEngine({
  kv,
  repo: {
    get: (id) => loadIndexedProject(id),
    save: (state) => void storeIndexedProject(state),
    list: () => listProjectIndex().map((e) => ({ id: e.id, name: e.name })),
  },
  getConfig: () => readConfig(kv),
  createSource: (cfg) => new GitHubSource(cfg),
  prepare: prepareRemoteProject,
  flush: () => flushHook?.(),
  onApplied: (ids) => appliedListeners.forEach((l) => l(ids)),
});

/** La interfaz registra cómo escribir de inmediato el autoguardado pendiente. */
export function setFlushHook(fn: (() => void) | undefined) {
  flushHook = fn;
}

/** Se llama cuando la sincronización cambia proyectos en este equipo (para recargar el abierto). */
export function onProjectsApplied(listener: (ids: string[]) => void): () => void {
  appliedListeners.add(listener);
  return () => void appliedListeners.delete(listener);
}

// ---------------------------------------------------------------- estado observable
let status: SyncStatus = {
  phase: "idle",
  message: "",
  errorCode: null,
  lastOkAt: null,
  dataVersion: null,
  conflictCount: 0,
  pendingCount: 0,
  notice: null,
};
const listeners = new Set<() => void>();
let noticeTimer: ReturnType<typeof setTimeout> | undefined;

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch };
  listeners.forEach((l) => l());
}

export function refreshCounters() {
  const s = engine.readState();
  setStatus({
    lastOkAt: s.lastOkAt,
    dataVersion: s.dataVersion,
    conflictCount: Object.keys(s.conflicts).length,
    // Solo quien puede publicar necesita ver «sin publicar».
    pendingCount: readConfig(kv).token ? engine.pendingChanges().length : 0,
  });
}

function showNotice(text: string) {
  clearTimeout(noticeTimer);
  setStatus({ notice: text });
  noticeTimer = setTimeout(() => setStatus({ notice: null }), 8000);
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
    () => status,
  );
}

export function describeError(error: unknown): { code: SyncError["code"] | null; message: string } {
  if (error instanceof SyncError) return { code: error.code, message: error.message };
  return { code: null, message: error instanceof Error ? error.message : String(error) };
}

// ---------------------------------------------------------------- acciones
let running = false;

/** Busca y aplica cambios. `manual` = lo pidió el usuario (muestra más mensajes). */
export async function syncNow(manual = false): Promise<CheckResult | null> {
  if (running) return null;
  const cfg = readConfig(kv);
  if (!cfg.enabled) return null;
  running = true;
  setStatus({ phase: "checking", message: "Buscando cambios en los datos…" });
  try {
    const result = await engine.check();
    refreshCounters();
    const count = result.applied.length;
    setStatus({ phase: "ok", message: "Datos al día", errorCode: null });
    if (count) showNotice(`Datos actualizados (${count} proyecto${count === 1 ? "" : "s"}).`);
    else if (result.conflicts.length) {
      showNotice("Hay cambios del servidor que chocan con los tuyos: revisalos en «Datos».");
    } else if (manual) showNotice("Los datos ya están al día.");
    return result;
  } catch (error) {
    const { code, message } = describeError(error);
    refreshCounters();
    // Comprobación en segundo plano: no molestar por red, datos aún no publicados o repo privado sin clave.
    if (!manual && (code === "network" || code === "not-found" || code === "auth")) {
      setStatus({ phase: "idle", message: "", errorCode: null });
      return null;
    }
    setStatus({ phase: "error", message, errorCode: code });
    return null;
  } finally {
    running = false;
  }
}

export async function publishNow(ids: string[], message: string) {
  setStatus({ phase: "publishing", message: "Publicando…" });
  try {
    const result = await engine.publish(ids, message);
    refreshCounters();
    setStatus({ phase: "ok", message: "Datos al día", errorCode: null });
    showNotice(`Publicado: datos v${result.dataVersion}.`);
    return result;
  } catch (error) {
    const { code, message: text } = describeError(error);
    refreshCounters();
    setStatus({ phase: "error", message: text, errorCode: code });
    throw error;
  }
}

export function saveSyncConfig(cfg: SyncConfig) {
  writeConfig(kv, cfg);
  void syncNow(true);
}

export function loadSyncConfig(): SyncConfig {
  return readConfig(kv);
}

// ---------------------------------------------------------------- arranque automático
let started = false;
let lastAuto = 0;

export function startAutoSync() {
  if (started || typeof window === "undefined") return;
  started = true;
  refreshCounters();

  const tick = () => {
    lastAuto = Date.now();
    void syncNow(false);
  };
  setTimeout(tick, 1500);

  let timer: ReturnType<typeof setInterval> | undefined;
  const schedule = () => {
    clearInterval(timer);
    timer = setInterval(tick, readConfig(kv).intervalMinutes * 60_000);
  };
  schedule();
  window.addEventListener("storage", schedule);

  const soon = () => {
    if (Date.now() - lastAuto > 30_000) tick();
  };
  window.addEventListener("focus", soon);
  window.addEventListener("online", soon);
}

// ---------------------------------------------------------------- panel «Datos»
let panelOpen = false;
const panelListeners = new Set<() => void>();

export function openSyncPanel() {
  panelOpen = true;
  refreshCounters();
  panelListeners.forEach((l) => l());
}

export function closeSyncPanel() {
  panelOpen = false;
  panelListeners.forEach((l) => l());
}

export function useSyncPanelOpen(): boolean {
  return useSyncExternalStore(
    (l) => {
      panelListeners.add(l);
      return () => void panelListeners.delete(l);
    },
    () => panelOpen,
  );
}
