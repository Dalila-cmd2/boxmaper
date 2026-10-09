import type { DeviceModule } from "../../types/project";
import { getCatalogEntry } from "../../data/deviceCatalog";
import { Chassis, DeviceTitle, DiagramCanvas } from "./loxoneDiagramShared";

interface Props {
  module: DeviceModule;
  compact?: boolean;
  fillHeight?: boolean;
}

function airOnlyVariant(catalogId: string) {
  if (catalogId === "ms-go") {
    return {
      badge: "Loxone Air",
      chip: "Miniserver Go · radio Air",
      chipClass: "fill-orange-400/30 stroke-orange-500",
      textClass: "fill-orange-900",
    };
  }
  if (catalogId.startsWith("ac-")) {
    return {
      badge: "Bus A/C",
      chip: "Pasarela climatización",
      chipClass: "fill-sky-400/30 stroke-sky-500",
      textClass: "fill-sky-900",
    };
  }
  return {
    badge: "Air / Bus A/C",
    chip: "Conexión inalámbrica",
    chipClass: "fill-orange-400/30 stroke-orange-500",
    textClass: "fill-orange-900",
  };
}

/** Miniserver Go y pasarelas `ac-*`: vista informativa centrada en el carcasa. */
export function AirOnlyDeviceDiagram({ module, compact, fillHeight }: Props) {
  const entry = getCatalogEntry(module.catalogId);
  const note = entry?.connectionNote ?? "Conexión por radio Air o bus A/C.";
  const variant = airOnlyVariant(module.catalogId);
  const chassisY = 16;
  const pad = 14;
  const titleY = chassisY + pad + 12;
  const noteY = titleY + 22;
  const boxY = noteY + 10;
  const chassisH = boxY + 36 + pad - chassisY;
  const viewH = chassisY + chassisH + chassisY;

  return (
    <DiagramCanvas
      viewBox={`0 0 520 ${viewH}`}
      ariaLabel={module.typeName}
      compact={compact}
      fillHeight={fillHeight}
      readOnly
    >
      <Chassis w={472} h={chassisH} x={24} y={chassisY} />
      <DeviceTitle x={260} y={titleY} title={module.typeName} subtitle={module.alias} />
      <text x={260} y={noteY} textAnchor="middle" className="fill-slate-600 text-[9px]">
        {note}
      </text>
      <rect x={200} y={boxY} width={120} height={28} rx={4} className={variant.chipClass} />
      <text x={260} y={boxY + 18} textAnchor="middle" className={`${variant.textClass} text-[9px] font-semibold`}>
        {variant.badge}
      </text>
    </DiagramCanvas>
  );
}
