import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import { CenteredIoPinoutDiagram } from "./CenteredIoPinoutDiagram";

const RGBW_CHANNEL_COLOR: Record<string, string> = {
  CH1: "Rojo",
  CH2: "Verde",
  CH3: "Azul",
  CH4: "Blanco",
};

function rgbwChannelColor(borne: string): string | undefined {
  const key = borne.trim().toUpperCase().replace(/\s+/g, "");
  return RGBW_CHANNEL_COLOR[key];
}

export function Rgbw24VDimmerTreeDiagram(props: LoxoneDiagramProps) {
  const shortTitle =
    props.module.catalogId === "tree-rgbw-compact-dimmer-24v"
      ? "RGBW 24V Compact Dimmer"
      : "RGBW 24V Dimmer Tree";

  return (
    <CenteredIoPinoutDiagram
      {...props}
      title={shortTitle}
      ariaLabel="Plano RGBW 24V Dimmer Tree"
      hint="Pulsa CH1–CH4: Rojo, Verde, Azul, Blanco."
      inputPattern={/^$/}
      outputPattern={/^CH\s*\d+$/i}
      outputAccent="#a855f7"
      outputLabelAnnotation={rgbwChannelColor}
    />
  );
}
