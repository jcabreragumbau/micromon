// Casino Mutagénesis: máquina tragaperras con tres rodillos de Microos.
import type { Game, Overlay } from "../game";
import { Gfx, W, H } from "../gfx";

const REELS: string[][] = [
  ["coli-k12", "casei", "synechoc", "coli-k12", "butyricum", "luca", "casei", "paramec", "coli-k12", "synechoc", "casei", "butyricum"],
  ["casei", "coli-k12", "paramec", "luca", "synechoc", "coli-k12", "butyricum", "casei", "paramec", "coli-k12", "synechoc", "casei"],
  ["synechoc", "casei", "coli-k12", "butyricum", "paramec", "casei", "luca", "coli-k12", "synechoc", "butyricum", "coli-k12", "paramec"],
];
const PAY: Record<string, number> = { luca: 100, synechoc: 15, butyricum: 15, paramec: 15, casei: 10, "coli-k12": 8 };
const BET = 3;

export function fichas(game: Game): number { return Number(game.state.flags.fichas ?? 0); }
function setFichas(game: Game, n: number) { game.state.flags.fichas = Math.max(0, Math.min(9999, n)); }

export class SlotMachine implements Overlay {
  pos = [0, 4, 8];
  speed = [0, 0, 0];
  target: (number | null)[] = [null, null, null];
  next = 0;           // siguiente rodillo que se detiene
  spinning = false;
  msg = "Pulsa A para apostar 3 fichas.";
  win = 0; flash = 0;
  constructor(public game: Game) {}

  update(game: Game) {
    const inp = game.input;
    if (this.flash > 0) this.flash--;
    for (let i = 0; i < 3; i++) {
      if (this.speed[i] > 0) {
        this.pos[i] = (this.pos[i] + this.speed[i]) % 12;
        const t = this.target[i];
        if (t !== null) {
          const d = (t - this.pos[i] + 12) % 12;
          if (d < this.speed[i] + 0.01) { this.pos[i] = t; this.speed[i] = 0; if (i === 2) this.settle(); }
        }
      }
    }
    if (inp.pressed("a")) {
      if (!this.spinning) {
        if (fichas(game) < BET) { this.msg = "¡No te quedan fichas! Cómpralas en el mostrador."; return false; }
        setFichas(game, fichas(game) - BET);
        this.spinning = true; this.next = 0; this.win = 0; this.target = [null, null, null];
        this.speed = [0.32, 0.36, 0.4];
        this.msg = "¡A girar! Pulsa A para parar cada rodillo.";
      } else if (this.next < 3 && this.target[this.next] === null) {
        // el rodillo se detiene en el siguiente símbolo completo (más uno al azar, como las máquinas reales)
        const i = this.next++;
        this.target[i] = (Math.ceil(this.pos[i]) + (Math.random() < 0.5 ? 1 : 0)) % 12;
      }
    }
    if (inp.pressed("b") && !this.spinning) return true;
    return false;
  }
  private settle() {
    this.spinning = false;
    const s = this.pos.map((p, i) => REELS[i][Math.round(p) % 12]);
    let pay = 0;
    if (s[0] === s[1] && s[1] === s[2]) pay = PAY[s[0]] * BET;
    else if (s[0] === "coli-k12" && s[1] === "coli-k12") pay = 2 * BET;
    if (pay) {
      setFichas(this.game, fichas(this.game) + pay);
      this.win = pay; this.flash = 60;
      this.msg = s[0] === "luca" && s[1] === "luca" ? `¡¡LUCA ×3!! ¡El ancestro común te sonríe! +${pay} fichas.` : `¡Premio! +${pay} fichas.`;
    } else this.msg = "Nada esta vez. A: otra tirada · B: salir.";
  }

  draw(g: Gfx, game: Game) {
    g.pattern("#7a2030", "#8a2838", game.frame, "#401018");
    g.panel(28, 8, W - 56, 128, "#f8d860", "#c89020", "#5a3a08", 10);
    g.panel(36, 14, W - 72, 18, "#e84848", "#a02828", "#401010", 5);
    g.text("MUTAGÉNESIS", W / 2 - g.measure("MUTAGÉNESIS") / 2, 17, "white");
    for (let i = 0; i < 3; i++) {
      const x = 48 + i * 56, y = 38;
      g.round(x - 2, y - 2, 44, 92, 5, "#2a1810");
      g.round(x, y, 40, 88, 4, "#f8f8f0");
      const p = this.pos[i];
      const base = Math.floor(p), frac = p - base;
      for (let k = -1; k <= 2; k++) {
        const sym = REELS[i][(base + k + 12) % 12];
        const yy = y + 28 + (k - frac) * 30;
        if (yy < y - 20 || yy > y + 80) continue;
        g.ctx.save(); g.ctx.beginPath(); g.ctx.rect(x, y, 40, 88); g.ctx.clip();
        g.icon(sym, 0, x + 4, yy);
        g.ctx.restore();
      }
      if (this.target[i] !== null || !this.spinning) g.alpha(0.15, () => g.rect(x, y, 40, 88, "#000"));
    }
    // línea de premio
    const lineOn = this.flash > 0 && Math.floor(this.flash / 6) % 2 === 0;
    g.rect(40, 81, W - 80, 2, lineOn ? "#ffffff" : "#e84848");
    g.panel(4, H - 52, W - 8, 48, "#ffffff", "#e8e8e0", "#384058", 6);
    g.text(this.msg, 12, H - 46);
    g.text(`Fichas: ${fichas(game)}`, 12, H - 30, "blue");
    g.text("×3: LUCA 300 · Inicial 45 · Casei 30 · Coli 24", 12, H - 18, "gray", false);
  }
}
