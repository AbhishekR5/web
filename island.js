/* ============================================================
   DteZ page — scroll flight + connect interactions

   ONE capsule. While the user scrolls the hero runway it is
   scrubbed (GPU translate3d + scale only, straight up, x locked
   at 50% viewport) from the large centered hero capsule to a
   compact Dynamic-Island pill at TOP CENTER. The scrub is 1:1
   with scroll position — slow scroll = slow movement, fast
   scroll = no jumps — and fully reversible. When it reaches the
   top it hands off seamlessly to a pinned (fixed) state so the
   page content scrolls underneath. Tapping opens the connect
   panel (hero or docked).
   ============================================================ */
(() => {
"use strict";

const $  = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const body     = document.body;
const root     = document.documentElement;
const noteEl   = $("#stageNote");
const banners  = $("#banners");
const frame    = $("#frame");
const pill     = $("#pill");
const panel    = $("#panel");
const pinner   = $("#pinner");
const hero     = $("#hero");
const headEl   = $("#heroHead");
const scanEl   = $("#heroScan");

const BRAND = {
  Instagram: ["#e1306c", "#833ab4"],
  Facebook:  ["#1877f2", "#0a4fc0"],
  WhatsApp:  ["#25d366", "#0b8a3c"],
  LinkedIn:  ["#0a66c2", "#004182"],
};
const POOL = {
  Instagram: { icon: "\uD83D\uDCF7", text: "arjun.k just followed you on Instagram" },
  Facebook:  { icon: "\uD83D\uDC4D", text: "Sara liked your photo on Facebook" },
  WhatsApp:  { icon: "\uD83D\uDFE2", text: "New voice message from your contact" },
  LinkedIn:  { icon: "\uD83D\uDCBC", text: "Your profile appeared in 3 searches" },
};

/* ---------- tiny audio cue (WebAudio, no files) ---------- */
let actx = null;
function tone({ f0 = 2093, dur = 0.16, when = 0, vol = 0.15 } = {}) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === "suspended") actx.resume();
    const t = actx.currentTime + when;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f0, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(actx.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) { /* audio blocked — fine */ }
}
const chimeHi = () => { tone({ f0: 2093 }); tone({ f0: 2637, when: 0.09 }); };

let toastDone = null;
function setNote(msg){
  if (!noteEl) return;
  noteEl.textContent = msg;
  noteEl.classList.add("hot");
  clearTimeout(toastDone);
  toastDone = setTimeout(() => noteEl.classList.remove("hot"), 2600);
}

/* ---------- notifications ---------- */
function sendNotification(app){
  const c = BRAND[app] || BRAND.Instagram;
  const m = POOL[app] || POOL.Instagram;
  const card = document.createElement("div");
  card.className = "banner";
  card.innerHTML =
    '<span class="banner-ico" style="background:linear-gradient(160deg,' + c[0] + ',' + c[1] + ')">' + m.icon + "</span>" +
    '<span class="banner-body">' +
      '<span class="banner-top"><b>' + app + '</b><time>now</time></span>' +
      '<p>' + m.text + '</p>' +
    "</span>";
  banners.prepend(card);
  chimeHi();
  setNote("Thanks — we'll see you on " + app);
  card.addEventListener("click", () => {
    card.style.opacity = 0;
    card.style.transform = "translateY(-16px) scale(.94)";
    setTimeout(() => card.remove(), 320);
  });
  setTimeout(() => {
    if (!card.isConnected) return;
    card.classList.add("leave");
    setTimeout(() => card.remove(), 340);
  }, 5200);
  while (banners.children.length > 3) banners.lastChild.remove();
}

/* ---------- connect panel rows (shared behavior) ---------- */
function press(app){
  document.querySelectorAll(".pan-row[data-app]").forEach(x =>
    x.setAttribute("aria-pressed", String(x.dataset.app === app)));
}
document.querySelectorAll(".pan-row[data-app]").forEach(t => {
  t.addEventListener("click", () => {
    press(t.dataset.app);
    sendNotification(t.dataset.app);
  });
});

/* ============================================================
   CONNECT PANEL — open / close
   ============================================================ */
let open = false;
function setOpen(on){
  if (open === on) return;
  open = on;
  body.classList.toggle("is-open", on);
  if (frame) frame.setAttribute("aria-expanded", String(on));
  if (pill) pill.setAttribute("aria-expanded", String(on));
  if (panel){
    panel.setAttribute("aria-hidden", String(!on));
    if (on){
      const first = panel.querySelector(".pan-row, a");
      if (first && (document.activeElement === frame || document.activeElement === pill)) {
        first.focus({ preventScroll: true });
      }
    } else if (docked && document.activeElement && panel.contains(document.activeElement)) {
      pill.focus({ preventScroll: true });
    }
  }
}
function frameClick(){
  if (docked) return;                 /* the pill handles the docked island */
  setOpen(!open);
}
if (frame){
  frame.addEventListener("click", (ev) => {
    if (ev.target.closest && ev.target.closest(".pill")) return; /* pill own handler */
    frameClick();
  });
  frame.addEventListener("keydown", (ev) => {
    if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); frameClick(); }
  });
}
if (pill){
  pill.addEventListener("click", () => { if (docked) setOpen(!open); });
}
/* close on outside tap or Escape */
document.addEventListener("pointerdown", (ev) => {
  if (!open) return;
  if (panel && panel.contains(ev.target)) return;
  if (frame && frame.contains(ev.target)) return;
  setOpen(false);
}, { passive: true });
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") setOpen(false);
});

/* ============================================================
   SCROLL FLIGHT ENGINE
   ============================================================ */
const rmQuery = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;

const G = {
  on: false, pinned: false,
  vw: 0, vh: 0, fw: 0, fh: 0, sF: 0.3, u: 1,
  cy0: 0, cyD: 0, F: 0,            /* flight length in px */
};

function safeInsets(){
  let st = 0, sr = 0;
  try {
    const p = document.createElement("div");
    p.style.cssText = "position:fixed;left:0;top:env(safe-area-inset-top);right:env(safe-area-inset-right);width:1px;height:1px;visibility:hidden;pointer-events:none";
    document.body.appendChild(p);
    const r = p.getBoundingClientRect();
    st = Math.max(0, r.top);
    sr = Math.max(0, window.innerWidth - r.right);
    p.remove();
  } catch (e) { /* env unsupported */ }
  return { st, sr };
}

function measure(){
  if (!frame || !pinner) return;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;

  /* --- compact pill size per viewport (spec) --- */
  let pw, ph;
  if (vw >= 1100){      pw = clamp(vw * 0.11, 130, 180); ph = clamp(vw * 0.028, 36, 48); }
  else if (vw >= 820){  pw = clamp(vw * 0.16, 120, 160); ph = clamp(vw * 0.045, 34, 44); }
  else if (vw >= 640){  pw = clamp(vw * 0.20, 120, 160); ph = clamp(vw * 0.05, 32, 42); }
  else {                pw = clamp(vw * 0.36, 110, 150); ph = clamp(vw * 0.10, 32, 42); }

  const fw = frame.offsetWidth;
  const fh = frame.offsetHeight;

  /* scale the capsule until its width equals the pill width */
  const sF = fw > 0 ? clamp(pw / fw, 0.08, 1) : 0.3;

  const { st } = safeInsets();
  const top = st > 0 ? st + 10 : 18;

  /* center of the sticky pinner in viewport coords, computed from layout
     only (clientHeight) so a transient entrance animation can never skew it */
  const cs = getComputedStyle(pinner);
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  const ch = pinner.clientHeight || window.innerHeight || 0;

  G.vw = vw; G.vh = vh; G.fw = fw; G.fh = fh;
  G.sF = sF;
  G.u  = 1 / sF;
  G.cy0 = pt + (ch - pt - pb) / 2;   /* pinner is stuck to viewport top:0 */
  G.cyD = top + ph / 2;
  G.F = Math.max(200, Math.round(vh * 1.2));   /* flight runway length */

  frame.style.setProperty("--u", G.u.toFixed(3));
  root.style.setProperty("--sit", top + "px");
  root.style.setProperty("--sph", ph + "px");
}

const easeInOut = p => (1 - Math.cos(Math.PI * p)) / 2;
const smooth = (a, b, p) => {
  const k = clamp((p - a) / (b - a), 0, 1);
  return k * k * (3 - 2 * k);
};

function poseAt(p){
  const e = easeInOut(p);
  return {
    s: 1 - (1 - G.sF) * e,
    ty: (G.cyD - G.cy0) * e,
  };
}

function applyCopy(p){
  /* hero copy drifts up & fades, scroll-scrubbed (staggered) */
  const kh = smooth(0.06, 0.5, p);
  if (headEl){
    headEl.style.opacity = (1 - kh).toFixed(3);
    headEl.style.transform = "translate3d(0," + (-Math.round(46 * kh)) + "px,0)";
  }
  const ks = smooth(0.12, 0.58, p);
  if (scanEl){
    scanEl.style.opacity = (1 - ks).toFixed(3);
    scanEl.style.transform = "translate3d(0," + (-Math.round(20 * ks)) + "px,0)";
  }
  const kn = smooth(0.55, 0.85, p);
  if (noteEl) noteEl.style.opacity = (1 - kn).toFixed(3);
}

let docked = false, min = false;
function setDocked(on){
  if (docked === on) return;
  docked = on;
  body.classList.toggle("is-docked", on);
  if (!on) setOpen(false);
}
function setMin(on){
  if (min === on) return;
  min = on;
  body.classList.toggle("is-min", on);
}

function applyPose(p){
  const { s, ty } = poseAt(p);
  frame.style.transform =
    "translate3d(0px," + ty.toFixed(2) + "px,0) scale(" + s.toFixed(4) + ")";
}

/* ---------- seamless handoff to pinned (fixed) ---------- */
function fixedPose(){
  /* center must sit at (vw/2, cyD) with the frame anchored left/top */
  const tx = G.vw / 2 - G.fw / 2;
  const ty = G.cyD - G.fh / 2;
  frame.style.transform =
    "translate3d(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px,0) scale(" + G.sF.toFixed(4) + ")";
}

function enterPinned(){
  if (G.pinned) return;
  G.pinned = true;
  body.classList.add("is-pinned");
  fixedPose();
  document.body.appendChild(frame);   /* fixed vs viewport — no paint between */
  frame.classList.add("pinned");
  setMin(true);
  setDocked(true);
}

function exitPinned(){
  if (!G.pinned) return;
  G.pinned = false;
  frame.classList.remove("pinned");
  pinner.appendChild(frame);          /* back in the flex flow (re-centered) */
  body.classList.remove("is-pinned");
  const p = progress();
  setDocked(false);
  setMin(p >= 0.5);
  applyPose(p);
  applyCopy(p);
}

function progress(){
  return G.F > 0 ? clamp((window.scrollY || 0) / G.F, 0, 1) : 0;
}

function scrub(){
  if (!G.on || !frame) return;
  const p = progress();

  if (G.pinned){
    if (p <= 0.96) exitPinned();      /* scrolling back up — reverse seamlessly */
    return;
  }
  if (p >= 0.995){ enterPinned(); return; }

  applyPose(p);
  applyCopy(p);

  /* state crossfades with hysteresis */
  if (p >= 0.70) setDocked(true);     /* pill replaces the rim */
  else if (p <= 0.58) setDocked(false);
  if (p >= 0.46) setMin(true);        /* interior fades out */
  else if (p <= 0.32) setMin(false);
}

/* event-driven rAF batch (no busy loop) */
let dirty = false;
function requestScrub(){
  if (dirty || !G.on) return;
  dirty = true;
  requestAnimationFrame(() => { dirty = false; scrub(); });
}

function startEngine(){
  if (G.on) return;
  if (!frame || !pinner || !hero) return;
  G.on = true;
  measure();
  const remeasure = () => {
    measure();
    if (G.pinned) fixedPose(); else requestScrub();
  };
  window.addEventListener("scroll", requestScrub, { passive: true });
  window.addEventListener("resize", remeasure, { passive: true });
  window.addEventListener("orientationchange", remeasure, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", remeasure, { passive: true });
    window.visualViewport.addEventListener("scroll", requestScrub, { passive: true });
  }
  requestScrub();
}

function stopEngine(){
  if (!G.on) return;
  G.on = false;
  if (G.pinned){
    G.pinned = false;
    frame.classList.remove("pinned");
    pinner.appendChild(frame);
    body.classList.remove("is-pinned");
  }
  setDocked(false);
  setMin(false);
  body.classList.remove("is-docked", "is-min", "is-open");
  if (frame) frame.style.transform = "";
  if (headEl) headEl.style.opacity = headEl.style.transform = "";
  if (scanEl) scanEl.style.opacity = scanEl.style.transform = "";
  if (noteEl) noteEl.style.opacity = "";
}

function syncMotionPref(){
  const rm = !!(rmQuery && rmQuery.matches);
  hero.classList.toggle("rm", rm);
  if (rm) stopEngine(); else startEngine();
}
if (rmQuery && rmQuery.addEventListener) rmQuery.addEventListener("change", syncMotionPref);

/* entry rise-in finished → drop the animation so it can never fight
   the scrubbed transform */
window.addEventListener("load", () => {
  setTimeout(() => root.classList.add("ready"), 1250);
});

syncMotionPref();

})();
