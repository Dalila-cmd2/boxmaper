import { useMemo } from "react";
import {
  createPreviewModuleFromCatalog,
  getCatalogPreviewSubtitle,
} from "../data/deviceCatalog";
import { ModulePinoutView } from "./ModulePinoutView";

interface Props {
  catalogId: string;
  /** Sustituye el subtítulo calculado del catálogo. */
  subtitleOverride?: string;
  compact?: boolean;
  showLegend?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function HardwareCatalogPreviewPane({
  catalogId,
  subtitleOverride,
  compact = true,
  showLegend = false,
  emptyMessage = "Elige un equipo del catálogo.",
  className = "",
}: Props) {
  const previewModule = useMemo(
    () => (catalogId ? createPreviewModuleFromCatalog(catalogId) : null),
    [catalogId]
  );
  const subtitle = subtitleOverride ?? (catalogId ? getCatalogPreviewSubtitle(catalogId) : undefined);

  if (!previewModule || !catalogId) {
    return (
      <div
        className={`flex flex-1 items-center justify-center rounded-lg border border-dashed border-slate-700 p-6 text-center text-xs text-slate-500 ${className}`}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`min-h-0 flex-1 ${className}`}>
      <ModulePinoutView
        module={previewModule}
        subtitle={subtitle}
        compact={compact}
        readOnly
        showLegend={showLegend}
      />
    </div>
  );
}
