import { getCatalogEntry } from "../data/deviceCatalog";
import { hasPinoutDiagram, isAirOrAcOnlyDevice } from "../data/pinoutDiagrams";
import type { DeviceModule } from "../types/project";
import { iconForCategory } from "../utils/deviceIcons";
import { AirOnlyDeviceDiagram } from "./diagrams/AirOnlyDeviceDiagram";
import { LoxoneDeviceDiagram } from "./diagrams/LoxoneDeviceDiagram";
import { LoxoneDiagramShell } from "./diagrams/LoxoneDiagramShell";
import { TerminalBoardViewer } from "./TerminalBoardViewer";

export interface ModulePinoutViewProps {
  module: DeviceModule;
  highlightedTerminalId?: string | null;
  onSelectTerminal?: (terminalId: string) => void;
  compact?: boolean;
  showLegend?: boolean;
  readOnly?: boolean;
  subtitle?: string;
  className?: string;
}

export function ModulePinoutView({
  module,
  highlightedTerminalId = null,
  onSelectTerminal,
  compact = false,
  showLegend = true,
  readOnly = false,
  subtitle,
  className = "",
}: ModulePinoutViewProps) {
  const entry = getCatalogEntry(module.catalogId);
  const Icon = iconForCategory(module.category);
  const detail =
    subtitle ??
    (entry?.description ? `${module.typeName} · ${entry.description}` : module.typeName);

  const diagramBody = hasPinoutDiagram(module.catalogId) ? (
    <LoxoneDeviceDiagram
      catalogId={module.catalogId}
      module={module}
      highlightedTerminalId={highlightedTerminalId}
      onSelectTerminal={onSelectTerminal}
      readOnly={readOnly}
      compact={compact}
      fillHeight={compact}
    />
  ) : isAirOrAcOnlyDevice(module.catalogId) ? (
    <AirOnlyDeviceDiagram module={module} compact={compact} fillHeight={compact} />
  ) : null;

  if (diagramBody) {
    return (
      <div className={`flex min-h-0 w-full flex-col ${className}`}>
        <LoxoneDiagramShell title={module.alias || module.typeName} subtitle={detail} icon={Icon} compact={compact}>
          {diagramBody}
        </LoxoneDiagramShell>
      </div>
    );
  }

  return (
    <TerminalBoardViewer
      module={module}
      subtitle={detail}
      icon={Icon}
      highlightedTerminalId={highlightedTerminalId}
      onSelectTerminal={onSelectTerminal}
      compact={compact}
      showLegend={showLegend}
      readOnly={readOnly}
    />
  );
}
