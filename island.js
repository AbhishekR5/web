/* ============================================================
   Connect page — light interactions
   (channels + notifications only)
   ============================================================ */
(() => {
"use strict";

const $  = (s) => document.querySelector(s);
const noteEl   = $("#stageNote");
const banners  = $("#banners");
const island   = $("#island");

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

/* social tiles */
document.querySelectorAll(".tile[data-app]").forEach(t => {
  t.addEventListener("click", () => {
    document.querySelectorAll(".tile").forEach(x => x.setAttribute("aria-pressed", String(x === t)));
    sendNotification(t.dataset.app);
  });
});

/* the pill just says hi */
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

/* unlock audio on the first gesture (mobile policy) */
document.addEventListener("pointerdown", () => {
  try { if (actx && actx.state === "suspended") actx.resume(); } catch(e){}
}, { once: false });

})();
