import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredOutputRowsPinoutDiagram } from "./CenteredIoPinoutDiagram";

export function RelayExtensionDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredOutputRowsPinoutDiagram
      {...props}
      title="Relay Extension"
      ariaLabel="Plano Relay Extension"
      hint="Pulsa Q1–Q14."
      rows={[
        ["Q1", "Q2", "Q3", "Q4", "Q5", "Q6", "Q7"],
        ["Q8", "Q9", "Q10", "Q11", "Q12", "Q13", "Q14"],
      ]}
    />
  );
}
