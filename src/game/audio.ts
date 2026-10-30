// Música y efectos sintetizados con WebAudio (estilo chiptune, sin archivos externos).
// Cada tema es una melodía (onda cuadrada), un bajo (triangular) y percusión (ruido).

/** Temas grabados (MP3 del usuario), incrustados como data URL por tools/build_game.ts. */
import FILES from "./assets_audio";

type Track = { bpm: number; lead: string; bass: string; drums?: boolean; loop?: boolean; leadWave?: OscillatorType };
const T: Record<string, Track> = {
  pueblo: { bpm: 100, lead: "E5:2 G5:2 C6:4 B5:2 G5:2 A5:4 F5:2 A5:2 D6:4 C6:2 A5:2 G5:4 E5:2 G5:2 C6:4 B5:2 D6:2 C6:4 A5:2 F5:2 G5:2 E5:2 D5:4 C5:4",
    bass: "C3:8 A2:8 F2:8 G2:8 C3:8 E3:8 F2:8 G2:4 C3:4" },
  ruta: { bpm: 138, drums: true, lead: "D5:2 G5:2 B5:2 D6:2 C6:2 B5:2 A5:4 G5:2 B5:2 D6:2 G6:2 F#6:2 E6:2 D6:4 E6:2 D6:2 C6:2 B5:2 A5:2 G5:2 A5:4 B5:2 A5:2 G5:2 F#5:2 G5:8",
    bass: "G2:4 D3:4 G2:4 D3:4 C3:4 G2:4 D3:4 D3:4 E3:4 B2:4 C3:4 D3:4 G2:4 D3:4 G2:8" },
  ciudad: { bpm: 112, drums: true, lead: "A5:3 C6:1 F6:4 E6:2 D6:2 C6:4 A#5:3 D6:1 G6:4 F6:2 E6:2 F6:4 A5:2 C6:2 F6:2 A6:2 G6:2 F6:2 E6:4 D6:2 E6:2 F6:2 G6:2 F6:8",
    bass: "F2:4 C3:4 F2:4 C3:4 A#2:4 F3:4 C3:4 F2:4 F2:4 A2:4 C3:4 C3:4 A#2:4 C3:4 F2:8" },
  bosque: { bpm: 96, lead: "A4:4 C5:2 E5:2 D5:4 C5:4 B4:4 D5:2 F5:2 E5:8 A5:4 G5:2 F5:2 E5:4 D5:4 C5:2 B4:2 A4:2 B4:2 A4:8",
    bass: "A2:8 F2:8 G2:8 E2:8 F2:8 C3:8 E2:8 A2:8" },
  cueva: { bpm: 80, leadWave: "triangle", lead: "D5:4 -:2 F5:2 E5:4 -:4 C5:4 -:2 E5:2 D5:8 A4:4 A#4:4 C5:4 A4:4 D5:8 -:8",
    bass: "D2:8 D2:8 C2:8 D2:8 A#1:8 A1:8 D2:16" },
  gimnasio: { bpm: 150, drums: true, lead: "E5:2 E5:2 G5:2 B5:2 A5:2 G5:2 F#5:4 E5:2 E5:2 G5:2 B5:2 C6:4 B5:4 A5:2 B5:2 C6:2 D6:2 E6:4 D6:4 C6:2 B5:2 A5:2 F#5:2 E5:8",
    bass: "E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 D2:2 D3:2 E2:2 E3:2 E2:2 E3:2 C2:2 C3:2 C2:2 C3:2 A1:2 A2:2 A1:2 A2:2 B1:2 B2:2 B1:2 B2:2 C2:2 C3:2 D2:2 D3:2 E2:4 E2:4" },
  torre: { bpm: 70, leadWave: "triangle", lead: "E5:4 D#5:4 E5:4 B4:4 C5:4 B4:4 A4:8 E5:4 F5:4 E5:4 C5:4 B4:8 G#4:8", bass: "A2:16 F2:16 A2:16 E2:16" },
  casino: { bpm: 128, drums: true, lead: "C5:2 E5:2 G5:2 A5:2 G5:2 E5:2 C5:4 D5:2 F5:2 A5:2 B5:2 A5:2 F5:2 D5:4 E5:2 G5:2 C6:2 E6:2 D6:2 C6:2 A5:4 G5:2 E5:2 D5:2 B4:2 C5:8",
    bass: "C3:4 G2:4 C3:4 G2:4 D3:4 A2:4 D3:4 A2:4 E3:4 C3:4 F3:4 F3:4 G2:4 G2:4 C3:8" },
  guarida: { bpm: 120, drums: true, lead: "C5:2 -:2 C5:2 D#5:2 G5:4 F5:4 D#5:2 -:2 D#5:2 D5:2 C5:8 G#4:2 C5:2 D#5:2 G#5:2 G5:4 F5:4 D#5:2 D5:2 B4:2 D5:2 C5:8",
    bass: "C2:4 C3:4 C2:4 B1:4 C2:4 C3:4 G1:4 G2:4 G#1:4 G#2:4 F1:4 F2:4 G1:4 G2:4 C2:8" },
  combate: { bpm: 152, drums: true, lead: "A5:2 A5:1 A5:1 G5:2 A5:2 C6:2 B5:2 A5:2 E5:2 F5:2 F5:1 F5:1 E5:2 F5:2 A5:2 G5:2 F5:2 C5:2 D5:2 E5:2 F5:2 G5:2 A5:2 B5:2 C6:2 D6:2 E6:4 D6:2 C6:2 B5:4 E5:4",
    bass: "A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 A2:2 A3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 D2:2 D3:2 D2:2 D3:2 G2:2 G3:2 G2:2 G3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2 E2:2 E3:2" },
  victoria: { bpm: 140, loop: false, lead: "C5:2 E5:2 G5:2 C6:6 -:2 B5:2 C6:8", bass: "C3:4 G2:4 C3:8 C2:8" },
};
// Introducción: destellos del logotipo, tema principal (fanfarria) y el tono solemne del Monte
T.intro_brillo = { bpm: 84, leadWave: "triangle", lead: "C5:2 E5:2 G5:2 B5:2 C6:4 G5:4 A5:2 C6:2 E6:2 D6:2 C6:8 B5:2 G5:2 E5:2 D5:2 E5:8 F5:4 A5:4 G5:8",
  bass: "C3:16 A2:16 F2:16 G2:16" };
T.tema = { bpm: 132, drums: true, lead: "G4:2 C5:2 E5:2 G5:4 E5:2 G5:2 C6:6 -:2 B5:2 A5:2 G5:2 E5:2 F5:4 A5:4 G5:8 E5:2 F5:2 G5:2 A5:2 B5:4 G5:2 B5:2 D6:6 -:2 C6:2 B5:2 A5:2 B5:2 C6:4 E6:4 C6:6 -:4",
  bass: "C3:4 G2:4 C3:4 G2:4 A2:4 E2:4 F2:4 G2:4 E2:4 B2:4 G2:4 D3:4 A2:4 E2:4 F2:4 G2:4 C3:4 G2:4 C3:4 G2:4 F2:4 G2:4 C3:8" };
T.oscuro = { bpm: 66, leadWave: "triangle", lead: "A4:4 C5:4 B4:4 G#4:4 A4:8 E4:8 F4:4 E4:4 D#4:4 E4:4 A3:16",
  bass: "A2:16 F2:16 D2:8 E2:8 A1:16" };
T.reserva = T.bosque;
T.entrenador = { ...T.combate, bpm: 160 };
T.lider = { ...T.gimnasio, bpm: 172 };
T.campeon = { ...T.guarida, bpm: 150 };

const NOTE: Record<string, number> = { C: 0, "C#": 1, D: 2, "D#": 3, E: 4, F: 5, "F#": 6, G: 7, "G#": 8, A: 9, "A#": 10, B: 11 };
function parse(s: string): [number | null, number][] {
  return s.trim().split(/\s+/).map((tok) => {
    const [n, l] = tok.split(":");
    if (n === "-") return [null, Number(l)];
    const m = /^([A-G]#?)(\d)$/.exec(n)!;
    return [12 * (Number(m[2]) + 1) + NOTE[m[1]], Number(l)];
  });
}
const freq = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

const FILE_VOL: Record<string, number> = { entrenador: 0.55 };

class Audio {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  /** Bus del tema que suena: al cambiar de tema se apaga entero (también las notas ya programadas). */
  private bus: GainNode | null = null;
  private src: AudioBufferSourceNode | null = null;
  /** Estado del último tema grabado (para depurar): "cargando", "sonando" o "error". */
  fileState = "";
  private buffers = new Map<string, Promise<AudioBuffer | null>>();
  musicOn = true; sfxOn = true;
  current = ""; private timer: number | null = null; private gen = 0;
  /** Se llama tras la primera pulsación (los navegadores no dejan sonar antes). */
  unlock() {
    if (this.ctx || typeof AudioContext === "undefined") { this.ctx?.resume(); return; }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.18; this.master.connect(this.ctx.destination);
    if (this.current) { const c = this.current; this.current = ""; this.music(c); }
    // descodifica ya los temas grabados para que suenen sin espera al empezar un combate
    for (const k of Object.keys(FILES)) void this.loadFile(k);
  }
  private tone(type: OscillatorType, f: number, t0: number, dur: number, vol: number, dest: AudioNode = this.master!) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + Math.max(0.05, dur * 0.95));
    o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur);
  }
  /** Apaga el tema actual con un fundido muy corto y desconecta su bus. */
  private killBus() {
    const c = this.ctx, b = this.bus, src = this.src;
    this.bus = null; this.src = null;
    if (!c || !b) return;
    const t = c.currentTime;
    b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.linearRampToValueAtTime(0, t + 0.12);
    setTimeout(() => { try { src?.stop(); } catch { /* ya parado */ } b.disconnect(); }, 200);
  }
  private loadFile(name: string): Promise<AudioBuffer | null> {
    let p = this.buffers.get(name);
    if (!p) {
      const url = (FILES as Record<string, string>)[name];
      // sin fetch(): en algunos entornos (la página publicada) no se permite pedir data URL
      p = new Promise<AudioBuffer | null>((res) => {
        try {
          const bin = atob(url.slice(url.indexOf(",") + 1)), bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          this.ctx!.decodeAudioData(bytes.buffer, (b) => res(b), () => res(null));
        } catch { res(null); }
      });
      this.buffers.set(name, p);
    }
    return p;
  }
  private noise(t0: number, dur: number, vol: number, hp = 2000, dest: AudioNode = this.master!) {
    const c = this.ctx!, n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    f.type = "highpass"; f.frequency.value = hp; src.buffer = buf;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t0);
  }
  /** Cambia la música (no la reinicia si ya suena la misma). */
  music(name: string | undefined) {
    const n = name && (T[name] || (FILES as Record<string, string>)[name]) ? name : "ruta";
    if (n === this.current) return;
    this.current = n;
    this.gen++;
    if (this.timer !== null) { clearInterval(this.timer); this.timer = null; }
    this.killBus();
    if (!this.ctx || !this.musicOn) return;
    const gen = this.gen;
    if ((FILES as Record<string, string>)[n]) {
      // tema grabado: bucle de un MP3 directo a la salida
      const bus = this.ctx.createGain(); bus.gain.value = FILE_VOL[n] ?? 0.5; bus.connect(this.ctx.destination); this.bus = bus;
      this.fileState = "cargando";
      this.loadFile(n).then((buf) => {
        if (!buf) { this.fileState = "error"; return; }
        if (gen !== this.gen || !this.ctx) return;
        const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true; src.connect(bus); src.start(); this.src = src;
        this.fileState = "sonando";
      });
      return;
    }
    const bus = this.ctx.createGain(); bus.gain.value = 1; bus.connect(this.master!); this.bus = bus;
    const tr = T[n], step = 60 / tr.bpm / 4;
    const lead = parse(tr.lead), bass = parse(tr.bass);
    const len = lead.reduce((a, [, l]) => a + l, 0);
    let start = this.ctx.currentTime + 0.05, loopN = 0;
    const schedule = () => {
      if (gen !== this.gen || !this.ctx) return;
      const base = start + loopN * len * step;
      if (base - this.ctx.currentTime > 2) return;              // ya programado con antelación
      for (const [seq, wave, vol, oct] of [[lead, tr.leadWave ?? "square", 0.22, 0], [bass, "triangle" as OscillatorType, 0.32, 0]] as const) {
        let t = 0;
        for (const [m, l] of seq) { if (m !== null) this.tone(wave as OscillatorType, freq(m + oct), base + t * step, l * step, vol, bus); t += l; }
      }
      if (tr.drums) for (let k = 0; k < len; k += 4) { this.noise(base + k * step, 0.05, k % 8 === 0 ? 0.25 : 0.12, k % 8 === 0 ? 400 : 4000, bus); }
      loopN++;
      if (tr.loop === false) { if (this.timer !== null) clearInterval(this.timer); this.timer = null; }
    };
    schedule();
    this.timer = setInterval(schedule, 250) as unknown as number;
  }
  stopMusic() { this.gen++; if (this.timer !== null) clearInterval(this.timer); this.timer = null; this.current = ""; this.killBus(); }
  /** Efectos cortos. */
  sfx(kind: "blip" | "ok" | "bump" | "hit" | "faint" | "ball" | "capture" | "levelup" | "heal" | "door") {
    if (!this.ctx || !this.sfxOn) return;
    const t = this.ctx.currentTime;
    const seq: Record<string, [number, number, OscillatorType, number][]> = {
      blip: [[1200, 0.04, "square", 0.12]], ok: [[880, 0.05, "square", 0.14], [1320, 0.07, "square", 0.14]],
      bump: [[110, 0.08, "square", 0.2]], hit: [[220, 0.06, "sawtooth", 0.25], [140, 0.08, "sawtooth", 0.2]],
      faint: [[440, 0.1, "square", 0.2], [330, 0.1, "square", 0.2], [220, 0.2, "square", 0.2]],
      ball: [[600, 0.05, "square", 0.15], [500, 0.05, "square", 0.15]], door: [[300, 0.05, "triangle", 0.2], [200, 0.08, "triangle", 0.2]],
      capture: [[523, 0.1, "square", 0.18], [659, 0.1, "square", 0.18], [784, 0.1, "square", 0.18], [1047, 0.3, "square", 0.18]],
      levelup: [[784, 0.08, "square", 0.18], [988, 0.08, "square", 0.18], [1175, 0.08, "square", 0.18], [1568, 0.25, "square", 0.18]],
      heal: [[659, 0.12, "triangle", 0.25], [784, 0.12, "triangle", 0.25], [1047, 0.12, "triangle", 0.25], [784, 0.12, "triangle", 0.25], [1047, 0.3, "triangle", 0.25]],
    };
    let k = 0;
    for (const [f, d, w, v] of seq[kind]) { this.tone(w, f, t + k, d, v); k += d; }
    if (kind === "hit") this.noise(t, 0.12, 0.3, 800);
  }
}
export const audio = new Audio();
