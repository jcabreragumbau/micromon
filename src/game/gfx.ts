// Dibujo sobre un lienzo de 256×192 (pantalla de DS) sin suavizado: tiles, sprites, texto con la fuente propia y marcos.
import { IMG, FONT, TILES, CHARS, MICRO, MEDALS } from "./assets";

export const W = 256, H = 192;
/** Resolución interna: el lienzo mide W·R × H·R y todo se dibuja en coordenadas lógicas (256×192).
 *  Así los sprites HD (las ilustraciones originales) se ven con todo su detalle. */
export const R = 4;
/** Parte superior de la caja de texto inferior. */
export const TB = H - 48;
export type TextColor = "dark" | "white" | "red" | "blue" | "gray" | "green" | "orange";
const COLORS: Record<TextColor, [string, string]> = {
  dark: ["#383840", "#d0d0c8"], white: ["#f8f8f8", "#585860"], red: ["#d83838", "#f8c8c0"],
  blue: ["#3058c0", "#b8c8f0"], gray: ["#808088", "#d8d8d0"], green: ["#30a050", "#c0e8c8"], orange: ["#e07828", "#f8d8b0"],
};

export const TYPE_COLORS: Record<string, string> = {
  "Levadura": "#c8a868", "Fotótrofo": "#68b840", "Anaerobio": "#e87828", "Protozoo": "#4888e0", "Espiroqueta": "#d8b820",
  "Gram+": "#8858c8", "Gram-": "#d05088", "Antibiótico": "#d05848", "Esporulado": "#a87c40", "Alga": "#40b098",
  "Intracelular": "#d068b8", "Hongo": "#a0a030", "Ácido-Alc.": "#58a8d8", "Archaea": "#7060b0", "Virus": "#5850d8",
  "Biofilm": "#808ca0", "Extremófilo": "#705850", "Simbionte": "#e078a8",
};
/** Abreviaturas de tipo para las etiquetas pequeñas (combate doble). */
export const TYPE_ABBR: Record<string, string> = {
  "Levadura": "LEV", "Fotótrofo": "FOT", "Anaerobio": "ANA", "Protozoo": "PRO", "Espiroqueta": "ESP", "Gram+": "G+",
  "Gram-": "G-", "Antibiótico": "ATB", "Esporulado": "SPO", "Alga": "ALG", "Intracelular": "INT", "Hongo": "HON",
  "Ácido-Alc.": "AAR", "Archaea": "ARQ", "Virus": "VIR", "Biofilm": "BIO", "Extremófilo": "EXT", "Simbionte": "SIM",
};
/** Aclara (t>0) u oscurece (t<0) un color hexadecimal. */
export function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t)));
  return `rgb(${ch[0]},${ch[1]},${ch[2]})`;
}

export class Gfx {
  ctx: CanvasRenderingContext2D;
  private fonts = new Map<string, HTMLCanvasElement>();
  constructor(public canvas: HTMLCanvasElement) {
    canvas.width = W * R; canvas.height = H * R;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.setTransform(R, 0, 0, R, 0, 0);
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
    const h = CHARS.hd?.[id];
    if (h !== undefined && IMG.personajes_hd) {
      const c = 32 * (CHARS.hdScale ?? 4);
      this.ctx.drawImage(IMG.personajes_hd, frame * c, h * 4 * c + dir * c, c, c, Math.round(x), Math.round(y), 32, 32);
      return;
    }
    const s = CHARS.sheets[id] ?? CHARS.sheets.becario;
    this.ctx.drawImage(IMG.personajes, frame * 32, s * 128 + dir * 32, 32, 32, Math.round(x), Math.round(y), 32, 32);
  }
  portrait(id: string, x: number, y: number) {
    const hp = CHARS.hdPortraits?.[id];
    if (hp !== undefined && IMG.retratos_hd) {
      const k = CHARS.hdScale ?? 4;
      this.ctx.drawImage(IMG.retratos_hd, hp * 64 * k, 0, 64 * k, 96 * k, Math.round(x), Math.round(y), 64, 96);
      return;
    }
    const p = CHARS.portraits[id];
    // sin retrato: el fotograma de frente de su hoja HD, ampliado
    const h = CHARS.hd?.[id];
    if (p === undefined && h !== undefined && IMG.personajes_hd) {
      const c = 32 * (CHARS.hdScale ?? 4);
      this.ctx.drawImage(IMG.personajes_hd, 0, h * 4 * c, c, c, Math.round(x) - 8, Math.round(y) + 16, 80, 80);
      return;
    }
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
  /** Medalla HD (size×size). Sin conseguir: silueta oscura. */
  medal(id: string, x: number, y: number, size: number, got = true) {
    const i = MEDALS.order.indexOf(id);
    if (i < 0 || !IMG.medallas_hd) return;
    const c = this.ctx, C = MEDALS.cell;
    c.save();
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = "high";
    c.drawImage(IMG.medallas_hd, i * C, got ? 0 : C, C, C, x, y, size, size);
    c.restore();
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
  // ---------------------------------------------------------------- kit de interfaz estilo DS
  /** Rectángulo de esquinas redondeadas (radio en píxeles, escalonado). */
  round(x: number, y: number, w: number, h: number, r: number, c: string) {
    const ctx = this.ctx; ctx.fillStyle = c;
    for (let i = 0; i < r; i++) {
      const inset = r - Math.round(Math.sqrt(r * r - (r - i - 0.5) ** 2));
      ctx.fillRect(x + inset, y + i, w - inset * 2, 1);
      ctx.fillRect(x + inset, y + h - 1 - i, w - inset * 2, 1);
    }
    ctx.fillRect(x, y + r, w, h - r * 2);
  }
  /** Panel con borde, degradado vertical y brillo superior. */
  panel(x: number, y: number, w: number, h: number, top: string, bottom: string, border = "#384058", r = 4) {
    this.round(x, y, w, h, r, border);
    const ctx = this.ctx;
    const gr = ctx.createLinearGradient(0, y + 1, 0, y + h - 1);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    ctx.save(); ctx.fillStyle = gr;
    for (let i = 0; i < r - 1; i++) {
      const rr = r - 1, inset = rr - Math.round(Math.sqrt(rr * rr - (rr - i - 0.5) ** 2));
      ctx.fillRect(x + 1 + inset, y + 1 + i, w - 2 - inset * 2, 1);
      ctx.fillRect(x + 1 + inset, y + h - 2 - i, w - 2 - inset * 2, 1);
    }
    ctx.fillRect(x + 1, y + r, w - 2, h - r * 2);
    ctx.restore();
    this.alpha(0.45, () => this.rect(x + r, y + 2, w - r * 2, 1, "#ffffff"));
  }
  /** Fondo de menú: degradado con rombos suaves que se desplazan. */
  pattern(c1: string, c2: string, t = 0, c3?: string) {
    const ctx = this.ctx;
    const gr = ctx.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, c1); gr.addColorStop(1, c3 ?? c1);
    ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    const o = Math.floor(t / 4) % 16;
    ctx.fillStyle = c2;
    for (let y = -16; y < H + 16; y += 16) for (let x = -16; x < W + 16; x += 16) {
      const cx = x + o + ((y / 16) % 2 ? 8 : 0), cy = y + o;
      ctx.fillRect(cx + 3, cy, 2, 1); ctx.fillRect(cx + 2, cy + 1, 4, 1); ctx.fillRect(cx + 1, cy + 2, 6, 1);
      ctx.fillRect(cx + 2, cy + 3, 4, 1); ctx.fillRect(cx + 3, cy + 4, 2, 1);
    }
  }
  /** Etiqueta de tipo con su color; ancho automático si w = 0. Devuelve el ancho usado. */
  typeBadge(type: string, x: number, y: number, w = 0): number {
    const base = TYPE_COLORS[type] ?? "#a0a0a0";
    const tw = this.measure(type);
    if (!w) w = tw + 10;
    this.panel(x, y, w, 13, shade(base, 0.2), shade(base, -0.15), shade(base, -0.6), 3);
    this.rawText(type, x + Math.round((w - tw) / 2) + 1, y + 3, shade(base, -0.6));
    this.rawText(type, x + Math.round((w - tw) / 2), y + 2, "#ffffff");
    return w;
  }
  /** Varias etiquetas de tipo en fila, saltando de línea si no caben. Devuelve la altura usada. */
  typeBadges(types: string[], x: number, y: number, maxW: number): number {
    let cx = x, cy = y;
    for (const t of types) {
      const w = this.measure(t) + 10;
      if (cx > x && cx + w > x + maxW) { cx = x; cy += 15; }
      this.typeBadge(t, cx, cy, w); cx += w + 3;
    }
    return cy - y + 15;
  }
  /** Etiqueta de tipo pequeña con abreviatura. Devuelve el ancho. */
  miniType(type: string, x: number, y: number): number {
    const base = TYPE_COLORS[type] ?? "#a0a0a0", t = TYPE_ABBR[type] ?? type.slice(0, 3).toUpperCase();
    const w = this.measure(t) + 6;
    this.round(x, y, w, 11, 2, shade(base, -0.5)); this.round(x + 1, y + 1, w - 2, 9, 2, base);
    this.rawText(t, x + 3, y + 1, "#ffffff");
    return w;
  }
  /** Recorta un texto con "…" para que quepa en `w` píxeles. */
  fit(s: string, w: number): string {
    if (this.measure(s) <= w) return s;
    while (s.length > 1 && this.measure(s + ".") > w) s = s.slice(0, -1);
    return s.trimEnd() + ".";
  }
  /** Barra genérica con marco (PS, experiencia, estadística). */
  bar(x: number, y: number, w: number, frac: number, col: string, h = 3, back = "#505868") {
    this.rect(x - 1, y - 1, w + 2, h + 2, "#283040");
    this.rect(x, y, w, h, back);
    const fw = Math.max(0, Math.min(w, Math.round(w * frac)));
    this.rect(x, y, fw, h, col);
    if (h > 2) this.alpha(0.5, () => this.rect(x, y, fw, 1, "#ffffff"));
  }
  hpColor(frac: number) { return frac > 0.5 ? "#48d070" : frac > 0.2 ? "#f0c020" : "#f04040"; }
  hpBar(x: number, y: number, w: number, frac: number) {
    this.rect(x, y, w + 2, 4, "#383840");
    const col = frac > 0.5 ? "#58d080" : frac > 0.2 ? "#f0c828" : "#e84848";
    this.rect(x + 1, y + 1, w, 2, "#505058");
    this.rect(x + 1, y + 1, Math.max(0, Math.round(w * frac)), 2, col);
  }
}
