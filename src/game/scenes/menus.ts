// Menús: inicio, equipo, resumen, mochila, Microdex, ficha, guardado, opciones y tienda.
import type { Game, Overlay } from "../game";
import { Gfx, W, H, TB } from "../gfx";
import type { Overworld } from "./overworld";
import { SPECIES, ITEMS, getMove, getSpecies, type ItemData } from "../../engine/data";
import { displayName, NATURES, itemEvolution, type Microo } from "../../engine/microo";
import { applyItemOutOfBattleLike, type Battle } from "../../engine/battle";
import { saveGame, playTime, addItem } from "../state";
import { evolutionSequence } from "./battle";

const STATUS_SHORT: Record<string, string> = { brn: "DES", frz: "CON", par: "PAR", psn: "TOX", tox: "TOX", slp: "LAT" };

// ---------------------------------------------------------------- menú de inicio
export async function openStartMenu(game: Game, world: Overworld) {
  const s = game.state;
  for (;;) {
    const opts: [string, string][] = [];
    if (s.flags.microdex) opts.push(["MICRODEX", "dex"]);
    if (s.party.length) opts.push(["MICROOS", "party"]);
    opts.push(["MOCHILA", "bag"], [s.name.toUpperCase(), "card"], ["GUARDAR", "save"], ["OPCIONES", "opt"], ["SALIR", "exit"]);
    const i = await game.run<number>(new StartMenu(opts.map((o) => o[0])));
    if (i < 0 || opts[i][1] === "exit") return;
    const k = opts[i][1];
    if (k === "dex") await game.run(new DexScreen());
    if (k === "party") await partyMenu(game, { mode: "view" });
    if (k === "bag") await bagMenu(game, { mode: "field" });
    if (k === "card") await game.run(new CardScreen());
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
    const w = 84, h = this.opts.length * 16 + 10;
    g.frame(W - w - 2, 2, w, h);
    this.opts.forEach((o, i) => g.text(o, W - w + 14, 9 + i * 16));
    g.cursor(W - w + 5, 9 + this.sel * 16);
  }
}

async function options(game: Game) {
  const s = game.state;
  const sp = await game.choose(["Texto lento", "Texto normal", "Texto rápido"], { prompt: "Velocidad del texto:", x: 140, y: 40, cancel: 999 });
  if (sp >= 0) s.textSpeed = ([1, 2, 4] as const)[sp];
  const d = await game.choose(["Fácil · Medio Rico", "Normal · Medio Selectivo", "Difícil · Presión Antibiótica"], { prompt: "Dificultad (Condiciones de Incubación):", x: 70, y: 40, cancel: 999 });
  if (d >= 0) s.difficulty = (["facil", "normal", "dificil"] as const)[d];
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
    const c = await game.choose(["RESUMEN", "MOVER", "SALIR"], { x: 160, y: 60, cancel: 2 });
    if (c === 0) await game.run(new SummaryScreen(m));
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
    const n = game.state.party.length;
    if (game.input.repeat("down")) this.sel = (this.sel + 1) % (n + 1);
    if (game.input.repeat("up")) this.sel = (this.sel + n) % (n + 1);
    if (game.input.pressed("a")) { this.result = this.sel === n ? -1 : this.sel; return true; }
    if (game.input.pressed("b")) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    g.clear("#3870a8");
    for (let y = 0; y < H; y += 8) g.rect(0, y, W, 4, "#3068a0");
    const p = game.state.party;
    p.forEach((m, i) => {
      const y = 4 + i * 22, sel = i === this.sel;
      g.frame(4, y, W - 8, 21, sel ? "texto" : "menu");
      g.icon(m.species, Math.floor(game.frame / 16) % 2, 6, y - 8);
      g.text(displayName(m), 40, y + 6, m.hp > 0 ? "dark" : "gray");
      g.text(`Nv${m.level}`, 110, y + 6);
      if (m.status) g.text(STATUS_SHORT[m.status], 140, y + 6, "red");
      g.hpBar(W - 92, y + 6, 64, m.hp / m.stats.hp);
      g.text(`${m.hp}/${m.stats.hp}`, W - 80, y + 12);
    });
    const ny = 4 + p.length * 22;
    g.frame(W - 70, Math.min(ny, H - 46), 66, 20, this.sel === p.length ? "texto" : "menu");
    g.text("SALIR", W - 54, Math.min(ny, H - 46) + 6);
    const msg = this.o.prompt ?? { view: "Elige un Microo.", switch: "¿Qué Microo sacar?", replace: "¡Elige el siguiente Microo!", item: "¿En qué Microo usarlo?" }[this.o.mode];
    g.frame(4, H - 22, 170, 20, "info");
    g.text(msg, 10, H - 16);
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
  draw(g: Gfx) {
    const m = this.m, sp = getSpecies(m.species);
    g.clear("#e8f0e0");
    g.frame(0, 0, 100, 112, "info");
    g.microo(m.species, "frente", 10, 18);
    g.text(`Nº ${String(sp.dex).padStart(3, "0")}`, 8, 6, "gray");
    g.text(displayName(m), 8, 98);
    g.frame(100, 0, W - 100, 20, "menu");
    g.text(this.page === 0 ? "ESTADÍSTICAS  ◀▶" : "MOVIMIENTOS  ◀▶", 104, 6);
    if (this.page === 0) {
      const nat = NATURES[m.nature];
      const rows: [string, string][] = [["Especie", sp.name], ["Tipo", sp.types.join(" / ")], ["Nivel", `${m.level}`], ["Naturaleza", nat[0]],
        ["PS", `${m.hp}/${m.stats.hp}`], ["Ataque", `${m.stats.atk}`], ["Defensa", `${m.stats.def}`], ["At. Esp.", `${m.stats.spa}`],
        ["Def. Esp.", `${m.stats.spd}`], ["Velocidad", `${m.stats.spe}`]];
      rows.forEach(([k, v], i) => { g.text(k, 108, 26 + i * 15, "blue"); g.text(v, 180, 26 + i * 15); });
    } else {
      m.moves.forEach((s, i) => {
        const mv = getMove(s.id);
        g.frame(102, 24 + i * 38, W - 104, 34, "info");
        g.text(mv.name.slice(0, 18), 108, 29 + i * 38);
        g.text(`${mv.type} · ${mv.category === "physical" ? "Físico" : mv.category === "special" ? "Especial" : "Estado"}`, 108, 42 + i * 38, "blue");
        g.text(`${s.pp}/${s.maxPp}`, W - 36, 29 + i * 38, "gray");
        if (mv.power) g.text(`${mv.power}`, W - 28, 42 + i * 38, "gray");
      });
    }
    g.frame(0, 112, 100, H - 112, "info");
    g.text("Organismo:", 6, 118, "blue");
    g.wrap(sp.organism || sp.name, 88).slice(0, 4).forEach((l, i) => g.text(l, 6, 132 + i * 12));
  }
}

// ---------------------------------------------------------------- mochila
const POCKETS: [string, ItemData["kind"][]][] = [["MEDIOS", ["heal", "cure", "revive", "pp"]], ["CRIOBOLAS", ["ball"]], ["PLÁSMIDOS", ["evolution"]], ["CLAVE", ["key"]]];
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
    } else if (it.kind === "ball") await game.say("Las Criobolas se usan en combate contra Microos salvajes.");
    else await game.say(it.desc);
  }
}
class BagScreen implements Overlay {
  pocket = 0; sel = 0; result: string | null = null;
  items(game: Game) { const k = POCKETS[this.pocket][1]; return Object.keys(game.state.bag).filter((i) => k.includes(ITEMS.get(i)?.kind as ItemData["kind"])); }
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
    g.clear("#e8c070");
    g.frame(0, 0, 90, 24, "info"); g.text(`◀ ${POCKETS[this.pocket][0]} ▶`, 8, 7);
    g.frame(90, 0, W - 90, TB, "menu");
    const its = this.items(game);
    const off = Math.max(0, this.sel - 5);
    its.slice(off, off + 7).forEach((id, i) => { g.text(ITEMS.get(id)!.name, 106, 8 + i * 16); g.text(`×${game.state.bag[id]}`, W - 28, 8 + i * 16); });
    if (its.length - off < 6) g.text("CERRAR", 106, 8 + (its.length - off) * 16);
    g.cursor(97, 8 + (this.sel - off) * 16);
    g.frame(0, TB, W, 48, "texto");
    const id = its[this.sel];
    const d = id ? ITEMS.get(id)!.desc : "Cerrar la mochila.";
    g.wrap(d, W - 20).slice(0, 2).forEach((l, i) => g.text(l, 10, TB + 10 + i * 16));
    g.text(`${game.state.money} créditos`, 6, 34, "dark");
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
    return game.input.pressed("b");
  }
  draw(g: Gfx, game: Game) {
    const s = game.state;
    g.clear("#c83c3c");
    g.frame(0, 0, 112, H, "info");
    g.text(`Vistos ${s.seen.length}  Aislados ${s.caught.length}`, 6, 4, "gray");
    const off = Math.max(0, Math.min(this.list.length - 11, this.sel - 5));
    this.list.slice(off, off + 11).forEach((sp, i) => {
      const y = 18 + i * 15;
      const seen = s.seen.includes(sp.id), caught = s.caught.includes(sp.id);
      g.text(`${String(sp.dex).padStart(3, "0")} ${seen ? sp.name : "-----"}`, 16, y, off + i === this.sel ? "red" : "dark");
      if (caught) g.rect(104, y + 2, 4, 4, "#d83838");
    });
    g.cursor(5, 18 + (this.sel - off) * 15);
    const sp = this.list[this.sel];
    g.frame(114, 0, W - 114, 110, "menu");
    if (s.seen.includes(sp.id)) {
      g.microo(sp.id, "frente", 114 + (W - 114 - 80) / 2, 22);
      g.text(sp.name, 120, 6);
      g.frame(114, 110, W - 114, H - 110, "info");
      g.text(sp.types.join(" / "), 120, 116, "blue");
      g.wrap(s.caught.includes(sp.id) ? sp.organism || "Sin datos." : "Aún no aislado.", 112).slice(0, 4).forEach((l, i) => g.text(l, 120, 130 + i * 12));
    } else g.text("?", 172, 44);
  }
}

class CardScreen implements Overlay {
  update(game: Game) { return game.input.pressed("a") || game.input.pressed("b"); }
  draw(g: Gfx, game: Game) {
    const s = game.state;
    g.clear("#3870a8");
    g.frame(10, 10, W - 20, H - 20, "info");
    g.text("FICHA DE INVESTIGACIÓN", 22, 18, "blue");
    g.character("protagonista", 0, 0, W - 60, 30);
    const rows: [string, string][] = [["Nombre", s.name], ["Créditos", `${s.money}`], ["Microdex", `${s.caught.length} aislados`], ["Tiempo", playTime(s)], ["Dificultad", { facil: "Fácil", normal: "Normal", dificil: "Difícil" }[s.difficulty]]];
    rows.forEach(([k, v], i) => { g.text(k, 22, 40 + i * 15); g.text(v, 100, 40 + i * 15); });
    g.text("Medallas:", 22, 118);
    s.badges.forEach((b, i) => { g.rect(90 + i * 16, 116, 12, 12, "#f0c040"); g.rect(93 + i * 16, 119, 6, 6, "#c83c3c"); void b; });
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
    g.frame(70, 2, 168, this.stock.length * 15 + 26);
    this.stock.forEach((id, i) => { const it = ITEMS.get(id)!; g.text(it.name, 86, 9 + i * 15); g.text(`${it.price}`, 204, 9 + i * 15); });
    g.text("SALIR", 86, 9 + this.stock.length * 15);
    g.cursor(77, 9 + this.sel * 15);
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
  draw(g: Gfx) { g.frame(140, 80, 98, 30); g.text(`×${this.q}`, 150, 90); g.text(`${this.q * this.price}`, 196, 90); }
}
