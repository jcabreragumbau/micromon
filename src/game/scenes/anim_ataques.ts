// Animaciones de los movimientos en combate.
// Cada movimiento recibe un estilo según su nombre, tipo y categoría, y una variación propia
// (número de partículas, tamaño, giro, trayectoria) sacada de su id: así no hay dos iguales.
import { Gfx, TYPE_COLORS, shade } from "../gfx";

export type Estilo = "golpe" | "corte" | "rayo" | "electrico" | "esporas" | "burbujas" | "explosion" | "espiral" | "agujas" | "orbes" | "mejora" | "ondas" | "red";

export interface FxSpec {
  move: string; type: string; category: string;
  from: [number, number]; to: [number, number];   // centros de atacante y objetivo
  self: boolean;
}
export interface Fx extends FxSpec { estilo: Estilo; t: number; dur: number; seed: number; color: string; luz: string; oscuro: string }

const CLAVES: [RegExp, Estilo][] = [
  [/descarga|electroporacion|nanocables|potencial|canales/, "electrico"],
  [/rayo|fluorescencia|fotosintesis|resonancia|sombra|pulso|luz|lux/, "rayo"],
  [/corte|fimbria|latigo|flagelar|valva|pinza|restriccion|frustula|ciliar/, "corte"],
  [/espora|aerosol|nube|gas|bioaerosol|floracion|marea|tormenta|bloom|indol|niebla/, "esporas"],
  [/espuma|vacuola|secrecion|chorro|lavado|fermentacion|acida|sulfuro|limo|vesicula|metano/, "burbujas"],
  [/estallido|explosion|lisis|apoptosis|bomba|autolisis|septico|osmotic|hemolisis|crecimiento|fase-exponencial/, "explosion"],
  [/taladro|giro|sacacorchos|vortice|centrifug|perforacion|agitacion|vertigo|browniano/, "espiral"],
  [/inyec|aguijon|espiculas|aguja|doble-inyeccion|toxina|cristal|lluvia/, "agujas"],
  [/hifa|micelio|red-|matriz|adhesion|eps|exopolisacarido|envolvente/, "red"],
];

function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0; return h; }

export function crearFx(s: FxSpec): Fx {
  let estilo: Estilo = s.category === "status" ? (s.self ? "mejora" : "ondas") : s.category === "physical" ? "golpe" : "orbes";
  for (const [re, e] of CLAVES) if (re.test(s.move)) { estilo = e; break; }
  if (s.self && s.category !== "status") estilo = "mejora";
  const base = TYPE_COLORS[s.type] ?? "#c0c0c0";
  const dur = { golpe: 26, corte: 26, rayo: 34, electrico: 32, esporas: 40, burbujas: 36, explosion: 34, espiral: 34, agujas: 32, orbes: 32, mejora: 34, ondas: 34, red: 36 }[estilo];
  return { ...s, estilo, t: 0, dur, seed: hash(s.move), color: base, luz: shade(base, 0.6), oscuro: shade(base, -0.45) };
}

/** Desplazamiento del atacante (embestida en los golpes físicos). */
export function embestida(fx: Fx | null): [number, number] {
  if (!fx || fx.self || (fx.estilo !== "golpe" && fx.estilo !== "corte" && fx.estilo !== "espiral")) return [0, 0];
  const p = fx.t / fx.dur, k = p < 0.35 ? p / 0.35 : Math.max(0, 1 - (p - 0.35) / 0.35);
  const [ax, ay] = fx.from, [bx, by] = fx.to;
  return [(bx - ax) * 0.18 * k, (by - ay) * 0.18 * k];
}

/** Momento del impacto (0..1 del recorrido) para el parpadeo del objetivo. */
export function impacto(fx: Fx) { return { golpe: 0.4, corte: 0.45, espiral: 0.5 }[fx.estilo as string] ?? 0.62; }

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function dibujarFx(g: Gfx, fx: Fx) {
  const p = Math.min(1, fx.t / fx.dur), r = (k: number) => ((fx.seed >>> (k % 24)) & 255) / 255;
  const [ax, ay] = fx.from, [bx, by] = fx.to;
  const n = 4 + (fx.seed % 5);
  const c = g.ctx;
  const punto = (x: number, y: number, s: number, col: string) => g.round(x - s / 2, y - s / 2, s, s, s / 2, col);
  switch (fx.estilo) {
    case "golpe": {
      if (p < impacto(fx)) break;
      const q = (p - impacto(fx)) / (1 - impacto(fx));
      // estrella de impacto
      const rad = 8 + q * 20;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + r(i);
        g.alpha(1 - q, () => { g.rect(bx + Math.cos(a) * rad - 2, by + Math.sin(a) * rad - 2, 5, 5, i % 2 ? fx.luz : "#ffffff"); });
      }
      g.alpha(0.8 * (1 - q), () => punto(bx, by, 16 + q * 16, fx.luz));
      break;
    }
    case "corte": {
      const k = 2 + (fx.seed % 3);
      for (let i = 0; i < k; i++) {
        const q = Math.max(0, Math.min(1, (p - 0.3 - i * 0.12) / 0.3));
        if (q <= 0 || q >= 1.2) continue;
        const ang = -0.9 + i * 0.5 + r(i) * 0.3, L = 34;
        const sx = bx - Math.cos(ang) * L / 2, sy = by - Math.sin(ang) * L / 2 + (i - k / 2) * 6;
        c.save(); c.strokeStyle = "#ffffff"; c.lineWidth = 2.5; c.globalAlpha = 1 - Math.max(0, q - 0.7) / 0.3;
        c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ang) * L * q, sy + Math.sin(ang) * L * q); c.stroke();
        c.strokeStyle = fx.color; c.lineWidth = 1; c.stroke(); c.restore();
      }
      break;
    }
    case "rayo": {
      const q = Math.min(1, p / 0.4), fin = Math.max(0, (p - 0.75) / 0.25);
      const ex = lerp(ax, bx, q), ey = lerp(ay, by, q);
      c.save(); c.globalAlpha = 1 - fin; c.lineCap = "round";
      for (const [w, col] of [[9, fx.oscuro], [6, fx.color], [2.5, "#ffffff"]] as [number, string][]) {
        c.strokeStyle = col; c.lineWidth = w + Math.sin(fx.t / 2) * 1.2; c.beginPath(); c.moveTo(ax, ay); c.lineTo(ex, ey); c.stroke();
      }
      c.restore();
      if (q >= 1) g.alpha(1 - fin, () => punto(bx, by, 14 + Math.sin(fx.t) * 4, fx.luz));
      break;
    }
    case "electrico": {
      const q = Math.min(1, p / 0.35), fin = Math.max(0, (p - 0.75) / 0.25);
      c.save(); c.globalAlpha = 1 - fin;
      for (let k = 0; k < 2; k++) {
        c.strokeStyle = k ? "#ffffff" : fx.color; c.lineWidth = k ? 1.2 : 3;
        c.beginPath(); c.moveTo(ax, ay);
        const segs = 7;
        for (let i = 1; i <= segs * q; i++) {
          const t = i / segs, j = i === segs ? 0 : (((fx.seed + i * 31 + Math.floor(fx.t / 3) * 7) % 17) - 8);
          c.lineTo(lerp(ax, bx, t) + j, lerp(ay, by, t) + j * 0.6);
        }
        c.stroke();
      }
      c.restore();
      break;
    }
    case "esporas": {
      const m = 10 + (fx.seed % 8);
      for (let i = 0; i < m; i++) {
        const del = (i / m) * 0.45, q = Math.max(0, Math.min(1, (p - del) / 0.5));
        if (q <= 0) continue;
        const wob = Math.sin(fx.t / 5 + i) * 6;
        const x = lerp(ax, bx + (r(i) - 0.5) * 30, q) + wob, y = lerp(ay, by + (r(i + 7) - 0.5) * 24, q) - Math.sin(q * Math.PI) * 18;
        g.alpha(q > 0.9 ? (1 - q) * 10 : 0.9, () => punto(x, y, 5 + (i % 3) * 2, i % 2 ? fx.color : fx.luz));
      }
      break;
    }
    case "burbujas": {
      const m = 5 + (fx.seed % 5);
      for (let i = 0; i < m; i++) {
        const del = (i / m) * 0.4, q = Math.max(0, Math.min(1, (p - del) / 0.45));
        if (q <= 0) continue;
        const x = lerp(ax, bx, q) + Math.sin(q * 9 + i) * 5, y = lerp(ay, by, q) + Math.cos(q * 7 + i) * 4;
        const s = q >= 1 ? 9 + (p - del - 0.45) * 50 : 8 + (i % 3) * 3;
        g.alpha(q >= 1 ? Math.max(0, 1 - (p - del - 0.45) * 5) : 0.9, () => {
          g.round(x - s / 2, y - s / 2, s, s, s / 2, fx.color);
          g.round(x - s / 2 + 1, y - s / 2 + 1, s - 2, s - 2, s / 2 - 1, fx.luz);
          g.rect(x - s / 4, y - s / 4, 2, 2, "#ffffff");
        });
      }
      break;
    }
    case "explosion": {
      if (p < 0.25) { const q = p / 0.25; punto(lerp(ax, bx, q), lerp(ay, by, q) - Math.sin(q * Math.PI) * 14, 7, fx.color); break; }
      const q = (p - 0.25) / 0.75, rad = 6 + q * 40;
      g.alpha(1 - q, () => {
        c.save(); c.strokeStyle = fx.luz; c.lineWidth = 3; c.beginPath(); c.arc(bx, by, rad, 0, Math.PI * 2); c.stroke(); c.restore();
        punto(bx, by, Math.max(2, 34 * (1 - q)), "#ffffff");
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2 + r(i); g.rect(bx + Math.cos(a) * rad * 1.1 - 2, by + Math.sin(a) * rad * 0.8 - 2, 5, 5, i % 2 ? fx.color : "#fff4a0"); }
      });
      break;
    }
    case "espiral": {
      const q = Math.max(0, (p - 0.3) / 0.7);
      for (let i = 0; i < 14; i++) {
        const a = q * 14 + i * 0.6 + r(1) * 3, rad = 6 + i * 2.6 * (1 - q * 0.5);
        g.alpha(Math.max(0, 1 - q) * (1 - i / 16), () => punto(bx + Math.cos(a) * rad, by + Math.sin(a) * rad * 0.7, 5, i % 3 ? fx.color : "#ffffff"));
      }
      break;
    }
    case "agujas": {
      const m = 3 + (fx.seed % 4);
      for (let i = 0; i < m; i++) {
        const del = (i / m) * 0.35, q = Math.max(0, Math.min(1, (p - del) / 0.35));
        if (q <= 0 || p - del > 0.6) continue;
        const ox = (i - m / 2) * 7, x = lerp(ax, bx, q) + ox, y = lerp(ay, by, q) + ox * 0.5;
        const ang = Math.atan2(by - ay, bx - ax);
        c.save(); c.strokeStyle = fx.luz; c.lineWidth = 3; c.beginPath(); c.moveTo(x - Math.cos(ang) * 14, y - Math.sin(ang) * 14); c.lineTo(x, y); c.stroke();
        c.fillStyle = "#ffffff"; c.fillRect(x - 2, y - 2, 4, 4); c.restore();
      }
      break;
    }
    case "red": {
      const q = Math.min(1, p / 0.6);
      c.save(); c.strokeStyle = fx.color; c.lineWidth = 2.5; c.globalAlpha = p > 0.85 ? (1 - p) / 0.15 : 1;
      for (let i = 0; i < n + 2; i++) {
        const a0 = (i / (n + 2)) * Math.PI * 2 + r(i);
        c.beginPath(); c.moveTo(ax, ay);
        const mx = lerp(ax, bx, 0.5) + Math.cos(a0) * 16, my = lerp(ay, by, 0.5) + Math.sin(a0) * 16;
        const ex = bx + Math.cos(a0) * 14 * q, ey = by + Math.sin(a0) * 10 * q;
        c.quadraticCurveTo(mx, my, lerp(ax, ex, q), lerp(ay, ey, q)); c.stroke();
      }
      if (q >= 1) { c.beginPath(); c.ellipse(bx, by, 16, 11, 0, 0, Math.PI * 2); c.stroke(); }
      c.restore();
      break;
    }
    case "orbes": {
      const m = 1 + (fx.seed % 3);
      for (let i = 0; i < m; i++) {
        const del = i * 0.12, q = Math.max(0, Math.min(1, (p - del) / 0.5));
        if (q <= 0) continue;
        if (q < 1) {
          const x = lerp(ax, bx, q), y = lerp(ay, by, q) - Math.sin(q * Math.PI) * (6 + r(i) * 14);
          g.alpha(0.5, () => punto(x, y, 22, fx.color)); punto(x, y, 13, fx.luz); punto(x, y, 5, "#ffffff");
        } else {
          const z = Math.min(1, (p - del - 0.5) / 0.3);
          g.alpha(1 - z, () => punto(bx, by, 16 + z * 30, fx.luz));
        }
      }
      break;
    }
    case "mejora": {
      const [cx, cy] = fx.from;
      for (let i = 0; i < 10; i++) {
        const t = (p * 1.6 + i / 10) % 1, x = cx + Math.sin(i * 2.3 + fx.seed) * 18, y = cy + 18 - t * 40;
        g.alpha(Math.sin(t * Math.PI), () => { g.rect(x - 2, y, 5, 2, fx.luz); g.rect(x, y - 2, 2, 5, fx.luz); g.rect(x, y, 1, 1, "#ffffff"); });
      }
      g.alpha(0.35 * Math.sin(p * Math.PI), () => punto(cx, cy, 44, fx.color));
      break;
    }
    case "ondas": {
      for (let i = 0; i < 3; i++) {
        const q = Math.max(0, Math.min(1, (p - i * 0.15) / 0.55));
        if (q <= 0 || q >= 1) continue;
        const x = lerp(ax, bx, q), y = lerp(ay, by, q);
        c.save(); c.strokeStyle = fx.luz; c.lineWidth = 3; c.globalAlpha = 1 - q * 0.5;
        c.beginPath(); c.ellipse(x, y, 6 + q * 10, 4 + q * 7, 0, 0, Math.PI * 2); c.stroke(); c.restore();
      }
      if (p > 0.6) g.alpha(1 - (p - 0.6) / 0.4, () => { for (let i = 0; i < 6; i++) { const a = fx.t / 6 + i; g.rect(bx + Math.cos(a) * 16, by + Math.sin(a) * 10, 2, 2, fx.color); } });
      break;
    }
  }
}
