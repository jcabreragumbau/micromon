// Pantalla de combate: dibuja la placa y traduce los eventos del motor en textos y animaciones.
import type { Game, Overlay, Scene } from "../game";
import { IMG } from "../assets";
import { audio } from "../audio";
import { Gfx, W, H, TB, TYPE_COLORS, shade } from "../gfx";
import { ponerMote } from "./nombre";
import { MoveForget, MoveDetail, iconoCategoria, nombreCategoria } from "./movinfo";
import { crearFx, dibujarFx, embestida, type Fx } from "./anim_ataques";
import { Battle, chooseActions, captureCheck, Rng, type Action, type BattleEvent } from "../../engine";
import { getMove, getSpecies, ITEMS, type StatusCode } from "../../engine/data";
import { displayName, expForLevel, replaceMove, evolve, type Microo } from "../../engine/microo";
import { markCaught, markSeen } from "../state";
import { partyMenu, bagMenu } from "./menus";

export interface BattleSetup {
  battle: Battle;
  wild: boolean;
  trainer?: { name: string; clase: string; portrait?: string; lose?: string; money?: number; /** Frase del entrenador al sacar cada especie (una vez). */ sendOut?: Record<string, string> };
  env: string;
  /** Reserva Microbiana: no se lucha; se lanzan Criobolas Verdes. */
  safari?: boolean;
}
/** Tema del combate: salvaje o contra un investigador (MP3 del usuario). */
export function battleTrack(s: { wild?: boolean; trainer?: { clase?: string } }) {
  // de momento el tema del usuario suena en todos los combates contra investigadores
  // (entrenadores, rival, líderes, Alto Mando, Pasteur y la Unidad de Genética)
  return s.wild ? "combate" : "entrenador";
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
  /** Animación del movimiento en curso. */
  fx: (Fx & { side: number; slot: number }) | null = null;
  /** La Criobola descansa en la placa (tras absorber al Microo). */
  ballRest = false;
  /** Microo siendo absorbido por la Criobola: hueco y fotogramas restantes (de 16 a 0). */
  absorb: { slot: number; t: number } | null = null;
  trainerSlide = 0; showTrainer = false; dichos = new Set<string>();
  finished: BattleOutcome | null = null;

  constructor(public game: Game, public s: BattleSetup) {
    for (const side of [0, 1] as const) {
      this.disp[side] = s.battle.sides[side].active.map(() => ({ mon: null, hp: 0, visible: false, flash: 0, drop: 0, appear: 0, status: null, level: 1, species: "" }));
    }
  }
  get b() { return this.s.battle; }
  private battleMusic() { audio.music(battleTrack(this.s)); }
  update() {}
  animate() {
    for (const side of this.disp) for (const d of side) {
      if (d.flash > 0) d.flash--; if (d.appear > 0) d.appear--;
      if (d.drop > 0 && d.drop < 48) d.drop += 3;
    }
    if (this.ballAnim > 0) this.ballAnim--;
    if (this.fx) this.fx.t++;
    if (this.absorb && this.absorb.t > 0) this.absorb.t--;
    if (this.trainerSlide > 0) this.trainerSlide -= 4;
  }

  // ---------------------------------------------------------------- flujo principal
  async run(): Promise<BattleOutcome> {
    const g = this.game, b = this.b;
    this.battleMusic();
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
    if (this.s.safari) return this.runSafari();
    while (!b.ended) {
      const acts = await this.chooseActions();
      if (!acts) continue;
      b.playTurn(acts, chooseActions(b, 1, this.s.wild ? "facil" : g.state.difficulty));
      for (const e of b.drain()) await this.play(e);
      await this.replacements();
    }
    return this.finish();
  }

  /** Combate de la Reserva Microbiana: Criobola Verde, Medio de Enriquecimiento, antibiótico o huir. */
  private async runSafari(): Promise<BattleOutcome> {
    const g = this.game, b = this.b, f = b.sides[1].active[0]!;
    const rng = new Rng((g.state.seed ^ (g.state.playFrames * 7919)) >>> 0);
    let calm = 0, angry = 0;
    for (;;) {
      const balls = Number(g.state.flags.safariBalls ?? 0);
      const c = await g.run<number>(new SafariMenu(balls));
      if (c === 3) { await this.text("¡Escapas sin problemas!"); return { outcome: "run" }; }
      if (c === 0) {
        if (balls <= 0) { await this.text("¡No te quedan Criobolas Verdes!"); continue; }
        g.state.flags.safariBalls = balls - 1;
        audio.sfx("ball"); this.ballAnim = 30; await this.text("¡Lanzas una Criobola Verde!");
        const mult = 1.5 * (calm > 0 ? 0.75 : 1) * (angry > 0 ? 2 : 1);
        const { caught, shakes } = captureCheck(f.mon, mult, rng);
        await this.absorbInto(0);
        for (let i = 0; i < shakes; i++) { this.ballShake = 1; await g.wait(12); this.ballShake = -1; await g.wait(12); this.ballShake = 0; await g.wait(16); }
        if (caught) {
          await this.text(`¡Ya está! ¡Has aislado a ${displayName(f.mon)}!`, true);
          b.captured = f.mon; b.outcome = "capture"; b.ended = true;
          return this.finish();
        }
        this.release(0);
        await this.text(shakes === 0 ? "¡Oh, no! ¡El Microo se ha escapado!" : "¡Casi lo tenías!");
        if (balls - 1 <= 0) { await this.text("¡Se te han acabado las Criobolas Verdes!"); return { outcome: "run" }; }
      }
      if (c === 1) { calm = rng.int(1, 5); angry = 0; await this.text(`¡Le ofreces un Medio de Enriquecimiento! ${displayName(f.mon)} se pone a crecer tranquilamente.`); }
      if (c === 2) { angry = rng.int(1, 5); calm = 0; await this.text(`¡Aplicas un antibiótico suave! ${displayName(f.mon)} se estresa.`); }
      // ¿huye el Microo?
      const flee = Math.min(0.6, (0.06 + f.mon.stats.spe / 500) * (calm > 0 ? 0.5 : 1) * (angry > 0 ? 2 : 1));
      if (calm > 0) calm--; if (angry > 0) angry--;
      if (rng.chance(flee)) { await this.text(`¡${displayName(f.mon)} ha huido!`); return { outcome: "foeFled" }; }
      if (calm > 0) await this.text(`${displayName(f.mon)} está absorbiendo nutrientes.`);
      else if (angry > 0) await this.text(`${displayName(f.mon)} está nervioso.`);
    }
  }

  /** Modo «Cambio» (como en Pokémon): en combates individuales contra entrenadores, antes de que el
   *  rival saque su siguiente Microo se anuncia cuál es y puedes cambiar el tuyo sin perder turno. */
  private async ofrecerCambio(sig: Microo) {
    const b = this.b, g = this.game, t = this.s.trainer;
    if (this.s.wild || !t || b.sides[0].active.length !== 1) return;
    const act = b.sides[0].active[0];
    if (!act || act.mon.hp <= 0) return;
    const banquillo = b.sides[0].party.some((m, i) => m.hp > 0 && i !== act.party);
    if (!banquillo) return;
    const quien = `${t.clase} ${t.name}`.trim();
    if (!(await g.yesno(`${quien} va a sacar a ${getSpecies(sig.species).name}. ¿Quieres cambiar de Microo?`))) return;
    const idx = await partyMenu(g, { mode: "switch", battle: b });
    if (idx < 0 || idx === act.party) return;
    b.freeSwitch(0, 0, idx);
    for (const e of b.drain()) await this.play(e);
  }
  private async replacements() {
    const b = this.b, g = this.game;
    if (b.ended) return;
    for (const slot of b.needsReplacement(1)) {
      const idx = b.sides[1].party.findIndex((m, i) => m.hp > 0 && !b.sides[1].active.some((x) => x?.party === i));
      if (idx >= 0) {
        await this.ofrecerCambio(b.sides[1].party[idx]);
        b.replace(1, slot, idx); markSeen(g.state, b.sides[1].party[idx].species);
      }
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
    if (out.outcome === "win" || out.outcome === "capture") audio.music("victoria");
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
      await ponerMote(g, m);
      if (g.state.party.length < 6) g.state.party.push(m);
      else { g.state.box.push(m); await this.text(`${displayName(m)} se ha enviado al Congelador de cepas.`); }
      out.captured = m;
    }
    // Evoluciones
    for (const ev of b.evolutionsPending) {
      // por uid y, por si acaso, comprobando que la evolución corresponde a esa especie
      const m = g.state.party.find((x) => x.uid === ev.uid && getSpecies(ev.to).evolvesFrom === x.species);
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
  /** Contra investigadores, cada mensaje espera a que pulses A (para ver el combate y leer con calma). */
  private async text(t: string, waitInput = false) { await this.game.run(new BattleText(this.game.fill(t), waitInput || !this.s.wild)); }

  private async play(e: BattleEvent) {
    const g = this.game, b = this.b;
    const side = e.side as 0 | 1 | undefined, slot = (e.slot as number) ?? 0;
    const d = side !== undefined ? this.disp[side][slot] : undefined;
    switch (e.type) {
      case "switch": {
        const mon = b.sides[side!].party[e.party as number];
        Object.assign(d!, { mon, hp: mon.hp, visible: true, drop: 0, appear: 20, status: mon.status, level: mon.level, species: mon.species });
        if (side === 1 && this.s.wild) { await this.text(e.text); break; }
        if (side === 1 && this.s.trainer?.sendOut?.[mon.species] && !this.dichos.has(mon.species)) {
          this.dichos.add(mon.species);
          await this.text(this.s.trainer.sendOut[mon.species]);
        }
        if (side === 1) { await this.text(`${this.s.trainer?.clase ?? ""} ${this.s.trainer?.name ?? ""} saca a ${displayName(mon)}.`.trim()); break; }
        await this.text(e.text);
        break;
      }
      case "withdraw": if (d) d.visible = false; await this.text(e.text); break;
      case "anim": {
        const [fs, fsl, ts, tsl] = [e.side as number, e.slot as number, e.toSide as number, e.toSlot as number];
        const ctr = (sd: number, sl: number): [number, number] => { const [x, y, k] = this.spot(sd as 0 | 1, sl); return [x + 40 * k, y + 44 * k]; };
        const fx = crearFx({ move: e.move as string, type: e.moveType as string, category: e.category as string, from: ctr(fs, fsl), to: ctr(ts, tsl), self: fs === ts && fsl === tsl });
        this.fx = { ...fx, side: fs, slot: fsl };
        await g.wait(fx.dur);
        this.fx = null;
        break;
      }
      case "damage": case "hp": {
        if (!d) break;
        // al impactar: el Microo parpadea y a la vez le baja la barra de PS
        if (e.type === "damage" && (e.amount as number) > 0) { audio.sfx("hit"); d.flash = 18; await g.wait(4); }
        await this.tweenHp(d, e.hp as number);
        break;
      }
      case "faint": audio.sfx("faint"); if (d) { d.drop = 1; await g.wait(16); } await this.text(e.text); if (d) d.visible = false; break;
      case "status": if (d) d.status = (e.status as StatusCode) ?? null; if (e.text) await this.text(e.text); break;
      case "cure": if (d) d.status = null; await this.text(e.text); break;
      case "levelup": {
        const m = b.sides[0].party.find((x) => x.uid === e.uid);
        const di = this.disp[0].find((x) => x.mon === m);
        if (di && m) { di.level = m.level; di.hp = m.hp; }
        audio.sfx("levelup");
        await this.text(e.text, true);
        break;
      }
      case "learnPending": await this.learnPrompt(e.uid as number, e.move as string); break;
      case "ball":
        audio.sfx("ball"); this.ballAnim = 30;
        // si va a haber captura, la Criobola se queda en la placa al caer
        this.ballRest = !!this.s.wild && this.disp[1].filter((d) => d?.visible && d.mon).length === 1;
        await this.text(e.text);
        if (!this.ballRest) await g.wait(20);
        break;
      case "shake": {
        const n = e.shakes as number;
        const slot = Math.max(0, this.disp[1].findIndex((d) => d?.visible && d.mon));
        await this.absorbInto(slot);
        for (let i = 0; i < n; i++) { this.ballShake = 1; await g.wait(12); this.ballShake = -1; await g.wait(12); this.ballShake = 0; await g.wait(16); }
        if (!(this.b.outcome === "capture")) this.release(slot);
        break;
      }
      case "capture": audio.sfx("capture"); this.disp[1][0].visible = false; await this.text(e.text, true); break;
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
    const idx = await g.run<number>(new MoveForget(m, move));
    if (idx < 0) { await this.text(`${displayName(m)} no ha aprendido ${name}.`, true); return; }
    const old = getMove(m.moves[idx].id).name;
    replaceMove(m, idx, move);
    await this.text(`1, 2 y… ¡zas! ${displayName(m)} ha olvidado ${old} y ha aprendido ${name}.`, true);
  }

  /** La Criobola cae, se abre y el Microo se encoge dentro de ella hasta desaparecer. */
  private async absorbInto(slot: number) {
    const g = this.game;
    if (this.ballAnim > 0) await g.wait(this.ballAnim);
    this.ballRest = true;
    this.absorb = { slot, t: 16 };
    audio.sfx("ball");
    await g.wait(17);
    if (this.disp[1][slot]) this.disp[1][slot].visible = false;
    this.absorb = null;
    await g.wait(10);
  }
  /** El Microo se libera: la Criobola desaparece y vuelve a aparecer en la placa. */
  private release(slot: number) {
    this.ballRest = false; this.ballAnim = 0;
    const d = this.disp[1][slot];
    if (d) { d.visible = true; d.appear = 20; }
  }

  // ---------------------------------------------------------------- dibujo
  /** Posición y escala de cada Microo en la placa (individual o doble). */
  private spot(side: 0 | 1, slot: number): [number, number, number] {
    if (!this.doubles) return side === 1 ? [152, 10, 1] : [22, 56, 1.1];
    return side === 1 ? (slot === 0 ? [124, 6, 0.72] : [188, -4, 0.72]) : (slot === 0 ? [-6, 76, 0.85] : [58, 80, 0.85]);
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
      if (this.absorb && this.absorb.slot === slot) {
        // se encoge hacia la Criobola con un destello rojo
        const q = this.absorb.t / 16, s2 = Math.max(0.05, q) * k;
        const cx = 192 + 6 + (x + 32 * k - 198) * q, cy = 66 + 6 + (y + 40 * k - 72) * q;
        g.alpha(0.35 + 0.65 * q, () => g.microo(f.species, "frente", cx - 32 * s2, cy - 40 * s2, s2));
        g.alpha(0.5 * (1 - q), () => g.round(cx - 10 * (1 - q) - 2, cy - 10 * (1 - q) - 2, 20 * (1 - q) + 4, 20 * (1 - q) + 4, 12, "#ff5050"));
        return;
      }
      const [lx, ly] = this.fx && this.fx.side === 1 && this.fx.slot === slot ? embestida(this.fx) : [0, 0];
      if (!blink) g.alpha(f.drop > 0 ? Math.max(0, 1 - f.drop / 48) : 1, () => g.microo(f.species, "frente", x + lx + 40 * (k - sc), y + ly + f.drop + 80 * (k - sc), sc));
    });
    // Criobola lanzada
    if (this.ballAnim > 0 || this.ballShake !== 0 || this.ballRest) {
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
      const [lx, ly] = this.fx && this.fx.side === 0 && this.fx.slot === slot ? embestida(this.fx) : [0, 0];
      if (!blink) g.alpha(p.drop > 0 ? Math.max(0, 1 - p.drop / 48) : 1, () => g.microo(p.species, "espalda", x + lx, y + ly + p.drop, k));
    });
    if (this.fx) dibujarFx(g, this.fx);
    // Cajas de PS
    if (!this.doubles) {
      const f = this.disp[1][0], p = this.disp[0][0];
      if (f?.visible && f.mon) { this.hpBox(g, f, 6, 10, false); g.typeBadges(this.typesOf(1, 0, f), 8, 43, 200); }
      if (p?.visible && p.mon) {
        const ts = this.typesOf(0, 0, p);
        const tw = ts.reduce((a, t) => a + g.measure(t) + 13, -3);
        g.typeBadges(ts, W - 6 - tw, TB - 62, 200);
        this.hpBox(g, p, W - 128, TB - 46, true);
      }
    } else {
      this.disp[1].forEach((f, i) => { if (f?.visible && f.mon) this.miniBox(g, f, 3, 3 + i * 37, false, this.typesOf(1, i, f)); });
      this.disp[0].forEach((p, i) => { if (p?.visible && p.mon) this.miniBox(g, p, W - 115, TB - 76 + i * 38, true, this.typesOf(0, i, p)); });
    }
    g.rect(0, TB, W, 48, "#283048");
  }
  bgCache: { env?: string; c?: HTMLCanvasElement } = {};
  /** Tipos actuales (los cambios por transformación o movimientos se reflejan). */
  private typesOf(side: 0 | 1, slot: number, d: Disp): string[] {
    const b = this.b.sides[side].active[slot];
    const t = (b && b.mon === d.mon ? this.b.typesOf(b) : null) ?? getSpecies(d.species).types;
    return [...t];
  }
  /** Caja compacta del combate doble: nombre, nivel, PS y tipos abreviados. */
  private miniBox(g: Gfx, d: Disp, x: number, y: number, mine: boolean, types: string[]) {
    const m = d.mon!, w = 112, h = 35;
    const c = g.ctx;
    c.fillStyle = "#2c3040"; roundRect(c, x, y, w, h, 5); c.fill();
    const gr = c.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, "#fbfbf3"); gr.addColorStop(1, "#dcdccc");
    c.fillStyle = gr; roundRect(c, x + 2, y + 2, w - 4, h - 4, 4); c.fill();
    c.fillStyle = mine ? "#e8d8a8" : "#c8d8e8"; c.fillRect(x + 4, y + 3, 2, h - 6);
    const lv = `Nv${d.level}`;
    g.text(g.fit(displayName(m), w - 22 - g.measure(lv)), x + 9, y + 3);
    g.text(lv, x + w - 6 - g.measure(lv), y + 3);
    c.fillStyle = "#3a3e4c"; roundRect(c, x + 8, y + 15, w - 16, 5, 2); c.fill();
    const frac = Math.max(0, d.hp / m.stats.hp);
    c.fillStyle = frac > 0.5 ? "#48c868" : frac > 0.2 ? "#e8c030" : "#e84848"; c.fillRect(x + 9, y + 16, Math.round((w - 18) * frac), 3);
    let tx = x + 9; for (const t of types) tx += g.miniType(t, tx, y + 21) + 2;
    if (d.status) { const [t, cc] = STATUS_TAG[d.status]; c.fillStyle = cc; roundRect(c, tx + 2, y + 21, 22, 11, 3); c.fill(); g.text(t, tx + 4, y + 21, "white", false); }
    if (mine) { const t = `${Math.max(0, d.hp)}/${m.stats.hp}`; g.text(t, x + w - 6 - g.measure(t), y + 21); }
  }
  private hpBox(g: Gfx, d: Disp, x: number, y: number, mine: boolean, compact = false, types?: string[]) {
    const m = d.mon!;
    const w = compact ? 112 : 122, h = (mine && !compact ? 42 : compact && mine ? 35 : 30) + (types ? 10 : 0);
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
    if (types) { let tx = x + 10; for (const t of types) tx += g.miniType(t, tx, y + h - 15) + 2; }
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
export function drawBattleBackground(g: Gfx, env: string, cache: { env?: string; c?: HTMLCanvasElement }) {
  // escenario ilustrado por el usuario (con sus propias plataformas)
  const ilu = IMG[`fondo_${env}`] ?? IMG.fondo_hierba;
  if (ilu) {
    const c = g.ctx; c.save(); c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    // subido un poco para que la plataforma rival quede bajo el Microo rival
    c.drawImage(ilu, 0, -14, W, TB + 14); c.restore();
    return;
  }
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
      hielo: ["#a8d8f8", "#eef8ff", "#d8ecf8", "#b0d0e8", "#ffffff", "#7898b8"],
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
    return !this.waitInput && this.hold > 55;
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
    // START: ficha completa del movimiento sin usarlo
    if (i.pressed("start") && this.mon.moves[this.sel]) { const s = this.mon.moves[this.sel]; void game.run(new MoveDetail(s.id, [s.pp, s.maxPp])); return false; }
    if (i.pressed("b")) { this.result = -1; return true; }
    if (i.pressed("a") && this.legal.includes(this.sel)) { this.result = this.sel; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    // cuatro celdas coloreadas por el tipo de cada movimiento
    g.rect(0, TB, W, H - TB, "#283048");
    for (let i = 0; i < 4; i++) {
      const s = this.mon.moves[i], x = 2 + (i % 2) * 95, y = TB + 2 + Math.floor(i / 2) * 23, on = i === this.sel;
      if (!s) { g.panel(x, y, 93, 21, "#4a5068", "#3a4058", "#202838", 5); g.text("—", x + 43, y + 5, "gray", false); continue; }
      const mv = getMove(s.id), col = TYPE_COLORS[mv.type] ?? "#a0a0a0", vacio = s.pp <= 0;
      const borde = on ? (Math.floor((game?.frame ?? 0) / 12) % 2 ? "#fff8c0" : "#f8d038") : shade(col, -0.5);
      g.panel(x, y, 93, 21, vacio ? "#808088" : shade(col, on ? 0.35 : 0.1), vacio ? "#606068" : shade(col, -0.15), borde, 5);
      iconoCategoria(g, mv.category, x + 4, y + 6);
      g.text(g.fit(mv.name, 72), x + 20, y + 5, "white");
    }
    // información del seleccionado (PP, tipo, categoría y potencia)
    g.panel(193, TB + 2, W - 195, 44, "#ffffff", "#e8e8f0", "#384058", 5);
    const s = this.mon.moves[this.sel];
    if (s) {
      const mv = getMove(s.id), pp = `${s.pp}/${s.maxPp}`;
      g.text(pp, W - 6 - g.measure(pp), TB + 5, s.pp === 0 ? "red" : "dark");
      g.text("PP", 197, TB + 5, "gray", false);
      g.miniType(mv.type, 197, TB + 19);
      const cat = mv.category === "physical" ? "FÍS" : mv.category === "special" ? "ESP" : "EST", pot = mv.power ? `${mv.power}` : "—";
      g.text(cat, 197, TB + 31, mv.category === "physical" ? "orange" : mv.category === "special" ? "blue" : "gray", false);
      g.text(pot, W - 6 - g.measure(pot), TB + 31, "dark", false);
    }
    // aviso del botón de información, sobre la placa a la izquierda
    const hint = "START: ficha del ataque";
    g.alpha(0.75, () => g.round(2, TB - 15, g.measure(hint) + 10, 13, 5, "#182030"));
    g.text(hint, 7, TB - 14, "white", false);
  }
}

class SafariMenu implements Overlay {
  sel = 0; result = 0;
  constructor(public balls: number) {}
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
    g.frame(0, TB, 112, 48, "oscuro");
    g.text("¿Qué vas a", 9, TB + 10, "white");
    g.text("hacer?", 9, TB + 26, "white");
    g.frame(112, TB, W - 112, 48, "menu");
    [`CRIOBOLA×${this.balls}`, "MEDIO", "ANTIBIÓTICO", "HUIR"].forEach((t, i) => g.text(t, 124 + (i % 2) * 72, TB + 11 + Math.floor(i / 2) * 16));
    g.cursor(116 + (this.sel % 2) * 72, TB + 11 + Math.floor(this.sel / 2) * 16);
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
