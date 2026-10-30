// Información de movimientos: descripción completa, icono de categoría, ficha de un movimiento
// y menú para elegir qué movimiento olvidar (con la ficha del que está seleccionado).
import type { Game, Overlay } from "../game";
import { Gfx, W, H, TYPE_COLORS, shade } from "../gfx";
import { getMove, type MoveData } from "../../engine/data";
import { displayName, type Microo } from "../../engine/microo";

const ESTADO: Record<string, string> = { brn: "desnaturalizar", frz: "congelar", par: "paralizar", psn: "intoxicar", tox: "intoxicar gravemente", slp: "dejar en latencia" };
const STAT: Record<string, string> = { atk: "el Ataque", def: "la Defensa", spa: "el Ataque Especial", spd: "la Defensa Especial", spe: "la Velocidad", accuracy: "la Precisión", evasion: "la Evasión" };
const VOLATIL: Record<string, string> = { confusion: "confundir", flinch: "hacer retroceder", partiallytrapped: "atrapar varios turnos" };
const ESPECIAL: Record<string, string> = {
  payday: "Al final del combate da créditos de laboratorio.", disable: "Bloquea el último movimiento del rival unos turnos.",
  rest: "Se pone en latencia 2 turnos y recupera todos los PS y estados.", struggle: "Último recurso cuando no quedan PP: también daña al usuario.",
  lowkick: "Hace más daño cuanto más pesado es el rival.", triattack: "Puede desnaturalizar, congelar o paralizar.",
  conversion: "Cambia su tipo al de su primer movimiento.", haze: "Anula todos los cambios de características de la placa.",
  superfang: "Quita la mitad de los PS que le queden al rival.", reflect: "Reduce el daño físico que recibe el equipo 5 turnos.",
  lightscreen: "Reduce el daño especial que recibe el equipo 5 turnos.", focusenergy: "Aumenta mucho la probabilidad de crítico.",
  razorwind: "Carga en el primer turno y ataca en el segundo.", skullbash: "Carga en el primer turno (sube la Defensa) y ataca en el segundo.",
  skyattack: "Carga en el primer turno y ataca en el segundo.", solarbeam: "Carga en el primer turno y ataca en el segundo.",
  dreameater: "Solo funciona si el rival está en latencia; recupera la mitad del daño.", minimize: "Sube mucho la Evasión.",
  bide: "Aguanta 2 turnos y devuelve el doble del daño recibido.", transform: "Copia la forma, tipos y movimientos del rival.",
  psywave: "Daño variable según el nivel del usuario.", metronome: "Usa un movimiento cualquiera al azar.",
  counter: "Devuelve el doble del daño físico recibido este turno.", mimic: "Copia el último movimiento del rival durante el combate.",
  highjumpkick: "Si falla, el usuario se hace daño.", jumpkick: "Si falla, el usuario se hace daño.", mirrormove: "Repite el último movimiento del rival.",
  leechseed: "Cada turno roba PS al rival y se los da al usuario.", dig: "Se esconde un turno y ataca en el siguiente.",
  fly: "Se esconde un turno y ataca en el siguiente.", teleport: "Huye de los combates contra Microos salvajes.", defensecurl: "Sube la Defensa.",
  rage: "Mientras lo usa, su Ataque sube cada vez que recibe daño.", splash: "No hace nada.", substitute: "Gasta un cuarto de sus PS en crear un señuelo que recibe los golpes.",
  blizzard: "Puede congelar.", thunder: "Puede paralizar.",
};
const OBJETIVO: Record<string, string> = { allAdjacentFoes: "Afecta a todos los rivales.", allAdjacent: "Afecta a todos los Microos de alrededor, aliados incluidos.", allySide: "Afecta a todo tu equipo.", all: "Afecta a toda la placa.", randomNormal: "Golpea a un rival al azar.", self: "", normal: "", any: "", scripted: "" };

export function nombreCategoria(cat: string) { return cat === "physical" ? "FÍSICO" : cat === "special" ? "ESPECIAL" : "ESTADO"; }

/** Descripción completa del movimiento a partir de su mecánica (y la nota del GDD). */
export function describir(mv: MoveData): string {
  const f: string[] = [];
  if (mv.category === "physical") f.push("Ataque físico: usa el Ataque del usuario contra la Defensa del rival.");
  else if (mv.category === "special") f.push("Ataque especial: usa el Ataque Especial contra la Defensa Especial del rival.");
  else f.push("Movimiento de estado: no hace daño directo.");
  if (mv.ohko) f.push("Debilita al rival de un golpe si acierta.");
  if (mv.damage === "level") f.push("Quita tantos PS como el nivel del usuario.");
  else if (typeof mv.damage === "number") f.push(`Quita siempre ${mv.damage} PS.`);
  if (mv.multihit) f.push(Array.isArray(mv.multihit) ? `Golpea de ${mv.multihit[0]} a ${mv.multihit[1]} veces.` : `Golpea ${mv.multihit} veces.`);
  if (mv.priority > 0) f.push("Ataca antes que el rival.");
  if (mv.priority < 0) f.push("Ataca después que el rival.");
  if (mv.critRatio && mv.critRatio > 1) f.push("Alta probabilidad de golpe crítico.");
  if (mv.drain) f.push(`Recupera ${Math.round((mv.drain[0] / mv.drain[1]) * 100)} % del daño causado.`);
  if (mv.recoil) f.push(`El usuario recibe ${Math.round((mv.recoil[0] / mv.recoil[1]) * 100)} % del daño causado.`);
  if (mv.heal) f.push(`Recupera ${Math.round((mv.heal[0] / mv.heal[1]) * 100)} % de los PS máximos.`);
  if (mv.selfdestruct) f.push("El usuario se debilita al usarlo.");
  if (mv.recharge) f.push("Tras usarlo, necesita un turno para recargar.");
  if (mv.status) f.push(`Intenta ${ESTADO[mv.status]} al rival.`);
  if (mv.volatileStatus && VOLATIL[mv.volatileStatus]) f.push(`Intenta ${VOLATIL[mv.volatileStatus]} al rival.`);
  const subir = (b: Partial<Record<string, number>>, quien: string) => {
    for (const [k, v] of Object.entries(b)) if (v) f.push(`${v > 0 ? "Sube" : "Baja"} ${STAT[k]} ${quien}${Math.abs(v) > 1 ? " mucho" : ""}.`);
  };
  if (mv.boosts) subir(mv.boosts, mv.target === "self" || mv.target === "allySide" ? "del usuario" : "del rival");
  if (mv.self?.boosts) subir(mv.self.boosts, "del usuario");
  if (mv.secondary) {
    const s = mv.secondary, p = `${s.chance} % de probabilidad de`;
    if (s.status) f.push(`${p} ${ESTADO[s.status]}.`);
    if (s.volatileStatus) f.push(`${p} ${VOLATIL[s.volatileStatus] ?? s.volatileStatus}.`);
    if (s.boosts) for (const [k, v] of Object.entries(s.boosts)) if (v) f.push(`${p} ${v > 0 ? "subir" : "bajar"} ${STAT[k]} del rival.`);
    if (s.self?.boosts) for (const [k, v] of Object.entries(s.self.boosts)) if (v) f.push(`${p} ${v > 0 ? "subir" : "bajar"} ${STAT[k]} del usuario.`);
  }
  if (mv.special && ESPECIAL[mv.special] && !f.some((x) => x.includes(ESPECIAL[mv.special!]))) f.push(ESPECIAL[mv.special]);
  if (mv.sideCondition === "mist") f.push("Protege al equipo de las bajadas de características.");
  if (mv.forceSwitch) f.push("Obliga al rival a cambiar o a huir.");
  if (OBJETIVO[mv.target]) f.push(OBJETIVO[mv.target]);
  if (mv.contact) f.push("Hace contacto.");
  // la nota del GDD, si añade algo (lo que va entre paréntesis)
  const nota = /\(([^)]+)\)/.exec(mv.desc)?.[1];
  if (nota && !/^\d/.test(nota)) f.push(nota.charAt(0).toUpperCase() + nota.slice(1) + (nota.endsWith(".") ? "" : "."));
  return f.join(" ");
}

/** Icono de categoría: estallido (físico), ondas (especial) o círculo (estado). */
export function iconoCategoria(g: Gfx, cat: string, x: number, y: number) {
  if (cat === "physical") {
    g.round(x, y, 14, 10, 3, "#a83820"); g.round(x + 1, y + 1, 12, 8, 2, "#f07038");
    g.rect(x + 3, y + 4, 8, 2, "#ffd060"); g.rect(x + 6, y + 2, 2, 6, "#ffd060");
  } else if (cat === "special") {
    g.round(x, y, 14, 10, 3, "#283880"); g.round(x + 1, y + 1, 12, 8, 2, "#5070d8");
    g.round(x + 4, y + 2, 6, 6, 3, "#a8c0ff"); g.round(x + 6, y + 4, 2, 2, 1, "#ffffff");
  } else {
    g.round(x, y, 14, 10, 3, "#585860"); g.round(x + 1, y + 1, 12, 8, 2, "#a0a0a8");
    g.round(x + 4, y + 2, 6, 6, 3, "#e8e8f0"); g.round(x + 5, y + 3, 4, 4, 2, "#a0a0a8");
  }
}

/** Ficha de un movimiento (dentro de un recuadro). */
export function dibujarFicha(g: Gfx, moveId: string, x: number, y: number, w: number, h: number, pp?: [number, number]) {
  const mv = getMove(moveId), col = TYPE_COLORS[mv.type] ?? "#a0a0a0";
  g.panel(x, y, w, h, "#ffffff", shade(col, 0.75), shade(col, -0.45), 6);
  g.text(g.fit(mv.name, w - 16), x + 8, y + 5);
  g.typeBadge(mv.type, x + 7, y + 20);
  const cx = x + 14 + g.measure(mv.type) + 8;
  iconoCategoria(g, mv.category, cx, y + 22);
  g.text(nombreCategoria(mv.category), cx + 18, y + 21, mv.category === "physical" ? "orange" : mv.category === "special" ? "blue" : "gray");
  const datos = [
    ["Potencia", mv.power ? `${mv.power}` : mv.ohko ? "K.O." : mv.damage ? "Fija" : "—"],
    ["Precisión", mv.accuracy === true ? "Siempre" : `${mv.accuracy} %`],
    ["PP", pp ? `${pp[0]}/${pp[1]}` : `${mv.pp}`],
  ];
  let dy = y + 64;
  if (w >= 200) datos.forEach(([k, v], i) => { const dx = x + 8 + i * Math.floor((w - 16) / 3); g.text(k, dx, y + 36, "gray"); g.text(v, dx, y + 48); });
  else { datos.forEach(([k, v], i) => { g.text(k, x + 8, y + 36 + i * 12, "gray"); g.text(v, x + w - 8 - g.measure(v), y + 36 + i * 12); }); dy = y + 76; }
  g.wrap(describir(mv), w - 16).slice(0, Math.floor((y + h - dy - 4) / 12)).forEach((l, i) => g.text(l, x + 8, dy + i * 12));
}

/** Pantalla con la ficha de un movimiento (en combate, con START). */
export class MoveDetail implements Overlay {
  constructor(public move: string, public pp?: [number, number]) {}
  update(game: Game) { return game.input.pressed("a") || game.input.pressed("b") || game.input.pressed("start"); }
  draw(g: Gfx) {
    g.alpha(0.55, () => g.rect(0, 0, W, H, "#000"));
    dibujarFicha(g, this.move, 8, 8, W - 16, H - 16, this.pp);
  }
}

/** Elegir qué movimiento olvidar: los cuatro actuales y el nuevo, con la ficha del seleccionado.
 *  Devuelve el índice (0-3) o -1 si no aprende el nuevo. */
export class MoveForget implements Overlay {
  sel = 0; result = -1;
  constructor(public mon: Microo, public nuevo: string) {}
  update(game: Game) {
    const i = game.input;
    if (i.repeat("down")) this.sel = (this.sel + 1) % 5;
    if (i.repeat("up")) this.sel = (this.sel + 4) % 5;
    if (i.pressed("b")) { this.result = -1; return true; }
    if (i.pressed("a")) { this.result = this.sel === 4 ? -1 : this.sel; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    g.pattern("#e8e0f0", "#ddd4ea", game.frame, "#c8c0e0");
    g.rect(0, 0, W, 16, "#384058");
    g.text(g.fit(`¿Qué movimiento olvida ${displayName(this.mon)}?`, W - 8), 4, 2, "white", false);
    const filas = [...this.mon.moves.map((s) => ({ id: s.id, pp: [s.pp, s.maxPp] as [number, number] })), { id: this.nuevo, pp: undefined }];
    filas.forEach((f, i) => {
      const mv = getMove(f.id), col = TYPE_COLORS[mv.type] ?? "#a0a0a0", y = 19 + i * 20 + (i === 4 ? 12 : 0), on = i === this.sel;
      g.panel(4, y, 112, 18, on ? shade(col, 0.55) : shade(col, 0.25), col, on ? "#f8d038" : shade(col, -0.5), 4);
      iconoCategoria(g, mv.category, 8, y + 4);
      g.text(g.fit(mv.name, 88), 25, y + 3, "white");
      if (i === 4) g.text("NUEVO", 6, y - 11, "red", false);
    });
    dibujarFicha(g, filas[this.sel].id, 120, 19, W - 124, H - 23, filas[this.sel].pp);
    if (this.sel === 4) g.text("(A: no aprenderlo)", 8, H - 13, "gray", false);
  }
}
