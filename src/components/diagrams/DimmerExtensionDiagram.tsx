import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredIoPinoutDiagram } from "./CenteredIoPinoutDiagram";

export function DimmerExtensionDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Dimmer Extension 220V"
      ariaLabel="Plano Dimmer Extension"
      hint="Pulsa I1–I8 o CH1–CH4."
      inputPattern={/^I\d+$/i}
      outputPattern={/^CH\s*\d+$/i}
      outputAccent="#eab308"
    />
  );
}
