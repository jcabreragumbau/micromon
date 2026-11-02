// Constructor de mapas: rejilla de caracteres + edificios + objetos, sin contar columnas a mano.

export interface TrainerDef {
  name: string; clase: string; team: [string, number, string[]?][]; sight: number;
  intro: string; lose: string; after: string; money: number; portrait?: string; leader?: string;
}
export interface NpcDef {
  id: string; x: number; y: number; sprite: string; dir?: number;
  /** quieto · girar (al azar) · pasear · reloj (gira en el sentido de las agujas) · mirar:0,2 (alterna esas
   *  direcciones) · patrulla:h:3 / patrulla:v:3 (va y vuelve N casillas; «:mira» = mira arriba y abajo en los extremos). */
  move?: string; talk?: string | string[]; script?: string;
  trainer?: TrainerDef; showIf?: string; hideIf?: string; solid?: boolean;
}
export interface WarpDef { x: number; y: number; w?: number; h?: number; to: string; tx: number; ty: number; dir?: number; keep?: "x" | "y" }
export interface ItemDef { x: number; y: number; item: string; n?: number; flag: string; hidden?: boolean }
export interface TriggerDef { x: number; y: number; w?: number; h?: number; script: string; once?: string }
export interface Encounter { sp: string; min: number; max: number; w: number }
export interface MapDef {
  id: string; name: string; w: number; h: number; grid: string[][];
  npcs: NpcDef[]; warps: WarpDef[]; signs: { x: number; y: number; text: string }[]; items: ItemDef[];
  triggers: TriggerDef[]; grass: Encounter[]; env: "hierba" | "bosque" | "interior" | "laboratorio" | "gimnasio" | "cueva" | "invernadero" | "casino" | "torre" | "hielo";
  outdoor: boolean; onEnter?: string; music?: string;
  /** Mapa oscuro: solo se ve alrededor del jugador (más con Quorum Sensing Lux). */
  dark?: boolean;
  /** Niebla de proteínas mal plegadas (Torre Prión). */
  fog?: boolean;
  /** Reserva Microbiana: pasos y Criobolas Verdes limitados. */
  safari?: boolean;
  /** Tile de suelo (no hierba) en el que hay encuentros salvajes. */
  floorEncounters?: string;
  /** Edificios dibujados con una ilustración HD sobre su planta (casilla x,y; ancho w; filas h; puerta en x+door). */
  props?: PropDef[];
  /** Puertas de edificios (para enlazar automáticamente la salida de cada interior). */
  doors?: { x: number; y: number; to: string }[];
}
export interface PropDef { sprite: string; x: number; y: number; w: number; h: number; door: number }
/** Tamaño en casillas (ancho, alto) de cada edificio ilustrado: la ilustración ocupa exactamente esa planta,
 *  con proporciones acordes al jugador (la puerta mide algo más de una casilla de alto). La puerta queda en la
 *  fila inferior, en la columna central. */
export const SPRITE_DIMS: Record<string, [number, number]> = {
  casa_roja: [5, 6], casa_azul: [5, 6], laboratorio: [7, 6], centro: [7, 5], tienda: [7, 5],
  gimnasio: [13, 7], casino: [13, 7], uab: [15, 8], torre_prion: [5, 8],
};
/** Ilustración HD por defecto de cada tipo de edificio ("" = dibujarlo con tiles). */
export function buildingSprite(kind: string, color: string): string {
  if (kind === "casa") return color === "rojo" || color === "naranja" ? "casa_roja" : "casa_azul";
  if (kind === "incubadora") return "centro";
  if (kind === "tienda") return "tienda";
  if (kind === "gimnasio") return "gimnasio";
  return "";
}

/** Leyenda de caracteres → tile. T y V son árboles de 2×2 alineados a coordenadas pares. */
export const LEGEND: Record<string, string> = {
  ".": "hierba", ",": "hierba2", g: "hierba_alta", G: "hierba_oscura", p: "camino", s: "arena", "~": "agua", f: "flores",
  k: "seto", l: "valla", r: "roca", v: "bordillo", "#": "vacio", w: "pared", W: "pared_base", m: "suelo_madera", L: "suelo_lab",
  Y: "suelo_gimnasio", e: "estanteria", t: "mesa", c: "mostrador", P: "pc", b: "cama", n: "planta", a: "alfombra",
  i: "incubadora", B: "poyata", M: "microscopio", Q: "queso", C: "lata", K: "tanque", E: "escaleras", S: "cartel",
  H: "hielo", y: "nieve", U: "roca_hielo", R: "pared_hielo",
  "=": "puente_h", "|": "puente_v", "^": "escalon", "%": "risco", "!": "valla_v",
  x: "suelo_casino", N: "suelo_tecnico", F: "suelo_torre", I: "placa_contaminada", J: "poster",
  u: "suelo_cueva", X: "pared_cueva", d: "disco_duro", A: "acantilado", O: "cueva_entrada", Z: "winogradsky", j: "suelo_invernadero",
};

export class MapBuilder {
  def: MapDef;
  constructor(id: string, name: string, w: number, h: number, fill = ".", env: MapDef["env"] = "hierba", outdoor = true) {
    this.def = {
      id, name, w, h, grid: Array.from({ length: h }, () => Array(w).fill(fill)),
      npcs: [], warps: [], signs: [], items: [], triggers: [], grass: [], env, outdoor,
    };
  }
  set(x: number, y: number, ch: string) { if (x >= 0 && y >= 0 && x < this.def.w && y < this.def.h) this.def.grid[y][x] = ch; return this; }
  fill(x: number, y: number, w: number, h: number, ch: string) {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) this.set(i, j, ch);
    return this;
  }
  /** Rellena de árboles el rectángulo (ajustado a coordenadas pares). */
  trees(x: number, y: number, w: number, h: number, ch = "T") {
    const x0 = x - (x % 2), y0 = y - (y % 2);
    return this.fill(x0, y0, w + (x - x0) + ((w + x - x0) % 2), h + (y - y0) + ((h + y - y0) % 2), ch);
  }
  /** Dibuja el mapa a partir de filas de texto (un carácter por casilla, ver LEGEND; espacio = no tocar). */
  ascii(rows: string[], x0 = 0, y0 = 0) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== " ") this.set(x0 + i, y0 + j, ch); }));
    return this;
  }
  /** Texto en filas (útil para interiores pequeños). */
  rows(x: number, y: number, rows: string[]) {
    rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch !== " ") this.set(x + i, y + j, ch); }));
    return this;
  }
  /** Edificio: tejado de 2 filas + muro. kind decide colores e iconos. Devuelve la casilla de la puerta. */
  building(x: number, y: number, o: { kind: "casa" | "lab" | "incubadora" | "tienda" | "gimnasio"; w: number; color?: string; door: number; to: string; tx: number; ty: number; sprite?: string }) {
    const color = o.color ?? { casa: "rojo", lab: "gris", incubadora: "naranja", tienda: "azul", gimnasio: "verde" }[o.kind];
    const wallRows = o.kind === "lab" || o.kind === "gimnasio" ? 2 : 1;
    const sprite = o.sprite ?? buildingSprite(o.kind, color);
    if (sprite && SPRITE_DIMS[sprite]) {
      // Planta sólida invisible del tamaño de la ilustración; la puerta (abajo, en el centro) es la entrada.
      const [w, rows] = SPRITE_DIMS[sprite], door = Math.floor(w / 2), dy = y + rows - 1;
      this.fill(x, y, w, rows, "@bloque");
      this.set(x + door, dy, "@puerta_hd");
      (this.def.props ??= []).push({ sprite, x, y, w, h: rows, door });
      this.def.warps.push({ x: x + door, y: dy, to: o.to, tx: o.tx, ty: o.ty, dir: 1 });
      (this.def.doors ??= []).push({ x: x + door, y: dy, to: o.to });
      return { x: x + door, y: dy };
    }
    for (let r = 0; r < 2; r++) for (let i = 0; i < o.w; i++) {
      const pos = i === 0 ? "l" : i === o.w - 1 ? "r" : "m";
      this.set(x + i, y + r, `@tejado_${color}_${pos}${r}`);
    }
    for (let r = 0; r < wallRows; r++) for (let i = 0; i < o.w; i++) {
      const pos = i === 0 ? "l" : i === o.w - 1 ? "r" : "m";
      let t = `muro_${pos}`;
      const last = r === wallRows - 1;
      if (!last && i % 2 === 1 && i !== o.w - 1) t = "muro_ventana";
      if (last && (i === 1 || i === o.w - 2) && o.w > 3) t = "muro_ventana";
      this.set(x + i, y + 2 + r, `@${t}`);
    }
    const dy = y + 1 + wallRows;
    const doorTile = o.kind === "casa" ? "muro_puerta" : "muro_puerta_cristal";
    this.set(x + o.door, dy, `@${doorTile}`);
    const icon = { incubadora: "muro_placa", tienda: "muro_tienda", gimnasio: "muro_gimnasio" }[o.kind as string];
    if (icon) this.set(x + o.door + 1 < x + o.w ? x + o.door + 1 : x + o.door - 1, dy, `@${icon}`);
    this.def.warps.push({ x: x + o.door, y: dy, to: o.to, tx: o.tx, ty: o.ty, dir: 1 });
    (this.def.doors ??= []).push({ x: x + o.door, y: dy, to: o.to });
    return { x: x + o.door, y: dy };
  }
  /** Edificio ilustrado con la puerta justo encima de la fila `road` (la calle); x es su borde izquierdo. */
  onRoad(x: number, road: number, o: Parameters<MapBuilder["building"]>[2]) {
    const sprite = o.sprite ?? buildingSprite(o.kind, o.color ?? { casa: "rojo", lab: "gris", incubadora: "naranja", tienda: "azul", gimnasio: "verde" }[o.kind]);
    const h = SPRITE_DIMS[sprite]?.[1] ?? 3;
    return this.building(x, road - h, o);
  }
  warp(w: WarpDef) { this.def.warps.push(w); return this; }
  npc(n: NpcDef) { this.def.npcs.push(n); return this; }
  sign(x: number, y: number, text: string) { this.set(x, y, "S"); this.def.signs.push({ x, y, text }); return this; }
  item(x: number, y: number, item: string, flag: string, n = 1, hidden = false) { this.def.items.push({ x, y, item, flag, n, hidden }); return this; }
  trigger(t: TriggerDef) { this.def.triggers.push(t); return this; }
  encounters(e: Encounter[]) { this.def.grass = e; return this; }
  done(extra: Partial<MapDef> = {}): MapDef { return Object.assign(this.def, extra); }
}

/** Para autotiles de camino (p), agua (~) y arena (s): ¿la casilla (xx, yy) continúa el terreno sin borde?
 *  Vecinos que no llevan borde de césped: en la montaña, riscos, escalones, puentes y cascadas. */
export const AJUSTES_TERRENO = {
  /** Micromón V2: el agua tiene orilla también junto a los caminos (su autotile trae arena y césped) y el
   *  borde de los caminos sigue recto bajo la fachada de los edificios ilustrados; la arena tiene borde
   *  junto al camino (con el camino en lugar de césped, ver tools/art/tileset_v2.py). */
  orillaJuntoCamino: false,
};
/** V2: ¿la casilla de camino es una terraza de montaña? (subiendo o bajando por su columna, lo primero que no
 *  es camino, agua ni puente es roca de montaña). */
export function esTerraza(m: MapDef, x: number, y: number): boolean {
  if (m.grid[y]?.[x] !== "p") return false;
  for (const d of [-1, 1]) {
    for (let k = 1; k < 12; k++) {
      const c = m.grid[y + d * k]?.[x];
      if (c === undefined) break;
      if ("p~=|*^".includes(c)) continue;
      if (c === "%" || c === "O") return true;
      break;
    }
  }
  return false;
}
export function mismoTerreno(m: MapDef, ch: string, xx: number, yy: number, ox = xx, oy = yy): boolean {
  const sinBorde = ch === "p" ? (AJUSTES_TERRENO.orillaJuntoCamino ? "%^=|*Os!" : "%^=|*O~s!") : ch === "~" ? (AJUSTES_TERRENO.orillaJuntoCamino ? "=|*%" : "=|*%p") : ch === "s" ? (AJUSTES_TERRENO.orillaJuntoCamino ? "%^=|*O~" : "%^=|*O~p") : "";
  const c = m.grid[yy]?.[xx];
  // V2: entre una terraza de montaña y el río no hay orilla (el canto de la terraza cae al agua)
  if (AJUSTES_TERRENO.orillaJuntoCamino && ((ch === "~" && c === "p" && esTerraza(m, xx, yy)) || (ch === "p" && c !== undefined && "~*".includes(c) && esTerraza(m, ox, oy)))) return true;
  // (V1: el camino entra bajo la puerta de los edificios; V2: el borde del camino sigue recto bajo la fachada)
  return c === undefined || c === ch || sinBorde.includes(c) || (ch === "p" && (c.startsWith("@muro_puerta") || (c === "@puerta_hd" && !AJUSTES_TERRENO.orillaJuntoCamino)));
}
/** Esquinas interiores de un autotile (camino, agua, arena): diagonales de otro terreno cuyos dos lados
 *  sí continúan (1 NE, 2 SE, 4 SO, 8 NO). 0 si la casilla no es de esos terrenos. */
export function esquinas(m: MapDef, x: number, y: number): number {
  const ch = m.grid[y]?.[x];
  if (ch !== "~" && ch !== "p" && ch !== "s") return 0;
  const s = (dx: number, dy: number) => mismoTerreno(m, ch, x + dx, y + dy, x, y);
  let d = 0;
  if (s(0, -1) && s(1, 0) && !s(1, -1)) d |= 1;
  if (s(0, 1) && s(1, 0) && !s(1, 1)) d |= 2;
  if (s(0, 1) && s(-1, 0) && !s(-1, 1)) d |= 4;
  if (s(0, -1) && s(-1, 0) && !s(-1, -1)) d |= 8;
  return d;
}

/** Nombre del tile de una casilla. */
export function tileAt(m: MapDef, x: number, y: number, frame = 0): string {
  const ch = m.grid[y]?.[x];
  if (ch === undefined) return "vacio";
  if (ch.startsWith("@")) return ch.slice(1);
  if (ch === "T" || ch === "V") {
    const p = (y % 2 ? "b" : "t") + (x % 2 ? "r" : "l");
    return `${ch === "T" ? "arbol" : "arbolv"}_${p}`;
  }
  if (ch === "%" || (ch === "O" && (m.grid[y]?.[x - 1] === "%" || m.grid[y]?.[x + 1] === "%"))) {
    // Montaña con relieve: la pieza depende de qué lados dan a suelo (ver tools/art/terreno_hd.py)
    const roca = (xx: number, yy: number) => { const c = m.grid[yy]?.[xx]; return c === undefined || c === "%" || c === "O"; };
    if (ch === "O") return "monte_cueva";
    const e = roca(x + 1, y) ? 0 : 1, w = roca(x - 1, y) ? 0 : 1;
    // por debajo del mapa se considera terreno más bajo: el borde inferior es una pared que cae
    const abierto = (k: number) => y + k >= m.h || !roca(x, y + k);
    if (abierto(1)) return `monte_${roca(x, y - 1) && m.grid[y - 1]?.[x] === "%" ? "cara2" : "cara1"}_${e}${w}`;
    if ((m.grid[y + 1]?.[x] === "%" || m.grid[y + 1]?.[x] === "O") && abierto(2)) return `monte_alta_${e}${w}`;
    return `monte_cima_${roca(x, y - 1) ? 0 : 1}${e}${w}`;
  }
  if (ch === "~" || ch === "p" || ch === "s") {
    const same = (xx: number, yy: number) => mismoTerreno(m, ch, xx, yy, x, y);
    const mask = (same(x, y - 1) ? 0 : 1) | (same(x + 1, y) ? 0 : 2) | (same(x, y + 1) ? 0 : 4) | (same(x - 1, y) ? 0 : 8);
    if (ch === "~") return `agua_${mask}_${frame % 64 < 32 ? 0 : 1}`;
    return `${ch === "p" ? "camino" : "arena"}_${mask}`;
  }
  if (ch === "f") return frame % 64 < 32 ? "flores0" : "flores1";
  if (ch === "*") return frame % 16 < 8 ? "cascada0" : "cascada1";
  if (ch === "h") return frame % 80 < 40 ? "hifas0" : "hifas1";
  if (ch === "o") return frame % 90 < 45 ? "seta0" : "seta1";
  if (ch === "q") return frame % 64 < 32 ? "piscina0" : "piscina1";
  if (ch === "1") return frame % 40 < 20 ? "holo0" : "holo1";
  if (ch === "z") return frame % 40 < 20 ? "tragaperras0" : "tragaperras1";
  if (ch === "D") return frame % 48 < 24 ? "servidor0" : "servidor1";
  return LEGEND[ch] ?? "hierba";
}

const PASSABLE = new Set(["hierba", "hierba2", "hierba_alta", "hierba_oscura", "camino", "arena", "puente_h", "puente_v", "escalon", "monte_cueva", ...Array.from({ length: 16 }, (_, i) => `camino_${i}`), ...Array.from({ length: 16 }, (_, i) => `arena_${i}`), "flores0", "flores1",
  "suelo_madera", "suelo_lab", "suelo_gimnasio", "suelo_cueva", "suelo_invernadero", "cueva_entrada", "suelo_casino", "suelo_tecnico", "suelo_torre", "hielo", "nieve", "alfombra", "escaleras", "muro_puerta", "muro_puerta_cristal", "bordillo", "puerta_hd"]);
export function passable(tile: string) { return PASSABLE.has(tile); }
export function isGrass(tile: string) { return tile === "hierba_alta" || tile === "hierba_oscura"; }
