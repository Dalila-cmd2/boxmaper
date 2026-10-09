import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { getCatalogSelectorHint } from "../data/deviceCatalog";
import { getLoxoneModule } from "../data/loxoneCatalog";
import { formatMacAddress } from "../utils/macAddress";
import { HardwareCatalogPreviewPane } from "./HardwareCatalogPreviewPane";
import { HardwareCatalogSelector } from "./HardwareCatalogSelector";

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (catalogId: string, name: string, serial?: string, zone?: string) => void;
}

export function AddModuleModal({ open, onClose, onAdd }: Props) {
  const [catalogId, setCatalogId] = useState("");
  const [alias, setAlias] = useState("");
  const [zone, setZone] = useState("");
  const [serial, setSerial] = useState("");

  const selected = catalogId ? getLoxoneModule(catalogId) : undefined;
  const selectorHint = catalogId ? getCatalogSelectorHint(catalogId) : null;

  useEffect(() => {
    if (!open) {
      setCatalogId("");
      setAlias("");
      setZone("");
      setSerial("");
    }
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (!selected) return;
    const name = alias.trim() || selected.name;
    onAdd(selected.id, name, serial.trim(), zone.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-device-title"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="add-device-title" className="text-base font-semibold text-white">
            Añadir Dispositivo
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto px-5 py-4 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <div>
              <span className="mb-2 block text-sm text-slate-400">1. Tipo de dispositivo</span>
              <HardwareCatalogSelector
                selectedId={catalogId}
                onSelect={setCatalogId}
                listMaxHeightClass="max-h-48"
              />
              {selectorHint && <p className="mt-2 text-xs text-slate-500">{selectorHint}</p>}
            </div>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">2. Nombre / Alias («De qué es»)</span>
              <input
                type="text"
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                placeholder='Ej. Per Suite, Cuadro Principal, Luces Comedor'
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">3. Estancia / Zona / Cuadro</span>
              <input
                type="text"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Ej. Planta baja · Cuadro cocina, Salón"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">4. {selected?.idLabel ?? "Identificador"}</span>
              <input
                type="text"
                value={serial}
                onChange={(e) => setSerial(formatMacAddress(e.target.value))}
                placeholder="Ej. 50:4F:94:FF:FE:BD"
                spellCheck={false}
                autoComplete="off"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 font-mono text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
          </div>

          <div className="flex min-h-[12rem] flex-col gap-2">
            <span className="text-sm text-slate-400">Vista previa del bornero</span>
            <HardwareCatalogPreviewPane catalogId={catalogId} className="min-h-[12rem]" />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-800 px-5 py-4">
          <button
            type="submit"
            disabled={!catalogId}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Crear Dispositivo
          </button>
          <p className="mt-2 text-center text-xs text-slate-500">
            Luego completas I1, I2… con ENTER, como en la libreta.
          </p>
        </div>
      </form>
    </div>
  );
}
