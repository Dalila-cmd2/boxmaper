import type { DeviceModule } from "../../types/project";
import { orderedModuleTerminals } from "../../utils/terminalNavigation";
import type { LoxoneDiagramProps } from "./loxoneDiagramShared";
import {
  Chassis,
  DeviceTitle,
  DiagramCanvas,
  IoBank,
  ioBankOriginX,
  ioBankPixelWidth,
  ioBankRowHeight,
} from "./loxoneDiagramShared";

const STANDARD = {
  viewW: 520,
  chassisX: 24,
  chassisY: 16,
  chassisW: 472,
  padInner: 14,
  centerX: 260,
  gapSection: 10,
  titleBlock: 28,
} as const;

const WIDE = {
  viewW: 920,
  chassisX: 24,
  chassisY: 16,
  chassisW: 872,
  padInner: 14,
  centerX: 460,
  gapSection: 10,
  titleBlock: 28,
} as const;

function labelsMatching(module: DeviceModule, pattern: RegExp): string[] {
  return orderedModuleTerminals(module)
    .filter((t) => pattern.test(t.borne.trim()))
    .map((t) => t.borne.trim());
}

function fitBankLayout(
  labelCount: number,
  centerX: number,
  maxWidth: number,
  preferredPinW: number,
  preferredGap: number
) {
  if (labelCount <= 0) {
    return { pinW: preferredPinW, gap: preferredGap, x: centerX };
  }
  let pinW = preferredPinW;
  let gap = preferredGap;
  while (ioBankPixelWidth(labelCount, pinW, gap) > maxWidth && pinW > 16) {
    pinW -= 1;
    if (gap > 1) gap -= 1;
  }
  if (ioBankPixelWidth(labelCount, pinW, gap) > maxWidth) {
    gap = 1;
    pinW = Math.max(
      16,
      Math.floor((maxWidth - 8 + gap) / labelCount - gap)
    );
  }
  return {
    pinW,
    gap,
    x: ioBankOriginX(centerX, labelCount, pinW, gap),
  };
}

function layoutInChassis(
  cfg: typeof STANDARD | typeof WIDE,
  hasInputs: boolean,
  hasOutputs: boolean,
  inputCount: number,
  outputCount: number
) {
  const maxBankW = cfg.chassisW - cfg.padInner * 2;
  const bankH = ioBankRowHeight();
  const inLay = fitBankLayout(inputCount, cfg.centerX, maxBankW, 28, 3);
  const outLay = fitBankLayout(outputCount, cfg.centerX, maxBankW, 30, 4);

  let y = cfg.chassisY + cfg.padInner;
  let inputY = y;
  if (hasInputs) {
    inputY = y;
    y += bankH + cfg.gapSection;
  }

  const titleY = hasInputs && hasOutputs ? y + cfg.titleBlock / 2 + 2 : y + cfg.titleBlock / 2;
  if (hasInputs || hasOutputs) {
    y += cfg.titleBlock + cfg.gapSection;
  }

  let outputY = y;
  if (hasOutputs) {
    outputY = y;
    y += bankH + cfg.padInner;
  } else {
    y += cfg.padInner;
  }

  const chassisH = y - cfg.chassisY;
  const viewH = y + cfg.chassisY;

  return { inLay, outLay, inputY, titleY, outputY, chassisH, viewH, bankH };
}

/**
 * Pinout minimalista: entradas arriba, nombre centrado, salidas abajo.
 * Regletas enmarcadas; todo dentro del fondo blanco.
 */
export function CenteredIoPinoutDiagram({
  module,
  highlightedTerminalId = null,
  onSelectTerminal,
  readOnly = false,
  compact,
  fillHeight,
  title,
  ariaLabel,
  hint,
  inputPattern = /^(I|AI|A)\d+$/i,
  outputPattern = /^Q\d+$|^CH\s*\d+$/i,
  inputAccent = "#22c55e",
  outputAccent = "#64748b",
  outputLabelAnnotation,
}: LoxoneDiagramProps & {
  title: string;
  ariaLabel: string;
  hint?: string;
  inputPattern?: RegExp;
  outputPattern?: RegExp;
  inputAccent?: string;
  outputAccent?: string;
  outputLabelAnnotation?: (borne: string) => string | undefined;
}) {
  const inputLabels = labelsMatching(module, inputPattern);
  const outputLabels = labelsMatching(module, outputPattern);
  const hasInputs = inputLabels.length > 0;
  const hasOutputs = outputLabels.length > 0;

  const { inLay, outLay, inputY, titleY, outputY, chassisH, viewH } = layoutInChassis(
    STANDARD,
    hasInputs,
    hasOutputs,
    inputLabels.length,
    outputLabels.length
  );

  const ioProps = {
    module,
    highlightedTerminalId: highlightedTerminalId ?? null,
    onSelectTerminal,
    readOnly,
  };

  return (
    <DiagramCanvas
      viewBox={`0 0 ${STANDARD.viewW} ${viewH}`}
      ariaLabel={ariaLabel}
      compact={compact}
      fillHeight={fillHeight}
      readOnly={readOnly}
      hint={hint}
    >
      <Chassis w={STANDARD.chassisW} h={chassisH} x={STANDARD.chassisX} y={STANDARD.chassisY} />
      {hasInputs ? (
        <IoBank
          x={inLay.x}
          y={inputY}
          labels={inputLabels}
          accent={inputAccent}
          bankFrame
          pinW={inLay.pinW}
          gap={inLay.gap}
          {...ioProps}
        />
      ) : null}
      <DeviceTitle x={STANDARD.centerX} y={titleY} title={title} subtitle={module.alias} />
      {hasOutputs ? (
        <IoBank
          x={outLay.x}
          y={outputY}
          labels={outputLabels}
          accent={outputAccent}
          bankFrame
          pinW={outLay.pinW}
          gap={outLay.gap}
          labelAnnotation={outputLabelAnnotation}
          {...ioProps}
        />
      ) : null}
    </DiagramCanvas>
  );
}

/** Dos filas de salidas bajo el título (p. ej. Relay Extension). */
export function CenteredOutputRowsPinoutDiagram({
  module,
  highlightedTerminalId = null,
  onSelectTerminal,
  readOnly = false,
  compact,
  fillHeight,
  title,
  ariaLabel,
  hint,
  rows,
  outputAccent = "#64748b",
}: LoxoneDiagramProps & {
  title: string;
  ariaLabel: string;
  hint?: string;
  rows: [string[], string[]];
  outputAccent?: string;
}) {
  const ioProps = {
    module,
    highlightedTerminalId: highlightedTerminalId ?? null,
    onSelectTerminal,
    readOnly,
  };

  const cfg = WIDE;
  const maxBankW = cfg.chassisW - cfg.padInner * 2;
  const bankH = ioBankRowHeight();
  const row1 = rows[0];
  const row2 = rows[1];
  const lay1 = fitBankLayout(row1.length, cfg.centerX, maxBankW, 26, 2);
  const lay2 = fitBankLayout(row2.length, cfg.centerX, maxBankW, 26, 2);

  let y = cfg.chassisY + cfg.padInner;
  const titleY = y + cfg.titleBlock / 2;
  y += cfg.titleBlock + cfg.gapSection;
  const row1Y = y;
  y += bankH + cfg.gapSection;
  const row2Y = y;
  y += bankH + cfg.padInner;
  const chassisH = y - cfg.chassisY;
  const viewH = y + cfg.chassisY;

  return (
    <DiagramCanvas
      viewBox={`0 0 ${cfg.viewW} ${viewH}`}
      ariaLabel={ariaLabel}
      compact={compact}
      fillHeight={fillHeight}
      readOnly={readOnly}
      hint={hint}
    >
      <Chassis w={cfg.chassisW} h={chassisH} x={cfg.chassisX} y={cfg.chassisY} />
      <DeviceTitle x={cfg.centerX} y={titleY} title={title} subtitle={module.alias} />
      <IoBank
        x={lay1.x}
        y={row1Y}
        labels={row1}
        accent={outputAccent}
        bankFrame
        pinW={lay1.pinW}
        gap={lay1.gap}
        {...ioProps}
      />
      <IoBank
        x={lay2.x}
        y={row2Y}
        labels={row2}
        accent={outputAccent}
        bankFrame
        pinW={lay2.pinW}
        gap={lay2.gap}
        {...ioProps}
      />
    </DiagramCanvas>
  );
}

export { labelsMatching };
