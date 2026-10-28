// Pantalla de combate: dibuja la placa y traduce los eventos del motor en textos y animaciones.
import type { Game, Overlay, Scene } from "../game";
import { Gfx, W } from "../gfx";
import { Battle, chooseActions, type Action, type BattleEvent } from "../../engine";
import { getMove, getSpecies, ITEMS, type StatusCode } from "../../engine/data";
import { displayName, expForLevel, replaceMove, evolve, type Microo } from "../../engine/microo";
import { markCaught, markSeen } from "../state";
import { partyMenu, bagMenu } from "./menus";

export interface BattleSetup {
  battle: Battle;
  wild: boolean;
  trainer?: { name: string; clase: string; portrait?: string; lose?: string; money?: number };
  env: string;
}
export interface BattleOutcome { outcome: "win" | "lose" | "run" | "capture" | "foeFled"; captured?: Microo }

interface Disp { mon: Microo | null; hp: number; visible: boolean; flash: number; drop: number; appear: number; status: StatusCode | null; level: number; species: string }
const STATUS_TAG: Record<StatusCode, [string, string]> = {
  brn: ["DES", "#e07828"], frz: ["CON", "#58a8e0"], par: ["PAR", "#d8b020"], psn: ["TOX", "#a050b8"], tox: ["TOX", "#a050b8"], slp: ["LAT", "#808088"],
};

export class BattleScene implements Scene {
  disp: Disp[][] = [[], []];
  msg = "";
  ballAnim = 0; ballShake = 0;
  trainerSlide = 0; showTrainer = false;
  finished: BattleOutcome | null = null;

  constructor(public game: Game, public s: BattleSetup) {
    for (const side of [0, 1] as const) {
      this.disp[side] = s.battle.sides[side].active.map(() => ({ mon: null, hp: 0, visible: false, flash: 0, drop: 0, appear: 0, status: null, level: 1, species: "" }));
    }
  }
  get b() { return this.s.battle; }
  update() {}
  animate() {
    for (const side of this.disp) for (const d of side) {
      if (d.flash > 0) d.flash--; if (d.appear > 0) d.appear--;
      if (d.drop > 0 && d.drop < 48) d.drop += 3;
    }
    if (this.ballAnim > 0) this.ballAnim--;
    if (this.trainerSlide > 0) this.trainerSlide -= 4;
  }

  // ---------------------------------------------------------------- flujo principal
  async run(): Promise<BattleOutcome> {
    const g = this.game, b = this.b;
    const initial = b.drain();
    // Introducción: primero el rival
    if (this.s.trainer) {
      this.showTrainer = true; this.trainerSlide = 120;
      await g.wait(30);
      await this.text(`¡${this.s.trainer.clase} ${this.s.trainer.name} quiere luchar!`);
      this.showTrainer = false;
    }
    for (const e of initial.filter((e) => e.side === 1)) await this.play(e);
    for (const e of initial.filter((e) => e.side === 0)) await this.play(e);
    for (const m of b.sides[1].party) markSeen(g.state, m.species);
    while (!b.ended) {
      const act = await this.chooseAction();
      if (!act) continue;
      b.playTurn([act], chooseActions(b, 1, this.s.wild ? "facil" : g.state.difficulty));
      for (const e of b.drain()) await this.play(e);
      await this.replacements();
    }
    return this.finish();
  }

  private async replacements() {
    const b = this.b, g = this.game;
    if (b.ended) return;
    for (const slot of b.needsReplacement(1)) {
      const idx = b.sides[1].party.findIndex((m, i) => m.hp > 0 && !b.sides[1].active.some((x) => x?.party === i));
      if (idx >= 0) { b.replace(1, slot, idx); markSeen(g.state, b.sides[1].party[idx].species); }
      for (const e of b.drain()) await this.play(e);
    }
    for (const slot of b.needsReplacement(0)) {
      let idx = -1;
      while (idx < 0) {
        idx = await partyMenu(g, { mode: "replace", battle: b });
      }
      b.replace(0, slot, idx);
      for (const e of b.drain()) await this.play(e);
    }
  }

  private async finish(): Promise<BattleOutcome> {
    const b = this.b, g = this.game;
    const out: BattleOutcome = { outcome: b.outcome ?? (b.winner === 0 ? "win" : "lose") };
    if (b.outcome === "win" && this.s.trainer) {
      this.showTrainer = true; this.trainerSlide = 60; await g.wait(16);
      if (this.s.trainer.lose) await this.text(`${this.s.trainer.name}: ${this.s.trainer.lose}`);
      const prize = (this.s.trainer.money ?? 20) * Math.max(...b.sides[1].party.map((m) => m.level));
      g.state.money += prize;
      await this.text(`¡Recibes ${prize} créditos de laboratorio por la victoria!`);
    }
    if (b.payDay > 0 && b.outcome === "win") { g.state.money += b.payDay; await this.text(`¡{nombre} recoge ${b.payDay} créditos de ATP!`); }
    if (b.outcome === "capture" && b.captured) {
      const m = b.captured;
      m.originalTrainer = g.state.name;
      markCaught(g.state, m.species);
      if (g.state.party.length < 6) g.state.party.push(m);
      else { g.state.box.push(m); await this.text(`${displayName(m)} se ha enviado al Congelador de cepas.`); }
      out.captured = m;
    }
    // Evoluciones
    for (const ev of b.evolutionsPending) {
      const m = g.state.party.find((x) => x.uid === ev.uid);
      if (m) await evolutionSequence(g, m, ev.to);
    }
    return out;
  }

  // ---------------------------------------------------------------- menús
  private async chooseAction(): Promise<Action | null> {
    const g = this.game, b = this.b;
    const me = b.sides[0].active[0]!;
    if (b.forced({ side: 0, slot: 0 })) return { kind: "move", slot: 0, move: 0 };
    const c = await g.run<number>(new ActionMenu(displayName(me.mon)));
    if (c === 0) {
      const legal = b.legalMoves({ side: 0, slot: 0 });
      if (!legal.length) return { kind: "move", slot: 0, move: -1 };
      const mv = await g.run<number>(new MoveMenu(me.mon, legal));
      if (mv < 0) return null;
      return { kind: "move", slot: 0, move: mv, target: { side: 1, slot: 0 } };
    }
    if (c === 1) {
      const r = await bagMenu(g, { mode: "battle", wild: this.s.wild });
      if (!r) return null;
      if (ITEMS.get(r.item)?.kind === "ball") {
        if (!this.s.wild) { await this.text("¡No puedes aislar el Microo de otro investigador!"); return null; }
      }
      g.state.bag[r.item]--; if (g.state.bag[r.item] <= 0) delete g.state.bag[r.item];
      b.inventory[r.item] = (b.inventory[r.item] ?? 0) + 1;
      return { kind: "item", slot: 0, item: r.item, party: r.target };
    }
    if (c === 2) {
      if (!b.canSwitch({ side: 0, slot: 0 })) { await this.text(`¡${displayName(me.mon)} no puede retirarse!`); return null; }
      const idx = await partyMenu(g, { mode: "switch", battle: b });
      if (idx < 0) return null;
      return { kind: "switch", slot: 0, party: idx };
    }
    if (c === 3) return { kind: "run", slot: 0 };
    return null;
  }

  // ---------------------------------------------------------------- eventos
  private async text(t: string, waitInput = false) { await this.game.run(new BattleText(this.game.fill(t), waitInput)); }

  private async play(e: BattleEvent) {
    const g = this.game, b = this.b;
    const side = e.side as 0 | 1 | undefined, slot = (e.slot as number) ?? 0;
    const d = side !== undefined ? this.disp[side][slot] : undefined;
    switch (e.type) {
      case "switch": {
        const mon = b.sides[side!].party[e.party as number];
        Object.assign(d!, { mon, hp: mon.hp, visible: true, drop: 0, appear: 20, status: mon.status, level: mon.level, species: mon.species });
        if (side === 1 && this.s.wild) { await this.text(e.text); break; }
        if (side === 1) { await this.text(`${this.s.trainer?.clase ?? ""} ${this.s.trainer?.name ?? ""} saca a ${displayName(mon)}.`.trim()); break; }
        await this.text(e.text);
        break;
      }
      case "withdraw": if (d) d.visible = false; await this.text(e.text); break;
      case "damage": case "hp": {
        if (!d) break;
        if (e.type === "damage" && (e.amount as number) > 0) { d.flash = 24; await g.wait(20); }
        await this.tweenHp(d, e.hp as number);
        break;
      }
      case "faint": if (d) { d.drop = 1; await g.wait(16); } await this.text(e.text); if (d) d.visible = false; break;
      case "status": if (d) d.status = (e.status as StatusCode) ?? null; if (e.text) await this.text(e.text); break;
      case "cure": if (d) d.status = null; await this.text(e.text); break;
      case "levelup": {
        const m = b.sides[0].party.find((x) => x.uid === e.uid);
        const di = this.disp[0].find((x) => x.mon === m);
        if (di && m) { di.level = m.level; di.hp = m.hp; }
        await this.text(e.text, true);
        break;
      }
      case "learnPending": await this.learnPrompt(e.uid as number, e.move as string); break;
      case "ball": this.ballAnim = 30; await this.text(e.text); await g.wait(20); break;
      case "shake": {
        const n = e.shakes as number;
        for (let i = 0; i < n; i++) { this.ballShake = 1; await g.wait(12); this.ballShake = -1; await g.wait(12); this.ballShake = 0; await g.wait(16); }
        if (n < 3 || !(this.b.outcome === "capture")) this.ballAnim = 0;
        break;
      }
      case "capture": this.disp[1][0].visible = false; await this.text(e.text, true); break;
      case "move": case "msg": case "crit": case "effective": case "miss": case "immune": case "boost": case "item":
      case "run": case "exp": case "learn": case "transform": case "end":
        if (e.text) await this.text(e.text, e.type === "end" || e.type === "learn");
        if (e.type === "transform" && d) d.species = e.species as string;
        break;
      default: if (e.text) await this.text(e.text);
    }
  }
  private async tweenHp(d: Disp, to: number) {
    const from = d.hp, steps = Math.min(30, Math.max(6, Math.abs(to - from)));
    for (let i = 1; i <= steps; i++) { d.hp = Math.round(from + ((to - from) * i) / steps); await this.game.wait(1); }
  }
  private async learnPrompt(uid: number, move: string) {
    const g = this.game;
    const m = this.b.sides[0].party.find((x) => x.uid === uid);
    if (!m) return;
    const name = getMove(move).name;
    await this.text(`${displayName(m)} quiere aprender ${name}, pero ya conoce cuatro movimientos.`, true);
    if (!(await g.yesno(`¿Olvidar un movimiento para aprender ${name}?`))) { await this.text(`${displayName(m)} no ha aprendido ${name}.`, true); return; }
    const idx = await g.choose(m.moves.map((s) => getMove(s.id).name), { prompt: "¿Qué movimiento olvidar?", x: 120, y: 30, cancel: 999 });
    if (idx < 0) { await this.text(`${displayName(m)} no ha aprendido ${name}.`, true); return; }
    const old = getMove(m.moves[idx].id).name;
    replaceMove(m, idx, move);
    await this.text(`1, 2 y… ¡zas! ${displayName(m)} ha olvidado ${old} y ha aprendido ${name}.`, true);
  }

  // ---------------------------------------------------------------- dibujo
  draw(g: Gfx) {
    const env = this.s.env;
    const sky = { hierba: ["#d8ecc8", "#b8d8a0"], bosque: ["#c8bce0", "#988cc0"], interior: ["#e0e4ec", "#b8c4d8"], laboratorio: ["#e4ecf4", "#b4c8dc"], gimnasio: ["#f4e8c0", "#d8c890"] }[env] ?? ["#d8ecc8", "#b8d8a0"];
    for (let y = 0; y < 112; y++) g.rect(0, y, W, 1, y < 56 ? sky[0] : sky[1]);
    const plat = { hierba: ["#b0c880", "#7a9a50"], bosque: ["#8a7aa8", "#5a4a80"] }[env] ?? ["#c8ccd8", "#8a90a0"];
    const ell = (x: number, y: number, w: number, h: number) => { g.ctx.fillStyle = plat[1]; g.ctx.beginPath(); g.ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2); g.ctx.fill(); g.ctx.fillStyle = plat[0]; g.ctx.beginPath(); g.ctx.ellipse(x, y - 1, w - 2, h - 2, 0, 0, Math.PI * 2); g.ctx.fill(); };
    ell(178, 66, 50, 12); ell(64, 108, 62, 14);
    // Rival
    const f = this.disp[1][0];
    if (this.showTrainer && this.s.trainer) g.portrait(this.s.trainer.portrait ?? "becario", 146 + Math.max(0, this.trainerSlide), -8);
    else if (f?.visible && f.mon) {
      const blink = f.flash > 0 && Math.floor(f.flash / 4) % 2 === 0;
      const sc = f.appear > 0 ? 1 - f.appear / 24 : 1;
      if (!blink) g.alpha(f.drop > 0 ? Math.max(0, 1 - f.drop / 48) : 1, () => g.microo(f.species, "frente", 146 + 32 * (1 - sc), 8 + f.drop + 64 * (1 - sc), sc));
    }
    // Criobola lanzada
    if (this.ballAnim > 0 || this.ballShake !== 0) {
      const t = Math.max(0, this.ballAnim) / 30;
      const bx = 178 - t * 110 + this.ballShake * 2, by = 54 - Math.sin((1 - t) * Math.PI) * (t > 0 ? 30 : 0);
      drawBallBig(g, bx, by);
    }
    // Propio
    const p = this.disp[0][0];
    if (p?.visible && p.mon) {
      const blink = p.flash > 0 && Math.floor(p.flash / 4) % 2 === 0;
      if (!blink) g.alpha(p.drop > 0 ? Math.max(0, 1 - p.drop / 48) : 1, () => g.microo(p.species, "espalda", 32, 48 + p.drop, 1));
    }
    // Cajas de PS
    if (f?.visible && f.mon) this.hpBox(g, f, 8, 8, false);
    if (p?.visible && p.mon) this.hpBox(g, p, 128, 70, true);
    g.rect(0, 112, W, 48, "#283048");
  }
  private hpBox(g: Gfx, d: Disp, x: number, y: number, mine: boolean) {
    const m = d.mon!;
    g.frame(x, y, 104, mine ? 36 : 26, "info");
    g.text(displayName(m).slice(0, 12), x + 6, y + 5);
    g.text(`Nv${d.level}`, x + 76, y + 5);
    g.text("PS", x + 8, y + 15, "orange", false);
    g.hpBar(x + 24, y + 17, 72, Math.max(0, d.hp / m.stats.hp));
    if (d.status) { const [t, c] = STATUS_TAG[d.status]; g.rect(x + 44, y + 4, 22, 9, c); g.text(t, x + 46, y + 5, "white", false); }
    if (mine) {
      g.text(`${Math.max(0, d.hp)}/${m.stats.hp}`, x + 56, y + 22);
      const sp = getSpecies(m.species);
      const lo = expForLevel(sp.growth, m.level), hi = expForLevel(sp.growth, m.level + 1);
      g.rect(x + 8, y + 31, 90, 2, "#505058");
      g.rect(x + 8, y + 31, Math.round(90 * Math.max(0, Math.min(1, (m.exp - lo) / Math.max(1, hi - lo)))), 2, "#48a8f0");
    }
  }
}

function drawBallBig(g: Gfx, x: number, y: number) {
  const c = g.ctx;
  c.fillStyle = "#1a1420"; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.fill();
  c.fillStyle = "#e04848"; c.beginPath(); c.arc(x, y, 5, Math.PI, 0); c.fill();
  c.fillStyle = "#f8f8f8"; c.beginPath(); c.arc(x, y, 5, 0, Math.PI); c.fill();
  c.fillStyle = "#1a1420"; c.fillRect(x - 5, y, 10, 1); c.fillStyle = "#f8f8f8"; c.fillRect(x - 1, y - 1, 3, 3);
}

/** Texto de combate: avanza solo tras una pausa (o con A). */
class BattleText implements Overlay {
  shown = 0; hold = 0;
  constructor(public text: string, public waitInput = false) {}
  update(game: Game) {
    const lines = game.g.wrap(this.text, 220);
    const total = lines.join("\n").length;
    if (this.shown < total) { this.shown += game.state.textSpeed * (game.input.down("a") ? 3 : 1); if (game.input.pressed("a")) this.shown = total; return false; }
    this.hold++;
    if (game.input.pressed("a") || game.input.pressed("b")) return true;
    return !this.waitInput && this.hold > 40;
  }
  draw(g: Gfx, game: Game) {
    g.frame(0, 112, W, 48, "oscuro");
    const lines = g.wrap(this.text, 220);
    const vis = lines.join("\n").slice(0, Math.floor(this.shown)).split("\n");
    vis.slice(-2).forEach((l, i) => g.text(l, 10, 122 + i * 16, "white"));
    if (this.waitInput && this.shown >= lines.join("\n").length && Math.floor(game.frame / 16) % 2 === 0) g.text("▼", 224, 144, "white", false);
  }
}

class ActionMenu implements Overlay {
  sel = 0; result = 0;
  constructor(public name: string) {}
  update(game: Game) {
    const i = game.input;
    if (i.pressed("right") && this.sel % 2 === 0) this.sel++;
    if (i.pressed("left") && this.sel % 2 === 1) this.sel--;
    if (i.pressed("down") && this.sel < 2) this.sel += 2;
    if (i.pressed("up") && this.sel >= 2) this.sel -= 2;
    if (i.pressed("a")) { this.result = this.sel; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.frame(0, 112, 120, 48, "oscuro");
    g.text("¿Qué debe hacer", 9, 122, "white");
    g.text(`${this.name}?`, 9, 138, "white");
    g.frame(120, 112, 120, 48, "menu");
    ["LUCHAR", "MOCHILA", "MICROOS", "HUIR"].forEach((t, i) => g.text(t, 136 + (i % 2) * 54, 123 + Math.floor(i / 2) * 16));
    g.cursor(128 + (this.sel % 2) * 54, 123 + Math.floor(this.sel / 2) * 16);
  }
}

class MoveMenu implements Overlay {
  sel = 0; result = -1;
  constructor(public mon: Microo, public legal: number[]) { this.sel = legal.length ? 0 : 0; }
  update(game: Game) {
    const i = game.input, n = this.mon.moves.length;
    if (i.pressed("right") && this.sel % 2 === 0 && this.sel + 1 < n) this.sel++;
    if (i.pressed("left") && this.sel % 2 === 1) this.sel--;
    if (i.pressed("down") && this.sel + 2 < n) this.sel += 2;
    if (i.pressed("up") && this.sel >= 2) this.sel -= 2;
    if (i.pressed("b")) { this.result = -1; return true; }
    if (i.pressed("a") && this.legal.includes(this.sel)) { this.result = this.sel; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.frame(0, 112, 160, 48, "menu");
    this.mon.moves.forEach((s, i) => g.text(getMove(s.id).name.slice(0, 13), 14 + (i % 2) * 74, 123 + Math.floor(i / 2) * 16, s.pp > 0 ? "dark" : "gray"));
    g.cursor(6 + (this.sel % 2) * 74, 123 + Math.floor(this.sel / 2) * 16);
    g.frame(160, 112, 80, 48, "menu");
    const s = this.mon.moves[this.sel];
    if (s) {
      const mv = getMove(s.id);
      g.text("PP", 170, 122); g.text(`${s.pp}/${s.maxPp}`, 196, 122, s.pp === 0 ? "red" : "dark");
      g.text(mv.type.slice(0, 11), 170, 138, "blue");
    }
  }
}

/** Secuencia de evolución con posibilidad de cancelar con B. */
export async function evolutionSequence(game: Game, m: Microo, to: string) {
  const from = m.species;
  const ov = new EvolutionOverlay(from, to);
  await game.run(new TextOverlay(`¿Eh? ¡${displayName(m)} está evolucionando!`, from));
  const ok = await game.run<boolean>(ov);
  const oldName = displayName(m);
  if (!ok) { await game.run(new TextOverlay(`¡${oldName} ha dejado de evolucionar!`, from)); return; }
  evolve(m, to);
  await game.run(new TextOverlay(`¡Enhorabuena! ¡${oldName} ha evolucionado a ${getSpecies(to).name}!`, to));
  markCaught(game.state, to);
}
class TextOverlay implements Overlay {
  t = new BattleText("", true);
  constructor(text: string, public sp: string) { this.t.text = text; }
  update(game: Game) { return this.t.update(game); }
  draw(g: Gfx, game: Game) { g.clear("#101828"); g.microo(this.sp, "frente", 88, 30); this.t.draw(g, game); }
}
class EvolutionOverlay implements Overlay {
  t = 0; result = true;
  constructor(public from: string, public to: string) {}
  update(game: Game) {
    this.t++;
    if (game.input.pressed("b") && this.t < 200) { this.result = false; return true; }
    return this.t > 240;
  }
  draw(g: Gfx) {
    g.clear("#101828");
    const phase = this.t < 200 ? Math.floor(this.t / Math.max(3, 24 - this.t / 9)) % 2 : 1;
    const sp = phase ? this.to : this.from;
    g.alpha(this.t > 200 ? 1 : 0.9, () => g.microo(sp, "frente", 88, 30));
    if (this.t < 200 && phase) g.alpha(0.6, () => g.rect(88, 30, 64, 64, "#ffffff"));
    g.frame(0, 112, W, 48, "oscuro");
    g.text("Pulsa B para detener la evolución.", 10, 130, "gray");
  }
}
