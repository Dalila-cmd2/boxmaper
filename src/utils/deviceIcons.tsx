import {
  Cpu,
  Layers,
  Radio,
  Server,
  Sun,
  Thermometer,
  ToggleRight,
  Volume2,
  type LucideIcon,
} from "lucide-react";
import type { DeviceCategory } from "../types/project";

export function iconForCategory(category: DeviceCategory): LucideIcon {
  switch (category) {
    case "miniserver":
      return Server;
    case "extension":
      return Layers;
    case "relay":
      return ToggleRight;
    case "dimmer":
      return Sun;
    case "nano":
      return Radio;
    case "audio":
      return Volume2;
    case "ac":
      return Thermometer;
    default:
      return Cpu;
  }
}

export function terminalCountLabel(module: {
  terminals: { borne: string }[];
  category: DeviceCategory;
}): string {
  const n = module.terminals.length;
  if (n === 0) return "Air";
  const hasQ = module.terminals.some((t) => /^Q\d+/i.test(t.borne));
  const hasI = module.terminals.some((t) => /^I\d+/i.test(t.borne));
  const hasCh = module.terminals.some((t) => /^CH\d+/i.test(t.borne));
  if ((hasQ && hasI) || (hasI && hasCh)) return `${n} IO`;
  if (hasQ) return `${module.terminals.filter((t) => /^Q\d+/i.test(t.borne)).length} Out`;
  if (hasI) return `${module.terminals.filter((t) => /^I\d+/i.test(t.borne)).length} In`;
  if (hasCh || module.category === "dimmer") return `${n} Ch`;
  return `${n}`;
}
