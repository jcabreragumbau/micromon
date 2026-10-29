// Núcleo: bucle de 60 fps, escena base y pila de capas (diálogos, menús, fundidos).
import { Gfx, W, H, TB, type TextColor } from "./gfx";
import { Input } from "./input";
import { newState, type GameState } from "./state";

export interface Scene { update(game: Game): void; draw(g: Gfx, game: Game): void; animate?(game: Game): void }
export interface Overlay { update(game: Game): boolean; draw(g: Gfx, game: Game): void; result?: unknown; transparent?: boolean }

export class Game {
  g: Gfx;
  input = new Input();
  state: GameState = newState();
  scene: Scene | null = null;
  overlays: { ov: Overlay; resolve: (v: unknown) => void }[] = [];
  frame = 0;
  /** Velocidad de simulación (las pruebas automáticas la suben). */
  turbo = 1;
  private acc = 0;
  private last = 0;

  constructor(canvas: HTMLCanvasElement) { this.g = new Gfx(canvas); }

  start() {
    const loop = (t: number) => {
      if (!this.last) this.last = t;
      this.acc += Math.min(250, t - this.last); this.last = t;
      let steps = 0;
      while (this.acc >= 1000 / 60 && steps < 8) { this.step(); this.acc -= 1000 / 60; steps++; }
      if (steps >= 8) this.acc = 0;
      this.draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
  step() {
    for (let k = 0; k < this.turbo; k++) {
      this.input.tick();
      this.frame++;
      this.state.playFrames++;
      this.scene?.animate?.(this);
      const top = this.overlays[this.overlays.length - 1];
      if (top) {
        if (top.ov.update(this)) { this.overlays.pop(); top.resolve(top.ov.result); }
      } else this.scene?.update(this);
    }
  }
  draw() {
    this.g.clear("#000");
    this.scene?.draw(this.g, this);
    if (this.blackout > 0) this.g.alpha(Math.min(1, this.blackout), () => this.g.rect(0, 0, W, H, "#000"));
    for (const o of this.overlays) o.ov.draw(this.g, this);
  }
  run<T = unknown>(ov: Overlay): Promise<T> {
    return new Promise((resolve) => this.overlays.push({ ov, resolve: resolve as (v: unknown) => void }));
  }
  wait(frames: number): Promise<void> { return this.run(new WaitOverlay(frames)) as Promise<void>; }

  // ---------------------------------------------------------------- utilidades de diálogo
  say(text: string, opts: { keep?: boolean; speaker?: string } = {}): Promise<void> {
    return this.run(new Dialog(this.fill(text), opts.keep ?? false, opts.speaker)) as Promise<void>;
  }
  async choose(options: string[], opts: { x?: number; y?: number; cancel?: number; prompt?: string } = {}): Promise<number> {
    if (opts.prompt) await this.say(opts.prompt, { keep: true });
    const r = await this.run<number>(new Choice(options, opts.x, opts.y, opts.cancel ?? -1));
    if (opts.prompt) this.popKept();
    return r;
  }
  async yesno(prompt: string): Promise<boolean> {
    return (await this.choose(["SÍ", "NO"], { prompt, x: 180, y: 76, cancel: 1 })) === 0;
  }
  /** Cierra el diálogo que quedó abierto con keep. */
  popKept() { this.keptDialog = null; }
  keptDialog: Dialog | null = null;
  fade(out: boolean, frames = 16): Promise<void> { return this.run(new Fade(out, frames)) as Promise<void>; }
  blackout = 0;
  /** Sustituye {nombre} y {rival}. */
  fill(t: string) { return t.replaceAll("{nombre}", this.state.name).replaceAll("{rival}", this.state.rival); }
}

class WaitOverlay implements Overlay {
  transparent = true;
  constructor(private n: number) {}
  update() { return --this.n <= 0; }
  draw() {}
}

export class Fade implements Overlay {
  private t = 0;
  constructor(private out: boolean, private n: number) {}
  update(game: Game) { this.t++; game.blackout = this.out ? this.t / this.n : 1 - this.t / this.n; if (this.t >= this.n) { game.blackout = this.out ? 1 : 0; return true; } return false; }
  draw() {}
}

/** Caja de texto con efecto máquina de escribir; dos líneas visibles. */
export class Dialog implements Overlay {
  lines: string[] = [];
  private shown = 0;     // caracteres mostrados de la página
  private page = 0;
  private done = false;
  constructor(public text: string, public keep = false, public speaker?: string) {}
  private wrapped(g: Gfx) { if (!this.lines.length) this.lines = g.wrap(this.text, W - 24); return this.lines; }
  update(game: Game) {
    const lines = this.wrapped(game.g);
    const pageText = lines.slice(this.page * 2, this.page * 2 + 2).join("\n");
    if (this.shown < pageText.length) {
      this.shown += game.state.textSpeed * (game.input.down("a") || game.input.down("b") ? 3 : 1);
      if (game.input.pressed("a") || game.input.pressed("b")) this.shown = pageText.length;
      return false;
    }
    if ((this.page + 1) * 2 < lines.length) {
      if (game.input.pressed("a") || game.input.pressed("b")) { this.page++; this.shown = 0; }
      return false;
    }
    if (this.keep) { game.keptDialog = this; return true; }
    if (game.input.pressed("a") || game.input.pressed("b")) { this.done = true; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    const lines = this.wrapped(g);
    g.frame(0, TB, W, 48, "texto");
    const pageText = lines.slice(this.page * 2, this.page * 2 + 2).join("\n").slice(0, Math.floor(this.shown));
    pageText.split("\n").forEach((l, i) => g.text(l, 11, TB + 10 + i * 16));
    const full = lines.slice(this.page * 2, this.page * 2 + 2).join("\n").length;
    if (this.shown >= full && !this.keep && Math.floor(game.frame / 16) % 2 === 0) g.text("▼", W - 18, TB + 30, "red", false);
  }
}

/** Menú de opciones; devuelve el índice o `cancel` con B. */
export class Choice implements Overlay {
  sel = 0;
  result = -1;
  constructor(public options: string[], public x?: number, public y?: number, public cancel = -1, public color: TextColor = "dark") {}
  size(g: Gfx) {
    const w = Math.max(...this.options.map((o) => g.measure(o))) + 24;
    const h = this.options.length * 16 + 10;
    return { w, h, x: this.x ?? W - w - 2, y: this.y ?? H - 48 - h - 2 };
  }
  update(game: Game) {
    const n = this.options.length;
    if (game.input.repeat("down")) this.sel = (this.sel + 1) % n;
    if (game.input.repeat("up")) this.sel = (this.sel + n - 1) % n;
    if (game.input.pressed("a")) { this.result = this.sel; return true; }
    if (game.input.pressed("b") && this.cancel >= 0) { this.result = this.cancel === 999 ? -1 : this.cancel; return true; }
    if (game.input.pressed("b") && this.cancel === -1) { this.result = -1; return true; }
    return false;
  }
  draw(g: Gfx, game: Game) {
    if (game.keptDialog) game.keptDialog.draw(g, game);
    const { w, h, x, y } = this.size(g);
    g.frame(x, y, w, h);
    this.options.forEach((o, i) => g.text(o, x + 16, y + 7 + i * 16, this.color));
    g.cursor(x + 7, y + 7 + this.sel * 16);
  }
}
