import type { ReactNode } from "react";
import type { DeviceModule, TerminalRow } from "../../types/project";

export interface LoxoneDiagramProps {
  module: DeviceModule;
  highlightedTerminalId?: string | null;
  onSelectTerminal?: (terminalId: string) => void;
  readOnly?: boolean;
  compact?: boolean;
  fillHeight?: boolean;
}

export function terminalFor(module: DeviceModule, key: string): TerminalRow | undefined {
  const k = key.trim().toUpperCase();
  return module.terminals.find((t) => t.borne.trim().toUpperCase() === k);
}

/** Ancho total de la regleta IoBank (marco incluido). */
export function ioBankPixelWidth(labelCount: number, pinW: number, gap: number): number {
  if (labelCount <= 0) return 0;
  return labelCount * (pinW + gap) - gap + 8;
}

/** Posición X del IoBank para centrar una fila de bornes en `centerX`. */
export function ioBankOriginX(
  centerX: number,
  labelCount: number,
  pinW: number,
  gap: number
): number {
  const bankW = ioBankPixelWidth(labelCount, pinW, gap);
  return centerX + 4 - bankW / 2;
}

const IO_BANK_ROW_H = 44;

export function ioBankRowHeight() {
  return IO_BANK_ROW_H;
}

export function DiagramCanvas({
  viewBox,
  ariaLabel,
  compact,
  fillHeight,
  hint,
  readOnly,
  children,
}: {
  viewBox: string;
  ariaLabel: string;
  compact?: boolean;
  fillHeight?: boolean;
  hint?: string;
  readOnly?: boolean;
  children: ReactNode;
}) {
  const sizeClass = fillHeight
    ? "h-full max-h-full min-h-0"
    : compact
      ? "max-h-[118px]"
      : "max-h-[min(420px,50vh)]";

  return (
    <div className={`flex w-full min-w-0 flex-col ${fillHeight ? "h-full" : sizeClass}`}>
      <svg
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        className={`mx-auto w-full select-none ${
          fillHeight
            ? "h-full max-h-full min-h-0 max-w-full"
            : compact
              ? "max-h-[118px] min-w-0 max-w-full"
              : "min-w-[640px]"
        }`}
        role="img"
        aria-label={ariaLabel}
      >
        {children}
      </svg>
      {hint && !readOnly && !compact ? (
        <p className="mt-1 text-center text-[10px] text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function Chassis({ w, h, x = 24, y = 16 }: { w: number; h: number; x?: number; y?: number }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx={6} className="fill-slate-100 stroke-slate-400" strokeWidth={1.5} />
      <rect x={x} y={y} width={w} height={h} rx={6} className="fill-none stroke-slate-300/80" strokeWidth={0.5} />
    </>
  );
}

export function SectionLabel({ x, y, children }: { x: number; y: number; children: string }) {
  return (
    <text x={x} y={y} className="fill-slate-500 text-[8px] font-semibold tracking-wide">
      {children}
    </text>
  );
}

export function DeviceTitle({
  x,
  y,
  title,
  subtitle,
}: {
  x: number;
  y: number;
  title: string;
  subtitle?: string;
}) {
  return (
    <>
      <text x={x} y={y} textAnchor="middle" className="fill-slate-700 text-[14px] font-bold">
        {title}
      </text>
      {subtitle ? (
        <text x={x} y={y + 14} textAnchor="middle" className="fill-slate-500 text-[9px]">
          {subtitle}
        </text>
      ) : null}
    </>
  );
}

export function PortBlock({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={2} className="fill-slate-300 stroke-slate-500" strokeWidth={1} />
      <text x={x + w / 2} y={y + h - 6} textAnchor="middle" className="fill-slate-600 text-[7px] font-medium">
        {label}
      </text>
    </g>
  );
}

export function BusPair({
  x,
  y,
  labels,
  colors,
  title,
  pinH = 36,
}: {
  x: number;
  y: number;
  labels: [string, string];
  colors: [string, string];
  title: string;
  pinH?: number;
}) {
  return (
    <g aria-label={title}>
      {[0, 1].map((i) => (
        <g key={labels[i]}>
          <rect
            x={x + i * 28}
            y={y}
            width={22}
            height={pinH}
            rx={2}
            fill={colors[i]}
            stroke="#64748b"
            strokeWidth={1}
          />
          <text
            x={x + i * 28 + 11}
            y={y + pinH + 12}
            textAnchor="middle"
            className="fill-slate-600 text-[7px] font-bold"
          >
            {labels[i]}
          </text>
        </g>
      ))}
    </g>
  );
}

export function PowerLinkBlock({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <SectionLabel x={x} y={y - 8}>
        POWER &amp; LINK
      </SectionLabel>
      <BusPair x={x} y={y} labels={["+24V", "GND"]} colors={["#f97316", "#1e293b"]} title="Power" pinH={32} />
      <BusPair x={x + 62} y={y} labels={["BU", "WH"]} colors={["#3b82f6", "#f8fafc"]} title="Loxone Link" pinH={32} />
    </g>
  );
}

export function IoBank({
  x,
  y,
  labels,
  module,
  accent,
  highlightedTerminalId,
  onSelectTerminal,
  readOnly,
  pinW = 30,
  gap = 3,
  vertical = false,
  bankFrame = true,
  labelAnnotation,
}: {
  x: number;
  y: number;
  labels: string[];
  module: DeviceModule;
  accent: string;
  highlightedTerminalId: string | null;
  onSelectTerminal?: (id: string) => void;
  readOnly: boolean;
  pinW?: number;
  gap?: number;
  vertical?: boolean;
  /** Fondo de regleta (desactivar p. ej. salidas relé sin marco rojo). */
  bankFrame?: boolean;
  /** Texto debajo del borne, p. ej. color del canal RGBW. */
  labelAnnotation?: (borne: string) => string | undefined;
}) {
  const count = labels.length;
  const bankW = vertical ? pinW + 8 : count * (pinW + gap) - gap + 8;
  const bankH = vertical ? count * (pinW + gap) - gap + 12 : 44;

  return (
    <g>
      {bankFrame ? (
        <rect
          x={x - 4}
          y={y - 2}
          width={bankW}
          height={bankH}
          rx={3}
          fill={`${accent}18`}
          stroke={accent}
          strokeWidth={1}
        />
      ) : null}
      {labels.map((label, i) => {
        const term = terminalFor(module, label);
        const assigned = Boolean(term?.connectedElement.trim());
        const highlighted = term?.id === highlightedTerminalId;
        const px = vertical ? x : x + i * (pinW + gap);
        const py = vertical ? y + 4 + i * (pinW + gap) : y + 4;
        const interactive = !readOnly && term && onSelectTerminal;
        const annot = labelAnnotation?.(label);
        const pinH = vertical ? pinW - 4 : annot ? 32 : 28;
        const labelY = vertical ? py + pinW / 2 + 3 : annot ? py + 13 : py + 18;

        const body = (
          <>
            <rect
              x={px}
              y={py}
              width={pinW}
              height={pinH}
              rx={2}
              fill={assigned ? "#ecfdf5" : "#ffffff"}
              stroke={highlighted ? "#34d399" : assigned ? "#10b981" : "#94a3b8"}
              strokeWidth={highlighted ? 2.5 : 1.5}
            />
            <text
              x={px + pinW / 2}
              y={labelY}
              textAnchor="middle"
              className="fill-slate-800 text-[8px] font-bold font-mono"
            >
              {label}
            </text>
            {annot && !vertical ? (
              <text
                x={px + pinW / 2}
                y={py + 26}
                textAnchor="middle"
                className="fill-slate-600 text-[6px] font-semibold"
              >
                ({annot})
              </text>
            ) : null}
            {assigned && term ? (
              <title>{`${label}${annot ? ` (${annot})` : ""}: ${term.connectedElement}`}</title>
            ) : null}
          </>
        );

        if (interactive && term) {
          return (
            <g
              key={label}
              className="cursor-pointer"
              role="button"
              tabIndex={0}
              onClick={() => onSelectTerminal!(term.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectTerminal!(term.id);
                }
              }}
            >
              {body}
            </g>
          );
        }
        return <g key={label}>{body}</g>;
      })}
    </g>
  );
}

export function RelayRowDecor({ x, y, count }: { x: number; y: number; count: number }) {
  return (
    <g className="stroke-slate-500" strokeWidth={1} fill="none">
      {Array.from({ length: count }, (_, i) => (
        <g key={i} transform={`translate(${x + i * 34}, ${y})`}>
          <line x1={0} y1={10} x2={0} y2={0} />
          <line x1={0} y1={10} x2={12} y2={0} />
          <circle cx={12} cy={0} r={1.5} className="fill-slate-500" />
        </g>
      ))}
    </g>
  );
}

/** Carril DIN + Power/Link + título (extensiones Tree/Link). */
export function ExtensionDinShell({
  module,
  readOnly = false,
  compact,
  fillHeight,
  ariaLabel,
  title,
  titleY = 108,
  hint,
  chassisH = 248,
  children,
}: Pick<LoxoneDiagramProps, "module" | "readOnly" | "compact" | "fillHeight"> & {
  ariaLabel: string;
  title: string;
  titleY?: number;
  hint?: string;
  chassisH?: number;
  children: ReactNode;
}) {
  return (
    <DiagramCanvas
      viewBox="0 0 920 300"
      ariaLabel={ariaLabel}
      compact={compact}
      fillHeight={fillHeight}
      readOnly={readOnly}
      hint={hint}
    >
      <Chassis w={872} h={chassisH} />
      <PowerLinkBlock x={48} y={36} />
      <DeviceTitle x={460} y={titleY} title={title} subtitle={module.alias} />
      {children}
    </DiagramCanvas>
  );
}
