/* ============================================================
   Dynamic Island — engine
   Pure vanilla JS. No frameworks.
   ============================================================ */
(() => {
"use strict";

/* ---------- element refs ---------- */
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

const island    = $("#island");
/* screen & status bar are optional (hero mode has no phone chrome) */
const screenEl  = $("#screen");
const screen    = screenEl || { classList:{ add(){}, remove(){} }, addEventListener(){} };
const viewC     = $("#viewCompact");
const viewE     = $("#viewExpand");
const noteEl    = $("#stageNote");
const statusTime= $("#statusTime");
const banners   = $("#banners");
const lockTime  = $("#lockTime") || null;
const lockDate  = $("#lockDate") || null;
const stateEl   = $("#stateLabel") || null;

const APP_COLORS = {
  music : ["#fc3c44", "#a5132a"],
  call  : ["#0a84ff", "#3a34b5"],
  timer : ["#ff9f0a", "#b45309"],
  ride  : ["#22d3ee", "#2563eb"],
  msg   : ["#30d158", "#1a9e44"],
  whats : ["#25d366", "#0b8a3c"],
  mail  : ["#0a84ff", "#1557bf"],
  insta : ["#e1306c", "#6a2c91"],
  notes : ["#ffd60a", "#b8960f"],
  alarm : ["#ff453a", "#a01330"],
};

const SVG = {
  play: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.87l11-6.5a1 1 0 0 0 0-1.74l-11-6.5A1 1 0 0 0 8 5.5z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="6" y="4" width="4.6" height="16" rx="1.6"/><rect x="13.4" y="4" width="4.6" height="16" rx="1.6"/></svg>',
  next: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M5 6.4v11.2a.8.8 0 0 0 1.24.67L15 13v4.6a.8.8 0 0 0 1.24.67l6.1-4.6a.8.8 0 0 0 0-1.34l-6.1-4.6A.8.8 0 0 0 15 8.4V13L6.24 5.73A.8.8 0 0 0 5 6.4z"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" style="transform:scaleX(-1)"><path d="M5 6.4v11.2a.8.8 0 0 0 1.24.67L15 13v4.6a.8.8 0 0 0 1.24.67l6.1-4.6a.8.8 0 0 0 0-1.34l-6.1-4.6A.8.8 0 0 0 15 8.4V13L6.24 5.73A.8.8 0 0 0 5 6.4z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6.6 10.8c1.4 3.8 4.8 7.1 8.6 8.5l2-2c.3-.3.8-.4 1.2-.2l2.3.9c.9.4 1.2 1.4.7 2.2-.6 1.1-1.8 1.8-3.1 1.7C12.3 21.5 2.5 11.7 2 4.7c-.1-1.3.6-2.5 1.7-3.1.8-.5 1.8-.2 2.2.7l.9 2.3c.2.4.1.9-.2 1.2l-2 2z"/></svg>',
  mic: '<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0"/><path d="M12 18v4"/></svg>',
  speaker: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M4 9v6h4l5 4.5v-15L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>',
  hang: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M2.5 8.5c9-6.5 10 6.5 19.5 0M2.5 8.5 6 14.5M21.5 8.5 18 14.5"/></svg>',
  msg: '<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M12 3C6.5 3 2 6.6 2 11c0 2.5 1.4 4.8 3.7 6.3L4.5 21l4.2-2a10 10 0 0 0 3.3.5c5.5 0 10-3.6 10-8s-4.5-8-10-8z"/></svg>',
  reply: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M10 9V4.5L3 11l7 6.5V13c5 0 8.5 1.8 11 5.5-.7-6.3-4-9.5-11-9.5z"/></svg>',
};

/* ============================================================
   State
   ============================================================ */
const state = {
  kind: null,        // music | call | timer | ride
  phase: "idle",     // idle | incoming | ringing | active | paused | done
  expanded: false,
  activeId: 0,
  timerTotal: 60,
  timerLeft: 60,
  timerOn: false,
  callSec: 0,
  music: { playing: false, sec: 26, dur: 226, src: "/island.mp3", art: null },
  rideTimer: null,
  autoDeclineT: null,
};

/* ============================================================
   Helpers
   ============================================================ */
function fmt(s){ s = Math.max(0, Math.round(s)); const m = Math.floor(s/60), r = s%60; return m + ":" + String(r).padStart(2,"0"); }

let toastDone = null;

function setNote(msg){ if(!noteEl) return; noteEl.textContent = msg; noteEl.classList.add("hot"); clearTimeout(toastDone); toastDone = setTimeout(()=>noteEl.classList.remove("hot"), 2600); }
function setState(msg){ if(stateEl) stateEl.textContent = msg; }

function artData(name){
  const theme = currentTheme();
  const seed  = (name + theme).split("").reduce((a,c)=>a + c.charCodeAt(0)*7, 0);
  let hue = seed % 360;
  const c1 = "hsl(" + hue + " 78% 58%)";
  const c2 = "hsl(" + ((hue + 40) % 360) + " 72% 36%)";
  const glyph = name.trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
  return { bg: "linear-gradient(150deg," + c1 + "," + c2 + ")", glyph };
}

/* ---------- audio (two tiny licensed CC0 tones via WebAudio) ---------- */
let actx = null;
function tone({ f0=880, f1=1174.66, dur=0.15, when=0, type="sine", vol=0.18 }) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* audio blocked — fine */ }
}
const chime   = () => tone({ f0: 1567.98, f1: 1567.98, dur: 0.18 });       // G6
const chimeHi = () => { tone({ f0: 2093, f1: 2093, dur: 0.15 });           // C7
                        tone({ f0: 2637, f1: 2637, dur: 0.2, when: 0.08 });}; // E7
const ring = { start(){ this.int = setInterval(()=>{ tone({f0:740,f1:740,dur:.28,type:"sine",vol:.12}); tone({f0:988,f1:988,dur:.34,when:.32,type:"sine",vol:.12}); }, 1500); },
               stop(){ clearInterval(this.int); } };

/* ============================================================
   Morphing (expand / collapse / switch kind)
   ============================================================ */
let morphTimer = null;

function expand(){
  if (state.expanded) return;
  state.expanded = true;
  screen.classList.add("is-expanded");
  island.classList.add("expanded");
  island.setAttribute("aria-expanded","true");
  startMorph();
  const kind = state.kind;
  setNote({ music:"Now Playing", call:"Phone call", timer:"Timer", ride:"Live Activity" }[kind] || "Dynamic Island");
  setState({ music:"Now Playing", call:"Call in progress", timer:"Timer", ride:"Live Activity" }[kind] || "Expanded");
}

function collapse(){
  if (!state.expanded) return;
  state.expanded = false;
  screen.classList.remove("is-expanded");
  island.classList.remove("expanded");
  island.setAttribute("aria-expanded","false");
  startMorph();
  const p = activityLabel();
  setState(p);
  setNote(p + " · tap to reopen");
}

function startMorph(){
  clearTimeout(morphTimer);
  morphTimer = setTimeout(()=>{ /* no-op hook: browsers coalesce transitions */ }, 70);
}

function activityLabel(){
  switch (state.kind){
    case "music": return state.music.playing ? "Music playing" : "Music";
    case "timer": return state.timerOn ? "Timer running" : state.phase === "done" ? "Timer done" : "Timer";
    case "call":  return state.phase === "incoming" ? "Incoming call" : "Call in progress";
    case "ride":  return "Live Activity";
    default:      return "Island idle";
  }
}

/* ============================================================
   Kinds — set + render
   ============================================================ */
function setKind(kind){
  const changed = state.kind !== kind;
  state.kind = kind;
  island.classList.remove("kind-music","kind-call","kind-timer","kind-ride");
  if (kind) island.classList.add("kind-" + kind);
  startMorph();
  renderCompact(); renderExpand();
  return changed;
}

/* ============================================================
   COMPACT render
   ============================================================ */
function renderCompact(){
  const el = viewC;
  if (!state.kind) { el.innerHTML = ""; return; }

  let inner = "";
  if (state.kind === "music"){
    inner = `
      <span class="c-art" style="background:${state.music.art.bg}">${state.music.art.glyph}</span>
      <span class="c-title">${state.music.title}</span>
      <span class="eq${state.music.playing ? "" : " paused"}"><i></i><i></i><i></i><i></i><i></i></span>`;
  }
  else if (state.kind === "timer"){
    const frac = state.timerLeft / state.timerTotal;
    const col  = state.timerLeft <= 10 ? "#ff453a" : state.timerOn ? "#ff9f0a" : "#9aa3b5";
    const deg  = Math.round(frac * 360);
    inner = `
      <span class="c-ring" style="background:conic-gradient(from -90deg,${col} ${deg}deg,rgba(255,255,255,.16) ${deg}deg)"><i></i></span>
      <span class="c-title" style="font-variant-numeric:tabular-nums;font-size:13.5px">${fmt(state.timerLeft)}</span>
      <span class="c-sub">${state.timerOn ? "Timer" : state.phase === "done" ? "Done!" : "Paused"}</span>`;
  }
  else if (state.kind === "call"){
    if (state.phase === "incoming"){
      inner = `<span class="c-sub" style="color:#06210f;font-weight:800;font-size:11px">Incoming call</span>
               <span class="c-title" style="color:#06210f;font-weight:800;max-width:74px">Priya Sharma</span>`;
    } else {
      inner = `<span class="c-title">Priya Sharma</span>
               <span class="c-time" id="callChipTime">${fmt(state.callSec)}</span>
               <span class="eq"><i></i><i></i><i></i><i></i><i></i></span>`;
    }
  }
  else if (state.kind === "ride"){
    const t = state.rideArrival;
    inner = `
      <span style="width:24px;height:24px;border-radius:50%;background:linear-gradient(150deg,#22d3ee,#2563eb);display:grid;place-items:center">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3.2"/><path d="M12 2v2.6M12 19.4V22M22 12h-2.6M4.6 12H2"/></svg>
      </span>
      <span class="c-sub" style="max-width:36px">${state.rideKind}</span>
      <span class="c-title" style="font-size:12px;color:${t === 0 ? "#30d158" : "inherit"};font-variant-numeric:tabular-nums">${t === 0 ? "Arrived" : t + " min"}</span>`;
  }
  el.innerHTML = `<div class="compact">${inner}</div>`;
}

/* ============================================================
   EXPANDED render
   ============================================================ */
function renderExpand(){
  const el = viewE;
  if (state.kind === "music")      el.innerHTML = musicWidget();
  else if (state.kind === "call")  el.innerHTML = callWidget();
  else if (state.kind === "timer") el.innerHTML = timerWidget();
  else if (state.kind === "ride")  el.innerHTML = rideWidget();
  else el.innerHTML = "";
}

function musicWidget(){
  const m = state.music;
  return `
  <div class="widget widget-music">
    <div class="m-row">
      <div class="m-art" style="background:${m.art.bg}">${m.art.glyph}</div>
      <div class="m-meta">
        <b>${m.title}</b>
        <span>${m.playing ? m.artist : m.artist + " — Paused"}</span>
      </div>
      <button class="icon-btn" data-action="expand-min" aria-label="Collapse">⌄</button>
    </div>
    <div class="m-scrub">
      <div class="scrub" data-action="scrub">
        <div class="scrub-track"><div class="scrub-fill" id="scrubFill"></div><div class="scrub-knob" id="scrubKnob"></div></div>
      </div>
      <div class="scrub-time"><span id="scrubNow">${fmt(m.sec)}</span><span>${fmt(m.dur)}</span></div>
    </div>
    <div class="m-controls">
      <button class="cmed" data-action="prev" aria-label="Previous">${SVG.back}</button>
      <button class="cbig" id="playBtn" data-action="play" aria-label="Play or pause">${m.playing ? SVG.pause : SVG.play}</button>
      <button class="cmed" data-action="next" aria-label="Next">${SVG.next}</button>
    </div>
    <div class="grabber"></div>
  </div>`;
}

function callWidget(){
  const w = state.phase === "incoming" ? "" : " active";
  const pulse = state.phase === "incoming" ? `
    <div class="call-pulse"></div><div class="call-pulse"></div><div class="call-pulse"></div>` : "";
  const mid = state.phase === "incoming" ? `
    <div class="call-name">Priya Sharma</div>
    <div class="call-sub"><i class="dot-live"></i> FaceTime Audio…</div>
    <div class="call-actions" style="margin-top:16px">
      <button class="call-act" data-action="decline"><span class="call-circle call-circle--decline">${SVG.hang}</span>Decline</button>
      <button class="call-act" data-action="accept"><span class="call-circle call-circle--accept">${SVG.phone}</span>Accept</button>
    </div>` : `
    <div class="call-timer" id="callTimeLg">${fmt(state.callSec)}</div>
    <div class="call-sub"><i class="dot-live"></i> ${state.callMuted ? "muted" : "on speaker"}</div>
    <div class="call-actions">
      <button class="call-act" data-action="mute"><span class="call-circle call-circle--ghost${state.callMuted ? " on" : ""}" data-ico="mute">${SVG.mic}</span>${state.callMuted ? "Unmute" : "Mute"}</button>
      <button class="call-act" data-action="speaker"><span class="call-circle call-circle--ghost${state.callSpeaker ? " on" : ""}" data-ico="spk">${SVG.speaker}</span>Speaker</button>
      <button class="call-act" data-action="hangup"><span class="call-circle call-circle--hang">${SVG.hang}</span>End</button>
    </div>`;
  return `
  <div class="widget widget-call${w}">
    <div class="call-avatar-wrap">${pulse}<div class="call-avatar">PS</div></div>
    ${mid}
    <div class="grabber"></div>
  </div>`;
}

function timerWidget(){
  const done  = state.phase === "done";
  const frac  = state.timerLeft / state.timerTotal;
  const col   = state.timerLeft <= 10 ? "#ff453a" : state.timerOn ? "#ff9f0a" : "#ffffff";
  const deg   = Math.round(frac * 360);
  const cap   = done ? "Time's up" : state.timerOn ? "Running" : "Paused";
  const main  = done
    ? `<b id="tTime" style="color:#30d158">0:00</b><small>Timer finished</small>`
    : `<b id="tTime" style="color:${state.timerLeft <= 10 && state.timerOn ? "#ff6961" : "#fff"}">${fmt(state.timerLeft)}</b>
       <small id="tCap">${cap}</small>`;
  const acts  = done ? `
    <button class="ghost ghost--ok" data-action="t-dismiss">Done</button>` : `
    <button class="ghost" data-action="t-reset">Reset</button>
    <button class="ghost ghost--ok" data-action="t-toggle">${state.timerOn ? "Pause" : "Start"}</button>`;
  return `
  <div class="widget widget-timer">
    <span class="t-cap">${cap}</span>
    <div class="t-ring${state.timerOn ? "" : " paused"}" id="tRing" style="background:conic-gradient(from -90deg,${col} ${deg}deg,rgba(255,255,255,.1) ${deg}deg)">
      <div class="t-in">${main}</div>
    </div>
    <div class="t-actions">${acts}</div>
    <div class="grabber"></div>
  </div>`;
}

function rideWidget(){
  const t = state.rideArrival;
  const arrived = t === 0;
  return `
  <div class="widget widget-ride${arrived ? " ride-arrived" : ""}">
    <div class="ride-app">
      <span class="ride-logo">R</span> Rydo
      <span class="ride-live">${arrived ? "HERE" : "LIVE"}</span>
    </div>
    <div class="ride-main">
      <small>${arrived ? "Your ride has arrived" : "Driver is on the way"}</small>
      <b id="rideEta">${arrived ? "Arrived" : t + " min · " + (2 + t) + ":42 pm"}</b>
    </div>
    <div class="ride-car">
      ${SVG.car}
      <span>${state.rideCar}</span>
      <span class="plate">${state.ridePlate}</span>
    </div>
    <div class="progress"><i id="rideBar" style="width:${100 - t * 33}%"></i></div>
    <div class="grabber"></div>
  </div>`;
}

/* ---------- SVG.car used above ---------- */
SVG.car = '<svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="#8ec5ff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 16v-3.2L5.9 9a2 2 0 0 1 1.8-1.2h8.6a2 2 0 0 1 1.8 1.2l1.9 3.8V16"/><rect x="2.8" y="13" width="18.4" height="4" rx="2"/><circle cx="7" cy="17.2" r="1.5"/><circle cx="17" cy="17.2" r="1.5"/><path d="M10 7.8V6.2h4v1.6"/></svg>';

/* ============================================================
   Interaction plumbing (event delegation inside the island)
   ============================================================ */
viewE.addEventListener("pointerdown", (e) => { if (e.target.closest("button,.scrub")) e.stopPropagation(); });

island.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-action]");
  if (btn){
    const act = btn.dataset.action;
    if (act === "expand-min") return collapse();
    if (act === "scrub")      return;
    handleAction(act, btn);
    return;
  }
  /* plain pill tap */
  if (state.expanded){ if (state.phase !== "incoming") collapse(); }
  else if (state.kind){ expand(); }
  else { demoTour(); }             // idle → start the showcase tour
});

viewE.addEventListener("click", (e) => {
  const s = e.target.closest(".scrub");
  if (!s) return;
  const r = s.getBoundingClientRect();
  seekMusic(((e.clientX - r.left) / r.width) * state.music.dur);
});

/* scrub dragging */
viewE.addEventListener("pointerdown", (e) => {
  const s = e.target.closest(".scrub");
  if (!s) return;
  s.classList.add("down");
  const move = (ev) => {
    const r = s.getBoundingClientRect();
    seekMusic(((ev.clientX - r.left) / r.width) * state.music.dur, true);
  };
  const up = () => { s.classList.remove("down"); window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
});

function handleAction(act, btn){
  switch (act){
    case "play":      toggleMusic(); break;
    case "next":      nextTrack(); break;
    case "prev":      prevTrack(); break;
    case "decline":   declineCall(); break;
    case "accept":    acceptCall(); break;
    case "hangup":    hangUp(); break;
    case "mute":      state.callMuted = !state.callMuted; renderExpand(); setNote(state.callMuted ? "Call muted" : "Mic on"); break;
    case "speaker":   state.callSpeaker = !state.callSpeaker; renderExpand(); setNote(state.callSpeaker ? "Speaker on" : "Speaker off"); break;
    case "t-toggle":  toggleTimer(); break;
    case "t-reset":   resetTimer(); break;
    case "t-dismiss": dismissTimer(); break;
    case "expand-min": break;
  }
}

/* ---------- keyboard ---------- */
island.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " "){
    e.preventDefault();
    if (state.expanded) { if (state.phase !== "incoming") collapse(); } else if (state.kind) expand();
  }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && state.expanded) collapse(); });

/* ============================================================
   Scenarios
   ============================================================ */
const TRACKS = [
  { title: "Midnight Sky",  artist: "Mira", dur: 226 },
  { title: "Golden Hour",   artist: "Aria Vale", dur: 197 },
  { title: "Pulse",         artist: "Kairo", dur: 184 },
];

function setActive(src){
  state.activeId = Math.max(state.activeId, src);
  document.querySelectorAll(".sim[data-trigger]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.trigger === src)));
  setState(activityLabel());
}

/* ---------------- MUSIC ---------------- */
/* cancel an incoming call (used when a new activity supersedes it) */
function cancelIncoming(){
  if (state.phase === "incoming"){
    ring.stop(); clearTimeout(state.autoDeclineT);
    state.phase = "idle";
  }
}
/* tidy up whatever is running before switching live activities */
function supersede(){
  cancelIncoming();
  state.timerDonePending = false;
  if (state.kind === "call"){
    ring.stop(); clearTimeout(state.autoDeclineT);
  }
}

function startMusic(){
  supersede();
  if (state.kind === "music"){ toggleMusic(); return; }
  const m = state.music;
  if (!m.title){ m.title = TRACKS[0].title; m.artist = TRACKS[0].artist; m.dur = TRACKS[0].dur; m.sec = 26; m.art = artData(m.title); }
  m.playing = true;
  state.phase = "active";
  setKind("music");
  setActive("music");
  chime();
  setNote("▶ " + m.title + " — " + m.artist);
  if (!state.expanded) setTimeout(()=>{ if (state.kind === "music") expand(); }, 420);
}
function toggleMusic(){
  if (state.kind !== "music"){
    startMusic();
    return;
  }
  state.music.playing = !state.music.playing;
  chime();
  renderCompact();
  const pb = $("#playBtn"); if (pb) pb.innerHTML = state.music.playing ? SVG.pause : SVG.play;
  setNote(state.music.playing ? "Playing — " + state.music.title : "Paused");
  $$(".eq").forEach(q => q.classList.toggle("paused", !state.music.playing));
}

function seekMusic(sec, drag){
  const m = state.music;
  m.sec = Math.min(Math.max(0, sec), m.dur);
  const fill = $("#scrubFill"), knob = $("#scrubKnob");
  if (fill){ const p = (m.sec/m.dur)*100; fill.style.width = p + "%"; knob.style.left = p + "%"; }
  const now = $("#scrubNow"); if (now) now.textContent = fmt(m.sec);
  if (!drag){
    const chip = $("#callChipTime");
    if (chip) chip.textContent = fmt(m.sec);
    renderCompact();
  }
}
function nextTrack(){
  const i = TRACKS.findIndex(t => t.title === state.music.title);
  const t = TRACKS[(i + 1) % TRACKS.length];
  state.music.title = t.title; state.music.artist = t.artist; state.music.dur = t.dur; state.music.sec = 0;
  state.music.art = artData(t.title); state.music.playing = true;
  chimeHi();
  setKind("music");
  setNote("♪ " + t.title + " — " + t.artist);
}
function prevTrack(){
  const i = TRACKS.findIndex(t => t.title === state.music.title);
  const t = TRACKS[(i - 1 + TRACKS.length) % TRACKS.length];
  state.music.title = t.title; state.music.artist = t.artist; state.music.dur = t.dur; state.music.sec = 0;
  state.music.art = artData(t.title); state.music.playing = true;
  chimeHi();
  setKind("music");
  setNote("♪ " + t.title + " — " + t.artist);
}

setInterval(() => {
  if (!state.music.playing || state.kind !== "music") return;
  state.music.sec++;
  seekMusic(state.music.sec, false);
}, 1000);

/* ---------------- TIMER ---------------- */
function startTimer(sec){
  supersede();
  state.timerTotal = sec; state.timerLeft = sec;
  state.timerOn = true; state.phase = "active";
  state.timerDonePending = false;
  state.kind = "timer";
  setKind("timer"); setActive("timer");
  if (!state.expanded){ state.expanded = true; screen.classList.add("is-expanded"); island.classList.add("expanded"); island.setAttribute("aria-expanded","true"); startMorph(); }
  chime();
  setState("Timer " + fmt(sec) + " running");
  setNote("⏱ Timer " + fmt(sec) + " started");
}
function toggleTimer(){
  if (state.kind !== "timer") return;
  state.timerOn = !state.timerOn;
  renderExpand(); renderCompact();
  chime();
  setNote(state.timerOn ? "Timer running" : "Timer paused");
}
function resetTimer(){
  state.timerLeft = state.timerTotal; state.timerOn = false; state.phase = "active";
  renderExpand(); renderCompact(); chime();
  setNote("Timer reset");
}
function dismissTimer(){
  if (state.kind !== "timer") return;
  const wasExpanded = state.expanded;
  state.kind = null; state.phase = "idle"; state.timerOn = false;
  setActive(null); setKind(null);
  setNote("Timer dismissed");
  if (wasExpanded){
    state.expanded = false; screen.classList.remove("is-expanded"); island.classList.remove("expanded");
    island.setAttribute("aria-expanded","false"); startMorph();
  }
  setTimeout(()=>{ setState("Island idle"); }, 900);
}

/* timer ticks in the background even when another activity is showing */
setInterval(() => {
  if (!state.timerOn) return;
  state.timerLeft--;
  if (state.timerLeft <= 0){
    state.timerLeft = 0; state.timerOn = false;
    /* a phone call must not be interrupted — defer the alarm */
    if (state.kind === "call"){
      state.timerDonePending = true; state.phase = "paused";
      return;
    }
    state.phase = "done";
    timerDoneShow();
    return;
  }
  if (state.kind !== "timer") return;      // still counting, but hidden
  const tTime = $("#tTime");
  if (tTime){ tTime.textContent = fmt(state.timerLeft);
    if (state.timerLeft <= 10){ tTime.style.color = "#ff6961"; tTime.style.fontWeight = "500"; }
  }
  const ring = $("#tRing");
  if (ring){ const col = state.timerLeft <= 10 ? "#ff453a" : "#ff9f0a";
    ring.style.background = "conic-gradient(from -90deg," + col + " " + Math.round((state.timerLeft/state.timerTotal)*360) + "deg,rgba(255,255,255,.1) 0deg)"; }
  renderCompact();
}, 1000);

function timerDoneShow(){
  state.kind = "timer";
  setKind("timer"); setActive("timer");
  renderCompact(); renderExpand();
  setNote("⏱ Time's up!");
  setState("Timer done");
  chimeHi();
  setTimeout(()=>tone({ f0: 2093, f1: 2093, dur: .2, when: .4 }), 400);
  setTimeout(()=>tone({ f0: 2093, f1: 2093, dur: .2, when: .8 }), 800);
  if (!state.expanded){
    state.expanded = true; screen.classList.add("is-expanded"); island.classList.add("expanded");
    island.setAttribute("aria-expanded","true"); startMorph();
  }
}

/* ---------------- CALL ---------------- */
function startCallIncoming(){
  if (state.kind === "call") return;             // already in a call
  state.kind = "call"; state.phase = "incoming";
  state.callMuted = false; state.callSpeaker = true; state.callSec = 0;
  setKind("call"); setActive("call");
  ring.start();
  clearTimeout(state.autoDeclineT);
  state.autoDeclineT = setTimeout(autoDecline, 24000);
  if (state.expanded){ state.expanded = false; screen.classList.remove("is-expanded"); island.classList.remove("expanded"); island.setAttribute("aria-expanded","false"); startMorph(); }
  setTimeout(()=>{ if (state.phase === "incoming") expand(); }, 450);
  setState("Incoming call · Priya Sharma");
  setNote("📞 Priya Sharma is calling…");
}
function acceptCall(){
  if (state.kind !== "call" || state.phase !== "incoming") return;
  ring.stop(); clearTimeout(state.autoDeclineT);
  state.phase = "active"; state.callSec = 0;
  chimeHi();
  setKind("call");
  expand();
  setState("On call · 0:00");
  setNote("Call connected — Priya Sharma");
}
/* if the timer finished while we were on the call, show it now */
function maybeShowPendingTimer(){
  if (state.timerDonePending && !state.kind){
    state.timerDonePending = false; state.phase = "done";
    timerDoneShow();
  }
}
function declineCall(){
  if (state.kind !== "call") return;
  ring.stop(); clearTimeout(state.autoDeclineT);
  const wasExpanded = state.expanded;
  state.kind = null; state.phase = "idle";
  setActive(null); setKind(null);
  if (wasExpanded){
    state.expanded = false; screen.classList.remove("is-expanded"); island.classList.remove("expanded");
    island.setAttribute("aria-expanded","false"); startMorph();
  }
  tone({ f0: 520, f1: 260, dur: .3, type: "triangle", vol: .1 });
  setNote("Call declined");
  setTimeout(()=>{ setState("Island idle"); maybeShowPendingTimer(); }, 700);
}
function hangUp(){
  if (state.kind !== "call") return;
  ring.stop(); clearTimeout(state.autoDeclineT);
  const wasExpanded = state.expanded;
  state.kind = null; state.phase = "idle";
  setActive(null); setKind(null);
  if (wasExpanded){
    state.expanded = false; screen.classList.remove("is-expanded"); island.classList.remove("expanded");
    island.setAttribute("aria-expanded","false"); startMorph();
  }
  tone({ f0: 660, f1: 220, dur: .4, type: "triangle", vol: .1 });
  setNote("Call ended — " + fmt(state.callSec));
  setTimeout(()=>{ setState("Island idle"); maybeShowPendingTimer(); }, 700);
}
function autoDecline(){
  if (state.kind === "call" && state.phase === "incoming"){
    ring.stop(); clearTimeout(state.autoDeclineT);
    state.kind = null; state.phase = "idle";
    setActive(null); setKind(null);
    if (state.expanded){ state.expanded = false; screen.classList.remove("is-expanded"); island.classList.remove("expanded"); island.setAttribute("aria-expanded","false"); startMorph(); }
    chimeHi();
    setNote("Missed call from Priya Sharma");
    setTimeout(()=>{ setState("Island idle"); maybeShowPendingTimer(); }, 1500);
  }
}

setInterval(() => {
  if (state.kind !== "call" || state.phase !== "active") return;
  state.callSec++;
  const chip = $("#callChipTime"), big = $("#callTimeLg");
  if (chip) chip.textContent = fmt(state.callSec);
  if (big)  big.textContent = fmt(state.callSec);
  renderCompact();
  setState("On call · " + fmt(state.callSec));
}, 1000);

/* ---------------- RIDE (live activity) ---------------- */
function endRide(msg){
  clearInterval(state.rideTimer); state.rideTimer = null;
  if (state.kind !== "ride") return;
  const wasExpanded = state.expanded;
  state.kind = null; state.phase = "idle";
  setActive(null); setKind(null);
  if (wasExpanded){
    state.expanded = false; screen.classList.remove("is-expanded"); island.classList.remove("expanded");
    island.setAttribute("aria-expanded","false"); startMorph();
  }
  setNote(msg || "Ride activity ended");
  setTimeout(()=>{ setState("Island idle"); }, 900);
}
function startRide(){
  supersede();
  state.kind = "ride"; state.phase = "active";
  state.rideArrival = 2;
  state.rideCar = "White Tata Nexon EV";
  state.ridePlate = "KA 01 AB 2345";
  state.rideKind = "Rydo Go";
  setKind("ride"); setActive("ride");
  if (!state.expanded){ state.expanded = true; screen.classList.add("is-expanded"); island.classList.add("expanded"); island.setAttribute("aria-expanded","true"); startMorph(); }
  chime();
  setState("Ride · arriving in 2 min");
  setNote("🚗 Karan is picking you up");
  clearInterval(state.rideTimer);
  state.rideTimer = setInterval(() => {
    if (state.kind !== "ride") { clearInterval(state.rideTimer); return; }
    if (state.rideArrival > 0) state.rideArrival--;
    renderCompact(); renderExpand();
    const bar = $("#rideBar"); if (bar) bar.style.width = Math.max(8, 100 - state.rideArrival * 33) + "%";
    const eta = $("#rideEta"); if (eta) eta.textContent = state.rideArrival === 0 ? "Arrived" : state.rideArrival + " min · " + (2 + state.rideArrival) + ":42 pm";
    setState(state.rideArrival === 0 ? "Ride · arrived" : "Ride · arriving in " + state.rideArrival + " min");
    if (state.rideArrival === 0){
      chimeHi();
      setNote("🚗 Your ride has arrived!");
      setTimeout(()=>{ endRide("Ride activity ended"); }, 9000);
    }
  }, 10000);
}

/* ============================================================
   Notifications
   ============================================================ */
const MSG_POOL = [
  { app: "Messages", icon: "💬", color: APP_COLORS.msg,  title: "Messages", text: "Mom: Dinner's ready, coming?" },
  { app: "WhatsApp", icon: "🟢", color: APP_COLORS.whats, title: "WhatsApp", text: "Design team: New island concept looks sick 🔥" },
  { app: "Mail",     icon: "✉️", color: APP_COLORS.mail,  title: "Mail",     text: "Apple Music: Your receipt from today's purchase" },
  { app: "Instagram",icon: "📷", color: APP_COLORS.insta, title: "Instagram",text: "arjun.k likes your photo" },
];
let msgIdx = 0;

function sendNotification(){
  const item = MSG_POOL[msgIdx++ % MSG_POOL.length];
  const card = document.createElement("div");
  card.className = "banner";
  card.innerHTML = `
    <span class="banner-ico" style="background:linear-gradient(160deg,${item.color[0]},${item.color[1]})">${item.icon}</span>
    <span class="banner-body">
      <span class="banner-top"><b>${item.title}</b><time>now</time></span>
      <p>${item.text}</p>
    </span>`;
  banners.prepend(card);
  chimeHi();
  setNote("New notification — " + item.title);
  card.addEventListener("click", () => {
    card.style.opacity = 0; card.style.transform = "translateY(-12px) scale(.95)";
    setTimeout(()=>card.remove(), 320);
  });
  setTimeout(()=>{
    if (!card.isConnected) return;
    card.classList.add("leave");
    setTimeout(()=>card.remove(), 340);
  }, 5200);
  while (banners.children.length > 3) banners.lastChild.remove();
}

/* ============================================================
   Wallpaper themes & indicators
   ============================================================ */
function currentTheme(){ return (document.body.dataset.theme || "aurora"); }
const THEMES = {
  aurora:   ["radial-gradient(120% 90% at 12% 6%,#1d4ed8 0%,transparent 55%)",
             "radial-gradient(130% 100% at 90% 0%,#6d28d9 0%,transparent 55%)",
             "radial-gradient(150% 120% at 50% 115%,#0ea5e9 0%,transparent 62%)",
             "linear-gradient(180deg,#10182f,#02040a 80%)"],
  sunset:   ["radial-gradient(120% 90% at 15% 5%,#ff7a59 0%,transparent 55%)",
             "radial-gradient(130% 100% at 90% 10%,#ef476f 0%,transparent 58%)",
             "radial-gradient(160% 120% at 50% 115%,#ffd166 0%,transparent 60%)",
             "linear-gradient(180deg,#3a1c71,#0d0414 85%)"],
  graphite: ["radial-gradient(120% 90% at 15% 5%,#4b5563 0%,transparent 55%)",
             "radial-gradient(130% 100% at 90% 10%,#374151 0%,transparent 55%)",
             "radial-gradient(160% 120% at 50% 115%,#1f2937 0%,transparent 60%)",
             "linear-gradient(180deg,#111827,#020617 85%)"],
};
function applyTheme(name){
  document.body.dataset.theme = name;
  const layers = THEMES[name] || THEMES.aurora;
  $("#wallpaper").style.background = layers.join(",");
  $$(".theme").forEach(t => t.classList.toggle("on", t.dataset.theme === name));
}

/* switches */
const sw = (name, on) => {
  const i = { mic: "#indMic", cam: "#indCam" }[name];
  if (i){ const el = $(i); el.hidden = !on; el.style.opacity = 1; }
  if (name === "wifi"){ const w = $("#wifiIco"); w.classList.toggle("off", !on); }
};

/* ============================================================
   Dock wiring
   ============================================================ */
document.querySelectorAll(".sim[data-trigger]").forEach(btn => {
  btn.addEventListener("click", () => {
    const t = btn.dataset.trigger;
    if (t === "music")            startMusic();
    else if (t === "call"){
      if (state.kind === "call"){ setNote("📞 Already in a call with Priya"); return; }
      startCallIncoming();
    }
    else if (t === "ride")        startRide();
    else if (t === "msg")         sendNotification();
  });
});

/* timer chips */
const chipSec = { "15": 15, "60": 60, "300": 300 };
document.querySelectorAll(".sim-timer-chips button").forEach(b => {
  b.addEventListener("click", () => {
    $$(".sim-timer-chips button").forEach(x => x.classList.remove("on"));
    b.classList.add("on");
    startTimer(chipSec[b.dataset.sec]);
  });
});

document.querySelectorAll(".sw").forEach(s => {
  s.addEventListener("click", () => {
    const on = s.getAttribute("aria-checked") !== "true";
    s.setAttribute("aria-checked", String(on));
    sw(s.dataset.switch, on);
  });
});

document.querySelectorAll(".theme").forEach(t => {
  t.addEventListener("click", () => applyTheme(t.dataset.theme));
});

const resetBtn = document.querySelector("[data-reset]");
if (resetBtn) resetBtn.addEventListener("click", () => {
  /* kill everything */
  ring.stop(); clearTimeout(state.autoDeclineT);
  clearInterval(state.rideTimer); state.rideTimer = null;
  state.kind = null; state.phase = "idle"; state.timerOn = false; state.music.playing = false;
  state.expanded = false; screen.classList.remove("is-expanded");
  island.classList.remove("expanded","kind-music","kind-call","kind-timer","kind-ride");
  island.setAttribute("aria-expanded","false");
  renderCompact(); renderExpand();
  document.querySelectorAll(".sim[data-trigger]").forEach(b => b.setAttribute("aria-pressed","false"));
  const defChip = document.querySelector('.sim-timer-chips button[data-sec="60"]');
  $$(".sim-timer-chips button").forEach(x => x.classList.remove("on"));
  if (defChip) defChip.classList.add("on");
  banners.innerHTML = "";
  setState("Island idle"); setNote("All clear — island reset");
});

/* dismiss expanded view when clicking outside */
document.addEventListener("pointerdown", (e) => {
  if (!state.expanded) return;
  if (e.target.closest(".island")) return;
  if (e.target.closest(".dock,.banner")) return;
  collapse();
});

/* ---------- clock ---------- */
function tickClock(){
  if (!statusTime) return;
  const d = new Date();
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: false }).replace("24:", "0:");
  statusTime.textContent = t;
  if (lockTime) lockTime.textContent = t;
  if (lockDate){
    const day = d.toLocaleDateString("en-US", { weekday: "long" });
    const month = d.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    lockDate.textContent = day + ", " + month;
  }
}
setInterval(tickClock, 10000); tickClock();

/* ============================================================
   Boot
   ============================================================ */
let booted = false;
let interacted = false;
function boot(){
  if (booted) return; booted = true;
  setTimeout(()=>{ chime(); setNote("Dynamic Island · tap it, or let it play"); }, 700);
}

/* ============================================================
   Audio unlock on first gesture (mobile policy)
   ============================================================ */
document.addEventListener("pointerdown", () => {
  interacted = true;
  try { if (actx && actx.state === "suspended") actx.resume(); } catch(e){}
}, { once: false });

/* ============================================================
   Hero autoplay demo (no simulator — the island plays itself)
   ============================================================ */
function heroReset(){
  ring.stop(); clearTimeout(state.autoDeclineT);
  clearInterval(state.rideTimer); state.rideTimer = null;
  state.timerOn = false; state.timerDonePending = false; state.music.playing = false;
  if (state.kind || state.expanded){
    state.kind = null; state.phase = "idle"; state.expanded = false;
    island.classList.remove("expanded","kind-music","kind-call","kind-timer","kind-ride");
    island.setAttribute("aria-expanded","false");
    screen.classList.remove("is-expanded");
    startMorph();
    setActive(null);
  }
  renderCompact(); renderExpand();
}

let demoRunning = false;
function demoTour(){
  if (demoRunning) return;
  demoRunning = true;
  (async () => {
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    try {
      while (demoRunning){
        /* 1 — idle pill */
        heroReset();
        await wait(2200);

        /* 2 — music */
        startMusic();
        await wait(1500);
        if (!state.expanded) expand();
        await wait(4600);

        /* 3 — timer ring */
        collapse();
        await wait(1200);
        state.timerOn = false; state.timerDonePending = false;
        startTimer(15);
        await wait(4700);
        state.timerOn = false; state.timerDonePending = false;

        /* 4 — ride live activity */
        startRide();
        await wait(4600);

        /* 5 — notification banner */
        sendNotification();
        await wait(2600);

        /* 6 — incoming call, then end */
        startCallIncoming();
        await wait(900);
        if (state.phase === "incoming" && !state.expanded) expand();
        await wait(3800);
        if (state.phase === "incoming") declineCall();
        await wait(1600);
      }
    } finally {
      demoRunning = false;
    }
  })();
}

/* tap the island: toggle; tap while idle starts the demo tour */
island.addEventListener("pointerenter", boot, { once: true });
setTimeout(boot, 600);
setTimeout(demoTour, 3600);

})();
