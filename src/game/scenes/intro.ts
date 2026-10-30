// Secuencia de introducción (antes de la pantalla de título), sincronizada con la música.
// 00:00 avisos legales · 00:07 logotipo de Jordi Freak · 00:22 logotipo de Micromón con la fanfarria ·
// 00:33 ruta · 00:39 pueblo con el Centro · 00:48 zona montañosa · 00:54-01:16 protagonistas e iniciales ·
// 01:16 el Monte al atardecer · 01:25 rayo en la cima · 01:30 destello y pantalla de título.
// START salta la introducción en cualquier momento.
import type { Game, Scene } from "../game";
import { Gfx, W, H } from "../gfx";
import { IMG } from "../assets";
import { audio } from "../audio";
import { Overworld } from "./overworld";

const S = 60;                         // fotogramas por segundo
const T = (s: number) => Math.round(s * S);
const FIN = T(91);

type Fondo = (g: Gfx, t: number) => void;

export class IntroCine implements Scene {
  t = 0; esperando = true; private ow: Overworld | null = null; private owMap = "";
  constructor(public game: Game, public alAcabar: () => void) {}

  update(game: Game) {
    // los navegadores no dejan sonar nada hasta que se pulsa una tecla: esperamos a la primera
    if (this.esperando) {
      if (["a", "b", "start", "up", "down", "left", "right"].some((k) => game.input.pressed(k as "a"))) { this.esperando = false; audio.unlock(); }
      return;
    }
    if (game.input.pressed("start")) { this.acabar(); return; }
    const t = this.t++;
    if (t === T(7)) audio.music("intro_brillo");
    if (t === T(22)) audio.music("tema");
    if (t === T(76)) audio.music("oscuro");
    if (t >= FIN) this.acabar();
    if (this.ow) this.ow.animate();
  }
  private acabar() { if (this.t < 0) return; this.t = -1; audio.stopMusic(); this.alAcabar(); }

  private mapa(id: string): Overworld {
    if (!this.ow || this.owMap !== id) { this.ow = new Overworld(this.game); this.ow.vista(id); this.owMap = id; }
    return this.ow;
  }

  draw(g: Gfx, game: Game) {
    if (this.esperando) {
      g.clear("#000");
      if (Math.floor(game.frame / 30) % 2 === 0) { const s = "Pulsa cualquier botón"; g.text(s, W / 2 - g.measure(s) / 2, H / 2 - 6, "white"); }
      return;
    }
    const t = Math.max(0, this.t), s = t / S;
    const tramo = (a: number, b: number) => s >= a && s < b;
    const prog = (a: number, b: number) => Math.min(1, Math.max(0, (s - a) / (b - a)));
    // fundido negro en los cortes (0,35 s a cada lado)
    const cortes = [7, 22, 33, 39, 48, 54, 58, 61, 65, 69, 72, 76];
    const fundido = Math.max(0, ...cortes.map((c) => 1 - Math.abs(s - c) / 0.35));

    if (tramo(0, 7)) this.legal(g, s);
    else if (tramo(7, 22)) this.jordiFreak(g, s - 7);
    else if (tramo(22, 33)) this.logo(g, s - 22);
    else if (tramo(33, 39)) this.panorama(g, "ruta-1", prog(33, 39), "vertical");
    else if (tramo(39, 48)) this.panorama(g, "ciudad-petri", prog(39, 48), "pueblo");
    else if (tramo(48, 54)) this.panorama(g, "ruta-2", prog(48, 54), "montaña");
    else if (tramo(54, 58)) this.retrato(g, cielo, "protagonista", prog(54, 58), "pulgar");
    else if (tramo(58, 61)) this.inicial(g, prado, "synechoc", prog(58, 61), ["protagonista"], "corre");
    else if (tramo(61, 65)) this.retrato(g, cielo, "protagonista-chica", prog(61, 65), "camina");
    else if (tramo(65, 69)) this.inicial(g, brasas, "butyricum", prog(65, 69), ["protagonista-chica"], "salta");
    else if (tramo(69, 72)) this.pareja(g, prog(69, 72));
    else if (tramo(72, 76)) this.inicial(g, burbujas, "paramec", prog(72, 76), ["protagonista", "protagonista-chica"], "saltitos");
    else if (tramo(76, 90)) this.monte(g, s - 76);
    else this.destello(g, s - 90);
    if (fundido > 0) g.alpha(Math.min(1, fundido), () => g.rect(0, 0, W, H, "#000"));
  }

  // ---------------------------------------------------------------- 1. avisos legales y Jordi Freak
  private legal(g: Gfx, s: number) {
    g.clear("#000");
    const a = Math.min(1, s / 0.8, (7 - s) / 0.8);
    g.alpha(a, () => {
      g.rect(0, H / 2 - 1, W, 2, "#202028");
      const arriba = ["(C) 2026 Micromón", "(C) 2026 The Jorge Company", "(C) 2026 Noentiendo", "(C) 2026 Microos Inc.", "(C) 2026 Jordi Freak"];
      arriba.forEach((l, i) => g.text(l, W / 2 - g.measure(l) / 2, 12 + i * 14, "white", false));
      g.rect(28, H / 2 + 12, 34, 44, "#ffffff"); g.rect(30, H / 2 + 14, 30, 30, "#000000");
      g.text("E", 39, H / 2 + 20, "white", false); g.text("ESRB", 31, H / 2 + 45, "dark", false);
      ["Interacción en línea", "no calificada por la ESRB.", "Las partidas en línea pueden", "contener contenido de otros."].forEach((l, i) => g.text(l, 72, H / 2 + 12 + i * 12, "white", false));
    });
  }
  private jordiFreak(g: Gfx, s: number) {
    g.clear("#000");
    const cx = W / 2, cy = 80;
    // estela de destellos dorados que converge (0-5 s)
    for (let i = 0; i < 46; i++) {
      const a0 = i * 2.39, r0 = 160 - (i % 7) * 9;
      const k = Math.min(1, Math.max(0, (s - (i % 10) * 0.12) / 4));
      const r = r0 * (1 - k) ** 1.6, a = a0 + k * 5;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r * 0.75;
      if (k < 1) g.alpha(0.5 + 0.5 * Math.sin(s * 12 + i), () => { g.rect(x - 1, y, 3, 1, "#ffe080"); g.rect(x, y - 1, 1, 3, "#ffe080"); });
    }
    if (s > 4) {
      const k = Math.min(1, (s - 4) / 0.8), gl = 0.6 + 0.4 * Math.sin(s * 5);
      g.alpha(k * 0.35 * gl, () => g.round(cx - 34, cy - 34, 68, 68, 34, "#ffd040"));
      g.alpha(k, () => {
        // icono: una «J» y una «F» entrelazadas en un círculo dorado
        g.round(cx - 24, cy - 24, 48, 48, 24, "#a07010"); g.round(cx - 21, cy - 21, 42, 42, 21, "#f0c040");
        g.round(cx - 17, cy - 17, 34, 34, 17, "#fff0a0");
        g.rect(cx - 2, cy - 12, 5, 20, "#a07010"); g.rect(cx - 9, cy + 6, 9, 5, "#a07010");
        g.rect(cx + 3, cy - 12, 10, 4, "#a07010"); g.rect(cx + 3, cy - 3, 8, 4, "#a07010");
      });
    }
    if (s > 7) {
      const k = Math.min(1, (s - 7) / 1.2), txt = "JORDI FREAK PRESENTS";
      for (let i = 0; i < 12; i++) { const x = (i * 53 + s * 40) % W, y = 128 + Math.sin(i + s * 3) * 6; g.alpha(k * Math.abs(Math.sin(s * 6 + i)), () => g.rect(x, y, 2, 2, "#fff4c0")); }
      g.alpha(k, () => {
        g.ctx.save(); g.ctx.translate(W / 2, 134); g.ctx.scale(1.5, 1.5);
        g.text(txt, -g.measure(txt) / 2 + 0.5, 0.5, "dark", false);
        g.text(txt, -g.measure(txt) / 2, 0, "orange", false);
        g.ctx.restore();
      });
    }
    if (s > 13.3) g.alpha(Math.min(1, (s - 13.3) / 0.7), () => g.rect(0, 0, W, H, "#000"));
  }
  // ---------------------------------------------------------------- 2. logotipo y panorámicas
  private logo(g: Gfx, s: number) {
    g.clear("#101014");
    for (let i = 0; i < 30; i++) g.rect((i * 71) % W, (i * 37 + s * 8) % H, 1, 1, "#404048");
    // logotipo clásico en relieve blanco y negro: sombra negra, borde gris y letras blancas
    const k = Math.min(1, s / 1.2), c = g.ctx, txt = "MICROMÓN", esc = 4.4 * (0.85 + 0.15 * k);
    c.save(); c.globalAlpha = k; c.translate(W / 2, 50); c.scale(esc, esc);
    const x = -g.measure(txt) / 2;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [2, 2]]) g.text(txt, x + dx * 0.6, dy * 0.6, "dark", false);
    g.text(txt, x + 0.4, 0.4, "gray", false);
    g.text(txt, x, 0, "white", false);
    c.restore();
    const sub = "EDICIÓN ESCHERICHIA";
    g.alpha(Math.min(1, Math.max(0, (s - 1.5) / 1)), () => {
      c.save(); c.translate(W / 2, 118); c.scale(1.6, 1.6);
      g.text(sub, -g.measure(sub) / 2 + 0.6, 0.6, "dark", false); g.text(sub, -g.measure(sub) / 2, 0, "white", false);
      c.restore();
    });
    // brillo que recorre el logotipo
    const bx = ((s - 2) / 2) * 340 - 40;
    if (s > 2 && s < 4) g.alpha(0.3, () => { c.fillStyle = "#ffffff"; c.beginPath(); c.moveTo(bx, 50); c.lineTo(bx + 14, 50); c.lineTo(bx - 6, 106); c.lineTo(bx - 20, 106); c.fill(); });
  }
  private panorama(g: Gfx, id: string, p: number, modo: "vertical" | "pueblo" | "montaña") {
    const ow = this.mapa(id), mw = ow.map.w * 16, mh = ow.map.h * 16;
    const e = p * p * (3 - 2 * p);
    if (modo === "vertical") ow.debugCam = [Math.min(0, (mw - W) / 2), (mh - H) * (1 - e)];
    else if (modo === "pueblo") ow.debugCam = [(mw - W) * e, Math.max(0, Math.min(mh - H, 9 * 16))];
    else ow.debugCam = [Math.min(0, (mw - W) / 2), (mh - H) * (1 - e) * 0.7];
    ow.draw(g, this.game);
  }
  // ---------------------------------------------------------------- 3. protagonistas e iniciales
  private retrato(g: Gfx, fondo: Fondo, quien: string, p: number, gesto: "pulgar" | "camina") {
    fondo(g, this.t);
    const c = g.ctx, k = gesto === "camina" ? 1.4 + p * 0.5 : 1.8;
    const x = W / 2 - 32 * k, y = H - 96 * k + (gesto === "camina" ? Math.abs(Math.sin(p * 18)) * -3 : Math.sin(p * 9) * 2);
    c.save(); c.translate(x, y); c.scale(k, k); g.portrait(quien, 0, 0); c.restore();
    if (gesto === "pulgar" && p > 0.35) {
      // destello de «¡vamos!» junto al retrato
      const q = Math.min(1, (p - 0.35) * 4);
      g.alpha(q, () => { for (let i = 0; i < 6; i++) { const a = i * 1.05 + p * 3; g.rect(x + 100 * k / 1.8 + Math.cos(a) * 16, 60 + Math.sin(a) * 12, 3, 3, "#fff8b0"); } });
    }
  }
  private inicial(g: Gfx, fondo: Fondo, sp: string, p: number, siluetas: string[], modo: "corre" | "salta" | "saltitos") {
    fondo(g, this.t);
    const c = g.ctx;
    siluetas.forEach((q, i) => {
      c.save(); c.filter = "brightness(0) opacity(0.55)";
      const x = siluetas.length === 1 ? -10 : i === 0 ? -16 : W - 100;
      c.translate(x, H - 150); c.scale(1.6, 1.6); g.portrait(q, 0, 0); c.restore();
    });
    const sal = modo === "corre" ? Math.abs(Math.sin(p * 22)) * 6 : modo === "salta" ? Math.abs(Math.sin(p * 10)) * 22 : Math.abs(Math.sin(p * 16)) * 10;
    const x = modo === "corre" ? -60 + p * (W + 40) : W / 2 - 60;
    g.microo(sp, "frente", x, H - 140 - sal, 1.5);
  }
  private pareja(g: Gfx, p: number) {
    cielo(g, this.t);
    const c = g.ctx;
    [["protagonista", W / 2 - 112], ["protagonista-chica", W / 2 - 4]].forEach(([q, x]) => {
      c.save(); c.translate(Number(x), H - 96 * 1.6 + 6); c.scale(1.6, 1.6); g.portrait(String(q), 0, 0); c.restore();
    });
  }
  // ---------------------------------------------------------------- 4 y 5. el Monte y el destello
  private monte(g: Gfx, s: number) {
    const c = g.ctx, cx = W / 2, cima = 70;
    const zoom = s > 9 ? 1 + ((s - 9) / 5) ** 2 * 1.6 : 1;
    c.save(); c.translate(cx, cima); c.scale(zoom, zoom); c.translate(-cx, -cima);
    const gr = c.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, "#2a1640"); gr.addColorStop(0.45, "#7a3a78"); gr.addColorStop(0.75, "#e0784a"); gr.addColorStop(1, "#f0a858");
    c.fillStyle = gr; c.fillRect(-W, -H, W * 3, H * 3);
    // nubes en espiral alrededor de la cima
    for (let i = 0; i < 7; i++) {
      c.strokeStyle = `rgba(${200 - i * 10},${150 - i * 8},${220 - i * 6},0.5)`; c.lineWidth = 3;
      c.beginPath(); c.ellipse(cx, cima - 20, 30 + i * 18, 8 + i * 5, 0, s * 0.4 + i, s * 0.4 + i + Math.PI * 1.3); c.stroke();
    }
    // la montaña
    c.fillStyle = "#3a2a3a"; c.beginPath(); c.moveTo(-40, H + 10); c.lineTo(cx - 30, cima + 24); c.lineTo(cx, cima); c.lineTo(cx + 26, cima + 20); c.lineTo(W + 40, H + 10); c.fill();
    c.fillStyle = "#2a1e2c"; c.beginPath(); c.moveTo(cx, cima); c.lineTo(cx + 26, cima + 20); c.lineTo(W + 40, H + 10); c.lineTo(cx + 10, H + 10); c.fill();
    c.fillStyle = "#e8d8f0"; c.beginPath(); c.moveTo(cx - 12, cima + 10); c.lineTo(cx, cima); c.lineTo(cx + 10, cima + 8); c.lineTo(cx + 2, cima + 6); c.fill();
    c.fillStyle = "#4a3048"; c.beginPath(); c.moveTo(-40, H + 10); c.lineTo(40, 130); c.lineTo(90, 150); c.lineTo(150, 128); c.lineTo(230, 146); c.lineTo(W + 40, H + 10); c.fill();
    // el rayo de energía (01:25)
    if (s > 9) {
      const q = s - 9, on = Math.floor(q * 14) % 3 !== 0;
      if (on) {
        c.strokeStyle = "#fffef0"; c.lineWidth = 3; c.beginPath(); c.moveTo(cx + 40, -60);
        for (let i = 1; i <= 8; i++) c.lineTo(cx + 40 - (40 * i) / 8 + ((i * 7 + Math.floor(q * 20)) % 11) - 5, -60 + ((cima + 60) * i) / 8);
        c.stroke(); c.strokeStyle = "rgba(180,140,255,0.6)"; c.lineWidth = 8; c.stroke();
      }
      g.alpha(Math.min(0.8, q / 2) * (on ? 1 : 0.6), () => g.round(cx - 18, cima - 14, 36, 28, 14, "#fff4ff"));
    }
    c.restore();
  }
  private destello(g: Gfx, s: number) { g.clear("#ffffff"); g.alpha(Math.min(1, s), () => g.rect(0, 0, W, H, "#ffffff")); }
}

// ---------------------------------------------------------------- fondos de las escenas de personajes
function cielo(g: Gfx, t: number) {
  const c = g.ctx, gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#3a8ae8"); gr.addColorStop(1, "#bfe6ff"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 6; i++) { const x = ((i * 70 - t * 0.3) % (W + 80)) - 40; c.fillStyle = "rgba(255,255,255,0.85)"; c.beginPath(); c.ellipse(x, 30 + (i % 3) * 22, 28, 8, 0, 0, Math.PI * 2); c.fill(); }
}
function prado(g: Gfx, t: number) {
  cielo(g, t);
  const c = g.ctx; c.fillStyle = "#58b848"; c.fillRect(0, 120, W, H - 120); c.fillStyle = "#78d060"; c.fillRect(0, 120, W, 4);
  for (let i = 0; i < 14; i++) { const x = (i * 41 + t * 0.9) % (W + 20) - 10, y = (i * 29 + t * 0.6) % 120; c.save(); c.translate(x, y); c.rotate(t / 30 + i); c.fillStyle = i % 2 ? "#4aa040" : "#8ad860"; c.fillRect(-3, -1, 6, 3); c.restore(); }
}
function brasas(g: Gfx, t: number) {
  const c = g.ctx, gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#a02818"); gr.addColorStop(1, "#f0a040"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 30; i++) { const x = (i * 37) % W, y = H - ((t * (0.6 + (i % 4) * 0.3) + i * 29) % H); c.fillStyle = i % 2 ? "#ffd060" : "#ff8030"; c.fillRect(x, y, 2, 2); }
}
function burbujas(g: Gfx, t: number) {
  const c = g.ctx, gr = c.createLinearGradient(0, 0, 0, H);
  gr.addColorStop(0, "#1a4aa0"); gr.addColorStop(1, "#58b8e8"); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  for (let i = 0; i < 22; i++) { const x = (i * 47) % W + Math.sin(t / 20 + i) * 4, y = H - ((t * (0.5 + (i % 3) * 0.3) + i * 31) % (H + 20)), r = 2 + (i % 4); c.strokeStyle = "rgba(220,240,255,0.8)"; c.lineWidth = 1; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); }
}
