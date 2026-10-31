// Música y efectos sintetizados con WebAudio (estilo chiptune, sin archivos externos).
// Cada tema es una melodía (onda cuadrada), un bajo (triangular) y percusión (ruido).

/** Temas grabados (MP3 del usuario), incrustados como data URL por tools/build_game.ts. */
import FILES from "./assets_audio";

type Track = { bpm: number; lead: string; bass: string; drums?: boolean; loop?: boolean; leadWave?: OscillatorType;
  /** Ambiente de terror: zumbido grave disonante, latido y pitidos de servidor. */ tetrico?: boolean;
  /** Segunda voz (acordes) y percusión épica (bombo, caja, platillos y redobles cada 8 compases). */ harm?: string; epic?: boolean };
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
// Tema principal: fanfarria heroica en Do mayor (16 compases). Dura exactamente 27 s, así en la intro
// suena dos veces justas (00:22–01:16) y la sala de servidores entra en la parte fuerte. Acaba en
// Si♭–La♭ (VII–VI): un final épico y algo inquietante que prepara la parte oscura.
T.tema = { bpm: (60 * 256) / (4 * 27), epic: true,
  lead: "C5:4 G4:2 C5:2 E5:4 G5:4 A5:6 G5:2 F5:4 E5:4 F5:4 A5:4 C6:4 B5:2 A5:2 G5:12 -:4 C5:4 G4:2 C5:2 E5:4 G5:4 A5:6 G5:2 F5:4 A5:4 G5:4 E6:4 D6:4 C6:2 B5:2 C6:12 -:4 A5:4 C6:4 B5:4 A5:4 G5:4 F5:4 E5:4 D5:4 F5:4 A5:4 G5:4 F5:4 E5:8 G5:8 C6:4 D6:4 E6:4 G6:4 F6:6 E6:2 D6:4 C6:4 A#5:4 G5:4 G#5:4 D#6:4 C6:12 -:4",
  harm: "E4:8 G4:8 A4:8 C5:8 A4:8 C5:8 B4:8 D5:8 E4:8 G4:8 A4:8 C5:8 B4:8 D5:8 E4:8 G4:8 C5:8 E5:8 B4:8 D5:8 A4:8 C5:8 E4:8 G4:8 E4:8 G4:8 A4:8 C5:8 D5:4 F5:4 C5:4 D#5:4 C5:8 D#5:8",
  bass: "C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 A1:2 A2:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 G2:2 G3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 C2:2 C3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 F2:2 F3:2 A#1:2 A#2:2 A#1:2 A#2:2 G#1:2 G#2:2 G#1:2 G#2:2 G#1:2 G#2:2 G#1:2 G#2:2 G#1:2 G#2:2 G#1:2 G#2:2" };
T.oscuro = { bpm: 66, leadWave: "triangle", lead: "A4:4 C5:4 B4:4 G#4:4 A4:8 E4:8 F4:4 E4:4 D#4:4 E4:4 A3:16",
  bass: "A2:16 F2:16 D2:8 E2:8 A1:16" };
// Final de la introducción: la sala de servidores de la Unidad de Genética (tritonos y caja de música desafinada)
T.tetrico = { bpm: 60, leadWave: "sine", tetrico: true, lead: "E6:6 -:2 D#6:6 -:2 A#5:8 -:8 E6:4 F6:4 -:4 B5:12 -:8",
  bass: "A1:16 A#1:16 A1:16 D#2:16" };
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
  /** Nota sostenida con ataque y caída lentos, filtrada (zumbidos y drones). */
  private pad(type: OscillatorType, f: number, t0: number, dur: number, vol: number, dest: AudioNode, lp = 400) {
    const c = this.ctx!, o = c.createOscillator(), fl = c.createBiquadFilter(), g = c.createGain();
    o.type = type; o.frequency.value = f; fl.type = "lowpass"; fl.frequency.value = lp;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(vol, t0 + dur * 0.3); g.gain.linearRampToValueAtTime(vol * 0.7, t0 + dur * 0.8); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    o.connect(fl); fl.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + dur + 0.05);
  }
  /** Capa de terror de un compás largo: drones desafinados, latido y pitidos de servidor. */
  private terror(t0: number, dur: number, step: number, dest: AudioNode) {
    this.pad("sawtooth", 55, t0, dur, 0.1, dest, 260);
    this.pad("sawtooth", 55.9, t0, dur, 0.1, dest, 260);
    this.pad("sine", 77.8, t0 + dur * 0.25, dur * 0.75, 0.1, dest, 600);   // tritono que entra a mitad
    this.pad("triangle", 1244, t0 + dur * 0.5, dur * 0.5, 0.012, dest, 3000); // pitido agudo de fondo
    const c = this.ctx!;
    for (let k = 0; k * step < dur; k += 16) {                             // latido: «pum-pum» cada 4 tiempos
      for (const [d, v] of [[0, 0.5], [1.1, 0.32]] as const) {
        const at = t0 + (k + d) * step, o = c.createOscillator(), g = c.createGain();
        o.type = "sine"; o.frequency.setValueAtTime(70, at); o.frequency.exponentialRampToValueAtTime(32, at + 0.25);
        g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.3);
        o.connect(g); g.connect(dest); o.start(at); o.stop(at + 0.32);
      }
    }
    for (let k = 0; k * step < dur; k++) if (Math.random() < 0.3) this.tone("square", 1800 + Math.floor(Math.random() * 4) * 400, t0 + k * step + Math.random() * step, 0.025, 0.035, dest);
  }
  /** Bombo con caída de tono. */
  private bombo(at: number, vol: number, dest: AudioNode, f0 = 120, f1 = 40, dur = 0.18) {
    const c = this.ctx!, o = c.createOscillator(), g = c.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + dur);
    g.gain.setValueAtTime(vol, at); g.gain.exponentialRampToValueAtTime(0.001, at + dur * 1.2);
    o.connect(g); g.connect(dest); o.start(at); o.stop(at + dur * 1.3);
  }
  /** Percusión de marcha épica: bombo en 1 y 3, caja en 2 y 4, charles en corcheas,
   *  platillo al empezar cada frase de 4 compases y redoble de caja al final de cada mitad. */
  private bateria(t0: number, len: number, step: number, dest: AudioNode) {
    for (let k = 0; k < len; k++) {
      const at = t0 + k * step, enCompas = k % 16, compas = Math.floor(k / 16);
      const redoble = (compas === 7 || compas === 15) && enCompas >= 8;
      if (enCompas === 0 || enCompas === 8 || (enCompas === 10 && compas % 2 === 1)) this.bombo(at, 0.55, dest);
      if (redoble) this.noise(at, 0.07, 0.08 + (enCompas - 8) * 0.025, 1500, dest);
      else if (enCompas === 4 || enCompas === 12) this.noise(at, 0.13, 0.26, 1200, dest);
      if (k % 2 === 0 && !redoble) this.noise(at, 0.03, 0.05, 7000, dest);
      if (enCompas === 0 && compas % 4 === 0) this.noise(at, 0.9, 0.12, 5000, dest);   // platillo
    }
  }
  /** Golpe grave con eco al entrar en la parte oscura. */
  private golpe(at: number, dest: AudioNode) {
    this.bombo(at, 0.9, dest, 90, 22, 1.6);
    this.noise(at, 1.4, 0.18, 120, dest);
    this.pad("sawtooth", 41.2, at, 3, 0.12, dest, 180);
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
    const lead = parse(tr.lead), bass = parse(tr.bass), harm = tr.harm ? parse(tr.harm) : null;
    const len = lead.reduce((a, [, l]) => a + l, 0);
    let start = this.ctx.currentTime + 0.05, loopN = 0;
    const schedule = () => {
      if (gen !== this.gen || !this.ctx) return;
      const base = start + loopN * len * step;
      if (base - this.ctx.currentTime > 2) return;              // ya programado con antelación
      const voces: [ReturnType<typeof parse>, OscillatorType, number, number][] = [[lead, tr.leadWave ?? "square", 0.22, 0], [bass, "triangle", 0.32, 0]];
      if (harm) voces.push([harm, "square", 0.075, 0], [lead, "sawtooth", 0.05, -12]);
      for (const [seq, wave, vol, oct] of voces) {
        let t = 0;
        for (const [m, l] of seq) { if (m !== null) this.tone(wave as OscillatorType, freq(m + oct), base + t * step, l * step, vol, bus); t += l; }
      }
      if (tr.tetrico) { if (loopN === 0) this.golpe(base, bus); this.terror(base, len * step, step, bus); }
      if (tr.epic) this.bateria(base, len, step, bus);
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
