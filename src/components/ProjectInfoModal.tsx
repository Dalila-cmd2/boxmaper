import { Building2, Home, Layers } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import type { CreateProjectOptions, ProjectInfo, ProjectKind, StandaloneScope } from "../types/project";

interface Props {
  open: boolean;
  mode: "create" | "edit";
  initial?: Partial<ProjectInfo>;
  initialKind?: ProjectKind;
  initialScope?: StandaloneScope;
  onClose: () => void;
  onSubmitCreate?: (options: CreateProjectOptions) => void;
  onSubmitEdit?: (info: ProjectInfo) => void;
}

const inputClass =
  "rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export function ProjectInfoModal({
  open,
  mode,
  initial,
  initialKind = "standalone",
  initialScope = "flat",
  onClose,
  onSubmitCreate,
  onSubmitEdit,
}: Props) {
  const [projectKind, setProjectKind] = useState<ProjectKind>("standalone");
  const [standaloneScope, setStandaloneScope] = useState<StandaloneScope>("flat");
  const [projectName, setProjectName] = useState("");
  const [location, setLocation] = useState("");
  const [miniserverIp, setMiniserverIp] = useState("");
  const [installerCompany, setInstallerCompany] = useState("");
  const [installerTechnician, setInstallerTechnician] = useState("");

  useEffect(() => {
    if (!open) return;
    setProjectKind(initialKind);
    setStandaloneScope(initialScope);
    setProjectName(initial?.projectName ?? "");
    setLocation(initial?.location ?? "");
    setMiniserverIp(initial?.miniserverIp ?? "");
    setInstallerCompany(initial?.installerCompany ?? "");
    setInstallerTechnician(initial?.installerTechnician ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (mode === "create") {
      onSubmitCreate?.({
        projectKind,
        standaloneScope: projectKind === "standalone" ? standaloneScope : undefined,
        projectName: projectName.trim() || (projectKind === "building" ? "Nuevo edificio" : "Nuevo proyecto"),
        location: location.trim(),
        miniserverIp: projectKind === "standalone" ? miniserverIp.trim() : undefined,
        installerCompany: installerCompany.trim(),
        installerTechnician: installerTechnician.trim(),
      });
    } else {
      onSubmitEdit?.({
        projectName: projectName.trim() || "Proyecto",
        location: location.trim(),
        miniserverIp: miniserverIp.trim(),
        installerCompany: installerCompany.trim(),
        installerTechnician: installerTechnician.trim(),
      });
    }
    onClose();
  };

  const title = mode === "create" ? "Nuevo Proyecto" : "Datos Generales Del Proyecto";
  const isBuilding = projectKind === "building";
  const editBuilding = mode === "edit" && initialKind === "building";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <form
        onSubmit={submit}
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-info-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 id="project-info-title" className="text-base font-semibold text-white">
            {title}
          </h2>
        </div>

        <div className="scrollbar-dark flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {mode === "create" && (
            <div className="flex flex-col gap-2">
              <span className="text-sm text-slate-400">Tipo de proyecto</span>
              <div className="grid gap-2 sm:grid-cols-3">
                <KindCard
                  active={projectKind === "standalone" && standaloneScope === "house"}
                  onClick={() => {
                    setProjectKind("standalone");
                    setStandaloneScope("house");
                  }}
                  icon={Home}
                  label="Casa / chalet"
                  hint="Una instalación directa"
                />
                <KindCard
                  active={projectKind === "standalone" && standaloneScope === "flat"}
                  onClick={() => {
                    setProjectKind("standalone");
                    setStandaloneScope("flat");
                  }}
                  icon={Layers}
                  label="Piso / vivienda"
                  hint="Un cuadro habitual"
                />
                <KindCard
                  active={projectKind === "building"}
                  onClick={() => setProjectKind("building")}
                  icon={Building2}
                  label="Edificio"
                  hint="Subproyectos por planta/local"
                />
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">
              {isBuilding || editBuilding ? "Nombre del edificio" : "Nombre del proyecto"}
            </span>
            <input
              autoFocus
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder={isBuilding ? "Ej. Residencial Norte" : "Ej. Vivienda Pérez"}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="text-slate-400">Cliente / Ubicación</span>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej. C/ Mayor 12, Madrid"
              className={inputClass}
            />
          </label>

          {!isBuilding && !editBuilding && (
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="text-slate-400">Mini Server IP</span>
              <input
                type="text"
                value={miniserverIp}
                onChange={(e) => setMiniserverIp(e.target.value.replace(/[^0-9.]/g, ""))}
                placeholder="Ej. 192.168.1.10"
                className={`font-mono text-sm text-emerald-400 ${inputClass}`}
              />
            </label>
          )}

          <div className="rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-3">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ficha PDF (empresa instaladora)
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-slate-400">Nombre (empresa)</span>
                <input
                  type="text"
                  value={installerCompany}
                  onChange={(e) => setInstallerCompany(e.target.value)}
                  placeholder="Ej. Instalaciones López S.L."
                  className={inputClass}
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="text-slate-400">Técnico</span>
                <input
                  type="text"
                  value={installerTechnician}
                  onChange={(e) => setInstallerTechnician(e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className={inputClass}
                />
              </label>
            </div>
          </div>

          {(isBuilding || editBuilding) && mode === "create" && (
            <p className="rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs text-slate-500">
              Cada piso o local tendrá su propio subproyecto con IP de Miniserver. Varios cuadros en
              el mismo sitio se distinguen al añadir cada dispositivo (Estancia/Zona).
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            {mode === "create" ? "Crear" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function KindCard({
  active,
  onClick,
  icon: Icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Home;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition ${
        active
          ? "border-emerald-500/50 bg-emerald-500/10 ring-1 ring-emerald-500/30"
          : "border-slate-800 bg-slate-800/40 hover:border-slate-600"
      }`}
    >
      <Icon className={`h-5 w-5 ${active ? "text-emerald-400" : "text-slate-500"}`} />
      <span className="text-xs font-semibold text-white">{label}</span>
      <span className="text-[10px] leading-snug text-slate-500">{hint}</span>
    </button>
  );
}
