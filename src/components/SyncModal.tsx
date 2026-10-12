import { History, KeyRound, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  closeSyncPanel,
  describeError,
  engine,
  loadSyncConfig,
  publishNow,
  refreshCounters,
  saveSyncConfig,
  syncNow,
  useSyncPanelOpen,
  useSyncStatus,
} from "../sync/syncService";
import type { BackupInfo, HistoryEntry, PendingChange, SyncConfig } from "../sync/types";

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";
const btn =
  "rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50";
const btnPrimary = `${btn} bg-emerald-600 text-white hover:bg-emerald-500`;
const btnGhost = `${btn} border border-slate-700 text-slate-200 hover:bg-slate-800`;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" });
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2 border-t border-slate-800 px-5 py-4 first:border-t-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h3>
      {children}
    </section>
  );
}

export function SyncModal() {
  const open = useSyncPanelOpen();
  const status = useSyncStatus();
  const [cfg, setCfg] = useState<SyncConfig>(() => loadSyncConfig());
  const [tick, setTick] = useState(0);
  const [pending, setPending] = useState<PendingChange[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[] | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const reload = useCallback(() => {
    const changes = engine.pendingChanges();
    setPending(changes);
    // Por defecto solo se marcan los proyectos ya publicados que se modificaron.
    setSelected(new Set(changes.filter((c) => c.kind === "modified").map((c) => c.id)));
    setBackups(engine.listBackups());
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCfg(loadSyncConfig());
    setHistory(null);
    setFeedback(null);
    reload();
  }, [open, reload]);

  if (!open) return null;

  const canWrite = Boolean(cfg.token);
  const conflicts = engine.getConflicts();
  void tick;

  const run = async (label: string, fn: () => Promise<void> | void, okText?: string) => {
    setBusy(label);
    setFeedback(null);
    try {
      await fn();
      if (okText) setFeedback({ ok: true, text: okText });
    } catch (error) {
      setFeedback({ ok: false, text: describeError(error).message });
    } finally {
      setBusy(null);
      refreshCounters();
      reload();
    }
  };

  const hint =
    status.errorCode === "auth" && !cfg.token
      ? "Este repositorio es privado: pegá abajo la clave de acceso (token de GitHub)."
      : status.errorCode === "schema"
        ? "Los datos son de una versión más nueva: actualizá BoxMaper desde Ayuda → Buscar actualizaciones."
        : null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-title"
        className="flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="sync-title" className="text-base font-semibold text-white">
            Datos y sincronización
          </h2>
          <button type="button" onClick={closeSyncPanel} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto text-sm text-slate-300">
          <Section title="Estado">
            <p>
              Versión de datos: <strong className="text-white">{status.dataVersion ?? "—"}</strong> · Última
              comprobación correcta: <strong className="text-white">{formatDate(status.lastOkAt)}</strong>
            </p>
            {status.phase === "error" ? (
              <p className="rounded-lg border border-red-900/70 bg-red-950/40 px-3 py-2 text-red-300">
                {status.message}
                {hint ? <span className="mt-1 block text-red-200">{hint}</span> : null}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={btnPrimary}
                disabled={busy !== null || status.phase === "checking"}
                onClick={() => void run("check", async () => void (await syncNow(true)))}
              >
                {status.phase === "checking" ? (
                  <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 inline h-3 w-3" />
                )}
                Buscar cambios ahora
              </button>
            </div>
            <p className="text-xs text-slate-500">
              BoxMaper busca cambios solo al abrir, cada {cfg.intervalMinutes} min y al volver a la ventana.
              Antes de cambiar un proyecto guarda una copia de seguridad en este equipo.
            </p>
          </Section>

          {conflicts.length ? (
            <Section title="Cambios que chocan">
              <p className="text-xs text-slate-400">
                Estos proyectos tienen cambios tuyos y también cambios nuevos publicados. No se tocó nada: elegí
                qué versión usar.
              </p>
              {conflicts.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-2"
                >
                  <span className="font-medium text-amber-200">{c.name}</span>
                  <span className="flex gap-2">
                    <button
                      type="button"
                      className={btnGhost}
                      disabled={busy !== null}
                      onClick={() => void run("c", () => engine.resolveConflict(c.id, "mine"), "Se conservó tu versión.")}
                    >
                      Conservar la mía
                    </button>
                    <button
                      type="button"
                      className={btnPrimary}
                      disabled={busy !== null}
                      onClick={() =>
                        void run("c", () => engine.resolveConflict(c.id, "server"), "Se usó la versión publicada (tu copia quedó guardada).")
                      }
                    >
                      Usar la publicada
                    </button>
                  </span>
                </div>
              ))}
            </Section>
          ) : null}

          <Section title="Publicar mis cambios">
            {!canWrite ? (
              <p className="text-xs text-slate-400">
                Para publicar cambios hace falta una clave de acceso con permiso de escritura (abajo, en
                «Conexión»). Sin clave, esta instalación solo recibe actualizaciones.
              </p>
            ) : pending.length === 0 ? (
              <p className="text-xs text-slate-400">No hay cambios sin publicar.</p>
            ) : (
              <>
                <ul className="flex flex-col gap-1">
                  {pending.map((c) => (
                    <li key={c.id}>
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(c.id);
                            else next.delete(c.id);
                            setSelected(next);
                          }}
                        />
                        <span className="text-slate-100">{c.name}</span>
                        <span className="text-xs text-slate-500">
                          {c.kind === "new" ? "(proyecto nuevo, aún no publicado)" : "(modificado)"}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <input
                  className={inputClass}
                  placeholder="¿Qué cambiaste? (ej. «Añadido sótano y corregidas persianas»)"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
                <div>
                  <button
                    type="button"
                    className={btnPrimary}
                    disabled={busy !== null || selected.size === 0 || !message.trim()}
                    onClick={() =>
                      void run(
                        "publish",
                        async () => {
                          await publishNow([...selected], message.trim());
                          setMessage("");
                          setHistory(null);
                        },
                        "Publicado. Los demás equipos lo recibirán solos.",
                      )
                    }
                  >
                    {busy === "publish" ? (
                      <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
                    ) : (
                      <Upload className="mr-1 inline h-3 w-3" />
                    )}
                    Publicar seleccionados
                  </button>
                </div>
              </>
            )}
          </Section>

          <Section title="Historial de versiones">
            {history === null ? (
              <div>
                <button
                  type="button"
                  className={btnGhost}
                  disabled={busy !== null}
                  onClick={() =>
                    void run("history", async () => setHistory(await engine.history(30)))
                  }
                >
                  <History className="mr-1 inline h-3 w-3" />
                  Ver historial
                </button>
              </div>
            ) : history.length === 0 ? (
              <p className="text-xs text-slate-400">Todavía no hay versiones publicadas.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {history.map((h, i) => (
                  <li
                    key={h.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-slate-100">{h.message}</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(h.date)}
                        {h.author ? ` · ${h.author}` : ""}
                        {i === 0 ? " · actual" : ""}
                      </span>
                    </span>
                    {canWrite && i > 0 ? (
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={busy !== null}
                        onClick={() => {
                          if (!confirm(`¿Volver a la versión «${h.message}»? Se publicará como un cambio nuevo y no se borra nada del historial.`)) return;
                          void run(
                            "restore",
                            async () => {
                              await engine.restoreFromHistory(h.id);
                              await syncNow(true);
                              setHistory(await engine.history(30));
                            },
                            "Versión restaurada y publicada.",
                          );
                        }}
                      >
                        Volver a esta
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Copias de seguridad en este equipo">
            {backups.length === 0 ? (
              <p className="text-xs text-slate-400">
                Se crean solas antes de cada actualización que cambia un proyecto.
              </p>
            ) : (
              <ul className="flex flex-col gap-1">
                {backups.slice(0, 15).map((b) => (
                  <li
                    key={`${b.projectId}-${b.at}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-800 px-3 py-1.5"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-slate-100">{b.name}</span>
                      <span className="text-xs text-slate-500">
                        {formatDate(b.at)} · {b.reason}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={btnGhost}
                      disabled={busy !== null}
                      onClick={() => {
                        if (!confirm(`¿Recuperar la copia de «${b.name}» del ${formatDate(b.at)}? Antes se guardará el estado actual.`)) return;
                        void run("backup", () => engine.restoreBackup(b.projectId, b.at), "Copia recuperada.");
                      }}
                    >
                      Recuperar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="Conexión">
            <label className="flex items-center gap-2 text-slate-200">
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
              />
              Sincronizar automáticamente
            </label>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Cuenta u organización
                <input className={inputClass} value={cfg.owner} onChange={(e) => setCfg({ ...cfg, owner: e.target.value.trim() })} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Repositorio de datos
                <input className={inputClass} value={cfg.repo} onChange={(e) => setCfg({ ...cfg, repo: e.target.value.trim() })} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Rama
                <input className={inputClass} value={cfg.branch} onChange={(e) => setCfg({ ...cfg, branch: e.target.value.trim() })} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <KeyRound className="h-3 w-3" /> Clave de acceso (opcional si el repositorio es público; con permiso de
                lectura para recibir, de escritura para publicar)
              </span>
              <input
                type="password"
                autoComplete="off"
                className={inputClass}
                value={cfg.token}
                onChange={(e) => setCfg({ ...cfg, token: e.target.value.trim() })}
                placeholder="github_pat_…"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Tu nombre (se anota al publicar)
                <input className={inputClass} value={cfg.author} onChange={(e) => setCfg({ ...cfg, author: e.target.value })} />
              </label>
              <label className="flex flex-col gap-1 text-xs text-slate-400">
                Buscar cambios cada (minutos)
                <input
                  type="number"
                  min={1}
                  max={240}
                  className={inputClass}
                  value={cfg.intervalMinutes}
                  onChange={(e) => setCfg({ ...cfg, intervalMinutes: Number(e.target.value) || 5 })}
                />
              </label>
            </div>
            <div>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  saveSyncConfig(cfg);
                  setFeedback({ ok: true, text: "Conexión guardada." });
                }}
              >
                Guardar conexión
              </button>
            </div>
          </Section>
        </div>

        {feedback ? (
          <div
            className={`border-t px-5 py-2 text-xs ${
              feedback.ok
                ? "border-emerald-900/60 bg-emerald-950/40 text-emerald-300"
                : "border-red-900/60 bg-red-950/40 text-red-300"
            }`}
          >
            {feedback.text}
          </div>
        ) : null}
      </div>
    </div>
  );
}
