import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  compact?: boolean;
  children: ReactNode;
}

/** Marco común para planos SVG (estilo ficha Loxone). */
export function LoxoneDiagramShell({ title, subtitle, icon: Icon, compact, children }: Props) {
  return (
    <div
      className={`flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-800/70 bg-slate-900/40 ${
        compact ? "h-full shrink-0" : "h-full"
      }`}
    >
      <div
        className={`w-full shrink-0 bg-slate-700/60 ${compact ? "h-1" : "h-1.5"}`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(2,6,23,0.7) 0px, rgba(2,6,23,0.7) 2px, transparent 2px, transparent 14px)",
        }}
        aria-hidden="true"
      />
      <div
        className={`shrink-0 border-b border-slate-800/60 ${
          compact ? "px-2 py-1" : "px-4 py-2"
        }`}
      >
        <div className="flex items-center gap-1.5">
          {Icon ? (
            <Icon className={`shrink-0 text-emerald-400/80 ${compact ? "h-3 w-3" : "h-4 w-4"}`} />
          ) : null}
          <div className="min-w-0">
            <p className={`truncate font-semibold text-white ${compact ? "text-[11px]" : "text-sm"}`}>
              {title}
            </p>
            {!compact && subtitle ? (
              <p className="truncate text-[11px] text-slate-500">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className={`min-h-0 bg-slate-950/30 ${compact ? "flex h-full flex-1 flex-col px-1 py-1" : "flex-1 px-2 py-3"}`}>
        {children}
      </div>
    </div>
  );
}
