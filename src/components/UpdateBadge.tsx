import { CheckCircle2, Download, Loader2, RefreshCw, X, AlertCircle } from "lucide-react";
import {
  dismissUpdateStatus,
  installUpdate,
  useUpdateStatus,
} from "../utils/appUpdater";

/** Aviso compacto de actualizaciones, pensado para la barra de título. */
export function UpdateBadge() {
  const status = useUpdateStatus();

  if (status.kind === "idle") return null;
  if (status.kind === "checking" && !status.manual) return null;

  const base =
    "flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium";

  if (status.kind === "checking") {
    return (
      <span className={`${base} border-slate-700 text-slate-400`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Buscando actualizaciones…
      </span>
    );
  }

  if (status.kind === "uptodate") {
    return (
      <span className={`${base} border-emerald-800/60 text-emerald-400`}>
        <CheckCircle2 className="h-3 w-3" />
        BoxMaper está actualizado
      </span>
    );
  }

  if (status.kind === "available") {
    return (
      <span className={`${base} border-emerald-700/70 bg-emerald-950/40 text-emerald-300`}>
        <Download className="h-3 w-3" />
        Nueva versión {status.version}
        <button
          type="button"
          onClick={() => void installUpdate()}
          className="rounded bg-emerald-600 px-1.5 py-px text-white transition hover:bg-emerald-500"
        >
          Actualizar ahora
        </button>
        <button
          type="button"
          aria-label="Más tarde"
          title="Más tarde"
          onClick={dismissUpdateStatus}
          className="text-slate-500 hover:text-slate-200"
        >
          <X className="h-3 w-3" />
        </button>
      </span>
    );
  }

  if (status.kind === "downloading") {
    return (
      <span className={`${base} border-slate-700 text-slate-300`}>
        <Loader2 className="h-3 w-3 animate-spin" />
        Descargando {status.version}
        {status.percent !== null ? ` · ${status.percent}%` : "…"}
      </span>
    );
  }

  if (status.kind === "ready") {
    return (
      <span className={`${base} border-emerald-700/70 text-emerald-300`}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        Reiniciando para terminar…
      </span>
    );
  }

  return (
    <span className={`${base} border-red-900/70 text-red-300`}>
      <AlertCircle className="h-3 w-3" />
      {status.message}
      <button
        type="button"
        aria-label="Cerrar aviso"
        onClick={dismissUpdateStatus}
        className="text-red-400/80 hover:text-red-200"
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}
