import type { ProjectState } from "../types/project";
import { exportProjectCsv } from "./csvExport";
import { exportProjectExcel } from "./excelExport";
import { subProjectToExportState } from "./projectModel";
import { exportTechnicalPdf } from "./pdfGenerator";

/**
 * Junta todas las plantas/pisos del edificio en un único proyecto para exportar
 * un solo archivo. Cada dispositivo lleva delante el nombre de su planta.
 */
function mergeBuilding(building: ProjectState): ProjectState {
  const subs = building.subProjects ?? [];
  const modules = subs.flatMap((sub) =>
    subProjectToExportState(building, sub).modules.map((mod) => ({
      ...mod,
      id: `${sub.id}:${mod.id}`,
      alias: `${sub.name} · ${mod.alias || mod.typeName}`,
    })),
  );
  return {
    ...building,
    projectKind: "standalone",
    modules,
    selectedModuleId: modules[0]?.id ?? null,
    highlightedTerminalId: null,
    subProjects: undefined,
    activeSubProjectId: null,
  };
}

export async function exportEntireBuilding(
  building: ProjectState,
  format: "csv" | "excel" | "pdf"
): Promise<"ok" | "empty"> {
  const merged = mergeBuilding(building);
  if (merged.modules.length === 0) return "empty";

  if (format === "csv") {
    await exportProjectCsv(merged);
  } else if (format === "excel") {
    await exportProjectExcel(merged);
  } else {
    await exportTechnicalPdf(merged);
  }
  return "ok";
}
