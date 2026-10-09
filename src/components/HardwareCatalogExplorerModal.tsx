import { X } from "lucide-react";
import { useState } from "react";
import { HardwareCatalogPreviewPane } from "./HardwareCatalogPreviewPane";
import { HardwareCatalogSelector } from "./HardwareCatalogSelector";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HardwareCatalogExplorerModal({ open, onClose }: Props) {
  const [selectedId, setSelectedId] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-h-[90dvh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-explorer-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 id="catalog-explorer-title" className="text-base font-semibold text-white">
              Catálogo Loxone
            </h2>
            <p className="text-xs text-slate-500">
              Explora equipos y bornes sin abrir un proyecto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-4 overflow-hidden p-5 lg:grid-cols-2">
          <HardwareCatalogSelector
            selectedId={selectedId}
            onSelect={setSelectedId}
            listMaxHeightClass="max-h-[min(50vh,28rem)]"
          />

          <div className="flex min-h-0 min-w-0 flex-col gap-2">
            <p className="shrink-0 text-xs font-medium uppercase tracking-wide text-slate-500">
              Vista previa del bornero
            </p>
            <HardwareCatalogPreviewPane
              catalogId={selectedId}
              emptyMessage="Selecciona un equipo para ver su esquema de bornes."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
