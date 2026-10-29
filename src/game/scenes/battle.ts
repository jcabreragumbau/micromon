// Pantalla de combate: dibuja la placa y traduce los eventos del motor en textos y animaciones.
import type { Game, Overlay, Scene } from "../game";
import { Gfx, W, H, TB } from "../gfx";
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
      const acts = await this.chooseActions();
      if (!acts) continue;
      b.playTurn(acts, chooseActions(b, 1, this.s.wild ? "facil" : g.state.difficulty));
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
  get doubles() { return this.b.sides[0].active.length > 1; }
  /** Acciones del turno: una por cada Microo propio en la placa (dos en combate doble). */
  private async chooseActions(): Promise<Action[] | null> {
    const b = this.b;
    const slots = b.sides[0].active.map((x, i) => (x && x.mon.hp > 0 ? i : -1)).filter((i) => i >= 0);
    const acts: Action[] = [];
    const reserved = new Set<number>();
    for (let k = 0; k < slots.length; k++) {
      const a = await this.chooseFor(slots[k], reserved, k > 0, acts.some((x) => x.kind === "item"));
      if (a === "back") {                       // B en el segundo Microo: volver al primero
        const prev = acts.pop(); if (prev?.kind === "switch") reserved.delete(prev.party);
        k -= 2; continue;
      }
      if (!a) { k--; continue; }
      if (a.kind === "run") return [a];
      if (a.kind === "switch") reserved.add(a.party);
      acts.push(a);
    }
    return acts;
  }
  private async chooseFor(slot: number, reserved: Set<number>, canBack: boolean, itemUsed: boolean): Promise<Action | "back" | null> {
    const g = this.game, b = this.b;
    const me = b.sides[0].active[slot]!;
    const ref = { side: 0 as const, slot };
    if (b.forced(ref)) return { kind: "move", slot, move: 0 };
    const c = await g.run<number>(new ActionMenu(displayName(me.mon), canBack));
    if (c < 0) return "back";
    if (c === 0) {
      const legal = b.legalMoves(ref);
      if (!legal.length) return { kind: "move", slot, move: -1 };
      const mv = await g.run<number>(new MoveMenu(me.mon, legal));
      if (mv < 0) return null;
      const move = getMove(me.mon.moves[mv].id);
      let target = { side: 1 as const, slot: b.sides[1].active.findIndex((x) => x && x.mon.hp > 0) };
      if (target.slot < 0) target.slot = 0;
      const foes = b.sides[1].active.map((x, i) => (x && x.mon.hp > 0 ? i : -1)).filter((i) => i >= 0);
      if (this.doubles && (move.target === "normal" || move.target === "any") && foes.length > 1) {
        this.aim = -1;
        const t = await g.run<number>(new TargetMenu(this, foes));
        this.aim = -1;
        if (t < 0) return null;
        target = { side: 1, slot: t };
      }
      return { kind: "move", slot, move: mv, target };
    }
    if (c === 1) {
      if (itemUsed) { await this.text("¡Solo puedes usar un objeto por turno!"); return null; }
      const r = await bagMenu(g, { mode: "battle", wild: this.s.wild });
      if (!r) return null;
      if (ITEMS.get(r.item)?.kind === "ball") {
        if (!this.s.wild) { await this.text("¡No puedes aislar el Microo de otro investigador!"); return null; }
      }
      g.state.bag[r.item]--; if (g.state.bag[r.item] <= 0) delete g.state.bag[r.item];
      b.inventory[r.item] = (b.inventory[r.item] ?? 0) + 1;
      return { kind: "item", slot, item: r.item, party: r.target };
    }
    if (c === 2) {
      if (!b.canSwitch(ref)) { await this.text(`¡${displayName(me.mon)} no puede retirarse!`); return null; }
      const idx = await partyMenu(g, { mode: "switch", battle: b });
      if (idx < 0) return null;
      if (reserved.has(idx)) { await this.text(`¡${displayName(g.state.party[idx])} ya va a salir!`); return null; }
      return { kind: "switch", slot, party: idx };
    }
    if (c === 3) {
      if (!this.s.wild) { await this.text("¡No puedes huir de un combate contra otro investigador!"); return null; }
      return { kind: "run", slot };
    }
    return null;
  }
  /** Rival señalado al elegir objetivo (parpadea). */
  aim = -1;

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
  /** Posición y escala de cada Microo en la placa (individual o doble). */
  private spot(side: 0 | 1, slot: number): [number, number, number] {
    if (!this.doubles) return side === 1 ? [152, 10, 1] : [22, 56, 1.1];
    return side === 1 ? (slot === 0 ? [126, 24, 0.78] : [186, 8, 0.78]) : (slot === 0 ? [-4, 58, 0.92] : [62, 66, 0.92]);
  }
  draw(g: Gfx, game?: Game) {
    drawBattleBackground(g, this.s.env, this.bgCache);
    const frame = game?.frame ?? 0;
    // Rivales
    if (this.showTrainer && this.s.trainer) g.portrait(this.s.trainer.portrait ?? "becario", 158 + Math.max(0, this.trainerSlide), 0);
    else this.disp[1].forEach((f, slot) => {
      if (!f?.visible || !f.mon) return;
      const [x, y, k] = this.spot(1, slot);
      const blink = (f.flash > 0 && Math.floor(f.flash / 4) % 2 === 0) || (this.aim === slot && Math.floor(frame / 8) % 2 === 0);
      const sc = (f.appear > 0 ? 1 - f.appear / 24 : 1) * k;
      if (!blink) g.alpha(f.drop > 0 ? Math.max(0, 1 - f.drop / 48) : 1, () => g.microo(f.species, "frente", x + 40 * (k - sc), y + f.drop + 80 * (k - sc), sc));
    });
    // Criobola lanzada
    if (this.ballAnim > 0 || this.ballShake !== 0) {
      const t = Math.max(0, this.ballAnim) / 30;
      const bx = 192 - t * 120 + this.ballShake * 2, by = 66 - Math.sin((1 - t) * Math.PI) * (t > 0 ? 34 : 0);
      drawBallBig(g, bx, by);
    }
    // Propios (el segundo se dibuja detrás)
    [...this.disp[0].keys()].reverse().forEach((slot) => {
      const p = this.disp[0][slot];
      if (!p?.visible || !p.mon) return;
      const [x, y, k] = this.spot(0, slot);
      const blink = p.flash > 0 && Math.floor(p.flash / 4) % 2 === 0;
      if (!blink) g.alpha(p.drop > 0 ? Math.max(0, 1 - p.drop / 48) : 1, () => g.microo(p.species, "espalda", x, y + p.drop, k));
    });
    // Cajas de PS
    if (!this.doubles) {
      const f = this.disp[1][0], p = this.disp[0][0];
      if (f?.visible && f.mon) this.hpBox(g, f, 6, 10, false);
      if (p?.visible && p.mon) this.hpBox(g, p, W - 128, TB - 46, true);
    } else {
      this.disp[1].forEach((f, i) => { if (f?.visible && f.mon) this.hpBox(g, f, 4, 4 + i * 31, false, true); });
      this.disp[0].forEach((p, i) => { if (p?.visible && p.mon) this.hpBox(g, p, W - 116, TB - 74 + i * 37, true, true); });
    }
    g.rect(0, TB, W, 48, "#283048");
  }
  bgCache: { env?: string; c?: HTMLCanvasElement } = {};
  private hpBox(g: Gfx, d: Disp, x: number, y: number, mine: boolean, compact = false) {
    const m = d.mon!;
    const w = compact ? 112 : 122, h = mine && !compact ? 42 : compact && mine ? 35 : 30;
    // Caja estilo DS: borde oscuro, relleno claro con degradado y lengüeta
    const c = g.ctx;
    c.fillStyle = "#2c3040"; roundRect(c, x, y, w, h, 6); c.fill();
    const gr = c.createLinearGradient(0, y, 0, y + h);
    gr.addColorStop(0, "#fbfbf3"); gr.addColorStop(1, "#dcdccc");
    c.fillStyle = gr; roundRect(c, x + 2, y + 2, w - 4, h - 4, 5); c.fill();
    c.fillStyle = mine ? "#e8d8a8" : "#c8d8e8"; c.fillRect(x + 4, y + 3, 3, h - 6);
    g.text(displayName(m).slice(0, 12), x + 10, y + 5);
    g.text(`Nv${d.level}`, x + w - 32, y + 5);
    c.fillStyle = "#3a3e4c"; roundRect(c, x + 22, y + 17, w - 30, 7, 3); c.fill();
    g.text("PS", x + 10, y + 16, "orange", false);
    const frac = Math.max(0, d.hp / m.stats.hp);
    const col = frac > 0.5 ? ["#70f088", "#38b858"] : frac > 0.2 ? ["#f8e058", "#c8a020"] : ["#f87070", "#c83838"];
    c.fillStyle = col[1]; c.fillRect(x + 24, y + 19, Math.round((w - 34) * frac), 3);
    c.fillStyle = col[0]; c.fillRect(x + 24, y + 19, Math.round((w - 34) * frac), 1);
    if (d.status) { const [t, cc] = STATUS_TAG[d.status]; c.fillStyle = cc; roundRect(c, x + 68, y + 4, 22, 10, 3); c.fill(); g.text(t, x + 70, y + 5, "white", false); }
    if (mine && compact) { const t = `${Math.max(0, d.hp)}/${m.stats.hp}`; g.text(t, x + w - 8 - g.measure(t), y + 24); }
    if (mine && !compact) {
      g.text(`${Math.max(0, d.hp)}/${m.stats.hp}`, x + w - 50, y + 26);
      const sp = getSpecies(m.species);
      const lo = expForLevel(sp.growth, m.level), hi = expForLevel(sp.growth, m.level + 1);
      c.fillStyle = "#3a3e4c"; c.fillRect(x + 10, y + h - 6, w - 20, 3);
      c.fillStyle = "#48b0f8"; c.fillRect(x + 10, y + h - 6, Math.round((w - 20) * Math.max(0, Math.min(1, (m.exp - lo) / Math.max(1, hi - lo)))), 3);
    }
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}

/** Fondo de combate estilo DS: cielo con bandas, suelo con textura y plataformas con relieve (se cachea). */
function drawBattleBackground(g: Gfx, env: string, cache: { env?: string; c?: HTMLCanvasElement }) {
  if (cache.env !== env || !cache.c) {
    const cv = document.createElement("canvas"); cv.width = W; cv.height = TB;
    const c = cv.getContext("2d")!;
    const pal: Record<string, string[]> = {
      hierba: ["#9fd8f8", "#d8f0f8", "#8cd070", "#6cb058", "#a8e088", "#4a8c40"],
      bosque: ["#6a5aa8", "#a898d8", "#5a8a68", "#3e6a50", "#78a888", "#2a4a3a"],
      interior: ["#c8d0e0", "#e8ecf4", "#c0c8d4", "#a8b0c0", "#dce2ea", "#7c8494"],
      laboratorio: ["#c4dcec", "#eef6fc", "#d4dce4", "#b8c4d0", "#eef2f6", "#8894a4"],
      gimnasio: ["#f4d890", "#fff4d0", "#e8c870", "#c8a450", "#f8e098", "#a07c38"],
      cueva: ["#1a1424", "#3a2e48", "#4a3e52", "#2e2636", "#6a8a8a", "#1a1420"],
      invernadero: ["#bfe8f0", "#f0fff4", "#a8d898", "#7cb870", "#c8f0b0", "#4a8a50"],
      casino: ["#3a1830", "#7a2840", "#9a3848", "#6a2030", "#e8c050", "#401020"],
      torre: ["#2a2438", "#6a5a88", "#5a5068", "#3a3448", "#9a88b8", "#201830"],
    };
    const [sky1, sky2, g1, g2, rim, dark] = pal[env] ?? pal.hierba;
    const gr = c.createLinearGradient(0, 0, 0, 70);
    gr.addColorStop(0, sky1); gr.addColorStop(1, sky2);
    c.fillStyle = gr; c.fillRect(0, 0, W, 70);
    // nubes / reflejos suaves en bandas
    c.fillStyle = "rgba(255,255,255,0.35)";
    for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(20 + i * 46, 18 + (i % 3) * 9, 26, 5, 0, 0, Math.PI * 2); c.fill(); }
    const gg = c.createLinearGradient(0, 70, 0, TB);
    gg.addColorStop(0, g1); gg.addColorStop(1, g2);
    c.fillStyle = gg; c.fillRect(0, 70, W, TB - 70);
    c.fillStyle = dark; c.globalAlpha = 0.18;
    for (let i = 0; i < 70; i++) { const x = (i * 97) % W, y = 72 + ((i * 53) % (TB - 72)); c.fillRect(x, y, 3, 1); }
    c.globalAlpha = 1;
    const plat = (x: number, y: number, rx: number, ry: number) => {
      c.fillStyle = "rgba(0,0,0,0.18)"; c.beginPath(); c.ellipse(x + 4, y + 4, rx, ry, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = dark; c.beginPath(); c.ellipse(x, y + 2, rx, ry, 0, 0, Math.PI * 2); c.fill();
      const pg = c.createRadialGradient(x - rx * 0.3, y - ry * 0.6, 2, x, y, rx);
      pg.addColorStop(0, rim); pg.addColorStop(1, g2);
      c.fillStyle = pg; c.beginPath(); c.ellipse(x, y, rx - 2, ry - 2, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = "rgba(255,255,255,0.35)"; c.lineWidth = 1; c.beginPath(); c.ellipse(x, y - 1, rx - 6, ry - 5, 0, Math.PI * 1.05, Math.PI * 1.95); c.stroke();
    };
    plat(192, 84, 60, 15); plat(70, TB - 4, 76, 18);
    cache.env = env; cache.c = cv;
  }
  g.ctx.drawImage(cache.c!, 0, 0);
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
    const lines = game.g.wrap(this.text, W - 20);
    const total = lines.join("\n").length;
    if (this.shown < total) { this.shown += game.state.textSpeed * (game.input.down("a") ? 3 : 1); if (game.input.pressed("a")) this.shown = total; return false; }
    this.hold++;
    if (game.input.pressed("a") || game.input.pressed("b")) return true;
    return !this.waitInput && this.hold > 40;
  }
  draw(g: Gfx, game: Game) {
    g.frame(0, TB, W, 48, "oscuro");
    const lines = g.wrap(this.text, W - 20);
    const vis = lines.join("\n").slice(0, Math.floor(this.shown)).split("\n");
    vis.slice(-2).forEach((l, i) => g.text(l, 10, TB + 10 + i * 16, "white"));
    if (this.waitInput && this.shown >= lines.join("\n").length && Math.floor(game.frame / 16) % 2 === 0) g.text("▼", W - 16, TB + 32, "white", false);
  }
}

class ActionMenu implements Overlay {
  sel = 0; result = 0;
  constructor(public name: string, public canBack = false) {}
  update(game: Game) {
    const i = game.input;
    if (i.pressed("right") && this.sel % 2 === 0) this.sel++;
    if (i.pressed("left") && this.sel % 2 === 1) this.sel--;
    if (i.pressed("down") && this.sel < 2) this.sel += 2;
    if (i.pressed("up") && this.sel >= 2) this.sel -= 2;
    if (i.pressed("a")) { this.result = this.sel; return true; }
    if (this.canBack && i.pressed("b")) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.frame(0, TB, 128, 48, "oscuro");
    g.text("¿Qué debe hacer", 9, TB + 10, "white");
    g.text(`${this.name}?`, 9, TB + 26, "white");
    g.frame(128, TB, W - 128, 48, "menu");
    ["LUCHAR", "MOCHILA", "MICROOS", "HUIR"].forEach((t, i) => g.text(t, 144 + (i % 2) * 58, TB + 11 + Math.floor(i / 2) * 16));
    g.cursor(136 + (this.sel % 2) * 58, TB + 11 + Math.floor(this.sel / 2) * 16);
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
    g.frame(0, TB, 172, 48, "menu");
    this.mon.moves.forEach((s, i) => g.text(getMove(s.id).name.slice(0, 14), 14 + (i % 2) * 80, TB + 11 + Math.floor(i / 2) * 16, s.pp > 0 ? "dark" : "gray"));
    g.cursor(6 + (this.sel % 2) * 80, TB + 11 + Math.floor(this.sel / 2) * 16);
    g.frame(172, TB, W - 172, 48, "menu");
    const s = this.mon.moves[this.sel];
    if (s) {
      const mv = getMove(s.id);
      g.text("PP", 182, TB + 10); g.text(`${s.pp}/${s.maxPp}`, 206, TB + 10, s.pp === 0 ? "red" : "dark");
      g.text(mv.type.slice(0, 11), 182, TB + 26, "blue");
    }
  }
}

/** Elección del rival al que atacar en un combate doble. */
class TargetMenu implements Overlay {
  sel = 0; result = -1;
  constructor(public scene: BattleScene, public foes: number[]) { scene.aim = foes[0]; }
  update(game: Game) {
    const i = game.input;
    if (i.pressed("left") || i.pressed("right") || i.pressed("up") || i.pressed("down")) { this.sel = (this.sel + 1) % this.foes.length; this.scene.aim = this.foes[this.sel]; }
    if (i.pressed("a")) { this.result = this.foes[this.sel]; return true; }
    if (i.pressed("b")) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx) {
    g.frame(0, TB, W, 48, "menu");
    g.text("¿A quién atacar?", 10, TB + 8, "blue");
    this.foes.forEach((slot, k) => {
      const m = this.scene.b.sides[1].active[slot]?.mon;
      if (m) g.text(displayName(m), 26 + k * 120, TB + 26);
    });
    g.cursor(16 + this.sel * 120, TB + 26);
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
  draw(g: Gfx, game: Game) { g.clear("#101828"); g.microo(this.sp, "frente", (W - 80) / 2, 30); this.t.draw(g, game); }
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
    g.alpha(this.t > 200 ? 1 : 0.9, () => g.microo(sp, "frente", (W - 80) / 2, 30));
    if (this.t < 200 && phase) g.alpha(0.6, () => g.rect((W - 80) / 2, 30, 80, 80, "#ffffff"));
    g.frame(0, TB, W, 48, "oscuro");
    g.text("Pulsa B para detener la evolución.", 10, TB + 18, "gray");
  }
}
