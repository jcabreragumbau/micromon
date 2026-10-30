// Menús: inicio, equipo, resumen, mochila, Microdex, ficha, guardado, opciones y tienda.
import type { Game, Overlay } from "../game";
import { MAPS } from "../world/maps";
import { audio } from "../audio";
import { Gfx, W, H, TB, shade, TYPE_COLORS } from "../gfx";
import type { Overworld } from "./overworld";
import { SPECIES, ITEMS, TRAINERS, getMove, getSpecies, type ItemData } from "../../engine/data";
import { displayName, NATURES, itemEvolution, expForLevel, plasmidCompatible, replaceMove, type Microo } from "../../engine/microo";
import { applyItemOutOfBattleLike, type Battle } from "../../engine/battle";
import { saveGame, playTime, addItem, AVATAR_SPRITE, OBEY_CAPS } from "../state";
import { evolutionSequence } from "./battle";
import { ponerMote } from "./nombre";

const MENU_DOT = ["#e84848", "#48a0e8", "#f0b030", "#48c068", "#a060d8", "#808898", "#e86898"];
const STATUS_COL: Record<string, string> = { brn: "#e86030", frz: "#58b8e8", par: "#d8b820", psn: "#a050c0", tox: "#a050c0", slp: "#8890a0" };
const TYPE_C = (t: string) => TYPE_COLORS[t] ?? "#a0a0a0";
const STATUS_SHORT: Record<string, string> = { brn: "DES", frz: "CON", par: "PAR", psn: "TOX", tox: "TOX", slp: "LAT" };

// ---------------------------------------------------------------- menú de inicio
export async function openStartMenu(game: Game, world: Overworld) {
  const s = game.state;
  for (;;) {
    const opts: [string, string][] = [];
    if (s.flags.microdex) opts.push(["MICRODEX", "dex"]);
    if (s.party.length) opts.push(["MICROOS", "party"]);
    opts.push(["MOCHILA", "bag"], [s.name.toUpperCase(), "card"], ["MEDALLERO", "medals"], ["GUARDAR", "save"], ["OPCIONES", "opt"], ["SALIR", "exit"]);
    const i = await game.run<number>(new StartMenu(opts.map((o) => o[0])));
    if (i < 0 || opts[i][1] === "exit") return;
    const k = opts[i][1];
    if (k === "dex") await game.run(new DexScreen());
    if (k === "party") await partyMenu(game, { mode: "view" });
    if (k === "bag") await bagMenu(game, { mode: "field" });
    if (k === "card") await game.run(new CardScreen());
    if (k === "medals") await game.run(new BadgeCase());
    if (k === "save") {
      if (await game.yesno("¿Quieres guardar la partida?")) {
        const ok = saveGame(s);
        await game.say(ok ? `{nombre} ha guardado la partida.` : "No se ha podido guardar: el navegador no permite almacenamiento aquí.");
      }
      return;
    }
    if (k === "opt") await options(game);
    void world;
  }
}
class StartMenu implements Overlay {
  sel = 0; result = -1;
  constructor(public opts: string[]) {}
  update(game: Game) {
    const n = this.opts.length;
    if (game.input.repeat("down")) this.sel = (this.sel + 1) % n;
    if (game.input.repeat("up")) this.sel = (this.sel + n - 1) % n;
    if (game.input.pressed("a")) { this.result = this.sel; return true; }
    if (game.input.pressed("b") || game.input.pressed("start")) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx) {
    const w = 92, h = this.opts.length * 18 + 8, x = W - w - 3, y = 3;
    g.panel(x, y, w, h, "#f8f8f8", "#d8e0e8", "#384058", 5);
    this.opts.forEach((o, i) => {
      const yy = y + 4 + i * 18, sel = i === this.sel;
      if (sel) g.panel(x + 3, yy, w - 6, 17, "#ffd890", "#f09838", "#b05818", 3);
      g.rect(x + 9, yy + 5, 7, 7, sel ? "#ffffff" : MENU_DOT[i % MENU_DOT.length]);
      g.rect(x + 10, yy + 6, 5, 5, sel ? "#f09838" : shade(MENU_DOT[i % MENU_DOT.length], 0.4));
      g.text(o, x + 22, yy + 4, "dark");
    });
  }
}

async function options(game: Game) {
  const s = game.state;
  const sp = await game.choose(["Texto lento", "Texto normal", "Texto rápido"], { prompt: "Velocidad del texto:", x: 140, y: 40, cancel: 999 });
  if (sp >= 0) s.textSpeed = ([1, 2, 4] as const)[sp];
  const d = await game.choose(["Fácil · Medio Rico", "Normal · Medio Selectivo", "Difícil · Presión Antibiótica"], { prompt: "Dificultad (Condiciones de Incubación):", x: 70, y: 40, cancel: 999 });
  if (d >= 0) s.difficulty = (["facil", "normal", "dificil"] as const)[d];
  const mu = await game.choose(["Música: SÍ", "Música: NO"], { prompt: "¿Música?", x: 150, y: 50, cancel: 999 });
  if (mu >= 0) { s.flags.sinMusica = mu === 1; audio.musicOn = mu === 0; if (mu === 1) audio.stopMusic(); }
  const fx = await game.choose(["Efectos: SÍ", "Efectos: NO"], { prompt: "¿Efectos de sonido?", x: 150, y: 50, cancel: 999 });
  if (fx >= 0) { s.flags.sinEfectos = fx === 1; audio.sfxOn = fx === 0; }
}

// ---------------------------------------------------------------- equipo
export interface PartyOpts { mode: "view" | "switch" | "replace" | "item"; battle?: Battle; prompt?: string; filter?: (m: Microo) => boolean }
export async function partyMenu(game: Game, o: PartyOpts): Promise<number> {
  for (;;) {
    const idx = await game.run<number>(new PartyScreen(game, o));
    if (idx < 0) { if (o.mode === "replace") continue; return -1; }
    const m = game.state.party[idx];
    if (o.mode === "item") return idx;
    if (o.mode === "switch" || o.mode === "replace") {
      const active = o.battle?.sides[0].active.some((b) => b?.party === idx);
      if (m.hp <= 0) { await game.say(`¡${displayName(m)} no tiene fuerzas para luchar!`); continue; }
      if (active) { await game.say(`¡${displayName(m)} ya está en la placa!`); continue; }
      return idx;
    }
    // modo ver
    const c = await game.choose(["RESUMEN", "MOVER", "MOTE", "SALIR"], { x: 160, y: 56, cancel: 3 });
    if (c === 0) await game.run(new SummaryScreen(m));
    if (c === 2) {
      if (m.originalTrainer && m.originalTrainer !== game.state.name) await game.say(`${displayName(m)} viene de otro investigador: no le puedes cambiar el mote.`);
      else await ponerMote(game, m, false);
    }
    if (c === 1) {
      const j = await game.run<number>(new PartyScreen(game, { mode: "item", prompt: `¿Con quién intercambiar a ${displayName(m)}?` }));
      if (j >= 0 && j !== idx) { const p = game.state.party; [p[idx], p[j]] = [p[j], p[idx]]; }
    }
  }
}
class PartyScreen implements Overlay {
  sel = 0; result = -1;
  constructor(public game: Game, public o: PartyOpts) {}
  update(game: Game) {
    const n = game.state.party.length, inp = game.input;
    if (inp.repeat("down")) this.sel = this.sel === n ? 0 : this.sel + 2 < n ? this.sel + 2 : n;
    if (inp.repeat("up")) this.sel = this.sel === n ? n - 1 : this.sel >= 2 ? this.sel - 2 : n;
    if (inp.repeat("right") && this.sel < n && this.sel % 2 === 0 && this.sel + 1 < n) this.sel++;
    if (inp.repeat("left") && this.sel < n && this.sel % 2 === 1) this.sel--;
    if (game.input.pressed("a")) { this.result = this.sel === n ? -1 : this.sel; return true; }
    if (game.input.pressed("b")) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    g.pattern("#58a880", "#68b890", game.frame, "#388868");
    const p = game.state.party;
    for (let i = 0; i < 6; i++) {
      const x = 4 + (i % 2) * 125, y = 4 + Math.floor(i / 2) * 49, m = p[i];
      if (!m) { g.panel(x, y, 123, 46, "#88b8a0", "#78a890", "#4a7a64", 6); continue; }
      const sel = i === this.sel, fainted = m.hp <= 0;
      const [t, b, br] = fainted ? ["#f0b0a8", "#c87870", "#803838"] : sel ? ["#fff0b0", "#f8b848", "#c06818"] : i === 0 ? ["#c8f0ff", "#68b8e8", "#2a6898"] : ["#d8ecff", "#88b0e0", "#384c88"];
      g.panel(x, y, 123, 46, t, b, br, 6);
      if (sel) g.alpha(0.6, () => g.round(x + 2, y + 2, 119, 42, 5, "#ffffff00"));
      g.round(x + 4, y + 5, 30, 30, 15, "rgba(255,255,255,0.35)");
      const bounce = sel && Math.floor(game.frame / 8) % 2 ? -2 : 0;
      g.icon(m.species, sel ? Math.floor(game.frame / 8) % 2 : 0, x + 3, y + 2 + bounce);
      g.text(displayName(m), x + 37, y + 5, fainted ? "gray" : "dark");
      g.text(`Nv${m.level}`, x + 37, y + 18, "dark");
      if (m.status) { g.round(x + 72, y + 17, 24, 11, 3, STATUS_COL[m.status]); g.text(STATUS_SHORT[m.status], x + 75, y + 18, "white", false); }
      const f = m.hp / m.stats.hp;
      g.round(x + 34, y + 31, 85, 11, 3, "#384058");
      g.text("PS", x + 36, y + 31, "orange", false);
      g.bar(x + 50, y + 34, 66, f, g.hpColor(f), 4);
      const hp = `${m.hp}/${m.stats.hp}`;
      g.text(hp, x + 119 - g.measure(hp), y + 18, "dark");
    }
    const csel = this.sel === p.length;
    g.panel(W - 68, H - 38, 64, 34, csel ? "#fff0b0" : "#f0f0f0", csel ? "#f8b848" : "#c0c8d0", csel ? "#c06818" : "#384058", 6);
    g.text("SALIR", W - 36 - g.measure("SALIR") / 2, H - 26, "dark");
    const msg = this.o.prompt ?? { view: "Elige un Microo.", switch: "¿Qué Microo sacar?", replace: "¡Elige el siguiente Microo!", item: "¿En qué Microo usarlo?" }[this.o.mode];
    g.panel(4, H - 38, W - 76, 34, "#ffffff", "#e8e8e0", "#384058", 6);
    g.wrap(msg, W - 92).slice(0, 2).forEach((l, i) => g.text(l, 12, H - 31 + i * 13));
  }
}

// ---------------------------------------------------------------- resumen
class SummaryScreen implements Overlay {
  page = 0;
  constructor(public m: Microo) {}
  update(game: Game) {
    if (game.input.pressed("right") || game.input.pressed("left")) this.page = 1 - this.page;
    return game.input.pressed("b") || game.input.pressed("a");
  }
  draw(g: Gfx, game: Game) {
    const m = this.m, sp = getSpecies(m.species);
    const main = sp.types[0];
    g.pattern("#e8e0f0", "#ddd4ea", game.frame, "#c8c0e0");
    // cabecera con pestañas
    g.rect(0, 0, W, 20, "#384058"); g.rect(0, 18, W, 2, "#202838");
    ["INFO", "MOVIMIENTOS"].forEach((t, i) => {
      const x = 112 + i * 72, on = this.page === i;
      g.panel(x, 3, 68, 17, on ? "#ffd890" : "#8890a8", on ? "#f09838" : "#606880", on ? "#b05818" : "#202838", 4);
      g.text(t, x + 34 - g.measure(t) / 2, 6, on ? "dark" : "white", on);
    });
    g.text(`Nº${String(sp.dex).padStart(3, "0")}`, 6, 5, "white", false);
    // retrato del Microo
    g.panel(4, 24, 104, 94, shade(TYPE_C(main), 0.55), shade(TYPE_C(main), 0.1), shade(TYPE_C(main), -0.5), 6);
    g.alpha(0.18, () => g.round(24, 96, 64, 14, 7, "#000000"));
    const bob = Math.floor(game.frame / 20) % 2;
    g.microo(m.species, "frente", 16, 28 + bob, 1);
    g.panel(4, 121, 104, 67, "#ffffff", "#e8e8f0", "#384058", 5);
    g.text(g.fit(displayName(m), 64), 10, 125);
    g.text(`Nv${m.level}`, 102 - g.measure(`Nv${m.level}`), 125, "blue");
    g.typeBadges(sp.types, 9, 139, 94);
    const lo = expForLevel(sp.growth, m.level), hi = expForLevel(sp.growth, m.level + 1);
    g.text("EXP", 10, 174, "gray");
    g.bar(30, 177, 72, m.level >= 100 ? 1 : Math.min(1, Math.max(0, (m.exp - lo) / Math.max(1, hi - lo))), "#40a8f0", 3);
    if (this.page === 0) {
      const nat = NATURES[m.nature];
      g.panel(112, 24, W - 116, 46, "#ffffff", "#e8e8f0", "#384058", 5);
      g.text("Organismo", 118, 28, "blue");
      g.wrap(sp.organism || sp.name, W - 130).slice(0, 2).forEach((l, i) => g.text(l, 118, 41 + i * 12));
      g.panel(112, 73, W - 116, 115, "#ffffff", "#e8e8f0", "#384058", 5);
      g.text(`Naturaleza ${nat[0]}`, 118, 77, "dark");
      const st: [string, number, string][] = [["PS", m.stats.hp, "hp"], ["Ataque", m.stats.atk, "atk"], ["Defensa", m.stats.def, "def"],
        ["At. Esp.", m.stats.spa, "spa"], ["Def. Esp.", m.stats.spd, "spd"], ["Velocidad", m.stats.spe, "spe"]];
      st.forEach(([k, v, key], i) => {
        const y = 92 + i * 15;
        if (i % 2 === 0) g.rect(115, y - 2, W - 122, 14, "#eef0f8");
        const up = nat[1] === key, down = nat[2] === key && nat[1] !== nat[2];
        g.text(k, 118, y, up ? "red" : down ? "blue" : "dark");
        const val = key === "hp" ? `${m.hp}/${v}` : `${v}`;
        g.text(val, 206 - g.measure(val), y);
        g.bar(210, y + 3, 32, Math.min(1, v / (m.level * 2.2 + 20)), key === "hp" ? g.hpColor(m.hp / v) : "#58b0e8", 3);
      });
    } else {
      for (let i = 0; i < 4; i++) {
        const y = 24 + i * 41, s = m.moves[i];
        if (!s) { g.panel(112, y, W - 116, 38, "#d8d8e0", "#c8c8d0", "#808898", 5); g.text("-", 180, y + 13, "gray"); continue; }
        const mv = getMove(s.id);
        g.panel(112, y, W - 116, 38, "#ffffff", shade(TYPE_C(mv.type), 0.7), shade(TYPE_C(mv.type), -0.45), 5);
        const pp0 = `PP ${s.pp}/${s.maxPp}`;
        g.text(g.fit(mv.name, W - 126 - g.measure(pp0) - 6), 118, y + 4);
        g.typeBadge(mv.type, 117, y + 21);
        const cat = mv.category === "physical" ? "Físico" : mv.category === "special" ? "Especial" : "Estado";
        g.text(cat, 117 + g.measure(mv.type) + 14, y + 22, "gray");
        const pp = `PP ${s.pp}/${s.maxPp}`;
        g.text(pp, W - 8 - g.measure(pp), y + 4, s.pp === 0 ? "red" : "dark");
        if (mv.power) g.text(`${mv.power}`, W - 8 - g.measure(`${mv.power}`), y + 22, "dark");
      }
    }
  }
}

// ---------------------------------------------------------------- mochila
const POCKET_COL = ["#d85858", "#3878d0", "#9858c8", "#d89830"];
const POCKETS: [string, ItemData["kind"][]][] = [["MEDIOS", ["heal", "cure", "revive", "pp"]], ["CRIOBOLAS", ["ball"]], ["PLÁSMIDOS", ["tm", "evolution"]], ["CLAVE", ["key"]]];
export async function bagMenu(game: Game, o: { mode: "field" | "battle"; wild?: boolean }): Promise<{ item: string; target?: number } | null> {
  const screen = new BagScreen();
  for (;;) {
    const id = await game.run<string | null>(screen);
    if (!id) return null;
    const it = ITEMS.get(id)!;
    if (o.mode === "battle") {
      if (it.kind === "ball") return { item: id };
      if (["heal", "cure", "revive", "pp"].includes(it.kind)) {
        const t = await partyMenu(game, { mode: "item" });
        if (t < 0) continue;
        const m = game.state.party[t];
        const would = (it.kind === "heal" && m.hp > 0 && m.hp < m.stats.hp) || (it.kind === "cure" && !!m.status && m.hp > 0) || (it.kind === "revive" && m.hp <= 0) || it.kind === "pp";
        if (!would) { await game.say("No tendría ningún efecto."); continue; }
        return { item: id, target: t };
      }
      await game.say("¡Ahora no es momento de usar eso!"); continue;
    }
    // Uso fuera de combate
    if (["heal", "cure", "revive", "pp"].includes(it.kind)) {
      const t = await partyMenu(game, { mode: "item" });
      if (t < 0) continue;
      const msgs: string[] = [];
      if (applyItemOutOfBattleLike(game.state.party[t], id, (x) => msgs.push(x))) addItem(game.state, id, -1);
      for (const x of msgs) await game.say(x);
    } else if (it.kind === "evolution") {
      const t = await partyMenu(game, { mode: "item" });
      if (t < 0) continue;
      const m = game.state.party[t];
      const to = itemEvolution(m, id);
      if (!to) { await game.say("No tendría ningún efecto."); continue; }
      addItem(game.state, id, -1);
      await evolutionSequence(game, m, to);
    } else if (it.kind === "tm" && it.move) {
      await enseñarPlasmido(game, it.move);
    } else if (it.kind === "ball") await game.say("Las Criobolas se usan en combate contra Microos salvajes.");
    else await game.say(it.desc);
  }
}
class BagScreen implements Overlay {
  pocket = 0; sel = 0; result: string | null = null;
  items(game: Game) { const k = POCKETS[this.pocket][1]; return Object.keys(game.state.bag).filter((i) => k.includes(ITEMS.get(i)?.kind as ItemData["kind"])).sort((a, b) => (ITEMS.get(a)!.kind === "tm" ? 1 : 0) - (ITEMS.get(b)!.kind === "tm" ? 1 : 0) || (ITEMS.get(a)!.kind === "tm" ? ITEMS.get(a)!.name.localeCompare(ITEMS.get(b)!.name) : 0)); }
  update(game: Game) {
    const its = this.items(game);
    const inp = game.input;
    if (inp.pressed("right")) { this.pocket = (this.pocket + 1) % POCKETS.length; this.sel = 0; }
    if (inp.pressed("left")) { this.pocket = (this.pocket + POCKETS.length - 1) % POCKETS.length; this.sel = 0; }
    if (inp.repeat("down")) this.sel = Math.min(its.length, this.sel + 1);
    if (inp.repeat("up")) this.sel = Math.max(0, this.sel - 1);
    if (inp.pressed("b")) { this.result = null; return true; }
    if (inp.pressed("a")) { this.result = this.sel < its.length ? its[this.sel] : null; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    const col = POCKET_COL[this.pocket];
    g.pattern(shade(col, 0.55), shade(col, 0.42), game.frame, shade(col, 0.2));
    // bolsa dibujada
    const bx = 14, by = 30;
    g.round(bx + 4, by + 50, 64, 10, 5, "rgba(0,0,0,0.2)");
    g.panel(bx, by + 8, 72, 50, shade(col, 0.15), shade(col, -0.3), shade(col, -0.65), 10);
    g.panel(bx + 6, by, 60, 26, shade(col, 0.3), shade(col, -0.15), shade(col, -0.65), 8);
    g.round(bx + 30, by + 18, 12, 12, 4, "#f0d060"); g.round(bx + 32, by + 20, 8, 8, 3, "#c89828");
    g.rect(bx + 10, by + 34, 52, 2, shade(col, -0.4));
    // nombre del bolsillo y puntos
    g.panel(4, 98, 98, 22, "#ffffff", "#e0e0e8", "#384058", 5);
    const name = POCKETS[this.pocket][0];
    g.text("◀", 9, 103, "gray", false); g.text("▶", 91, 103, "gray", false);
    g.text(name, 53 - g.measure(name) / 2, 103);
    POCKETS.forEach((_, i) => g.round(30 + i * 12, 124, 8, 8, 4, i === this.pocket ? POCKET_COL[i] : "#ffffff"));
    g.panel(4, 136, 98, 18, "#fff8d0", "#f0d890", "#806020", 5);
    g.text(`${game.state.money} cr.`, 53 - g.measure(`${game.state.money} cr.`) / 2, 139);
    // lista
    g.panel(106, 4, W - 110, 150, "#ffffff", "#eef0f4", "#384058", 6);
    const its = this.items(game);
    const off = Math.max(0, this.sel - 7);
    const rows = [...its.slice(off, off + 9).map((id) => [ITEMS.get(id)!.name, ITEMS.get(id)!.kind === "tm" ? "" : `×${game.state.bag[id]}`]), ...(its.length - off < 9 ? [["CERRAR", ""]] : [])];
    rows.forEach(([n, q], i) => {
      const y = 9 + i * 16, sel = off + i === this.sel;
      if (sel) g.panel(109, y - 2, W - 116, 16, "#ffe8a0", "#f8c050", "#c07018", 3);
      else if (i % 2) g.rect(110, y - 2, W - 118, 16, "#f0f2f8");
      g.text(g.fit(n, W - 132 - (q ? g.measure(q) + 4 : 0)), 116, y + 1, "dark");
      if (q) g.text(q, W - 12 - g.measure(q), y + 1, "dark");
    });
    g.panel(4, 157, W - 8, 32, "#ffffff", "#e8e8e0", "#384058", 6);
    const id = its[this.sel];
    const d = id ? ITEMS.get(id)!.desc : "Cerrar la mochila.";
    g.wrap(d, W - 24).slice(0, 2).forEach((l, i) => g.text(l, 12, 161 + i * 13));
  }
}

// ---------------------------------------------------------------- Microdex
class DexScreen implements Overlay {
  sel = 0;
  list = [...SPECIES.values()].sort((a, b) => a.dex - b.dex);
  update(game: Game) {
    const n = this.list.length;
    if (game.input.repeat("down")) this.sel = Math.min(n - 1, this.sel + 1);
    if (game.input.repeat("up")) this.sel = Math.max(0, this.sel - 1);
    if (game.input.repeat("right")) this.sel = Math.min(n - 1, this.sel + 8);
    if (game.input.repeat("left")) this.sel = Math.max(0, this.sel - 8);
    if (game.input.pressed("a") && game.state.seen.includes(this.list[this.sel].id)) game.run(new DexDetail(this.list[this.sel].id));
    return game.input.pressed("b");
  }
  draw(g: Gfx, game: Game) {
    const s = game.state;
    g.clear("#c83838");
    g.rect(0, 0, W, 20, "#a02828"); g.rect(0, 20, W, 2, "#701818");
    g.round(4, 3, 14, 14, 7, "#f8f8f8"); g.round(6, 5, 10, 10, 5, "#48b8f0"); g.rect(8, 7, 3, 3, "#d8f4ff");
    [["#f84848", 24], ["#f8d838", 32], ["#58d858", 40]].forEach(([c, x]) => g.round(x as number, 6, 6, 6, 3, c as string));
    g.text("MICRODEX", 54, 5, "white");
    const cnt = `Vistos ${s.seen.length}  Aislados ${s.caught.length}`;
    g.text(cnt, W - 6 - g.measure(cnt), 5, "white");
    // pantalla del Microo
    const sp = this.list[this.sel];
    const seen = s.seen.includes(sp.id), caught = s.caught.includes(sp.id);
    g.round(4, 26, 120, 112, 6, "#202830");
    g.panel(7, 29, 114, 106, seen ? shade(TYPE_C(sp.types[0]), 0.7) : "#d0d8d8", seen ? shade(TYPE_C(sp.types[0]), 0.25) : "#a8b0b0", "#283040", 4);
    g.alpha(0.12, () => { for (let x = 10; x < 120; x += 8) g.rect(x, 30, 1, 104, "#000"); for (let y = 32; y < 134; y += 8) g.rect(8, y, 112, 1, "#000"); });
    if (seen) g.microo(sp.id, "frente", 24, 40 + (Math.floor(game.frame / 24) % 2), 1);
    else g.text("?", 60, 76, "gray");
    g.panel(4, 142, 120, 46, "#ffffff", "#e8e8f0", "#384058", 5);
    if (seen) {
      g.text(sp.name, 10, 145);
      const th = g.typeBadges(sp.types, 9, 158, 110);
      if (th < 20) g.text(g.fit(caught ? sp.organism || "Sin datos." : "Aún no aislado.", 108), 10, 174, "gray");
    } else g.text("Sin datos.", 10, 150, "gray");
    // lista
    g.panel(128, 26, W - 132, H - 30, "#304060", "#203048", "#101828", 5);
    const off = Math.max(0, Math.min(this.list.length - 10, this.sel - 4));
    this.list.slice(off, off + 10).forEach((e, i) => {
      const y = 30 + i * 16, sel = off + i === this.sel;
      const sn = s.seen.includes(e.id), ca = s.caught.includes(e.id);
      if (sel) g.panel(131, y, W - 138, 15, "#ffe8a0", "#f8b848", "#c06818", 3);
      if (ca) { g.round(135, y + 4, 8, 8, 4, "#f04848"); g.rect(135, y + 7, 8, 2, "#ffffff"); }
      g.text(String(e.dex).padStart(3, "0"), 147, y + 2, sel ? "dark" : "white", sel);
      g.text(sn ? e.name : "----------", 171, y + 2, sel ? "dark" : sn ? "white" : "gray", sel);
    });
    const frac = this.sel / Math.max(1, this.list.length - 1);
    g.rect(W - 8, 30, 2, H - 38, "#506080"); g.rect(W - 9, 30 + Math.round(frac * (H - 44)), 4, 6, "#f8d838");
  }
}

class CardScreen implements Overlay {
  update(game: Game) { return game.input.pressed("a") || game.input.pressed("b"); }
  draw(g: Gfx, game: Game) {
    const s = game.state;
    g.pattern("#5080c8", "#5888d0", game.frame, "#3060a8");
    g.panel(8, 8, W - 16, H - 16, "#f8f4e0", "#e8d8a8", "#604820", 8);
    g.panel(14, 14, W - 28, 18, "#f8c058", "#e08828", "#804010", 4);
    g.text("FICHA DE INVESTIGACIÓN", 22, 17, "white");
    g.panel(W - 76, 38, 56, 64, "#c8e8f8", "#88b8e0", "#305080", 5);
    g.character(AVATAR_SPRITE[s.avatar], 0, Math.floor(game.frame / 16) % 3 === 1 ? 1 : 0, W - 64, 56);
    const rows: [string, string][] = [["Nombre", s.name], ["Créditos", `${s.money}`], ["Microdex", `${s.caught.length} aislados`], ["Tiempo", playTime(s)], ["Dificultad", { facil: "Fácil", normal: "Normal", dificil: "Difícil" }[s.difficulty]]];
    rows.forEach(([k, v], i) => { const y = 40 + i * 15; if (i % 2 === 0) g.rect(18, y - 2, W - 102, 14, "rgba(160,120,40,0.15)"); g.text(k, 22, y, "blue"); g.text(v, 98, y); });
    g.text("Medallas", 22, 122, "blue");
    BADGES.forEach((b, i) => {
      const x = 22 + i * 27, y = 136;
      g.round(x - 1, y - 1, 26, 26, 6, "rgba(96,72,32,0.18)");
      g.medal(b.id, x, y, 24, s.badges.includes(b.id));
    });
  }
}

// ---------------------------------------------------------------- tienda
export async function shopMenu(game: Game, stock: string[]) {
  for (;;) {
    const opts = stock.map((id) => `${ITEMS.get(id)!.name}`);
    await game.say(`¿Qué quieres comprar? Tienes ${game.state.money} créditos.`, { keep: true });
    const i = await game.run<number>(new ShopList(stock));
    game.popKept();
    if (i < 0) return;
    const it = ITEMS.get(stock[i])!;
    if (it.kind === "tm") {
      if (game.state.bag[it.id]) { await game.say("Ya tienes ese plásmido. ¡No se gasta al usarlo!"); continue; }
      if (game.state.money < it.price) { await game.say("No tienes suficientes créditos."); continue; }
      if (!(await game.yesno(`${it.name} cuesta ${it.price} créditos. ¿Lo compras?`))) continue;
      game.state.money -= it.price; addItem(game.state, it.id, 1); audio.sfx("ok");
      await game.say(`¡Has comprado ${it.name}! Úsalo desde la mochila para enseñar el movimiento.`);
      continue;
    }
    const max = Math.min(99, Math.floor(game.state.money / it.price));
    if (max <= 0) { await game.say("No tienes suficientes créditos."); continue; }
    const q = await game.run<number>(new Quantity(it.price, max));
    if (q <= 0) continue;
    if (!(await game.yesno(`${opts[i]} ×${q} cuesta ${it.price * q} créditos. ¿De acuerdo?`))) continue;
    game.state.money -= it.price * q;
    addItem(game.state, it.id, q);
    await game.say("¡Aquí tienes! Gracias por tu compra.");
  }
}
class ShopList implements Overlay {
  sel = 0; result = -1;
  constructor(public stock: string[]) {}
  update(game: Game) {
    const n = this.stock.length + 1;
    if (game.input.repeat("down")) this.sel = (this.sel + 1) % n;
    if (game.input.repeat("up")) this.sel = (this.sel + n - 1) % n;
    if (game.input.pressed("b")) { this.result = -1; return true; }
    if (game.input.pressed("a")) { this.result = this.sel === this.stock.length ? -1 : this.sel; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    game.keptDialog?.draw(g, game);
    const all = [...this.stock.map((id) => [ITEMS.get(id)!.name, `${ITEMS.get(id)!.price}`, id]), ["SALIR", "", ""]];
    const VIS = 8, off = Math.max(0, Math.min(this.sel - VIS + 2, all.length - VIS));
    const rows = all.slice(off, off + VIS);
    g.panel(70, 3, 182, rows.length * 16 + 10, "#ffffff", "#e8eef4", "#384058", 6);
    rows.forEach(([n, p, id], k) => {
      const i = off + k, y = 8 + k * 16, sel = i === this.sel;
      if (sel) g.panel(73, y - 2, 176, 16, "#ffe8a0", "#f8c050", "#c07018", 3);
      const owned = id && ITEMS.get(id)?.kind === "tm" && game.state.bag[id];
      const pr = owned ? "TIENES" : p ? `${p} cr.` : "";
      g.text(g.fit(n, 168 - g.measure(pr) - 6), 78, y + 1, owned ? "gray" : "dark");
      if (pr) g.text(pr, 246 - g.measure(pr), y + 1, owned ? "gray" : "dark");
    });
    if (off > 0) g.text("▲", 238, 2, "gray", false);
    if (off + VIS < all.length) g.text("▼", 238, rows.length * 16 + 4, "gray", false);
  }
}
class Quantity implements Overlay {
  q = 1; result = 0;
  constructor(public price: number, public max: number) {}
  update(game: Game) {
    if (game.input.repeat("up")) this.q = Math.min(this.max, this.q + 1);
    if (game.input.repeat("down")) this.q = Math.max(1, this.q - 1);
    if (game.input.repeat("right")) this.q = Math.min(this.max, this.q + 10);
    if (game.input.repeat("left")) this.q = Math.max(1, this.q - 10);
    if (game.input.pressed("a")) { this.result = this.q; return true; }
    if (game.input.pressed("b")) { this.result = 0; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.panel(140, 80, 110, 32, "#ffffff", "#e8eef4", "#384058", 6);
    g.text("▲", 150, 82, "gray", false); g.text("▼", 150, 100, "gray", false);
    g.text(`×${String(this.q).padStart(2, "0")}`, 160, 91);
    const t = `${this.q * this.price} cr.`; g.text(t, 242 - g.measure(t), 91);
  }
}

// ---------------------------------------------------------------- Congelador de cepas (PC)
export async function congeladorMenu(game: Game) {
  const s = game.state;
  for (;;) {
    await game.say(`Congelador de cepas a -80 °C. Hay ${s.box.length} Microos congelados.`, { keep: true });
    const c = await game.choose(["RETIRAR", "DEPOSITAR", "SALIR"], { x: 170, y: 60, cancel: 2 });
    game.popKept();
    if (c === 2 || c < 0) return;
    if (c === 0) {
      if (!s.box.length) { await game.say("El congelador está vacío."); continue; }
      if (s.party.length >= 6) { await game.say("Tu equipo ya está completo. Deposita antes algún Microo."); continue; }
      const i = await game.run<number>(new BoxScreen(game));
      if (i < 0) continue;
      const [m] = s.box.splice(i, 1);
      s.party.push(m);
      await game.say(`${displayName(m)} se ha descongelado y se une a tu equipo.`);
    } else {
      if (s.party.length <= 1) { await game.say("No puedes quedarte sin Microos en el equipo."); continue; }
      const i = await partyMenu(game, { mode: "item", prompt: "¿Qué Microo quieres congelar?" });
      if (i < 0) continue;
      if (s.party.filter((m, k) => k !== i && m.hp > 0).length === 0) { await game.say("¡Necesitas al menos un Microo en condiciones de luchar!"); continue; }
      const [m] = s.party.splice(i, 1);
      s.box.push(m);
      await game.say(`${displayName(m)} se ha congelado a -80 °C con glicerol.`);
    }
  }
}
class BoxScreen implements Overlay {
  sel = 0; result = -1;
  constructor(public game: Game) {}
  update(game: Game) {
    const n = game.state.box.length;
    if (game.input.repeat("down")) this.sel = Math.min(n - 1, this.sel + 1);
    if (game.input.repeat("up")) this.sel = Math.max(0, this.sel - 1);
    if (game.input.repeat("right")) this.sel = Math.min(n - 1, this.sel + 6);
    if (game.input.repeat("left")) this.sel = Math.max(0, this.sel - 6);
    if (game.input.pressed("a")) { this.result = this.sel; return true; }
    if (game.input.pressed("b")) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    const box = game.state.box;
    g.pattern("#4a7ab8", "#5888c8", game.frame, "#284878");
    g.panel(4, 4, W - 8, 20, "#e8f4ff", "#a8c8e8", "#284878", 5);
    const t = `CONGELADOR DE CEPAS · ${box.length} Microos`;
    g.text(t, W / 2 - g.measure(t) / 2, 8);
    // ficha del seleccionado
    const m = box[this.sel];
    g.panel(4, 28, 104, 160, "#ffffff", "#e0ecf8", "#284878", 6);
    if (m) {
      g.microo(m.species, "frente", 16, 36);
      g.text(g.fit(displayName(m), 92), 10, 120);
      g.text(`Nv${m.level}`, 10, 134, "blue");
      g.typeBadges(getSpecies(m.species).types, 9, 150, 94);
    }
    g.panel(112, 28, W - 116, 160, "#ffffff", "#eef4fa", "#284878", 6);
    const off = Math.max(0, Math.min(box.length - 9, this.sel - 4));
    box.slice(off, off + 9).forEach((x, i) => {
      const y = 32 + i * 17, sel = off + i === this.sel;
      if (sel) g.panel(115, y - 1, W - 122, 17, "#ffe8a0", "#f8c050", "#c07018", 3);
      g.icon(x.species, sel ? Math.floor(game.frame / 10) % 2 : 0, 116, y - 9);
      g.text(g.fit(displayName(x), 70), 148, y + 2);
      g.text(`${x.level}`, W - 12 - g.measure(`${x.level}`), y + 2, "gray");
    });
  }
}

/** Mapas donde aparece cada especie (según las tablas de encuentros). */
function habitats(sp: string): string[] {
  const out: string[] = [];
  for (const m of Object.values(MAPS)) if (m.grass.some((e) => e.sp === sp) && !out.includes(m.name)) out.push(m.name);
  return out;
}
export class DexDetail implements Overlay {
  page = 0;
  constructor(public sp: string) {}
  update(game: Game) {
    if (game.input.pressed("left") || game.input.pressed("right")) this.page = 1 - this.page;
    return game.input.pressed("a") || game.input.pressed("b");
  }
  draw(g: Gfx, game: Game) {
    const sp = getSpecies(this.sp), caught = game.state.caught.includes(this.sp);
    g.clear("#c83838");
    g.rect(0, 0, W, 20, "#a02828");
    g.text(`Nº${String(sp.dex).padStart(3, "0")}  ${g.fit(sp.name, 150)}`, 8, 5, "white");
    g.text(this.page === 0 ? "DATOS 1/2" : "HÁBITAT 2/2", W - 70, 5, "white");
    g.panel(4, 24, 96, 92, shade(TYPE_C(sp.types[0]), 0.6), shade(TYPE_C(sp.types[0]), 0.15), "#283040", 6);
    g.microo(this.sp, "frente", 20 - 4, 36 + (Math.floor(game.frame / 24) % 2));
    g.panel(104, 24, W - 108, 92, "#ffffff", "#e8e8f0", "#384058", 5);
    g.text(g.fit(caught ? sp.scientific : "Especie sin identificar", W - 120), 110, 29, "blue");
    g.typeBadges(sp.types, 110, 46, W - 122);
    g.text(caught ? "AISLADO" : "VISTO", 110, 98, caught ? "green" : "gray");
    const evo = sp.evolvesFrom ? `Evoluciona de ${getSpecies(sp.evolvesFrom).name}` : "";
    if (evo) g.text(g.fit(evo, W - 120), 110, 80, "gray");
    g.panel(4, 120, W - 8, 68, "#ffffff", "#e8e8f0", "#384058", 5);
    let lines: string[];
    if (this.page === 0) lines = caught ? g.wrap(sp.entry, W - 24) : ["Aíslalo con una Criobola para", "completar su entrada."];
    else { const h = habitats(this.sp); lines = h.length ? ["Se encuentra en:", ...g.wrap(h.join(", "), W - 24)] : ["No aparece en estado salvaje."]; }
    lines.slice(0, 4).forEach((l, k) => g.text(l, 12, 125 + k * 14));
  }
}

// ---------------------------------------------------------------- medallero
/** Las ocho medallas en el orden en que se ganan: id, nombre, gimnasio (id de entrenador). */
export const BADGES = [
  { id: "probiotico", name: "Medalla Probiótico", gym: "gym1" },
  { id: "tapete", name: "Medalla Tapete", gym: "gym2" },
  { id: "micelio", name: "Medalla Micelio", gym: "gym3" },
  { id: "catalasa", name: "Medalla Catalasa", gym: "gym4" },
  { id: "quimiostato", name: "Medalla Quimiostato", gym: "gym5" },
  { id: "algoritmo", name: "Medalla Algoritmo", gym: "gym6" },
  { id: "ziehl", name: "Medalla Ziehl-Neelsen", gym: "gym7" },
  { id: "lisogenia", name: "Medalla Lisogenia", gym: "gym8" },
];

/** Estuche de medallas: 4×2 huecos de terciopelo; las conseguidas brillan. */
export class BadgeCase implements Overlay {
  sel = 0;
  update(game: Game) {
    if (game.input.repeat("right")) this.sel = (this.sel + 1) % 8;
    if (game.input.repeat("left")) this.sel = (this.sel + 7) % 8;
    if (game.input.repeat("down") || game.input.repeat("up")) this.sel = (this.sel + 4) % 8;
    return game.input.pressed("b") || game.input.pressed("start");
  }
  draw(g: Gfx, game: Game) {
    const s = game.state;
    g.pattern("#5a2a30", "#622f36", game.frame, "#3a1418");
    g.panel(4, 4, W - 8, 20, "#f8d860", "#c89020", "#5a3a08", 5);
    const cap = OBEY_CAPS[Math.min(8, s.badges.length)];
    const title = `MEDALLERO · ${s.badges.length}/8 · ${cap >= 100 ? "Te obedecen todos" : `Obedecen hasta Nv${cap}`}`;
    g.text(title, W / 2 - g.measure(title) / 2, 8, "dark");
    // estuche
    g.panel(6, 28, W - 12, 104, "#3a2028", "#2a141a", "#c89020", 8);
    BADGES.forEach((b, i) => {
      const cx = 12 + (i % 4) * 60, cy = 33 + Math.floor(i / 4) * 49;
      const got = s.badges.includes(b.id), on = i === this.sel;
      g.round(cx, cy, 52, 45, 8, on ? "#7a3a48" : "#4a2430");
      g.round(cx + 2, cy + 2, 48, 41, 7, on ? "#8a4656" : "#552a36");
      const bob = got && on ? Math.round(Math.sin(game.frame / 10)) : 0;
      g.medal(b.id, cx + 6, cy + 2 + bob, 40, got);
      if (got) {
        // destello que recorre cada medalla por turnos
        const ph = (game.frame + i * 23) % 160;
        if (ph < 14) g.alpha(1 - ph / 14, () => { g.rect(cx + 30 - 2, cy + 8, 5, 1, "#ffffff"); g.rect(cx + 30, cy + 6, 1, 5, "#ffffff"); });
      }
      if (on && Math.floor(game.frame / 16) % 2 === 0) { g.rect(cx, cy, 52, 1, "#f8d860"); g.rect(cx, cy + 44, 52, 1, "#f8d860"); g.rect(cx, cy, 1, 45, "#f8d860"); g.rect(cx + 51, cy, 1, 45, "#f8d860"); }
    });
    // descripción
    const b = BADGES[this.sel], t = TRAINERS.get(b.gym), got = s.badges.includes(b.id);
    g.panel(4, 136, W - 8, 52, "#ffffff", "#e8e8f0", "#384058", 6);
    if (got) {
      g.text(b.name, 12, 141, "red");
      g.text(g.fit(t ? `Líder: ${t.name}` : "", W - 24), 12, 156);
      g.text(g.fit(t?.role ?? "", W - 24), 12, 170, "gray");
    } else {
      g.text("??????", 12, 141, "gray");
      g.text(g.fit(t ? `Se gana en el ${t.role.split(" · ")[0]}.` : "", W - 24), 12, 156, "gray");
      g.text(g.fit(t?.role.split(" · ")[1] ?? "", W - 24), 12, 170, "gray");
    }
  }
}

/** Animación al recibir una medalla: aparece girando con destellos. */
export class BadgeGet implements Overlay {
  t = 0;
  constructor(public id: string) { audio.sfx("levelup"); }
  update(game: Game) { this.t++; return this.t > 40 && (game.input.pressed("a") || game.input.pressed("b") || this.t > 150); }
  draw(g: Gfx) {
    const b = BADGES.find((x) => x.id === this.id);
    g.alpha(Math.min(0.75, this.t / 20), () => g.rect(0, 0, W, H, "#000"));
    const k = Math.min(1, this.t / 30), size = 24 + 56 * k;
    const sx = Math.abs(Math.cos(Math.min(1, this.t / 30) * Math.PI * 2));      // gira dos veces al entrar
    g.ctx.save();
    g.ctx.translate(W / 2, 74); g.ctx.scale(this.t < 30 ? Math.max(0.08, sx) : 1, 1);
    g.medal(this.id, -size / 2, -size / 2, size);
    g.ctx.restore();
    if (this.t > 30) for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + this.t / 30, r = 46 + Math.sin(this.t / 8 + i) * 4;
      const x = W / 2 + Math.cos(a) * r, y = 74 + Math.sin(a) * r * 0.8;
      g.rect(x - 1, y, 3, 1, "#fff8c0"); g.rect(x, y - 1, 1, 3, "#fff8c0");
    }
    if (this.t > 30 && b) { const t = `¡${b.name.toUpperCase()}!`; g.panel(W / 2 - g.measure(t) / 2 - 8, 124, g.measure(t) + 16, 18, "#f8d860", "#c89020", "#5a3a08", 5); g.text(t, W / 2 - g.measure(t) / 2, 127, "dark"); }
  }
}

/** Enseñar un movimiento con un Plásmido (no se gasta). */
export async function enseñarPlasmido(game: Game, move: string) {
  const name = getMove(move).name;
  const t = await partyMenu(game, { mode: "item", prompt: `¿Quién aprende ${name}?` });
  if (t < 0) return;
  const m = game.state.party[t];
  if (!plasmidCompatible(m, move)) { await game.say(`${displayName(m)} no es compatible con este plásmido.`); return; }
  if (m.moves.some((x) => x.id === move)) { await game.say(`${displayName(m)} ya conoce ${name}.`); return; }
  if (m.moves.length < 4) {
    m.moves.push({ id: move, pp: getMove(move).pp, maxPp: getMove(move).pp });
    audio.sfx("levelup"); await game.say(`¡${displayName(m)} ha aprendido ${name}!`); return;
  }
  await game.say(`${displayName(m)} quiere aprender ${name}, pero ya conoce cuatro movimientos.`);
  const idx = await game.choose([...m.moves.map((x) => getMove(x.id).name), "NO APRENDER"], { prompt: "¿Qué movimiento olvidar?", x: 120, y: 30, cancel: 4 });
  if (idx < 0 || idx >= 4) { await game.say(`${displayName(m)} no ha aprendido ${name}.`); return; }
  const old = getMove(m.moves[idx].id).name;
  replaceMove(m, idx, move);
  audio.sfx("levelup");
  await game.say(`1, 2 y… ¡zas! ${displayName(m)} ha olvidado ${old} y ha aprendido ${name}.`);
}
