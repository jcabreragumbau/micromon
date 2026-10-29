// Transiciones de entrada al combate.
// Entrenador: hileras de placas de Petri que barren la pantalla. Salvaje: parpadeo y cortinilla de persianas.
import type { Game, Overlay } from "../game";
import { Gfx, W, H } from "../gfx";

const ROWS = 5, RH = H / ROWS, R = 17;
const AGAR = ["#c83a3a", "#e8c860", "#d86aa0", "#5a3a28", "#e0e0b0"];   // sangre, chocolate claro, MacConkey, chocolate, nutritivo
const COLONIA = ["#f4e8d8", "#fff8c0", "#fff0f8", "#e8d0a0", "#f8f8ff"];

function dish(g: Gfx, cx: number, cy: number, row: number, rot: number) {
  g.round(cx - R - 1, cy - R - 1, 2 * R + 2, 2 * R + 2, R + 1, "#102030");
  g.round(cx - R, cy - R, 2 * R, 2 * R, R, "#dff0f8");
  g.round(cx - R + 3, cy - R + 3, 2 * R - 6, 2 * R - 6, R - 3, AGAR[row % AGAR.length]);
  for (let k = 0; k < 6; k++) {
    const a = rot + k * 1.9 + row, d = 4 + ((k * 5) % 9);
    const s = k % 3 === 0 ? 4 : 3;
    g.round(cx + Math.cos(a) * d - s / 2, cy + Math.sin(a) * d - s / 2, s, s, s / 2, COLONIA[row % COLONIA.length]);
  }
  g.alpha(0.55, () => { g.rect(cx - R + 5, cy - R + 6, 6, 2, "#ffffff"); g.rect(cx - R + 4, cy - R + 8, 2, 4, "#ffffff"); });
}

/** Placas de Petri que ruedan de derecha a izquierda. cover=true: tapan la pantalla; false: la destapan. */
export class PetriSweep implements Overlay {
  t = 0;
  constructor(public cover: boolean) {}
  private edge(row: number) {
    const start = (row % 2 ? 6 : 0) + row * 3;
    return W + R + 2 - Math.max(0, this.t - start) * 9;
  }
  update(game: Game) {
    this.t++;
    if (!this.cover) game.blackout = 0;
    const done = [...Array(ROWS).keys()].every((r) => this.edge(r) < -R - 2);
    if (done && this.cover) game.blackout = 1;
    return done;
  }
  draw(g: Gfx) {
    for (let r = 0; r < ROWS; r++) {
      const e = this.edge(r), y = Math.round(r * RH), h = Math.round((r + 1) * RH) - y;
      if (this.cover) g.rect(Math.max(0, e), y, W - Math.max(0, e) + 1, h, "#000");
      else g.rect(0, y, Math.max(0, Math.min(W, e)), h, "#000");
      if (e > -R - 2 && e < W + R + 2) dish(g, e, y + h / 2, r, -e / R);
    }
  }
}

/** Combate salvaje: la pantalla parpadea y se cierra con persianas que entran por ambos lados. */
export class WildIntro implements Overlay {
  t = 0;
  static FLASH = 26; static BLIND = 26;
  update(game: Game) {
    this.t++;
    if (this.t >= WildIntro.FLASH + WildIntro.BLIND) { game.blackout = 1; return true; }
    return false;
  }
  draw(g: Gfx) {
    if (this.t < WildIntro.FLASH) {
      const on = Math.floor(this.t / 4) % 2 === 0;
      if (on) g.alpha(0.85, () => g.rect(0, 0, W, H, this.t < 12 ? "#ffffff" : "#000000"));
      return;
    }
    blinds(g, (this.t - WildIntro.FLASH) / WildIntro.BLIND, true);
  }
}

/** Persianas que se abren para mostrar el combate. */
export class CurtainOpen implements Overlay {
  t = 0;
  update(game: Game) { this.t++; game.blackout = 0; return this.t >= 22; }
  draw(g: Gfx) { blinds(g, 1 - this.t / 22, false); }
}

function blinds(g: Gfx, p: number, closing: boolean) {
  const n = 8, sh = H / n;
  const q = Math.max(0, Math.min(1, p));
  for (let i = 0; i < n; i++) {
    const w = Math.ceil(W * Math.min(1, q * 1.15 - (closing ? (i % 4) * 0.04 : 0)));
    if (w <= 0) continue;
    const y = Math.round(i * sh), h = Math.round((i + 1) * sh) - y;
    if (i % 2 === 0) g.rect(0, y, w, h, "#000"); else g.rect(W - w, y, w, h, "#000");
    // borde brillante de la persiana
    if (w < W) g.rect(i % 2 === 0 ? w - 2 : W - w, y, 2, h, "#e04040");
  }
}
