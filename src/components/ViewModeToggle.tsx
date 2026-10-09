import { CircuitBoard, Columns2, Table2 } from "lucide-react";

export type WorkspaceViewMode = "table" | "split" | "pinout";

interface Props {
  value: WorkspaceViewMode;
  onChange: (mode: WorkspaceViewMode) => void;
  /** En pantallas pequeñas la vista dividida no cabe: se oculta. */
  hideSplit?: boolean;
}

const OPTIONS: { id: WorkspaceViewMode; label: string; icon: typeof Table2 }[] = [
  { id: "table", label: "Tabla", icon: Table2 },
  { id: "split", label: "Split", icon: Columns2 },
  { id: "pinout", label: "Pinout", icon: CircuitBoard },
];

export function ViewModeToggle({ value, onChange, hideSplit = false }: Props) {
  const options = hideSplit ? OPTIONS.filter((o) => o.id !== "split") : OPTIONS;
  return (
    <div
      role="tablist"
      aria-label="Modo de visualización del módulo"
      className="flex shrink-0 items-center gap-0.5 rounded-md bg-slate-900/70 p-0.5"
    >
      {options.map(({ id, label, icon: Icon }) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`flex items-center gap-1 rounded-md px-3 py-2 text-xs font-medium transition md:px-2.5 md:py-1 ${
              active
                ? "bg-emerald-600/90 text-white"
                : "text-slate-500 hover:bg-slate-800/80 hover:text-slate-200"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
