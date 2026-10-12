import type { KeyValueStore } from "./kv";
import type { SyncConfig } from "./types";

/**
 * Fuente de datos que traen TODAS las instalaciones por defecto: así, al
 * instalar la app una sola vez, ya apunta al repositorio central.
 * Se puede cambiar desde «Ayuda → Datos y sincronización».
 */
export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  enabled: true,
  owner: "Dalila-cmd2",
  repo: "boxmaper-datos",
  branch: "main",
  token: "",
  intervalMinutes: 5,
  author: "",
};

const CONFIG_KEY = "boxmaper.sync.config.v1";

export function readConfig(kv: KeyValueStore): SyncConfig {
  try {
    const raw = kv.get(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_SYNC_CONFIG };
    const parsed = JSON.parse(raw) as Partial<SyncConfig>;
    const merged = { ...DEFAULT_SYNC_CONFIG, ...parsed };
    merged.intervalMinutes = Math.min(Math.max(Math.round(Number(merged.intervalMinutes) || 5), 1), 240);
    return merged;
  } catch {
    return { ...DEFAULT_SYNC_CONFIG };
  }
}

export function writeConfig(kv: KeyValueStore, cfg: SyncConfig) {
  kv.set(CONFIG_KEY, JSON.stringify(cfg));
}
