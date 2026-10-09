import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredIoPinoutDiagram } from "./CenteredIoPinoutDiagram";

export function NanoIoAirDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Nano IO Air"
      ariaLabel="Plano Nano IO Air"
      hint="Pulsa I1–I6 o Q1–Q2."
      inputPattern={/^I\d+$/i}
      outputPattern={/^Q\d+$/i}
    />
  );
}

export function NanoDiTreeDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Nano DI Tree"
      ariaLabel="Plano Nano DI Tree"
      hint="Pulsa I1–I6."
      inputPattern={/^I\d+$/i}
      outputPattern={/^$/}
    />
  );
}

export function NanoDimmerAirDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Nano Dimmer Air"
      ariaLabel="Plano Nano Dimmer Air"
      hint="Pulsa CH1–CH2."
      inputPattern={/^$/}
      outputPattern={/^CH\s*\d+$/i}
      outputAccent="#eab308"
    />
  );
}

export function Nano2RelayTreeDiagram(props: LoxoneDiagramProps) {
  return (
    <CenteredIoPinoutDiagram
      {...props}
      title="Nano 2 Relay Tree"
      ariaLabel="Plano Nano 2 Relay Tree"
      hint="Pulsa Q1–Q2."
      inputPattern={/^$/}
      outputPattern={/^Q\d+$/i}
    />
  );
}
