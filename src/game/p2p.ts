// Conexión directa entre dos ordenadores (WebRTC), sin página publicada ni servidor propio.
// Uno crea la conexión y le pasa un código a su amigo (por WhatsApp, correo…); el amigo pega ese código y le
// devuelve otro; al pegarlo, los dos navegadores quedan unidos por un canal de datos directo. Sobre ese canal se
// imita la «sala» de la página publicada (presencia, mensajes por tema, salas con nombre), así que el Club de
// Conexión funciona igual con las dos formas de conectar.
// Para encontrarse a través de internet se usa un servidor STUN público (solo averigua la dirección pública; los
// datos del juego no pasan por él). En la misma red local no hace falta.

type Msg = { topic: string; data?: any; peer: string; isMe: boolean; sameTab: boolean };
type Peer = { peer: string; isMe: boolean; sameTab: boolean; presence: Record<string, any> };
export interface SalaP2P {
  name: string;
  emit(t: string, d?: unknown): Promise<void>; on(t: string, f: (m: Msg) => void): () => void;
  presence(p: Record<string, unknown>): Promise<void>; peers(): readonly Peer[];
  onPeers(f: (c: { peers: readonly Peer[] }) => void): () => void; connected(): boolean;
  join(n: string): Promise<SalaP2P>; leave(): Promise<void>;
}

const ICE: RTCConfiguration = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }] };
const PREFIJO = "MICROMON1-";

// ---------------------------------------------------------------- códigos (SDP comprimido)
async function comprimir(s: string): Promise<string> {
  const datos = new TextEncoder().encode(s);
  let bytes: Uint8Array = datos;
  if (typeof CompressionStream !== "undefined") {
    const st = new Blob([datos]).stream().pipeThrough(new CompressionStream("deflate-raw"));
    bytes = new Uint8Array(await new Response(st).arrayBuffer());
  }
  let bin = ""; for (const b of bytes) bin += String.fromCharCode(b);
  return PREFIJO + (typeof CompressionStream !== "undefined" ? "z" : "p") + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function descomprimir(c: string): Promise<string> {
  c = c.trim().replace(/\s+/g, "");
  if (!c.startsWith(PREFIJO)) throw new Error("código");
  const modo = c[PREFIJO.length], b64 = c.slice(PREFIJO.length + 1).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
  const bytes = Uint8Array.from(bin, (x) => x.charCodeAt(0));
  if (modo === "p") return new TextDecoder().decode(bytes);
  const st = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return await new Response(st).text();
}
/** Espera a que el navegador termine de reunir sus direcciones (como mucho unos segundos). */
function reunido(pc: RTCPeerConnection): Promise<void> {
  if (pc.iceGatheringState === "complete") return Promise.resolve();
  return new Promise((ok) => {
    const t = setTimeout(ok, 4000);
    pc.addEventListener("icegatheringstatechange", () => { if (pc.iceGatheringState === "complete") { clearTimeout(t); ok(); } });
  });
}

// ---------------------------------------------------------------- sala sobre un canal de datos
/** Imita la sala de la página publicada con un único canal entre dos personas. Se crea en cuanto existe el canal
 *  (antes de que se abra) para no perder los primeros mensajes del otro lado. */
function crearSala(canal: RTCDataChannel, pc: RTCPeerConnection): SalaP2P {
  const yo = Math.random().toString(36).slice(2, 12);
  let otro = "otro";
  const abierto = () => canal.readyState === "open";
  const enviar = (x: unknown) => { if (abierto()) canal.send(JSON.stringify(x)); };
  type S = { api: SalaP2P; pres: Record<string, unknown>; suya: Record<string, any> | null; dentro: boolean;
    temas: Map<string, ((m: Msg) => void)[]>; vigias: ((c: { peers: readonly Peer[] }) => void)[] };
  const salas = new Map<string, S>();
  const lista = (s: S): Peer[] => {
    const l: Peer[] = [{ peer: yo, isMe: true, sameTab: true, presence: { ...s.pres } }];
    if (s.suya && abierto()) l.push({ peer: otro, isMe: false, sameTab: false, presence: s.suya });
    return l;
  };
  const avisar = (s: S) => { const peers = lista(s); for (const f of [...s.vigias]) f({ peers }); };
  const entregar = (s: S, m: Msg) => { for (const f of [...(s.temas.get(m.topic) ?? [])]) f(m); };
  function obtener(nombre: string): S {
    const ya = salas.get(nombre); if (ya) return ya;
    const s = { pres: {}, suya: null, dentro: nombre === "", temas: new Map(), vigias: [] } as unknown as S;
    s.api = {
      name: nombre,
      async emit(topic, data) {
        enviar({ k: "msg", r: nombre, topic, data });
        entregar(s, { topic, data: JSON.parse(JSON.stringify(data ?? null)), peer: yo, isMe: true, sameTab: true });
      },
      on(topic, f) { const l = s.temas.get(topic) ?? []; l.push(f); s.temas.set(topic, l); return () => { const i = l.indexOf(f); if (i >= 0) l.splice(i, 1); }; },
      async presence(p) {
        for (const [k, v] of Object.entries(p)) { if (v === null) delete s.pres[k]; else s.pres[k] = v; }
        enviar({ k: "pres", r: nombre, p: s.pres });
      },
      peers: () => lista(s),
      onPeers(f) { s.vigias.push(f); return () => { const i = s.vigias.indexOf(f); if (i >= 0) s.vigias.splice(i, 1); }; },
      connected: abierto,
      async join(n) { const t = obtener(n); t.dentro = true; enviar({ k: "pres", r: n, p: t.pres }); return t.api; },
      async leave() { s.dentro = false; enviar({ k: "bye", r: nombre }); },
    };
    salas.set(nombre, s);
    return s;
  }
  const lobby = obtener("");
  canal.addEventListener("message", (ev) => {
    let m: any; try { m = JSON.parse(String(ev.data)); } catch { return; }
    if (m.k === "hola") { otro = String(m.id); for (const s of salas.values()) avisar(s); return; }
    const s = obtener(String(m.r ?? ""));
    if (m.k === "msg") { if (s.dentro) entregar(s, { topic: String(m.topic), data: m.data, peer: otro, isMe: false, sameTab: false }); }
    else if (m.k === "pres") { const nuevo = !s.suya; s.suya = m.p ?? {}; avisar(s); if (nuevo && s.dentro) enviar({ k: "pres", r: m.r, p: s.pres }); }
    else if (m.k === "bye") { s.suya = null; avisar(s); }
  });
  const saludar = () => { enviar({ k: "hola", id: yo }); enviar({ k: "pres", r: "", p: lobby.pres }); };
  if (abierto()) saludar(); else canal.addEventListener("open", saludar);
  const cerrado = () => { for (const s of salas.values()) { s.suya = null; avisar(s); } };
  canal.addEventListener("close", cerrado);
  pc.addEventListener("connectionstatechange", () => { if (["failed", "closed"].includes(pc.connectionState)) cerrado(); });
  return lobby.api;
}

// ---------------------------------------------------------------- panel para pasarse los códigos
/** Panel HTML sobre el juego: muestra un código para copiar y/o una casilla para pegar el del amigo. */
function panel(o: { titulo: string; texto: string; codigo?: string; pedir?: string; boton?: string }): { esperar: Promise<string | null>; cerrar: () => void; poner: (c: string) => void; estado: (t: string) => void } {
  const raiz = document.createElement("div");
  raiz.setAttribute("style", "position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:#000a;z-index:50;font-family:system-ui,sans-serif");
  const caja = document.createElement("div");
  caja.setAttribute("style", "background:#1c2030;color:#e8eaf2;border:2px solid #4a5170;border-radius:12px;padding:16px;width:min(520px,92vw);box-sizing:border-box;display:flex;flex-direction:column;gap:10px");
  const h = document.createElement("div"); h.textContent = o.titulo; h.setAttribute("style", "font-weight:700;font-size:17px");
  const p = document.createElement("div"); p.textContent = o.texto; p.setAttribute("style", "font-size:14px;line-height:1.4;opacity:.9");
  const est = document.createElement("div"); est.setAttribute("style", "font-size:13px;color:#ffd060;min-height:1em");
  caja.append(h, p);
  const area = (lectura: boolean) => {
    const t = document.createElement("textarea");
    t.setAttribute("style", "width:100%;height:84px;box-sizing:border-box;background:#0e1018;color:#c8f0c8;border:1px solid #454b63;border-radius:8px;padding:8px;font:12px ui-monospace,monospace;resize:none");
    t.readOnly = lectura; t.spellcheck = false;
    // que las teclas no muevan al personaje mientras se escribe
    for (const ev of ["keydown", "keyup", "keypress"]) t.addEventListener(ev, (e) => e.stopPropagation());
    return t;
  };
  const boton = (txt: string, principal = false) => {
    const b = document.createElement("button"); b.textContent = txt;
    b.setAttribute("style", `padding:9px 14px;border-radius:8px;border:2px solid #4a5170;font-weight:700;font-size:14px;cursor:pointer;background:${principal ? "#3858c8" : "#2a2e3e"};color:#fff`);
    for (const ev of ["keydown", "keyup"]) b.addEventListener(ev, (e) => e.stopPropagation());
    return b;
  };
  let salida: (v: string | null) => void = () => {};
  const esperar = new Promise<string | null>((ok) => { salida = ok; });
  const mio = area(true);
  const fila1 = document.createElement("div"); fila1.setAttribute("style", "display:flex;gap:8px");
  const copiar = boton("Copiar código");
  copiar.onclick = async () => {
    mio.select();
    try { await navigator.clipboard.writeText(mio.value); } catch { try { document.execCommand("copy"); } catch { /* manual */ } }
    copiar.textContent = "¡Copiado!"; setTimeout(() => (copiar.textContent = "Copiar código"), 1500);
  };
  fila1.append(copiar);
  if (o.codigo !== undefined) { mio.value = o.codigo; caja.append(mio, fila1); }
  let suyo: HTMLTextAreaElement | null = null;
  if (o.pedir) {
    const q = document.createElement("div"); q.textContent = o.pedir; q.setAttribute("style", "font-size:14px;margin-top:4px");
    suyo = area(false); suyo.placeholder = "Pega aquí el código (Ctrl+V)";
    caja.append(q, suyo);
  }
  const fila = document.createElement("div"); fila.setAttribute("style", "display:flex;gap:8px;justify-content:flex-end");
  const cancelar = boton("Cancelar"); cancelar.onclick = () => salida(null);
  fila.append(cancelar);
  if (o.pedir) { const ok = boton(o.boton ?? "Conectar", true); ok.onclick = () => { const v = suyo!.value.trim(); if (v) salida(v); else est.textContent = "Pega primero el código de tu amigo."; }; fila.append(ok); }
  caja.append(est, fila);
  raiz.append(caja);
  document.body.append(raiz);
  setTimeout(() => (suyo ?? mio).focus(), 50);
  return {
    esperar,
    cerrar: () => raiz.remove(),
    poner: (c) => { mio.value = c; if (!mio.isConnected) caja.insertBefore(mio, est); },
    estado: (t) => { est.textContent = t; },
  };
}

/** Espera a que el canal se abra (o falle). */
function abrirCanal(canal: RTCDataChannel, pc: RTCPeerConnection, ms = 25000): Promise<boolean> {
  if (canal.readyState === "open") return Promise.resolve(true);
  return new Promise((ok) => {
    const t = setTimeout(() => ok(false), ms);
    canal.addEventListener("open", () => { clearTimeout(t); ok(true); });
    pc.addEventListener("connectionstatechange", () => { if (pc.connectionState === "failed") { clearTimeout(t); ok(false); } });
  });
}

let activa: SalaP2P | null = null;
/** La conexión directa ya establecida en esta partida (se reutiliza al volver al Club). */
export function salaP2P(): SalaP2P | null { return activa && activa.connected() ? activa : null; }

/** Crea la conexión: muestra el código para el amigo y espera su respuesta. */
export async function crearConexion(): Promise<SalaP2P | null> {
  const pc = new RTCPeerConnection(ICE);
  const canal = pc.createDataChannel("micromon", { ordered: true });
  await pc.setLocalDescription(await pc.createOffer());
  const ui = panel({ titulo: "Crear conexión", texto: "1. Copia este código y pásaselo a tu amigo (WhatsApp, correo…). Él te devolverá otro.", codigo: "Preparando el código…", pedir: "2. Pega aquí el código de respuesta de tu amigo:", boton: "Conectar" });
  await reunido(pc);
  ui.poner(await comprimir(JSON.stringify(pc.localDescription)));
  const sala = crearSala(canal, pc);
  const p = await ui.esperar;
  if (!p) { ui.cerrar(); pc.close(); return null; }
  try { await pc.setRemoteDescription(JSON.parse(await descomprimir(p))); }
  catch { ui.cerrar(); pc.close(); throw new Error("Ese código no es válido."); }
  ui.estado("Conectando…");
  const ok = await abrirCanal(canal, pc);
  ui.cerrar();
  if (!ok) { pc.close(); throw new Error("No se ha podido conectar. Probad de nuevo (o desde la misma red)."); }
  activa = sala;
  return activa;
}

/** Se une a la conexión de un amigo: pega su código y le devuelve otro. */
export async function unirseConexion(): Promise<SalaP2P | null> {
  const ui = panel({ titulo: "Unirse a una conexión", texto: "1. Pega el código que te ha pasado tu amigo.", pedir: "Código de tu amigo:", boton: "Siguiente" });
  const p = await ui.esperar;
  ui.cerrar();
  if (!p) return null;
  const pc = new RTCPeerConnection(ICE);
  let canalResuelto: (c: RTCDataChannel) => void = () => {};
  const canalP = new Promise<RTCDataChannel>((ok) => { canalResuelto = ok; });
  pc.addEventListener("datachannel", (ev) => canalResuelto(ev.channel));
  try { await pc.setRemoteDescription(JSON.parse(await descomprimir(p))); }
  catch { pc.close(); throw new Error("Ese código no es válido."); }
  await pc.setLocalDescription(await pc.createAnswer());
  const ui2 = panel({ titulo: "Unirse a una conexión", texto: "2. Copia este código de respuesta y pásaselo a tu amigo. Cuando lo pegue, quedaréis conectados.", codigo: "Preparando el código…" });
  await reunido(pc);
  ui2.poner(await comprimir(JSON.stringify(pc.localDescription)));
  ui2.estado("Esperando a que tu amigo pegue el código…");
  const canal = await Promise.race([canalP, ui2.esperar.then(() => null)]);
  if (!canal) { ui2.cerrar(); pc.close(); return null; }
  const sala = crearSala(canal, pc);
  const ok = await Promise.race([abrirCanal(canal, pc), ui2.esperar.then(() => false)]);
  ui2.cerrar();
  if (!ok) { pc.close(); throw new Error("No se ha podido conectar. Probad de nuevo (o desde la misma red)."); }
  activa = sala;
  return activa;
}
