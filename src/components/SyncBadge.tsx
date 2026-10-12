import { AlertCircle, CheckCircle2, CloudOff, Loader2, UploadCloud } from "lucide-react";
import { openSyncPanel, useSyncStatus } from "../sync/syncService";

/** Indicador compacto del estado de los datos centrales (barra de título). */
export function SyncBadge() {
  const s = useSyncStatus();
  const base =
    "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium transition hover:brightness-125";

  let tone = "border-slate-700 text-slate-400";
  let icon = <CheckCircle2 className="h-3 w-3" />;
  let text = s.dataVersion !== null ? `Datos v${s.dataVersion}` : "Datos";

  if (s.phase === "checking" || s.phase === "publishing") {
    icon = <Loader2 className="h-3 w-3 animate-spin" />;
    text = s.phase === "publishing" ? "Publicando…" : "Sincronizando…";
  } else if (s.conflictCount > 0) {
    tone = "border-amber-700/70 bg-amber-950/40 text-amber-300";
    icon = <AlertCircle className="h-3 w-3" />;
    text = `${s.conflictCount} cambio${s.conflictCount === 1 ? "" : "s"} que choca${s.conflictCount === 1 ? "" : "n"}`;
  } else if (s.phase === "error") {
    tone = "border-red-900/70 text-red-300";
    icon = s.errorCode === "network" ? <CloudOff className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />;
    text = "Datos: revisar";
  } else if (s.notice) {
    tone = "border-emerald-700/70 bg-emerald-950/40 text-emerald-300";
    text = s.notice;
  } else if (s.pendingCount > 0) {
    tone = "border-sky-800/70 text-sky-300";
    icon = <UploadCloud className="h-3 w-3" />;
    text = `${s.pendingCount} sin publicar`;
  } else if (s.phase === "ok") {
    tone = "border-emerald-800/60 text-emerald-400";
  }

  return (
    <button
      type="button"
      onClick={openSyncPanel}
      title="Datos y sincronización"
      className={`${base} ${tone}`}
    >
      {icon}
      {text}
    </button>
  );
}
