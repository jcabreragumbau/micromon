// Sala falsa para pruebas: imita claude.use("room") con un BroadcastChannel entre pestañas del mismo origen.
(() => {
  const me = Math.random().toString(36).slice(2, 10);
  const bc = new BroadcastChannel("sala-micromon");
  const salas = new Map();
  function mk(nombre) {
    const st = { pres: {}, peers: new Map(), subs: new Map(), peerSubs: [] };
    const sender = (from) => ({ peer: from, by: null, isMe: from === me, sameTab: from === me, kind: "viewer", guest: false });
    const peersList = () => [...st.peers.entries()].map(([p, pr]) => ({ ...sender(p), presence: pr, updatedAt: Date.now() }));
    const notif = () => { const l = peersList(); for (const f of st.peerSubs) f({ peers: l, joined: [], left: [], updated: [] }); };
    const api = {
      name: nombre,
      async emit(topic, data) { const m = { kind: "msg", room: nombre, topic, data, from: me }; bc.postMessage(m); deliver(m); },
      on(topic, f) { if (!st.subs.has(topic)) st.subs.set(topic, []); st.subs.get(topic).push(f); return () => { const a = st.subs.get(topic); a.splice(a.indexOf(f), 1); }; },
      async presence(p) { for (const [k, v] of Object.entries(p)) { if (v === null) delete st.pres[k]; else st.pres[k] = v; } st.peers.set(me, { ...st.pres }); bc.postMessage({ kind: "pres", room: nombre, from: me, presence: { ...st.pres } }); notif(); },
      peers: () => peersList(),
      onPeers(f) { st.peerSubs.push(f); return () => {}; },
      connected: () => true, onConnection: () => () => {},
      async join(n) { if (!salas.has(n)) { const s = mk(n); salas.set(n, s); await s.api.presence({}); } return salas.get(n).api; },
      async leave() { bc.postMessage({ kind: "bye", room: nombre, from: me }); salas.delete(nombre); },
    };
    function deliver(m) { for (const f of st.subs.get(m.topic) ?? []) f({ ...sender(m.from), topic: m.topic, data: JSON.parse(JSON.stringify(m.data ?? null)) }); }
    const s = { api, st, deliver, notif };
    return s;
  }
  const lobby = mk(""); salas.set("", lobby);
  lobby.api.presence({});
  bc.onmessage = (ev) => {
    const m = ev.data; const s = salas.get(m.room); if (!s) return;
    if (m.kind === "msg") s.deliver(m);
    if (m.kind === "pres") { const nuevo = !s.st.peers.has(m.from); s.st.peers.set(m.from, m.presence); s.notif(); if (nuevo) bc.postMessage({ kind: "pres", room: m.room, from: me, presence: { ...s.st.pres } }); }
    if (m.kind === "bye") { s.st.peers.delete(m.from); s.notif(); }
  };
  window.claude = { use: async (n) => (n === "room" ? lobby.api : null) };
})();
