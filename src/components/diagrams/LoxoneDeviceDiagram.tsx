import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { DimmerExtensionDiagram } from "./DimmerExtensionDiagram";
import { MiniserverCompactDiagram } from "./MiniserverCompactDiagram";
import { MiniserverGenDiagram } from "./MiniserverGenDiagram";
import {
  Nano2RelayTreeDiagram,
  NanoDiTreeDiagram,
  NanoDimmerAirDiagram,
  NanoIoAirDiagram,
} from "./NanoDiagrams";
import { MultiExtensionAirDiagram } from "./MultiExtensionAirDiagram";
import { RelayExtensionDiagram } from "./RelayExtensionDiagram";
import { Rgbw24VDimmerTreeDiagram } from "./Rgbw24VDimmerTreeDiagram";
import type { PinoutDiagramCatalogId } from "../../data/pinoutDiagrams";

export function LoxoneDeviceDiagram({
  catalogId,
  ...props
}: LoxoneDiagramProps & { catalogId: PinoutDiagramCatalogId }) {
  switch (catalogId) {
    case "ms-compact":
      return <MiniserverCompactDiagram {...props} />;
    case "ms-gen":
      return <MiniserverGenDiagram {...props} />;
    case "ext-relay":
      return <RelayExtensionDiagram {...props} />;
    case "ext-dimmer":
      return <DimmerExtensionDiagram {...props} />;
    case "tree-rgbw-dimmer-24v":
    case "tree-rgbw-compact-dimmer-24v":
      return <Rgbw24VDimmerTreeDiagram {...props} />;
    case "ext-multi-air":
      return <MultiExtensionAirDiagram {...props} />;
    case "nano-io-air":
      return <NanoIoAirDiagram {...props} />;
    case "nano-di-tree":
      return <NanoDiTreeDiagram {...props} />;
    case "nano-dimmer-air":
      return <NanoDimmerAirDiagram {...props} />;
    case "nano-2relay-tree":
      return <Nano2RelayTreeDiagram {...props} />;
    default:
      return null;
  }
}
