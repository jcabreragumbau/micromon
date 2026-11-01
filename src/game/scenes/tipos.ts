// Tabla de tipos (botón SELECT en combate): elige un tipo y ve contra qué es eficaz al atacar y qué le
// afecta al defender. Si hay un Microo rival, la primera opción es «RIVAL»: sus debilidades y
// resistencias reales con sus dos tipos combinados (×4, ×2, ×0,5, ×0,25, ×0).
import type { Game, Overlay } from "../game";
import { Gfx, W, H, TYPE_COLORS, TYPE_ABBR, shade } from "../gfx";
import { TYPE_NAMES, typeEffectiveness, type TypeName } from "../../engine/data";

const COLS = 6;

export class TablaTipos implements Overlay {
  sel = 0; result = null;
  private opciones: (string | null)[];          // null = el rival
  constructor(public rival: { nombre: string; tipos: string[] } | null) {
    this.opciones = [...(rival ? [null] : []), ...TYPE_NAMES];
    // empieza en el rival o, si no hay, en el primer tipo
    this.sel = 0;
  }
  update(game: Game) {
    const i = game.input, n = this.opciones.length;
    if (i.pressed("b") || i.pressed("select") || i.pressed("start")) return true;
    if (i.repeat("right")) this.sel = (this.sel + 1) % n;
    if (i.repeat("left")) this.sel = (this.sel + n - 1) % n;
    if (i.repeat("down")) this.sel = Math.min(n - 1, this.sel + COLS);
    if (i.repeat("up")) this.sel = Math.max(0, this.sel - COLS);
    return false;
  }

  draw(g: Gfx) {
    const c = g.ctx;
    c.fillStyle = "#1c2030"; c.fillRect(0, 0, W, H);
    g.text("TABLA DE TIPOS", 6, 3, "white");
    g.text("SELECT/B: salir", W - 6 - g.measure("SELECT/B: salir"), 3, "gray");
    // rejilla de tipos (6 columnas)
    const cw = 41, ch = 13, x0 = 5, y0 = 16;
    this.opciones.forEach((t, k) => {
      const x = x0 + (k % COLS) * cw, y = y0 + Math.floor(k / COLS) * ch;
      const base = t ? TYPE_COLORS[t] ?? "#999" : "#d8d8e8";
      const on = k === this.sel;
      g.round(x, y, cw - 2, ch - 2, 2, on ? "#ffffff" : shade(base, -0.55));
      g.round(x + 1, y + 1, cw - 4, ch - 4, 2, t ? base : "#3a3f58");
      const s = g.fit(t ?? "RIVAL", cw - 6);
      g.rawText(s, x + Math.round((cw - 2 - g.measure(s)) / 2), y + 1, t ? "#ffffff" : "#ffe070");
    });
    const yInfo = y0 + Math.ceil(this.opciones.length / COLS) * ch + 3;
    const t = this.opciones[this.sel];
    if (t === null && this.rival) this.dibujarRival(g, yInfo);
    else if (t) this.dibujarTipo(g, t as TypeName, yInfo);
  }

  /** Lista de etiquetas abreviadas que salta de línea; devuelve la altura usada. */
  private fila(g: Gfx, etiqueta: string, color: string, tipos: string[], x: number, y: number, w: number): number {
    g.rawText(etiqueta, x, y, color);
    let cx = x + 30, cy = y - 1;
    if (!tipos.length) { g.rawText("—", cx, y, "#8890a8"); return 12; }
    for (const t of tipos) {
      const tw = g.measure(abbr(t)) + 6;
      if (cx + tw > x + w) { cx = x + 30; cy += 12; }
      g.miniType(t, cx, cy); cx += tw + 2;
    }
    return cy - y + 13;
  }

  private dibujarTipo(g: Gfx, t: TypeName, y: number) {
    const ataque = (m: number) => TYPE_NAMES.filter((d) => typeEffectiveness(t, [d]) === m);
    const defensa = (m: number) => TYPE_NAMES.filter((a) => typeEffectiveness(a, [t]) === m);
    g.typeBadge(t, 5, y);
    const colW = (W - 15) / 2, yp = y + 16;
    for (const [i, titulo, lst] of [
      [0, "AL ATACAR", [["×2", "#78e080", ataque(2)], ["×0,5", "#f0a060", ataque(0.5)], ["×0", "#a0a8c0", ataque(0)]]],
      [1, "AL DEFENDER", [["×2", "#f07070", defensa(2)], ["×0,5", "#78e080", defensa(0.5)], ["×0", "#78c8f0", defensa(0)]]],
    ] as const) {
      const x = 5 + i * (colW + 5);
      g.panel(x, yp, colW, H - yp - 4, "#2a3048", "#232838", "#454b63", 4);
      g.rawText(titulo, x + 4, yp + 3, "#ffffff");
      let yy = yp + 15;
      for (const [et, col, tipos] of lst) yy += this.fila(g, et, col, tipos as string[], x + 4, yy, colW - 8) + 2;
    }
  }

  private dibujarRival(g: Gfx, y: number) {
    const r = this.rival!;
    const tipos = r.tipos.slice(0, 2) as TypeName[];
    const mult = (a: TypeName) => typeEffectiveness(a, tipos);
    const lst = (m: number) => TYPE_NAMES.filter((a) => mult(a) === m);
    g.text(r.nombre, 5, y + 2, "white");
    let bx = 9 + g.measure(r.nombre);
    for (const t of tipos) bx += g.typeBadge(t, bx, y) + 3;
    y += 16;
    g.panel(5, y, W - 10, H - y - 4, "#2a3048", "#232838", "#454b63", 4);
    g.rawText("DAÑO QUE RECIBE DE CADA TIPO", 9, y + 3, "#ffffff");
    const colW = (W - 24) / 2;
    let yl = y + 16, yr = y + 16;
    yl += this.fila(g, "×4", "#ff5a5a", lst(4), 9, yl, colW) + 2;
    yl += this.fila(g, "×2", "#f07070", lst(2), 9, yl, colW) + 2;
    yr += this.fila(g, "×0,5", "#78e080", lst(0.5), 14 + colW, yr, colW) + 2;
    yr += this.fila(g, "×0,25", "#58c060", lst(0.25), 14 + colW, yr, colW) + 2;
    yr += this.fila(g, "×0", "#78c8f0", lst(0), 14 + colW, yr, colW) + 2;
  }
}

function abbr(t: string) { return TYPE_ABBR[t] ?? t.slice(0, 3).toUpperCase(); }
