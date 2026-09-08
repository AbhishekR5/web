/* ============================================================
   Connect page — light interactions + scroll flight

   The giant emerald capsule is ONE object. On scroll it is
   scrubbed (GPU translate3d + scale only) straight UP from the
   centered hero pose to a compact Dynamic-Island pill at TOP
   CENTER (x stays at 50% viewport). The scrub is 1:1 with
   scroll — slow scroll = slow movement, fast scroll = no
   jumps — and fully reversible. Tapping the docked pill
   expands the contact panel; it collapses on outside tap /
   Esc / scrolling back up.
   ============================================================ */
(() => {
"use strict";

const $  = (s) => document.querySelector(s);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const noteEl   = $("#stageNote");
const banners  = $("#banners");
const island   = $("#island");
const frame    = $("#frame");
const pinner   = $("#pinner");
const hero     = $("#hero");
const pill     = $("#pill");
const panel    = $("#panel");
const root     = document.documentElement;
const body     = document.body;

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
    card.style.transform = "translateY(-12px) scale(.95)";
    setTimeout(() => card.remove(), 320);
  });
  setTimeout(() => {
    if (!card.isConnected) return;
    card.classList.add("leave");
    setTimeout(() => card.remove(), 340);
  }, 5200);
  while (banners.children.length > 3) banners.lastChild.remove();
}

/* ---------- social tiles + expanded-panel rows (shared behavior) ---------- */
function press(app){
  document.querySelectorAll(".tile[data-app], .pan-row[data-app]").forEach(x =>
    x.setAttribute("aria-pressed", String(x.dataset.app === app)));
}
document.querySelectorAll(".tile[data-app], .pan-row[data-app]").forEach(t => {
  t.addEventListener("click", () => {
    press(t.dataset.app);
    sendNotification(t.dataset.app);
  });
});

/* the hero pill just says hi */
if (island){
  island.style.cursor = "pointer";
  island.addEventListener("click", () => {
    chimeHi();
    setNote("the island says hi \uD83D\uDC4B");
    island.classList.remove("pop");
    void island.offsetWidth;      /* restart animation */
    island.classList.add("pop");
    setTimeout(() => island.classList.remove("pop"), 500);
  });
}

/* ============================================================
   SCROLL FLIGHT ENGINE
   The whole frame is transformed per-frame with
   translate3d(0, ty, 0) scale(s) — never width/height/top/left,
   and never horizontally (the island stays at 50% viewport).
   ============================================================ */
const rmQuery = window.matchMedia ? matchMedia("(prefers-reduced-motion: reduce)") : null;

const G = { on: false, cx0: 0, cy0: 0, cyD: 0, sF: 0.15, u: 1, vh: 0 };

function safeInsets(){
  /* read env(safe-area-inset-*) through a probe element */
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
  if (!frame || !pinner || !hero) return;
  const vw = document.documentElement.clientWidth || window.innerWidth;
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const fw = frame.offsetWidth, fh = frame.offsetHeight;
  const pr = pinner.getBoundingClientRect();

  /* --- compact pill size per viewport (spec ranges) --- */
  let pw, ph;
  if (vw >= 1100){      pw = clamp(vw * 0.11, 130, 180); ph = clamp(vw * 0.028, 36, 48); }
  else if (vw >= 820){  pw = clamp(vw * 0.16, 120, 160); ph = clamp(vw * 0.045, 34, 44); }
  else if (vw >= 640){  pw = clamp(vw * 0.20, 120, 160); ph = clamp(vw * 0.05, 32, 42); }
  else {                pw = clamp(vw * 0.36, 110, 150); ph = clamp(vw * 0.10, 32, 42); }

  /* the frame condenses until its width equals the pill width */
  const s = clamp(pw / fw, 0.08, 1);

  const { st } = safeInsets();
  const top = st > 0 ? st + 10 : 18;

  const cs = getComputedStyle(pinner);
  const pt = parseFloat(cs.paddingTop) || 0;
  const pb = parseFloat(cs.paddingBottom) || 0;
  G.cx0 = pr.left + pr.width / 2;        /* hero center x — stays the final x */
  G.cy0 = pr.top + pt + (pr.height - pt - pb) / 2;
  G.cyD = top + ph / 2;                  /* docked frame center (pill centered) */
  G.sF  = s;
  G.u   = 1 / s;
  G.vh  = vh;

  if (frame) frame.style.setProperty("--u", G.u.toFixed(3));
  root.style.setProperty("--sit", top + "px");
  root.style.setProperty("--sph", ph + "px");
}

function scrub(){
  if (!G.on || !frame || !hero) return;
  const vh = G.vh || (window.innerHeight || 1);
  const max = hero.offsetHeight - vh;            /* scrollable runway length */
  let p = max > 0 ? (window.scrollY || 0) / max : 1;
  p = clamp(p, 0, 1);

  /* ease-in-out: subtle at the start (phase 1), steady through the
     middle (phase 2), settling at the end (phase 3) — pure 1:1
     scroll mapping, reversible */
  const e = (1 - Math.cos(Math.PI * p)) / 2;
  const sc = 1 - (1 - G.sF) * e;
  const ty = (G.cyD - G.cy0) * e;                /* straight up, x unchanged */

  frame.style.transform =
    "translate3d(0px," + ty.toFixed(2) + "px,0) scale(" + sc.toFixed(4) + ")";

  /* state crossfades with hysteresis so a slow scroll near a
     threshold never flickers */
  if (p >= 0.80) setDocked(true);        /* pill replaces the rim */
  else if (p <= 0.72) setDocked(false);
  if (p >= 0.55) setMin(true);           /* interior content fades out */
  else if (p <= 0.38) setMin(false);
}

let docked = false, min = false, open = false;

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

/* ---------- expand / collapse of the contact panel ---------- */
function setOpen(on){
  if (open === on) return;
  open = on;
  body.classList.toggle("is-open", on);
  if (pill) pill.setAttribute("aria-expanded", String(on));
  if (panel){
    panel.setAttribute("aria-hidden", String(!on));
    if (on){
      const first = panel.querySelector(".pan-row, a");
      if (first && document.activeElement && document.activeElement === pill) first.focus({ preventScroll: true });
    }
  }
}

if (pill){
  pill.addEventListener("click", () => { if (docked) setOpen(!open); });
}
/* collapse on outside tap or Escape */
document.addEventListener("pointerdown", (ev) => {
  if (!open) return;
  if (panel && panel.contains(ev.target)) return;
  if (pill && (pill === ev.target || pill.contains(ev.target))) return;
  setOpen(false);
}, { passive: true });
document.addEventListener("keydown", (ev) => {
  if (ev.key === "Escape") setOpen(false);
});

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
  const remeasure = () => { measure(); requestScrub(); };
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
  setDocked(false);
  setMin(false);
  setOpen(false);
  body.classList.remove("is-docked", "is-min", "is-open");
  if (frame) frame.style.transform = "";
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
