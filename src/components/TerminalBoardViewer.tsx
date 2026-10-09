import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { DeviceModule } from "../types/project";
import { buildPinoutLayout, type PinoutPin } from "../utils/pinoutLayout";

export interface TerminalBoardViewerProps {
  module: DeviceModule;
  subtitle?: string;
  icon?: LucideIcon;
  highlightedTerminalId?: string | null;
  onSelectTerminal?: (terminalId: string) => void;
  compact?: boolean;
  showLegend?: boolean;
  /** Vista previa del catálogo: bornes no clicables. */
  readOnly?: boolean;
}

type PinFilter = "all" | "asignado" | "libre" | "alimentacion";

function matchesFilter(pin: PinoutPin, filter: PinFilter): boolean {
  if (filter === "all") return true;
  const assigned = pin.terminal.connectedElement.trim().length > 0;
  if (filter === "asignado") return assigned;
  if (filter === "libre") return !assigned;
  return pin.kind === "power" || pin.kind === "bus";
}

export function TerminalBoardViewer({
  module,
  subtitle,
  icon: Icon,
  highlightedTerminalId = null,
  onSelectTerminal,
  compact = false,
  showLegend = true,
  readOnly = false,
}: TerminalBoardViewerProps) {
  const [activeFilter, setActiveFilter] = useState<PinFilter>("all");
  const layout = buildPinoutLayout(module);

  const toggleFilter = (value: PinFilter) => {
    setActiveFilter((current) => (current === value ? "all" : value));
  };

  const filteredTop = layout.top.filter((p) => matchesFilter(p, activeFilter));
  const filteredBottom = layout.bottom.filter((p) => matchesFilter(p, activeFilter));
  const detailLine = subtitle ?? module.typeName;

  return (
    <div
      className={`flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-800/70 bg-slate-900/40 ${
        compact ? "shrink-0" : "h-full"
      }`}
    >
      <div
        className="h-1.5 w-full shrink-0 bg-slate-700/60"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(2,6,23,0.7) 0px, rgba(2,6,23,0.7) 2px, transparent 2px, transparent 14px)",
        }}
        aria-hidden="true"
      />

      <div className={`min-h-0 overflow-x-auto ${compact ? "px-3 py-2" : "flex flex-1 items-center px-6 py-6"}`}>
        <div
          className={`mx-auto flex w-full flex-col ${
            compact ? "max-w-4xl gap-0.5" : "max-w-3xl gap-1.5"
          }`}
        >
          <PinRow
            pins={filteredTop}
            position="top"
            compact={compact}
            highlightedTerminalId={highlightedTerminalId}
            onSelectTerminal={onSelectTerminal}
            readOnly={readOnly}
            showDetail={!compact && !readOnly}
          />

          <div
            className={`flex w-full items-center justify-center gap-2 rounded-md border border-slate-800/60 bg-slate-950/50 ${
              compact ? "px-3 py-1.5" : "px-5 py-3"
            }`}
          >
            {Icon ? (
              <div className="shrink-0 text-emerald-400/80">
                <Icon className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />
              </div>
            ) : null}
            <div className="min-w-0 text-center">
              <p className={`truncate font-semibold text-white ${compact ? "text-xs" : "text-sm"}`}>
                {module.alias}
              </p>
              <p className="truncate text-[11px] text-slate-500">{detailLine}</p>
            </div>
          </div>

          <PinRow
            pins={filteredBottom}
            position="bottom"
            compact={compact}
            highlightedTerminalId={highlightedTerminalId}
            onSelectTerminal={onSelectTerminal}
            readOnly={readOnly}
            showDetail={!compact && !readOnly}
          />

          {module.terminals.length === 0 && (
            <p className="py-4 text-center text-xs text-slate-500">
              Este equipo no expone bornes E/S físicos en el cuadro.
            </p>
          )}
        </div>
      </div>

      {showLegend && !readOnly ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-3 border-t border-slate-800/70 px-3 py-1 text-[11px] text-slate-500">
          <LegendFilterButton
            label="Borne asignado"
            shape="rounded-md"
            active={activeFilter === "all" || activeFilter === "asignado"}
            onClick={() => toggleFilter("asignado")}
          />
          <LegendFilterButton
            label="Borne libre"
            shape="rounded-md"
            active={activeFilter === "all" || activeFilter === "libre"}
            onClick={() => toggleFilter("libre")}
          />
          <LegendFilterButton
            label="Alimentación / Bus"
            shape="rounded-full"
            active={activeFilter === "all" || activeFilter === "alimentacion"}
            onClick={() => toggleFilter("alimentacion")}
          />
          {activeFilter !== "all" && (
            <button
              type="button"
              onClick={() => setActiveFilter("all")}
              className="ml-auto text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline"
            >
              Quitar filtro
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

interface LegendFilterButtonProps {
  label: string;
  shape: "rounded-md" | "rounded-full";
  active: boolean;
  onClick: () => void;
}

function LegendFilterButton({ label, shape, active, onClick }: LegendFilterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="flex items-center gap-1.5 text-slate-400 transition hover:text-slate-300"
    >
      <span
        className={`h-2.5 w-2.5 border-2 ${shape} ${
          active ? "border-emerald-500 bg-emerald-500/10" : "border-slate-600 bg-slate-800/60"
        }`}
      />
      {label}
    </button>
  );
}

interface RowProps {
  pins: PinoutPin[];
  position: "top" | "bottom";
  compact: boolean;
  highlightedTerminalId: string | null;
  onSelectTerminal?: (terminalId: string) => void;
  readOnly: boolean;
  showDetail: boolean;
}

function PinRow({
  pins,
  position,
  compact,
  highlightedTerminalId,
  onSelectTerminal,
  readOnly,
  showDetail,
}: RowProps) {
  if (pins.length === 0) {
    return <div className={compact ? "h-6" : "h-10"} aria-hidden="true" />;
  }
  return (
    <div className={`flex w-full justify-center ${compact ? "gap-1" : "gap-2"}`}>
      {pins.map((pin) => (
        <Pin
          key={pin.terminal.id}
          pin={pin}
          position={position}
          compact={compact}
          showDetail={showDetail}
          highlighted={pin.terminal.id === highlightedTerminalId}
          readOnly={readOnly}
          onSelect={() => onSelectTerminal?.(pin.terminal.id)}
        />
      ))}
    </div>
  );
}

interface PinProps {
  pin: PinoutPin;
  position: "top" | "bottom";
  compact: boolean;
  showDetail: boolean;
  highlighted: boolean;
  readOnly: boolean;
  onSelect: () => void;
}

function Pin({ pin, position, compact, showDetail, highlighted, readOnly, onSelect }: PinProps) {
  const { terminal, kind } = pin;
  const assigned = terminal.connectedElement.trim().length > 0;
  const shape = kind === "io" ? "rounded-md" : "rounded-full";
  const size = compact ? "h-6 w-6" : "h-8 w-8";
  const slot = compact ? "w-8" : "w-14";

  const borne = (
    <span
      className={`max-w-full truncate select-none font-mono text-[10px] font-semibold tracking-tight ${
        assigned ? "text-emerald-300" : "text-slate-500"
      }`}
    >
      {terminal.borne}
    </span>
  );

  const detail = showDetail ? (
    <span className="max-w-full truncate text-[10px] leading-tight text-slate-500">
      {terminal.connectedElement || "—"}
    </span>
  ) : null;

  const pinBody = (
    <span
      className={`relative flex items-center justify-center border ${size} ${shape} ${
        assigned
          ? "border-emerald-500/80 bg-emerald-500/10"
          : "border-slate-700 bg-slate-800/50"
      } ${highlighted ? "ring-1 ring-emerald-400" : ""} ${readOnly ? "" : "transition hover:border-slate-500 hover:bg-slate-800"}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${assigned ? "bg-emerald-400" : "bg-slate-600"}`} />
    </span>
  );

  return (
    <div className={`group relative flex ${slot} flex-col items-center gap-0.5`}>
      {position === "top" && (
        <>
          {detail}
          {borne}
        </>
      )}

      {readOnly ? (
        pinBody
      ) : (
        <button
          type="button"
          onClick={onSelect}
          aria-label={`Borne ${terminal.borne}${
            terminal.connectedElement ? `, conectado a ${terminal.connectedElement}` : ", sin asignar"
          }`}
          className={`focus:outline-none focus:ring-1 focus:ring-emerald-400 ${readOnly ? "" : ""}`}
        >
          {pinBody}
        </button>
      )}

      {position === "bottom" && (
        <>
          {borne}
          {detail}
        </>
      )}

      {!readOnly && (
        <div
          className={`pointer-events-none absolute left-1/2 z-20 w-max max-w-[200px] -translate-x-1/2 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs opacity-0 shadow-lg transition duration-150 group-hover:opacity-100 ${
            position === "top" ? "top-full mt-1.5" : "bottom-full mb-1.5"
          }`}
        >
          <p className="font-mono font-bold text-emerald-400">{terminal.borne}</p>
          <p className="truncate text-slate-200">{terminal.connectedElement || "Sin asignar"}</p>
        </div>
      )}
    </div>
  );
}
