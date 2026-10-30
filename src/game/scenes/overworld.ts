// Escena de mapa: movimiento por casillas, cámara, PNJ, entrenadores, hierba alta y puertas.
import type { Game, Scene } from "../game";
import { audio } from "../audio";
import { AVATAR_SPRITE } from "../state";
import type { Gfx } from "../gfx";
import { W, H } from "../gfx";
import { MAPS } from "../world/maps";
import { tileAt, passable, isGrass, type MapDef, type NpcDef } from "../world/builder";
import { runScript, talkNpc, trainerBattle, wildBattle } from "../scripts";
import { openStartMenu } from "./menus";
import { addItem } from "../state";
import { ITEMS } from "../../engine/data";
import { IMG, TILES, PROPS } from "../assets";

const DX = [0, 0, -1, 1], DY = [1, -1, 0, 0]; // abajo, arriba, izquierda, derecha

export interface NpcState { def: NpcDef; x: number; y: number; dir: number; ox: number; oy: number; moving: number; timer: number; home: { x: number; y: number }; emote: number }

export class Overworld implements Scene {
  map!: MapDef;
  npcs: NpcState[] = [];
  px = 0; py = 0; dir = 0;
  moving = 0; ox = 0; oy = 0; speed = 1; anim = 0; jumping = 0;
  busy = false;
  banner = 0;
  stepsInGrass = 0;

  constructor(public game: Game) {}

  load(id: string, x: number, y: number, dir?: number) {
    const m = MAPS[id];
    if (!m) throw new Error(`Mapa desconocido: ${id}`);
    this.map = m; this.px = x; this.py = y; if (dir !== undefined) this.dir = dir;
    this.moving = 0; this.ox = this.oy = 0;
    const f = this.game.state.flags;
    f[`visitado:${id}`] = true;      // para el mapa de la región
    this.npcs = m.npcs.filter((n) => (!n.showIf || f[n.showIf]) && (!n.hideIf || !f[n.hideIf]))
      .map((n) => ({ def: n, x: n.x, y: n.y, dir: n.dir ?? 0, ox: 0, oy: 0, moving: 0, timer: 60 + ((n.x * 37 + n.y * 11) % 120), home: { x: n.x, y: n.y }, emote: 0 }));
    const s = this.game.state;
    s.map = id; s.x = x; s.y = y; s.dir = this.dir;
    if (m.outdoor || m.env === "cueva") this.banner = 120;
    audio.music(m.music ?? (m.outdoor ? "ruta" : "pueblo"));
    this.lux = false;
  }
  /** Modo cinemática: muestra un mapa sin jugador, sin música ni efectos en la partida. */
  cine = false;
  vista(id: string) {
    const m = MAPS[id]; this.map = m; this.cine = true; this.banner = 0; this.px = 0; this.py = 0;
    this.npcs = m.npcs.filter((n) => !n.showIf && n.sprite !== "" && !n.sprite.startsWith("@"))
      .map((n) => ({ def: { ...n, move: n.trainer ? n.move : n.move ?? "pasear" }, x: n.x, y: n.y, dir: n.dir ?? 0, ox: 0, oy: 0, moving: 0, timer: 20 + ((n.x * 37 + n.y * 11) % 90), home: { x: n.x, y: n.y }, emote: 0 }));
  }
  /** Deslizándose sobre hielo (sin animación de paso, sin control). */
  sliding = false;
  /** En mapas oscuros: si se ha usado Quorum Sensing Lux en esta visita. */
  lux = false;
  refreshNpcs() {
    const f = this.game.state.flags;
    this.npcs = this.npcs.filter((n) => (!n.def.showIf || f[n.def.showIf]) && (!n.def.hideIf || !f[n.def.hideIf]));
  }
  npc(id: string) { return this.npcs.find((n) => n.def.id === id); }

  // ---------------------------------------------------------------- colisiones
  blocked(x: number, y: number, ignore?: NpcState): boolean {
    if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) return true;
    const t = tileAt(this.map, x, y);
    if (!passable(t)) return true;
    if (this.npcs.some((n) => n !== ignore && ((n.x === x && n.y === y) || (n.moving > 0 && n.x + DX[n.dir] === x && n.y + DY[n.dir] === y)))) return true;
    if (this.map.items.some((i) => !i.hidden && !this.game.state.flags[i.flag] && i.x === x && i.y === y)) return true;
    return false;
  }
  warpAt(x: number, y: number) {
    return this.map.warps.find((w) => x >= w.x && x < w.x + (w.w ?? 1) && y >= w.y && y < w.y + (w.h ?? 1));
  }

  // ---------------------------------------------------------------- actualización
  animate() {
    this.anim++;
    if (this.banner > 0) this.banner--;
    for (const n of this.npcs) this.updateNpc(n);
  }
  update(game: Game) {
    if (this.moving > 0) { this.stepMove(); return; }
    if (this.busy) return;
    const inp = game.input;
    if (inp.pressed("start")) { this.busy = true; openStartMenu(game, this).finally(() => (this.busy = false)); return; }
    if (inp.pressed("a")) { this.interact(); return; }
    const dirs: [string, number][] = [["down", 0], ["up", 1], ["left", 2], ["right", 3]];
    for (const [k, d] of dirs) {
      if (inp.down(k as "up")) { this.tryMove(d, inp.down("b")); return; }
    }
  }

  tryMove(d: number, run: boolean) {
    const turnOnly = this.dir !== d && !this.game.input.down(["down", "up", "left", "right"][this.dir] as "up");
    this.dir = d;
    const nx = this.px + DX[d], ny = this.py + DY[d];
    // Puertas y salidas por el borde
    const t = tileAt(this.map, nx, ny);
    if (t === "bordillo" && d === 0) { this.startMove(d, 2, false, true); return; }
    if (nx < 0 || ny < 0 || nx >= this.map.w || ny >= this.map.h) {
      const w = this.warpAt(this.px, this.py);
      if (w) this.doWarp(w, this.px, this.py);
      return;
    }
    if (t === "bordillo" || this.blocked(nx, ny)) { if (turnOnly) return; if (this.bump === 0) audio.sfx("bump"); this.bump = 8; return; }
    this.startMove(d, 1, run);
  }
  bump = 0;
  private startMove(d: number, tiles: number, run: boolean, jump = false) {
    this.speed = run ? 2 : 1;
    if (jump) { this.speed = 1; this.jumping = 32; }
    this.moving = 16 * tiles;
  }
  private stepMove() {
    const d = this.dir;
    this.ox += DX[d] * this.speed; this.oy += DY[d] * this.speed;
    this.moving -= this.speed;
    if (this.jumping > 0) this.jumping -= this.speed;
    if (Math.abs(this.ox) >= 16 || Math.abs(this.oy) >= 16) {
      this.px += Math.sign(this.ox); this.py += Math.sign(this.oy);
      this.ox -= Math.sign(this.ox) * 16; this.oy -= Math.sign(this.oy) * 16;
      if (this.moving <= 0) { this.moving = 0; this.ox = this.oy = 0; this.arrived(); }
    }
  }

  private async arrived() {
    const s = this.game.state;
    s.x = this.px; s.y = this.py; s.dir = this.dir;
    // Hielo: se sigue deslizando en la misma dirección hasta chocar
    if (tileAt(this.map, this.px, this.py) === "hielo" && !this.warpAt(this.px, this.py)) {
      const nx = this.px + DX[this.dir], ny = this.py + DY[this.dir];
      if (nx >= 0 && ny >= 0 && nx < this.map.w && ny < this.map.h && !this.blocked(nx, ny) && tileAt(this.map, nx, ny) !== "bordillo") {
        this.sliding = true; this.startMove(this.dir, 1, false); return;
      }
    }
    this.sliding = false;
    if (this.map.safari) {
      const left = Number(s.flags.safariSteps ?? 0) - 1;
      s.flags.safariSteps = left;
      if (left <= 0) { await this.lock(() => runScript(this.game, this, "finReserva")); return; }
    }
    const w = this.warpAt(this.px, this.py);
    const tile = tileAt(this.map, this.px, this.py);
    if (w && (tile.startsWith("muro_puerta") || tile === "puerta_hd" || tile === "alfombra" || tile === "escaleras" || tile === "cueva_entrada" || this.isEdge(this.px, this.py, w))) {
      if (tile === "alfombra" && this.dir !== 0) return;
      if (this.isEdge(this.px, this.py, w) && !tile.startsWith("muro_puerta") && tile !== "puerta_hd" && tile !== "alfombra") return; // los bordes se cruzan al seguir andando
      this.doWarp(w, this.px, this.py); return;
    }
    const tr = this.map.triggers.find((t) => this.px >= t.x && this.px < t.x + (t.w ?? 1) && this.py >= t.y && this.py < t.y + (t.h ?? 1));
    if (tr && (!tr.once || !s.flags[tr.once])) { await this.lock(() => runScript(this.game, this, tr.script)); return; }
    if (await this.checkTrainers()) return;
    const cave = (this.map.env === "cueva" && tile === "suelo_cueva") || (this.map.env === "torre" && tile === "suelo_torre") || this.map.floorEncounters === tile;
    if ((isGrass(tile) || cave) && this.map.grass.length && !this.game.noEncounters) {
      this.stepsInGrass++;
      const rng = (this.game.frame * 9301 + this.px * 49297 + this.py * 233) % 1000;
      if (rng < (cave ? 70 : 100) && s.party.some((m) => m.hp > 0)) {
        const total = this.map.grass.reduce((a, e) => a + e.w, 0);
        let r = Math.random() * total;
        const e = this.map.grass.find((x) => (r -= x.w) < 0) ?? this.map.grass[0];
        const lv = e.min + Math.floor(Math.random() * (e.max - e.min + 1));
        await this.lock(() => wildBattle(this.game, this, e.sp, lv));
      }
    }
  }
  private isEdge(x: number, y: number, _w: unknown) { return x === 0 || y === 0 || x === this.map.w - 1 || y === this.map.h - 1; }

  async lock(f: () => Promise<unknown>) {
    this.busy = true;
    try { await f(); } finally { this.busy = false; this.game.input.consume(); }
  }

  doWarp(w: NonNullable<ReturnType<Overworld["warpAt"]>>, x: number, y: number) {
    const tx = w.tx + (w.keep === "x" ? x - w.x : 0);
    const ty = w.ty + (w.keep === "y" ? y - w.y : 0);
    this.lock(async () => {
      await this.game.fade(true, 10);
      this.load(w.to, tx, ty, w.dir ?? this.dir);
      await this.game.fade(false, 10);
      if (this.map.onEnter) await runScript(this.game, this, this.map.onEnter);
      await this.checkTrainers();
    });
  }

  // ---------------------------------------------------------------- interacción
  facing() { return { x: this.px + DX[this.dir], y: this.py + DY[this.dir] }; }
  private interact() {
    const { x, y } = this.facing();
    let n = this.npcs.find((n) => n.x === x && n.y === y);
    // hablar por encima de un mostrador
    const t = tileAt(this.map, x, y);
    if (!n && t === "mostrador") n = this.npcs.find((m) => m.x === x + DX[this.dir] && m.y === y + DY[this.dir]);
    if (n) { if (n.def.sprite && !n.def.sprite.startsWith("@")) n.dir = [1, 0, 3, 2][this.dir]; this.lock(() => talkNpc(this.game, this, n!)); return; }
    if (t.startsWith("tragaperras")) { this.lock(() => runScript(this.game, this, "tragaperras")); return; }
    const sign = this.map.signs.find((s) => s.x === x && s.y === y);
    if (sign) { this.lock(() => this.game.say(sign.text)); return; }
    const it = this.map.items.find((i) => i.x === x && i.y === y && !this.game.state.flags[i.flag]);
    if (it) {
      this.lock(async () => {
        this.game.state.flags[it.flag] = true;
        addItem(this.game.state, it.item, it.n ?? 1);
        const name = ITEMS.get(it.item)?.name ?? it.item;
        await this.game.say(`¡{nombre} ha encontrado ${it.n && it.n > 1 ? `${it.n}× ` : ""}${name}!`);
      });
    }
  }

  // ---------------------------------------------------------------- PNJ
  private updateNpc(n: NpcState) {
    if (n.emote > 0) n.emote--;
    if (n.moving > 0) {
      n.ox += DX[n.dir]; n.oy += DY[n.dir]; n.moving--;
      if (n.moving === 0) { n.x += DX[n.dir]; n.y += DY[n.dir]; n.ox = n.oy = 0; }
      return;
    }
    if (this.busy || !n.def.move || n.def.move === "quieto") return;
    if (--n.timer > 0) return;
    n.timer = 90 + Math.floor(Math.random() * 120);
    const d = Math.floor(Math.random() * 4);
    if (n.def.move === "girar") { n.dir = d; return; }
    const nx = n.x + DX[d], ny = n.y + DY[d];
    n.dir = d;
    if (Math.abs(nx - n.home.x) > 2 || Math.abs(ny - n.home.y) > 2) return;
    if (this.blocked(nx, ny, n) || (nx === this.px && ny === this.py) || this.warpAt(nx, ny)) return;
    n.moving = 16;
  }
  /** Mueve un PNJ una casilla (para guiones). */
  async walkNpc(n: NpcState, d: number, steps = 1) {
    for (let i = 0; i < steps; i++) {
      n.dir = d; n.moving = 16;
      await this.game.wait(16);
    }
  }
  async walkPlayer(d: number, steps = 1) {
    for (let i = 0; i < steps; i++) {
      this.dir = d; this.speed = 1; this.moving = 16;
      while (this.moving > 0) { this.stepMove(); await this.game.wait(1); }
    }
  }

  /** ¿Algún entrenador ve al jugador? Lo lanza y devuelve true. */
  async checkTrainers(): Promise<boolean> {
    for (const n of this.npcs) {
      const tr = n.def.trainer;
      if (!tr || this.game.state.flags[`entrenador:${n.def.id}`]) continue;
      for (let k = 1; k <= tr.sight; k++) {
        const x = n.x + DX[n.dir] * k, y = n.y + DY[n.dir] * k;
        if (x === this.px && y === this.py) {
          await this.lock(async () => {
            n.emote = 40; await this.game.wait(40);
            for (let s = 1; s < k; s++) await this.walkNpc(n, n.dir);
            this.dir = [1, 0, 3, 2][n.dir];
            await trainerBattle(this.game, this, n);
          });
          return true;
        }
        if (this.blocked(x, y, n)) break;
      }
    }
    return false;
  }

  // ---------------------------------------------------------------- dibujo
  /** Cámara fija para capturas del mapa entero (solo herramientas de prueba). */
  debugCam: [number, number] | null = null;
  draw(g: Gfx, game: Game) {
    const camX = Math.round(this.px * 16 + this.ox - W / 2 + 8);
    const camY = Math.round(this.py * 16 + this.oy - H / 2 + 8);
    let cx = this.map.w * 16 < W ? -(W - this.map.w * 16) / 2 : Math.max(0, Math.min(this.map.w * 16 - W, camX));
    let cy = this.map.h * 16 < H ? -(H - this.map.h * 16) / 2 : Math.max(0, Math.min(this.map.h * 16 - H, camY));
    if (this.debugCam) [cx, cy] = this.debugCam;      // vistas completas del mapa (herramientas)
    g.clear("#000");
    const x0 = Math.floor(cx / 16) - 1, y0 = Math.floor(cy / 16) - 1;
    const hd = !!IMG.props_hd;
    const trees: [string, number, number][] = [];
    for (let y = y0; y < y0 + Math.ceil(H / 16) + 2; y++) for (let x = x0; x < x0 + Math.ceil(W / 16) + 2; x++) {
      if (x < 0 || y < 0 || x >= this.map.w || y >= this.map.h) continue;
      let t = tileAt(this.map, x, y, this.anim);
      if (hd && t.startsWith("arbol")) {
        // árbol HD de 2×2 casillas: suelo en las cuatro y la ilustración desde la esquina superior izquierda
        if (t.endsWith("_tl")) trees.push([t.startsWith("arbolv") ? "arbolv" : "arbol", x * 16 - cx, y * 16 - cy]);
        t = t.startsWith("arbolv") ? "hierba_oscura" : "hierba";
        if (t === "hierba_oscura" && TILES[t] === undefined) t = "hierba";
      }
      if (t === "bloque" || t === "puerta_hd") t = "hierba";
      g.tile(t, x * 16 - cx, y * 16 - cy);
    }
    for (const [n, x, y] of trees) drawProp(g, n, x - 1, y - 2, 34);
    // objetos del suelo
    for (const it of this.map.items) {
      if (it.hidden || game.state.flags[it.flag]) continue;
      drawBall(g, it.x * 16 - cx + 4, it.y * 16 - cy + 4);
    }
    // personajes y edificios HD ordenados por profundidad
    type E = { y: number; d: () => void };
    const ents: E[] = [];
    if (hd) for (const p of this.map.props ?? []) {
      const m = PROPS[p.sprite];
      if (!m?.door || !m.wall) continue;
      // la ilustración ocupa la planta: su alto es el de la planta y su puerta cae sobre la casilla de la puerta
      const k = (p.h * 16) / m.h;
      const dx = (p.x + p.door) * 16 + 8 - cx - m.door[0] * k, dy = (p.y + p.h) * 16 - cy - m.h * k;
      if (dx > W || dy > H || dx + m.w * k < 0 || dy + m.h * k < 0) continue;
      ents.push({ y: (p.y + p.h - 1) * 16 - cy - 1, d: () => drawProp(g, p.sprite, dx, dy, m.w * k) });
    }
    for (const n of this.npcs) {
      if (n.def.sprite === "") continue;
      const sx = n.x * 16 + n.ox - cx, sy = n.y * 16 + n.oy - cy;
      if (n.def.sprite === "@criobola") { ents.push({ y: sy, d: () => drawBall(g, sx + 4, sy + 2) }); continue; }
      if (n.def.sprite.startsWith("@microo:")) { const spc = n.def.sprite.slice(8); const bob = Math.floor(this.anim / 20) % 2; ents.push({ y: sy, d: () => g.icon(spc, bob, sx - 8, sy - 16 - bob) }); continue; }
      if (n.def.sprite.startsWith("@tile:")) { const t = n.def.sprite.slice(6); ents.push({ y: sy - 32, d: () => g.tile(t, sx, sy) }); continue; }
      const fr = n.moving > 0 ? (Math.floor(n.moving / 8) % 2 ? 1 : 2) : 0;
      ents.push({ y: sy, d: () => { g.character(n.def.sprite, n.dir, fr, sx - 8, sy - 18); if (n.emote > 0) drawEmote(g, sx + 4, sy - 26); } });
    }
    const psx = this.px * 16 + this.ox - cx, psy = this.py * 16 + this.oy - cy;
    const pfr = this.moving > 0 && !this.sliding ? (Math.floor((this.px + this.py) % 2 === 0 ? (this.moving > 8 ? 1 : 0) : (this.moving > 8 ? 2 : 0))) : 0;
    const jy = this.jumping > 0 ? -Math.round(Math.sin(((32 - this.jumping) / 32) * Math.PI) * 8) : 0;
    const heli = this.game.state.avatar === "apache";
    const pf = heli ? Math.floor(this.game.frame / 3) % 3 : pfr;      // el rotor gira siempre
    if (!this.cine) ents.push({ y: psy, d: () => g.character(AVATAR_SPRITE[this.game.state.avatar], this.dir, pf, psx - 8, psy - 18 + jy) });
    ents.sort((a, b) => a.y - b.y).forEach((e) => e.d());
    // la hierba alta tapa los pies del jugador
    const gt = tileAt(this.map, this.px, this.py);
    if (isGrass(gt) && this.moving === 0 && !heli) {
      const i = TILES[gt];
      g.ctx.drawImage(IMG.tiles, (i % 16) * 16, Math.floor(i / 16) * 16 + 10, 16, 6, psx, psy + 10, 16, 6);
    }
    if (this.map.safari) {
      const f = this.game.state.flags;
      g.panel(W - 92, 2, 90, 30, "#ffffff", "#e0ecd8", "#305028", 5);
      g.text(`Pasos ${Math.max(0, Number(f.safariSteps ?? 0))}`, W - 86, 5);
      g.text(`Criobolas ${Number(f.safariBalls ?? 0)}`, W - 86, 18, "green");
    }
    if (this.map.fog) drawFog(g, this.anim, !!this.game.state.bag["western-blot"]);
    if (this.map.dark) drawDark(g, psx + 8, psy - 2 + jy, this.lux ? 84 : 22);
    if (this.banner > 0 && (this.map.outdoor || this.map.env === "cueva")) {
      const yb = this.banner > 100 ? (120 - this.banner) * 1.2 - 24 : this.banner < 20 ? this.banner * 1.2 - 24 : 0;
      g.frame(2, 2 + yb, g.measure(this.map.name) + 20, 20, "info");
      g.text(this.map.name, 12, 8 + yb);
    }
  }
}

export function drawBall(g: Gfx, x: number, y: number) {
  const c = g.ctx;
  c.fillStyle = "#1a1420"; c.fillRect(x + 1, y, 6, 8); c.fillRect(x, y + 1, 8, 6);
  c.fillStyle = "#e04848"; c.fillRect(x + 1, y + 1, 6, 3);
  c.fillStyle = "#f8f8f8"; c.fillRect(x + 1, y + 4, 6, 3);
  c.fillStyle = "#1a1420"; c.fillRect(x + 1, y + 4, 6, 1);
  c.fillStyle = "#f8f8f8"; c.fillRect(x + 3, y + 3, 2, 2); c.fillStyle = "#ffb0b0"; c.fillRect(x + 2, y + 1, 1, 1);
}
/** Dibuja una ilustración HD del atlas de edificios con ancho w (la altura sale de la proporción). */
function drawProp(g: Gfx, name: string, x: number, y: number, w: number) {
  const m = PROPS[name];
  if (!m) return;
  const c = g.ctx;
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
  c.drawImage(IMG.props_hd, m.x, m.y, m.w, m.h, Math.round(x * 4) / 4, Math.round(y * 4) / 4, w, (w * m.h) / m.w);
  c.imageSmoothingEnabled = false;
}

function drawEmote(g: Gfx, x: number, y: number) {
  g.frame(x - 2, y, 12, 14, "info");
  g.text("!", x + 2, y + 2, "red", false);
}

/** Oscuridad con un círculo de luz alrededor del jugador (Túnel Endospórico). */
let darkCanvas: HTMLCanvasElement | null = null;
export function drawDark(g: Gfx, x: number, y: number, r: number) {
  darkCanvas ??= document.createElement("canvas");
  const c = darkCanvas; c.width = W; c.height = H;
  const k = c.getContext("2d")!;
  k.fillStyle = "rgba(4,4,12,0.96)"; k.fillRect(0, 0, c.width, c.height);
  k.globalCompositeOperation = "destination-out";
  const gr = k.createRadialGradient(x, y, r * 0.55, x, y, r);
  gr.addColorStop(0, "rgba(0,0,0,1)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  k.fillStyle = gr; k.beginPath(); k.arc(x, y, r, 0, Math.PI * 2); k.fill();
  k.globalCompositeOperation = "source-over";
  g.ctx.drawImage(c, 0, 0, W, H);
}

/** Niebla violeta que se desplaza (más tenue cuando el Western Blot permite identificar los priones). */
export function drawFog(g: Gfx, t: number, clear: boolean) {
  const c = g.ctx;
  c.save();
  c.globalAlpha = clear ? 0.16 : 0.32;
  for (let i = 0; i < 9; i++) {
    const x = ((i * 71 + t * (0.25 + (i % 3) * 0.12)) % (W + 120)) - 60;
    const y = 20 + ((i * 53) % 150) + Math.sin(t / 50 + i) * 6;
    const gr = c.createRadialGradient(x, y, 4, x, y, 56);
    gr.addColorStop(0, "#c8a8f0"); gr.addColorStop(1, "rgba(200,168,240,0)");
    c.fillStyle = gr; c.fillRect(x - 60, y - 60, 120, 120);
  }
  c.restore();
}
