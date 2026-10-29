// Dibujo sobre un lienzo de 256×192 (pantalla de DS) sin suavizado: tiles, sprites, texto con la fuente propia y marcos.
import { IMG, FONT, TILES, CHARS, MICRO } from "./assets";

export const W = 256, H = 192;
/** Parte superior de la caja de texto inferior. */
export const TB = H - 48;
export type TextColor = "dark" | "white" | "red" | "blue" | "gray" | "green" | "orange";
const COLORS: Record<TextColor, [string, string]> = {
  dark: ["#383840", "#d0d0c8"], white: ["#f8f8f8", "#585860"], red: ["#d83838", "#f8c8c0"],
  blue: ["#3058c0", "#b8c8f0"], gray: ["#808088", "#d8d8d0"], green: ["#30a050", "#c0e8c8"], orange: ["#e07828", "#f8d8b0"],
};

export class Gfx {
  ctx: CanvasRenderingContext2D;
  private fonts = new Map<string, HTMLCanvasElement>();
  constructor(public canvas: HTMLCanvasElement) {
    canvas.width = W; canvas.height = H;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;
  }
  clear(c = "#000") { this.ctx.fillStyle = c; this.ctx.fillRect(0, 0, W, H); }
  rect(x: number, y: number, w: number, h: number, c: string) { this.ctx.fillStyle = c; this.ctx.fillRect(Math.round(x), Math.round(y), w, h); }
  alpha(a: number, f: () => void) { const p = this.ctx.globalAlpha; this.ctx.globalAlpha = a; f(); this.ctx.globalAlpha = p; }

  tile(name: string, x: number, y: number) {
    const i = TILES[name];
    if (i === undefined) return;
    this.ctx.drawImage(IMG.tiles, (i % 16) * 16, Math.floor(i / 16) * 16, 16, 16, Math.round(x), Math.round(y), 16, 16);
  }
  /** Personaje de mapa: dir 0 abajo, 1 arriba, 2 izquierda, 3 derecha; frame 0-2. */
  character(id: string, dir: number, frame: number, x: number, y: number) {
    const s = CHARS.sheets[id] ?? CHARS.sheets.becario;
    this.ctx.drawImage(IMG.personajes, frame * 32, s * 128 + dir * 32, 32, 32, Math.round(x), Math.round(y), 32, 32);
  }
  portrait(id: string, x: number, y: number) {
    const p = CHARS.portraits[id];
    if (p === undefined) { this.ctx.save(); this.ctx.drawImage(IMG.personajes, 0, (CHARS.sheets[id] ?? 0) * 128, 32, 32, Math.round(x), Math.round(y) + 32, 64, 64); this.ctx.restore(); return; }
    this.ctx.drawImage(IMG.retratos, p * 64, 0, 64, 96, Math.round(x), Math.round(y), 64, 96);
  }
  microo(species: string, view: "frente" | "espalda", x: number, y: number, scale = 1, flipX = false) {
    const i = MICRO.index[species] ?? 0;
    const C = MICRO.cell ?? 64;
    const img = view === "frente" ? IMG.microos_frente : IMG.microos_espalda;
    const sx = (i % MICRO.cols) * C, sy = Math.floor(i / MICRO.cols) * C;
    if (flipX) {
      this.ctx.save(); this.ctx.translate(Math.round(x) + C * scale, Math.round(y)); this.ctx.scale(-1, 1);
      this.ctx.drawImage(img, sx, sy, C, C, 0, 0, C * scale, C * scale); this.ctx.restore();
    } else this.ctx.drawImage(img, sx, sy, C, C, Math.round(x), Math.round(y), C * scale, C * scale);
  }
  icon(species: string, frame: number, x: number, y: number) {
    const i = MICRO.index[species] ?? 0;
    this.ctx.drawImage(IMG.microos_iconos, (i % MICRO.cols) * 64 + frame * 32, Math.floor(i / MICRO.cols) * 32, 32, 32, Math.round(x), Math.round(y), 32, 32);
  }

  // ---------------------------------------------------------------- texto
  private fontCanvas(color: string): HTMLCanvasElement {
    let c = this.fonts.get(color);
    if (c) return c;
    const src = IMG.font;
    c = document.createElement("canvas"); c.width = src.width; c.height = src.height;
    const x = c.getContext("2d")!;
    x.drawImage(src, 0, 0); x.globalCompositeOperation = "source-in"; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
    this.fonts.set(color, c);
    return c;
  }
  measure(s: string): number {
    let w = 0;
    for (const ch of s) w += (FONT.glyphs[ch] ?? FONT.glyphs["?"])[1] + 1;
    return Math.max(0, w - 1);
  }
  text(s: string, x: number, y: number, color: TextColor = "dark", shadow = true) {
    const [fg, sh] = COLORS[color];
    if (shadow) this.rawText(s, x + 1, y + 1, sh);
    this.rawText(s, x, y, fg);
  }
  rawText(s: string, x: number, y: number, color: string) {
    const fc = this.fontCanvas(color);
    let cx = Math.round(x);
    for (const ch of s) {
      const [i, w] = FONT.glyphs[ch] ?? FONT.glyphs["?"];
      this.ctx.drawImage(fc, (i % FONT.cols) * 8, Math.floor(i / FONT.cols) * 12, 8, 12, cx, Math.round(y) - 2, 8, 12);
      cx += w + 1;
    }
  }
  /** Parte un texto en líneas que caben en `width` píxeles. */
  wrap(s: string, width: number): string[] {
    const out: string[] = [];
    for (const para of s.split("\n")) {
      let line = "";
      for (const word of para.split(" ")) {
        const t = line ? `${line} ${word}` : word;
        if (this.measure(t) > width && line) { out.push(line); line = word; } else line = t;
      }
      out.push(line);
    }
    return out;
  }

  // ---------------------------------------------------------------- marcos
  /** Marco redondeado estilo GBA. */
  frame(x: number, y: number, w: number, h: number, style: "texto" | "menu" | "info" | "oscuro" = "menu") {
    const st = {
      texto: ["#f8f8f0", "#d84848", "#f8a8a0"], menu: ["#f8f8f0", "#5068a8", "#a8b8e0"],
      info: ["#f8f8e8", "#383840", "#c8c8b8"], oscuro: ["#283048", "#101018", "#485878"],
    }[style];
    const c = this.ctx;
    c.fillStyle = st[1]; c.fillRect(x + 1, y, w - 2, h); c.fillRect(x, y + 1, w, h - 2);
    c.fillStyle = st[2]; c.fillRect(x + 2, y + 1, w - 4, h - 2); c.fillRect(x + 1, y + 2, w - 2, h - 4);
    c.fillStyle = st[0]; c.fillRect(x + 3, y + 2, w - 6, h - 4); c.fillRect(x + 2, y + 3, w - 4, h - 6);
  }
  cursor(x: number, y: number) { this.text("▶", x, y, "dark", false); }
  hpBar(x: number, y: number, w: number, frac: number) {
    this.rect(x, y, w + 2, 4, "#383840");
    const col = frac > 0.5 ? "#58d080" : frac > 0.2 ? "#f0c828" : "#e84848";
    this.rect(x + 1, y + 1, w, 2, "#505058");
    this.rect(x + 1, y + 1, Math.max(0, Math.round(w * frac)), 2, col);
  }
}
