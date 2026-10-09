import type { LoxoneDeviceDefinition, PinoutTerminal } from "../types/pinoutLayout";

export const LOXONE_FAMILIES = [
  "Controladores",
  "Extensiones DIN",
  "Módulos Empotrables (Nano)",
  "Pasarelas A/C (Clima)",
] as const;

export type LoxoneFamily = (typeof LOXONE_FAMILIES)[number];

/** @deprecated Usar `LoxoneDeviceDefinition`. Se mantiene por compatibilidad. */
export type LoxoneModule = LoxoneDeviceDefinition;

function pt(label: string, loadType = ""): PinoutTerminal {
  return loadType ? { label, loadType } : { label };
}

function range(prefix: string, from: number, to: number, loadType = ""): PinoutTerminal[] {
  const rows: PinoutTerminal[] = [];
  for (let i = from; i <= to; i++) {
    rows.push(pt(`${prefix}${i}`, loadType));
  }
  return rows;
}

function m(
  id: string,
  name: string,
  category: LoxoneFamily,
  technology: string,
  idLabel: string,
  pinout: PinoutTerminal[],
  connectionNote?: string
): LoxoneDeviceDefinition {
  return {
    id,
    name,
    category,
    technology,
    terminals: pinout.length,
    idLabel,
    connectionNote,
    pinout,
  };
}

const ID_SERIE_MAC = "Nº Serie / MAC";
const ID_MAC_AIR = "MAC Air";
const ID_LOX_LINK = "Nº Serie Lox-Link";
const ID_TREE = "Tree ID";

export const LOXONE_MODULES: LoxoneDeviceDefinition[] = [
  m(
    "ms-gen",
    "Miniserver (Gen 1 / Gen 2)",
    "Controladores",
    "Link / Tree / LAN",
    ID_SERIE_MAC,
    [
      ...range("I", 1, 8, "Entrada digital"),
      ...range("Q", 1, 8, "Salida relé"),
      ...range("AI", 1, 4, "Entrada analógica"),
    ]
  ),
  m(
    "ms-compact",
    "Miniserver Compact",
    "Controladores",
    "Link / Tree / Air / LAN",
    ID_SERIE_MAC,
    [...range("I", 1, 4, "Entrada digital"), ...range("Q", 1, 2, "Salida relé")]
  ),
  m(
    "ms-go",
    "Miniserver Go",
    "Controladores",
    "Air",
    ID_MAC_AIR,
    [],
    "Radio Air integrada. Sin entradas ni salidas físicas."
  ),

  m("ext-relay", "Relay Extension", "Extensiones DIN", "Lox-Link", ID_LOX_LINK, range("Q", 1, 14, "Salida relé")),
  m(
    "ext-multi-air",
    "Multi Extension Air",
    "Extensiones DIN",
    "Air",
    ID_MAC_AIR,
    [
      ...range("I", 1, 12, "Entrada digital"),
      ...range("Q", 1, 8, "Salida relé"),
      ...range("AI", 1, 4, "Entrada analógica"),
    ]
  ),
  m(
    "ext-dimmer",
    "Dimmer Extension 220V",
    "Extensiones DIN",
    "Lox-Link",
    ID_LOX_LINK,
    [...range("I", 1, 8, "Entrada digital"), ...range("CH", 1, 4, "Dimmer 220V")]
  ),
  m(
    "tree-rgbw-dimmer-24v",
    "RGBW 24V Dimmer Tree",
    "Extensiones DIN",
    "Tree",
    ID_TREE,
    [
      pt("CH1", "PWM 24V · R"),
      pt("CH2", "PWM 24V · G"),
      pt("CH3", "PWM 24V · B"),
      pt("CH4", "PWM 24V · W"),
    ],
    "4 salidas PWM (máx. 2,1 A/canal). Alimentación 12–28 V DC (+24V/GND) y bus Tree (GR/WH)."
  ),
  m(
    "tree-rgbw-compact-dimmer-24v",
    "RGBW 24V Compact Dimmer Tree",
    "Extensiones DIN",
    "Tree",
    ID_TREE,
    [
      pt("CH1", "PWM 24V · R"),
      pt("CH2", "PWM 24V · G"),
      pt("CH3", "PWM 24V · B"),
      pt("CH4", "PWM 24V · W"),
    ],
    "Actuador compacto en carril DIN. Misma función RGBW por Tree que el Dimmer Tree estándar."
  ),

  m(
    "nano-io-air",
    "Nano IO Air",
    "Módulos Empotrables (Nano)",
    "Air",
    ID_MAC_AIR,
    [...range("I", 1, 6, "Entrada digital"), ...range("Q", 1, 2, "Salida relé")]
  ),
  m(
    "nano-di-tree",
    "Nano DI Tree",
    "Módulos Empotrables (Nano)",
    "Tree",
    ID_TREE,
    range("I", 1, 6, "Entrada digital")
  ),
  m(
    "nano-dimmer-air",
    "Nano Dimmer Air",
    "Módulos Empotrables (Nano)",
    "Air",
    ID_MAC_AIR,
    range("CH", 1, 2, "Dimmer 220V")
  ),
  m(
    "nano-2relay-tree",
    "Nano 2 Relay Tree",
    "Módulos Empotrables (Nano)",
    "Tree",
    ID_TREE,
    range("Q", 1, 2, "Salida relé")
  ),

  m(
    "ac-daikin",
    "AC Control Air - Daikin",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (S21 / P1P2)"
  ),
  m(
    "ac-mitsubishi-electric",
    "AC Control Air - Mitsubishi Electric",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (CN105)"
  ),
  m(
    "ac-mitsubishi-heavy",
    "AC Control Air - Mitsubishi Heavy",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (CNS)"
  ),
  m(
    "ac-panasonic",
    "AC Control Air - Panasonic",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (CN-CNT)"
  ),
  m(
    "ac-fujitsu",
    "AC Control Air - Fujitsu / General",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (UTY)"
  ),
  m(
    "ac-toshiba",
    "AC Control Air - Toshiba",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (AB)"
  ),
  m(
    "ac-lg",
    "AC Control Air - LG",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C (CN-REMO)"
  ),
  m(
    "ac-gree",
    "AC Control Air - Gree / Otros",
    "Pasarelas A/C (Clima)",
    "Air",
    ID_MAC_AIR,
    [],
    "Puerto Bus A/C Genérico"
  ),
];

/** Catálogo maestro tipado (alias de `LOXONE_MODULES`). */
export const HARDWARE_CATALOG = LOXONE_MODULES;

export function groupModulesByFamily(
  modules: LoxoneDeviceDefinition[] = LOXONE_MODULES
): { family: LoxoneFamily; modules: LoxoneDeviceDefinition[] }[] {
  return LOXONE_FAMILIES.map((family) => ({
    family,
    modules: modules.filter((mod) => mod.category === family),
  })).filter((g) => g.modules.length > 0);
}

export function searchLoxoneModules(query: string): LoxoneDeviceDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...LOXONE_MODULES];
  return LOXONE_MODULES.filter((mod) => {
    const haystack = `${mod.name} ${mod.category} ${mod.technology} ${mod.id}`.toLowerCase();
    return haystack.includes(q);
  });
}

export function getLoxoneModule(id: string): LoxoneDeviceDefinition | undefined {
  return LOXONE_MODULES.find((mod) => mod.id === id);
}

export function getHardwareDevice(id: string): LoxoneDeviceDefinition | undefined {
  return getLoxoneModule(id);
}
