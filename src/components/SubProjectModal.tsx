import { X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

interface Props {
  open: boolean;
  mode?: "create" | "edit";
  initial?: { name: string; miniserverIp: string };
  onClose: () => void;
  onSubmit: (name: string, miniserverIp: string) => void;
}

const inputClass =
  "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function SubProjectModal({
  open,
  mode = "create",
  initial,
  onClose,
  onSubmit,
}: Props) {
  const [name, setName] = useState("");
  const [miniserverIp, setMiniserverIp] = useState("");
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) {
      setName("");
      setMiniserverIp("");
      return;
    }
    if (isEdit && initial) {
      setName(initial.name);
      setMiniserverIp(initial.miniserverIp ?? "");
    }
  }, [open, isEdit, initial?.name, initial?.miniserverIp]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(name.trim() || initial?.name || "Subproyecto", miniserverIp.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="subproject-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="subproject-title" className="text-base font-semibold text-white">
            {isEdit ? "Editar planta / piso" : "Nuevo subproyecto"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4 px-5 py-4">
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Nombre (planta, local, piso…)</span>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Planta 2 · Piso 2-1"
              className={inputClass}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Mini Server IP</span>
            <input
              type="text"
              value={miniserverIp}
              onChange={(e) => setMiniserverIp(e.target.value.replace(/[^0-9.]/g, ""))}
              placeholder="Ej. 192.168.1.23"
              className={`font-mono text-sm text-emerald-400 ${inputClass}`}
            />
          </label>
        </div>
        <div className="border-t border-slate-800 px-5 py-4">
          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {isEdit ? "Guardar cambios" : "Crear y abrir"}
          </button>
        </div>
      </form>
    </div>
  );
}
