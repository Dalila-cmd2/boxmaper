import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredIoPinoutDiagram } from "./CenteredIoPinoutDiagram";

export function MiniserverGenDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Miniserver"
      ariaLabel="Plano Miniserver Gen"
      hint="Pulsa I1–I8 o Q1–Q8."
      inputPattern={/^I\d+$/i}
      outputPattern={/^Q\d+$/i}
    />
  );
}
