import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredIoPinoutDiagram } from "./CenteredIoPinoutDiagram";

export function MultiExtensionAirDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Multi Extension Air"
      ariaLabel="Plano Multi Extension Air"
      hint="Pulsa I1–I12 o Q1–Q8."
      inputPattern={/^I\d+$/i}
      outputPattern={/^Q\d+$/i}
      outputAccent="#ef4444"
    />
  );
}
