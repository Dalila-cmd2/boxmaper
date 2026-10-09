import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredIoPinoutDiagram } from "./CenteredIoPinoutDiagram";

export function MiniserverCompactDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Miniserver Compact"
      ariaLabel="Plano Miniserver Compact"
      hint="Pulsa I1–I4 o Q1–Q2."
      inputPattern={/^I\d+$/i}
      outputPattern={/^Q\d+$/i}
    />
  );
}
