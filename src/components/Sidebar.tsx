import { MoreVertical, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { DeviceModule } from "../types/project";
import { iconForCategory, terminalCountLabel } from "../utils/deviceIcons";

interface Props {
  modules: DeviceModule[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Edita nombre, cliente/ubicación e IP del proyecto. */
  onEditProjectClick: () => void;
  onAddDeviceClick: () => void;
  onRemove: (id: string) => void;
  /** Solo móvil/tablet: el panel se abre y se cierra como un cajón lateral. */
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  modules,
  selectedId,
  onSelect,
  onEditProjectClick,
  onAddDeviceClick,
  onRemove,
  open = false,
  onClose,
}: Props) {
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Cierra el menú contextual si el usuario hace clic en cualquier otra parte de la pantalla.
  useEffect(() => {
    if (!menuOpenId) return;
    const closeMenu = () => setMenuOpenId(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, [menuOpenId]);

  return (
    <>
      {open ? (
        <div
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      ) : null}
    <aside
      aria-label="Módulos del cuadro"
      className={`scrollbar-dark flex shrink-0 flex-col gap-2.5 overflow-y-auto border-r border-slate-800/80 px-3 py-3
        fixed inset-y-0 left-0 z-40 w-72 max-w-[85vw] bg-slate-950 pt-[calc(0.75rem+env(safe-area-inset-top))] transition-transform duration-200
        md:static md:z-auto md:w-64 md:max-w-none md:translate-x-0 md:overflow-y-scroll md:bg-slate-950/40 md:pt-3
        ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center justify-between md:hidden">
        <span className="text-sm font-semibold text-white">Módulos</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel de módulos"
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <button
        type="button"
        onClick={() => {
          onClose?.();
          onEditProjectClick();
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-center text-xs font-medium leading-snug text-slate-400 transition hover:bg-slate-800/60 hover:text-slate-200"
      >
        <Plus className="h-3.5 w-3.5" />
        Añadir Datos Generales Del Proyecto
      </button>
      <button
        type="button"
        onClick={() => {
          onClose?.();
          onAddDeviceClick();
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600/90 px-2 py-1.5 text-xs font-medium text-white transition hover:bg-emerald-500"
      >
        <Plus className="h-3.5 w-3.5" />
        Añadir Dispositivo
      </button>

      <div className="flex items-center justify-between px-0.5 pt-1">
        <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
          Módulos en cuadro ({modules.length})
        </span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {modules.map((mod) => {
          const active = mod.id === selectedId;
          const Icon = iconForCategory(mod.category);
          const badge = terminalCountLabel(mod);
          const menuOpen = menuOpenId === mod.id;

          return (
            <div key={mod.id} className="relative">
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(mod.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(mod.id);
                  }
                }}
                className={`flex cursor-pointer items-center justify-between rounded-md px-2 py-2 text-left text-sm transition ${
                  active
                    ? "bg-emerald-500/10 font-medium text-white"
                    : "text-slate-300 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-emerald-400" : "text-slate-400"}`} />
                  <div className="min-w-0">
                    <div className="truncate">{mod.alias}</div>
                    <div className="truncate text-xs text-slate-500">
                      {mod.zone?.trim() ? mod.zone : mod.typeName}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      active ? "text-emerald-300" : "text-slate-500"
                    }`}
                  >
                    {badge}
                  </span>
                  <button
                    type="button"
                    aria-label="Más opciones del módulo"
                    title="Más opciones"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpenId(mod.id === menuOpenId ? null : mod.id);
                    }}
                    className="rounded p-1.5 text-slate-500 transition hover:bg-slate-700 hover:text-slate-200 md:p-1"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-2 top-full z-50 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl"
                >
                  <button
                    type="button"
                    onClick={() => {
                      onRemove(mod.id);
                      setMenuOpenId(null);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 transition hover:bg-slate-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar módulo
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
    </>
  );
}
