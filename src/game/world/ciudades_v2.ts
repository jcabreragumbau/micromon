// Micromón V2: ciudades más grandes y con más vida, construidas con los edificios del tileset de 4.ª gen.
// Se conservan los edificios propios (Incubadora, tienda, gimnasios, laboratorio, casino, Torre Prión...), sus
// interiores, los PNJ con historia, los carteles y los objetos de cada ciudad de la V1; se rehace la planta:
// calles, manzanas, casas nuevas (con interior y un vecino), comercios, farolas, jardines y paseantes.
// Solo se aplica en la V2 (aplicarCiudadesV2, desde main.ts); la V1 no cambia.
import { MAPS, casa, visitante, linkWarps } from "./maps";
import { MapBuilder, SPRITE_DIMS, tileAt, type MapDef, type NpcDef } from "./builder";
import PROPS2 from "../../../assets/atlas_v2/props_hd.json";

type Meta = { planta?: [number, number, number, string] };
const P2 = PROPS2 as unknown as Record<string, Meta>;
/** Planta (ancho, alto en casillas), columna de la puerta y tipo de cada ilustración nueva. */
function planta(sprite: string): [number, number, number] {
  const p = P2[sprite]?.planta;
  if (p) return [p[0], p[1], p[2]];
  const d = SPRITE_DIMS[sprite];
  return d ? [d[0], d[1], Math.floor(d[0] / 2)] : [5, 5, 2];
}

/** Generador pseudoaleatorio con semilla (las ciudades salen siempre iguales). */
function rng(semilla: string) {
  let h = 2166136261;
  for (const c of semilla) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
}

const CASAS = ["v2_casa_teal", "v2_casa_rosa", "v2_casa_rosa2", "v2_casa_gris", "v2_casa_naranja", "v2_casa_madera", "v2_cabana", "v2_casa_cristal",
  "v2_casa_azulejo", "v2_casa_azul", "v2_casa_roja", "v2_casa_verde3", "v2_casa_naranja2", "v2_casa_gris2",
  "v2_casa_roja2", "v2_casa_crema", "v2_casa_marron", "v2_casa_lila", "v2_casita"];
const URBANOS = ["v2_tienda_gris", "v2_mercado", "v2_tienda_toldo", "v2_kiosco", "v2_tienda_moderna", "v2_bloque_azul", "v2_oficina", "v2_bloque_naranja",
  "v2_cafeteria", "v2_cristalera", "v2_tienda_marron", "v2_bloque_verde", "v2_bloque_crema", "v2_tienda_cian", "v2_casa_verde2", "v2_casa_rosa3", "v2_tienda_naranja", "v2_teatro",
  "v2_nave_granate", "v2_bloque_amarillo", "v2_cupula", "v2_casona"];

/** Frases de los paseantes que se añaden a cada ciudad. */
const FRASES = [
  "Dicen que en una cucharadita de tierra hay más microbios que personas en el planeta.",
  "Mi abuela hacía yogur en casa: leche templada, una cucharada del anterior y paciencia.",
  "¿Has probado el pan de masa madre? Levaduras y lactobacilos trabajando juntos.",
  "Lávate las manos al volver a casa: es la forma más barata de evitar infecciones.",
  "El queso con agujeros los tiene por el CO₂ que sueltan las bacterias propiónicas.",
  "Los liquenes son una alianza entre un hongo y un alga. ¡Mira las piedras del parque!",
  "En el puerto huele a mar por el dimetilsulfuro que sueltan las algas al morir.",
  "Los antibióticos no sirven contra los virus. Me lo explicó mi médica muy despacio.",
  "Mi gato duerme en la Incubadora. Bueno, en la puerta. Bueno, donde le da la gana.",
  "Por la noche el agua del muelle brilla: son dinoflagelados bioluminiscentes.",
  "He leído que el intestino tiene casi tantas bacterias como células tiene el cuerpo.",
  "El vinagre lo hacen bacterias acéticas que oxidan el alcohol del vino.",
  "La ciudad ha crecido mucho desde que abrieron el laboratorio. ¡Hay obras en cada calle!",
  "Si ves hierba alta, ten cuidado: los Microos salvajes se esconden ahí.",
  "Los domingos hay mercado en la plaza: quesos, encurtidos, kombucha... ¡todo fermentado!",
  "Dicen que la Unidad de Genética anda buscando cepas raras por toda la región.",
];

interface Hueco { x: number; y: number }
interface Cfg {
  /** Ancho y alto del mapa nuevo. */
  w: number; h: number;
  /** Salidas por cada lado: id del mapa vecino. */
  salidas: { n?: string; s?: string; e?: string; o?: string };
  /** Pueblo: dos bandas de edificios (pequeño); ciudad: tres. */
  pueblo?: boolean;
  /** Número de casas nuevas en las que se puede entrar. */
  casas: number;
  /** Edificios de ciudad (sin entrar) que se usan para rellenar. */
  urbanos?: string[];
  /** Sustitutos para los edificios de la V1 dibujados con tiles (interior -> ilustración nueva). */
  sustitutos?: Record<string, string>;
  /** Muelle al sur (Ciudad Pili, Isla Conjugada): agua, embarcadero y barco. */
  puerto?: boolean;
  /** Parche de hierba alta (encuentros) en la banda superior. */
  hierbaAlta?: boolean;
  /** Estanque decorativo. */
  estanque?: boolean;
  /** Alto de la banda de arriba (para edificios altos como la Torre Prión). */
  banda1?: number;
}

/** Datos de la V1 que se conservan: edificios con interior, PNJ, carteles, objetos y disparadores. */
function edificiosV1(m: MapDef) {
  const out: { sprite: string; to: string; tx: number; ty: number; kind: string }[] = [];
  for (const w of m.warps) {
    const t = MAPS[w.to];
    if (!t || t.outdoor) continue;
    if (w.x === 0 || w.y === 0 || w.x === m.w - 1 || w.y === m.h - 1) continue;   // salida por el borde (túnel)
    const p = (m.props ?? []).find((p) => p.x + p.door === w.x && p.y + p.h - 1 === w.y);
    out.push({ sprite: p?.sprite ?? "", to: w.to, tx: w.tx, ty: w.ty, kind: t.env });
  }
  return out;
}

function construir(id: string, c: Cfg): MapDef {
  const viejo = MAPS[id];
  const r = rng(id);
  const W = c.w, H = c.h;
  const b = new MapBuilder(id, viejo.name, W, H, ".", "hierba", true);
  // ---- bordes de árboles (bloques de 2×2) con las salidas abiertas
  b.trees(0, 0, W, 2).trees(0, H - 2, W, 2).trees(0, 0, 2, H).trees(W - 2, 0, 2, H);
  const cx = Math.floor(W / 2) - 1;                         // avenida norte-sur: columnas cx..cx+2
  // filas de calles (3 de alto) y bandas de edificios encima de cada una
  const B1 = c.banda1 ?? (c.pueblo ? 7 : 9), B2 = c.pueblo ? 7 : 8;
  const calle1 = 2 + B1;                                    // calle que da a la banda 1
  const calle2 = calle1 + 3 + B2;                           // calle (avenida) que da a la banda 2
  const calle3 = c.pueblo ? -1 : calle2 + 3 + 8;            // calle que da a la banda 3 (solo ciudades)
  const ultima = c.pueblo ? calle2 : calle3;
  const avenidaEO = c.pueblo ? calle1 : calle2;             // las salidas este y oeste van por esta calle
  // calles entre las dos calles laterales (sin tramos que acaben contra los árboles del borde)
  for (const y of [calle1, calle2, calle3].filter((y) => y > 0)) b.fill(3, y, W - 6, 3, "p");
  // avenida norte-sur: solo llega al borde si hay una salida por ese lado
  b.fill(cx, calle1, 3, ultima - calle1 + 3, "p");
  b.fill(3, calle1, 2, ultima - calle1 + 3, "p").fill(W - 5, calle1, 2, ultima - calle1 + 3, "p");   // calles laterales
  // salidas
  const sal = c.salidas;
  if (sal.n) { b.fill(cx, 0, 3, calle1 + 3, "p"); b.warp({ x: cx, y: 0, w: 3, to: sal.n, tx: 0, ty: 0, dir: 1 }); }
  if (sal.s) { b.fill(cx, ultima, 3, H - ultima, "p"); b.warp({ x: cx, y: H - 1, w: 3, to: sal.s, tx: 0, ty: 0, dir: 0 }); }
  if (sal.o) { b.fill(0, avenidaEO, 3, 3, "p"); b.warp({ x: 0, y: avenidaEO, h: 3, to: sal.o, tx: 0, ty: 0, dir: 2 }); }
  if (sal.e) { b.fill(W - 3, avenidaEO, 3, 3, "p"); b.warp({ x: W - 1, y: avenidaEO, h: 3, to: sal.e, tx: 0, ty: 0, dir: 3 }); }
  // salidas a mapas interiores (el Túnel Endospórico): se conserva su llegada y se ajusta su vuelta
  for (const w of b.def.warps) {
    const t = MAPS[w.to];
    if (!t || t.outdoor) continue;
    const v = viejo.warps.find((u) => u.to === w.to);
    if (v) { w.tx = v.tx; w.ty = v.ty; }
    const dentro: [number, number] = w.x === 0 ? [1, w.y + 1] : w.x === W - 1 ? [W - 2, w.y + 1] : w.y === 0 ? [w.x + 1, 1] : [w.x + 1, H - 2];
    for (const u of t.warps) if (u.to === id) { u.tx = dentro[0]; u.ty = dentro[1]; }
  }
  // ---- solares: tramos de cada banda a izquierda y derecha de la avenida
  type Solar = { x0: number; x1: number; base: number; alto: number; x: number };
  const solares: Solar[] = [];
  const bandas: [number, number][] = [[calle1 - 1, B1], [calle2 - 1, B2]];
  if (!c.pueblo) bandas.push([calle3 - 1, 8]);
  for (const [base, alto] of bandas) {
    solares.push({ x0: 6, x1: cx - 2, base, alto, x: 6 }, { x0: cx + 4, x1: W - 7, base, alto, x: cx + 4 });
  }
  // puerto: la banda de abajo da al agua en lugar de a una calle
  if (c.puerto) {
    const y0 = ultima + 3;
    b.fill(2, y0, W - 4, H - y0, "~");
    b.fill(cx + 1, y0, 1, 3, "p");                          // embarcadero
  }
  const huecosDeco: Hueco[] = [];
  const puertas: Record<string, { x: number; y: number }> = {};
  const colocar = (sprite: string, s: Solar, opt: { to?: string; tx?: number; ty?: number } = {}): boolean => {
    const [w, h, d] = planta(sprite);
    if (h > s.alto || s.x + w - 1 > s.x1) return false;
    const x = s.x, y = s.base - h + 1;
    b.fill(x, y, w, h, "@bloque");
    (b.def.props ??= []).push({ sprite, x, y, w, h, door: d });
    if (opt.to) {
      b.set(x + d, s.base, "@puerta_hd");
      b.warp({ x: x + d, y: s.base, to: opt.to, tx: opt.tx ?? 3, ty: opt.ty ?? 5, dir: 1 });
      (b.def.doors ??= []).push({ x: x + d, y: s.base, to: opt.to });
      puertas[opt.to] = { x: x + d, y: s.base };
    }
    s.x += w + 1 + (r() < 0.35 ? 1 : 0);
    huecosDeco.push({ x: s.x - 1, y: s.base });
    return true;
  };
  const solarPara = (sprite: string, preferidos: Solar[] = solares) => {
    const [w, h] = planta(sprite);
    return preferidos.find((s) => h <= s.alto && s.x + w - 1 <= s.x1) ?? solares.find((s) => h <= s.alto && s.x + w - 1 <= s.x1);
  };
  // ---- 1) edificios de la V1 (los de la historia), en las bandas centrales primero
  const orden = [...solares].sort((a, b2) => Math.abs(a.base - calle2) - Math.abs(b2.base - calle2));
  for (const e of edificiosV1(viejo)) {
    const sprite = e.sprite || c.sustitutos?.[e.to] || "v2_casa_grande";
    const s = solarPara(sprite, orden);
    if (!s || !colocar(sprite, s, { to: e.to, tx: e.tx, ty: e.ty })) console.warn(`[V2] ${id}: no cabe ${sprite} (${e.to})`);
  }
  // ---- 2) casas nuevas con interior y un vecino que cuenta curiosidades
  const casas = [...CASAS].sort(() => r() - 0.5);
  for (let i = 0; i < c.casas; i++) {
    const sprite = casas[i % casas.length];
    const s = solarPara(sprite, [...solares].sort(() => r() - 0.5));
    if (!s) break;
    const interior = `${id}-v2casa-${i + 1}`;
    MAPS[interior] = casa(interior, `Casa de ${viejo.name}`, { to: id, x: 0, y: 0 }, [
      { id: `${interior}-vecino`, x: 2, y: 4, sprite: visitante(interior), move: "girar", talk: [] },
    ]);
    colocar(sprite, s, { to: interior, tx: 3, ty: 5 });
  }
  // ---- 3) comercios y edificios de ciudad para rellenar
  const urbanos = [...(c.urbanos ?? URBANOS)].sort(() => r() - 0.5);
  for (const s of solares) {
    for (let k = 0; k < 12; k++) {
      const cand = urbanos.filter((u) => { const [w, h] = planta(u); return h <= s.alto && s.x + w - 1 <= s.x1; });
      if (!cand.length) break;
      const u = cand[Math.floor(r() * cand.length)];
      if (colocar(u, s)) urbanos.splice(urbanos.indexOf(u), 1);       // sin repetir en la misma ciudad
      if (!urbanos.length) urbanos.push(...(c.urbanos ?? URBANOS));
    }
    // el resto del solar: jardín con árboles
    while (s.x + 2 <= s.x1) {
      const arbol = ["arbol_caduco", "arbol_otono", "arbol_rojo"][Math.floor(r() * 3)];
      if (!colocar(arbol, s)) break;
    }
  }
  // ---- 4) decoración: farolas en los huecos junto a la calle, flores y arbustos en el césped
  for (const hq of huecosDeco) {
    if (tileAt(b.def, hq.x, hq.y) !== "hierba") continue;
    const deco = r() < 0.5 ? "farola" : r() < 0.5 ? "maceta_flores" : "arbusto_flor";
    const [w] = planta(deco);
    if (w === 1 || tileAt(b.def, hq.x + 1, hq.y) === "hierba") {
      b.fill(hq.x, hq.y, w, 1, "@bloque");
      (b.def.props ??= []).push({ sprite: deco, x: hq.x, y: hq.y, w, h: 1, door: 0 });
    }
  }
  if (c.hierbaAlta) {
    // un prado con hierba alta en un solar libre (o en la esquina superior izquierda)
    for (let y = 3; y < 3 + 4; y++) for (let x = 5; x < 5 + 6; x++) if (b.def.grid[y][x] === "." || b.def.grid[y][x] === "f") b.set(x, y, "g");
  }  // detrás de los edificios (lo alto de cada banda): arboledas en bloques de 2×2, con algún claro
  for (const [base, alto] of bandas) {
    const top = base - alto + 1;
    for (let y = top + (top % 2); y + 1 < base - 1; y += 2) for (let x = 6; x + 1 < W - 6; x += 2) {
      const celdas = [[x, y], [x + 1, y], [x, y + 1], [x + 1, y + 1]];
      if (celdas.every(([a, c2]) => b.def.grid[c2][a] === ".") && r() < 0.7) for (const [a, c2] of celdas) b.set(a, c2, "T");
    }
  }
  for (let k = 0; k < W * H / 40; k++) {
    const x = 2 + Math.floor(r() * (W - 4)), y = 2 + Math.floor(r() * (H - 4));
    if (b.def.grid[y][x] === ".") b.set(x, y, "f");
  }
  // plaza: farolas en las esquinas del cruce de la avenida con la calle principal
  for (const [x, y] of [[cx - 1, avenidaEO - 1], [cx + 3, avenidaEO - 1]]) {
    if (b.def.grid[y]?.[x] === "." || b.def.grid[y]?.[x] === "f") { b.set(x, y, "@bloque"); (b.def.props ??= []).push({ sprite: "farola", x, y, w: 1, h: 1, door: 0 }); }
  }

  if (c.estanque) {
    // estanque en el primer claro de 5×4 de la banda de arriba
    busca: for (let y = 3; y + 4 < calle1 - 1; y++) for (let x = 6; x + 5 < W - 6; x++) {
      for (let j = -1; j <= 4; j++) for (let i = -1; i <= 5; i++) if (!".fT".includes(b.def.grid[y + j]?.[x + i] ?? "#")) continue busca;
      for (let j = -1; j <= 4; j++) for (let i = -1; i <= 5; i++) if (b.def.grid[y + j][x + i] === "T") continue busca;
      b.fill(x, y, 5, 4, "~");
      break;
    }
  }
  if (c.puerto) {
    // un velero amarrado junto al embarcadero (sobre el agua, sin planta)
    (b.def.props ??= []).push({ sprite: "v2_barco", x: cx + 3, y: ultima + 3, w: 6, h: 5, door: 2 });
  }
  const def = b.done({ music: viejo.music, grass: viejo.grass, env: viejo.env });
  // ---- 5) PNJ, carteles, objetos y disparadores de la V1
  const libre = (x: number, y: number) => x > 1 && y > 1 && x < W - 2 && y < H - 2 && ["camino", "hierba", "flores0", "flores1"].some((t) => tileAt(def, x, y).startsWith(t))
    && !def.npcs.some((n) => n.x === x && n.y === y) && !def.warps.some((w) => x >= w.x && x < w.x + (w.w ?? 1) && y >= w.y && y < w.y + (w.h ?? 1))
    && !Object.values(puertas).some((p) => p.x === x && p.y + 1 === y) && !def.signs.some((s) => s.x === x && s.y === y);
  const cerca = (x0: number, y0: number, soloCamino = true): [number, number] => {
    for (let d = 0; d < 30; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
      const x = x0 + dx, y = y0 + dy;
      if (libre(x, y) && (!soloCamino || tileAt(def, x, y).startsWith("camino"))) return [x, y];
    }
    return [x0, y0];
  };
  const delante = (to: string): [number, number] | null => { const p = puertas[to]; return p ? [p.x, p.y + 1] : null; };
  for (const n0 of viejo.npcs) {
    const n: NpcDef = { ...n0 };
    // PNJ que custodian algo: delante de la puerta de su edificio o en su salida
    const guardaPuerta = viejo.warps.find((w) => !MAPS[w.to]?.outdoor && Math.abs(w.x - n0.x) + Math.abs(w.y - n0.y) <= 4 && n0.y > w.y);
    const guardaSalida = viejo.warps.find((w) => MAPS[w.to]?.outdoor && Math.abs(w.x - n0.x) <= 2 && Math.abs(w.y - n0.y) <= 2);
    let pos: [number, number] | null = null;
    if (n0.sprite.startsWith("@")) pos = null;
    if (n0.script === "ferri") pos = null;                  // el marinero va al embarcadero (abajo)
    else if (guardaSalida && (n0.hideIf || n0.solid)) {
      const s = def.warps.find((w) => w.to === guardaSalida.to);
      if (s) {
        const k = viejo.npcs.filter((o) => o.hideIf === n0.hideIf && Math.abs(o.x - n0.x) <= 2).indexOf(n0);
        pos = s.x === 0 ? [2, s.y + k] : s.x === W - 1 ? [W - 3, s.y + k] : s.y === 0 ? [s.x + k, 2] : [s.x + k, H - 3];
      }
    } else if (guardaPuerta && (n0.hideIf || n0.script)) {
      const d = delante(guardaPuerta.to);
      if (d) pos = [d[0] + (n0.x - guardaPuerta.x), d[1] + (n0.y - guardaPuerta.y - 1)];
    }
    if (n0.script === "ferri") {
      n.x = cx + 1; n.y = H - 2 > ultima + 5 ? ultima + 5 : ultima + 3; n.dir = 1;
      def.npcs.push(n); continue;
    }
    if (!pos) pos = cerca(Math.round((n0.x / viejo.w) * W), Math.round((n0.y / viejo.h) * H), !n0.move);
    n.x = pos[0]; n.y = pos[1];
    def.npcs.push(n);
  }
  // paseantes nuevos
  const nPase = c.pueblo ? 2 : 4;
  for (let i = 0; i < nPase; i++) {
    const [x, y] = cerca(4 + Math.floor(r() * (W - 8)), calle1 + Math.floor(r() * (ultima - calle1 + 3)));
    const sp = ["chico", "chica", "estudiante", "madre", "jubilado", "becario"][Math.floor(r() * 6)];
    def.npcs.push({ id: `${id}-v2paseo-${i + 1}`, x, y, sprite: sp, move: r() < 0.6 ? "pasear" : "girar", talk: FRASES[Math.floor(r() * FRASES.length)] });
  }
  // carteles: el de la ciudad junto a la avenida; los de los edificios, al lado de su puerta
  for (const s0 of viejo.signs) {
    const t = s0.text;
    const edif = edificiosV1(viejo).find((e) => {
      const clave = (MAPS[e.to]?.name ?? "").split(" ")[0].toLowerCase();
      return clave.length > 4 && clave !== "casa" && t.toLowerCase().startsWith(clave.slice(0, 6));
    });
    let pos: [number, number];
    const p = edif && puertas[edif.to];
    if (p) {
      // a la izquierda del edificio, en la fila de su puerta (junto a la calle)
      const pr = def.props!.find((q) => q.x + q.door === p.x && q.y + q.h - 1 === p.y)!;
      pos = cercaHierba(def, pr.x - 1, p.y, libre);
    }
    else {
      // cartel de la ciudad: junto a la primera salida; los demás, repartidos junto a la avenida
      const ruta = /^ruta (\d+)/i.exec(t);
      const sal0 = (ruta && def.warps.find((w) => w.to === `ruta-${ruta[1]}`)) || def.warps.find((w) => MAPS[w.to]?.outdoor);
      const [ex, ey] = sal0 ? [sal0.x === 0 ? 3 : sal0.x === W - 1 ? W - 4 : sal0.x - 1, sal0.y === 0 ? 3 : sal0.y === H - 1 ? H - 4 : sal0.y - 1] : [cx - 1, avenidaEO - 1];
      pos = cercaHierba(def, ex, ey, libre);
    }
    def.grid[pos[1]][pos[0]] = "S";
    def.signs.push({ x: pos[0], y: pos[1], text: t });
  }
  for (const it of viejo.items) {
    const [x, y] = cerca(Math.round((it.x / viejo.w) * W), Math.round((it.y / viejo.h) * H), false);
    def.items.push({ ...it, x, y });
  }
  for (const t of viejo.triggers) {
    // disparadores en una salida (p. ej. no salir del pueblo sin Microo): en la salida nueva
    const w = viejo.warps.find((w) => MAPS[w.to]?.outdoor && Math.abs(w.y - t.y) <= 2 && Math.abs(w.x - t.x) <= 2);
    const s = w && def.warps.find((v) => v.to === w.to);
    if (s) def.triggers.push({ ...t, x: s.x, y: s.y === 0 ? 1 : s.y === H - 1 ? H - 2 : s.y, w: s.w ?? 1, h: s.h ?? 1 });
    else def.triggers.push({ ...t });
  }
  // punto de llegada del ferri (encima del marinero)
  const mar = def.npcs.find((n) => n.script === "ferri");
  if (mar) (def as MapDef & { puntos?: Record<string, [number, number]> }).puntos = { ferri: [mar.x, mar.y - 1] };
  return def;
}

function cercaHierba(def: MapDef, x0: number, y0: number, libre: (x: number, y: number) => boolean): [number, number] {
  for (let d = 0; d < 20; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
    const x = x0 + dx, y = y0 + dy;
    if (libre(x, y) && tileAt(def, x, y) === "hierba") return [x, y];
  }
  return [x0, y0];
}

const CIUDADES: Record<string, Cfg> = {
  "pueblo-plaqueta": { w: 30, h: 24, pueblo: true, salidas: { n: "ruta-1" }, casas: 2, urbanos: ["v2_kiosco", "v2_tienda_toldo"], estanque: true },
  "ciudad-viral": { w: 48, h: 38, salidas: { s: "ruta-1", e: "bosque-viral" }, casas: 4 },
  "ciudad-petri": { w: 50, h: 38, salidas: { o: "bosque-viral", n: "ruta-2" }, casas: 4 },
  "ciudad-cultivo": { w: 50, h: 38, salidas: { s: "ruta-3", e: "ruta-4" }, casas: 4, urbanos: ["v2_mercado", "v2_tienda_toldo", "v2_casona", "v2_nave_granate", "v2_choza_redonda", "v2_cafeteria", "v2_tienda_marron", "v2_torre_agua"] },
  "ciudad-gram": { w: 50, h: 38, salidas: { o: "tunel-endosporico", e: "ruta-5" }, casas: 4 },
  "pueblo-levadura": { w: 32, h: 26, pueblo: true, banda1: 9, salidas: { o: "ruta-5", e: "ruta-6" }, casas: 2, estanque: true, urbanos: ["v2_casa_piedra", "v2_choza_redonda", "v2_torre_agua"] },
  "ciudad-aerobia": { w: 52, h: 38, salidas: { o: "ruta-6", e: "ruta-7" }, casas: 4, urbanos: ["v2_teatro", "v2_cristalera", "v2_tienda_cian", "v2_bloque_azul", "v2_bloque_naranja", "v2_cafeteria", "v2_tienda_moderna", "v2_oficina"] },
  "ciudad-agar": { w: 52, h: 38, salidas: { o: "ruta-7", e: "ruta-8" }, casas: 4, sustitutos: { "reserva-entrada": "v2_casona" } },
  "parque-biotec": { w: 54, h: 38, salidas: { o: "ruta-8", e: "ruta-9" }, casas: 3, sustitutos: { "instituto-1": "v2_bloque_verde" },
    urbanos: ["v2_cristalera", "v2_oficina", "v2_bloque_azul", "v2_bloque_crema", "v2_bloque_verde", "v2_tienda_moderna", "v2_cupula", "v2_bloque_amarillo"] },
  "ciudad-pili": { w: 50, h: 41, salidas: { o: "ruta-9" }, casas: 4, puerto: true },
  "isla-conjugada": { w: 50, h: 41, salidas: {}, casas: 3, puerto: true, hierbaAlta: true, sustitutos: { "mansion-1": "v2_mansion" } },
};

/** Sustituye las ciudades por las de la V2 y vuelve a enlazar las salidas de interiores y rutas. */
export function aplicarCiudadesV2() {
  for (const [id, c] of Object.entries(CIUDADES)) {
    if (!MAPS[id]) continue;
    const nuevo = construir(id, c);
    MAPS[id] = nuevo;
    // las rutas que entran en la ciudad ya no conservan la coordenada (la planta es otra)
    for (const m of Object.values(MAPS)) for (const w of m.warps) if (w.to === id) delete w.keep;
  }
  linkWarps();
}
