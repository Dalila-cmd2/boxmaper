import { Download, MoreVertical, PlusSquare, Share, X } from "lucide-react";
import { useState } from "react";
import { useInstallPrompt } from "../pwa/useInstallPrompt";

function InstallHelpModal({
  open,
  onClose,
  ios,
}: {
  open: boolean;
  onClose: () => void;
  ios: boolean;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-help-title"
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="install-help-title" className="text-base font-semibold text-white">
            Instalar BoxMaper
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4 text-sm text-slate-300">
          {ios ? (
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              <li>
                Abre esta página en <strong className="text-white">Safari</strong> (en iPhone solo
                Safari puede instalar la app).
              </li>
              <li>
                Toca el botón <Share className="mx-0.5 inline h-4 w-4 text-emerald-400" />{" "}
                <strong className="text-white">Compartir</strong> (abajo en el centro).
              </li>
              <li>
                Elige{" "}
                <PlusSquare className="mx-0.5 inline h-4 w-4 text-emerald-400" />{" "}
                <strong className="text-white">Añadir a pantalla de inicio</strong>.
              </li>
              <li>
                Toca <strong className="text-white">Añadir</strong>. Ya tienes el icono de BoxMaper.
              </li>
            </ol>
          ) : (
            <ol className="flex list-decimal flex-col gap-3 pl-5">
              <li>
                <strong className="text-white">Android (Chrome):</strong> toca el menú{" "}
                <MoreVertical className="mx-0.5 inline h-4 w-4 text-emerald-400" /> y elige{" "}
                <strong className="text-white">Instalar aplicación</strong> (o «Añadir a la pantalla
                de inicio»).
              </li>
              <li>
                <strong className="text-white">PC (Chrome / Edge):</strong> busca el icono de
                instalar a la derecha de la barra de direcciones, o menú ⋮ →{" "}
                <strong className="text-white">Instalar BoxMaper</strong>.
              </li>
              <li>
                <strong className="text-white">iPhone / iPad:</strong> ábrelo en Safari →{" "}
                <Share className="mx-0.5 inline h-4 w-4 text-emerald-400" /> Compartir →{" "}
                <strong className="text-white">Añadir a pantalla de inicio</strong>.
              </li>
            </ol>
          )}
          <p className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
            Tus proyectos se guardan en este dispositivo. Usa{" "}
            <strong className="text-slate-200">Archivo → Guardar</strong> para bajar una copia de
            seguridad y poder abrirla en otro móvil u ordenador.
          </p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** `card`: botón grande para la pantalla de inicio. `menu`: fila de menú. */
  variant?: "card" | "menu";
  className?: string;
}

/** Botón «Instalar app». No aparece si ya está instalada o en la app de escritorio. */
export function InstallAppButton({ variant = "card", className = "" }: Props) {
  const { state, install } = useInstallPrompt();
  const [helpOpen, setHelpOpen] = useState(false);

  if (state === "installed") return null;

  const handleClick = async () => {
    if (state === "promptable") {
      await install();
      return;
    }
    setHelpOpen(true);
  };

  const helpModal = (
    <InstallHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} ios={state === "ios"} />
  );

  if (variant === "menu") {
    return (
      <>
        <button
          type="button"
          onClick={() => void handleClick()}
          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-slate-800 md:py-1.5 ${className}`}
        >
          <Download className="h-3.5 w-3.5" />
          Instalar app
        </button>
        {helpModal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        className={`flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3 text-left transition hover:border-emerald-500/70 hover:bg-emerald-500/20 ${className}`}
      >
        <Download className="h-6 w-6 shrink-0 text-emerald-400" />
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-white">Instalar BoxMaper</span>
          <span className="text-xs text-slate-400">
            {state === "ios"
              ? "Añádela a tu pantalla de inicio (te explicamos cómo)."
              : "Úsala como una app, también sin conexión."}
          </span>
        </span>
      </button>
      {helpModal}
    </>
  );
}
