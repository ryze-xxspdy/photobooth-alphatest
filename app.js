/* ══════════════════════════════════════════════════════════════
   smora photo booth
   ──────────────────────────────────────────────────────────────
   SETTINGS you may want to change are all in CONFIG below.
   The Discord webhook is NOT here on purpose — it lives in a
   Vercel environment variable so nobody can read it from the page.
   See README.md.
   ══════════════════════════════════════════════════════════════ */

const CONFIG = {
  name: "smora",
  adminPass: "smora2026",        // change this
  discordEndpoint: "/api/discord", // Vercel function; leave as is
  defaultCaption: "",
  maxShots: 8
};

/* ─── built-in strips ─────────────────────────────────────── */
const BUILTIN = {
  strip4:  {label:"Classic strip", cols:1, rows:4, cw:560, ch:420, pad:30, gap:16, foot:110, rad:10},
  strip3:  {label:"Mini strip",    cols:1, rows:3, cw:560, ch:420, pad:30, gap:16, foot:100, rad:10},
  grid4:   {label:"Grid",          cols:2, rows:2, cw:460, ch:460, pad:28, gap:16, foot:96,  rad:10},
  duo:     {label:"Duo",           cols:1, rows:2, cw:620, ch:430, pad:28, gap:16, foot:96,  rad:10},
  wide6:   {label:"Contact sheet", cols:2, rows:3, cw:440, ch:330, pad:26, gap:12, foot:92,  rad:8},
  polaroid:{label:"Polaroid",      cols:1, rows:1, cw:640, ch:560, pad:34, gap:0,  foot:160, rad:8},
  single:  {label:"Big one",       cols:1, rows:1, cw:760, ch:560, pad:20, gap:0,  foot:70,  rad:12}
};

const LOOKS = {
  none:  {label:"None",  css:"none"},
  warm:  {label:"Warm",  css:"saturate(1.25) sepia(.18) brightness(1.06) contrast(1.02)"},
  film:  {label:"Film",  css:"sepia(.35) contrast(1.12) brightness(.97) saturate(1.15)"},
  mono:  {label:"Mono",  css:"grayscale(1) contrast(1.25) brightness(1.05)"},
  candy: {label:"Candy", css:"saturate(1.5) brightness(1.1) contrast(.92) hue-rotate(-8deg)"},
  cool:  {label:"Cool",  css:"hue-rotate(178deg) saturate(1.15) brightness(1.04)"},
  neon:  {label:"Neon",  css:"saturate(2.1) contrast(1.22) hue-rotate(160deg)"},
  dream: {label:"Dream", css:"brightness(1.12) contrast(.88) saturate(1.3)"},
  noir:  {label:"Noir",  css:"grayscale(1) contrast(1.6) brightness(.9)"},
  faded: {label:"Faded", css:"saturate(.72) brightness(1.1) contrast(.9) sepia(.12)"}
};

const COLORS = ["#FFFFFF","#FFF4E4","#F2A0BC","#141013","#231A2B","#7BD9A8","#FFC24B","#C9A7E8","#7FB3FF","#E23E57"];

const EMOJI = {
  "😀":"😀 😃 😄 😁 😆 😅 🤣 😂 🙂 🙃 😉 😊 😇 🥰 😍 🤩 😘 😋 😜 🤪 😎 🥸 🤓 🧐 😏 😴 🥳 🤠 😭 😱 🤯 🥺 🤗 🤭 🫠",
  "❤️":"❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💖 💗 💓 💞 💕 💘 💝 💟 ❣️ 💔 😻 💋 🫶 💌",
  "🎉":"🎉 🎊 🎈 🎁 🎂 🍰 🪅 🎆 🎇 ✨ 🌟 ⭐ 💫 🔥 💥 🎵 🎶 🎤 🎧 🕺 💃 🪩 🍾 🥂 🎺 🥁",
  "🌸":"🌸 🌺 🌻 🌷 🌹 🌼 💐 🍀 🍄 🌈 ☀️ 🌤️ ⛅ 🌙 🌊 🍁 🍂 🌴 🌵 🦋 🐝 ❄️ ⚡",
  "🐶":"🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🐔 🐧 🦄 🐢 🐙 🦖 🐳",
  "🍕":"🍕 🍔 🍟 🌭 🍿 🧁 🍩 🍪 🍫 🍬 🍭 🍦 🍨 🍉 🍓 🍒 🥑 🌮 🍜 🍣 🧋 ☕ 🥤",
  "👋":"👋 🤚 ✋ 🖖 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 👈 👉 👆 👇 👍 ✊ 👊 🙌 👏 🙏 💪 🫵",
  "💯":"💯 ✅ ⚡ 🚀 👑 💎 🎯 🏆 🥇 🔮 🪄 💸 🎮 📸 🎬 🎨 ♾️ 💤 🔔 🎀 🪞 🕯️"
};

/* ─── state ───────────────────────────────────────────────── */
const S = {
  step: 1, frame: "strip4", look: "warm", timer: 3,
  bg: "#FFFFFF", caption: CONFIG.defaultCaption, date: true,
  mirror: true, facing: "user", sound: true,
  shots: [], stickers: [], sel: null, cat: "😀",
  busy: false, gallery: [], custom: {}
};

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const wait = ms => new Promise(r => setTimeout(r, ms));
const FRAMES = () => ({ ...BUILTIN, ...S.custom });
const F = () => FRAMES()[S.frame] || BUILTIN.strip4;
const shotsOf = f => f.cols * f.rows;

/* ─── sound ───────────────────────────────────────────────── */
let AC;
function beep(freq = 760, dur = .09, vol = .2){
  if(!S.sound) return;
  try{
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = "sine"; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, AC.currentTime);
    g.gain.exponentialRampToValueAtTime(.0001, AC.currentTime + dur);
    o.connect(g).connect(AC.destination); o.start(); o.stop(AC.currentTime + dur);
  }catch(e){}
}
const shutter = () => { beep(1100,.05,.18); setTimeout(()=>beep(520,.09,.16), 55); };

/* ─── toast ───────────────────────────────────────────────── */
let toastT;
function toast(msg, kind = ""){
  const el = $("#toast");
  el.textContent = msg; el.className = "on " + kind;
  clearTimeout(toastT);
  toastT = setTimeout(() => el.className = kind, 3000);
}

/* ─── steps ───────────────────────────────────────────────── */
function go(n){
  if(n === 3 && S.step !== 3) prepShots();
  if(n !== 3) stopCam();
  S.step = n;
  $$(".step").forEach((el, i) => el.classList.toggle("on", i + 1 === n));
  $("#fill").style.width = (n / 4 * 100) + "%";
  $("#count").textContent = n + " of 4";
  if(n === 4) drawPreview();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
$$("[data-go]").forEach(b => b.onclick = () => go(+b.dataset.go));
$("#toStep4").onclick = () => go(4);
$("#soloCard").onclick = () => go(2);

$("#soundBtn").onclick = e => {
  S.sound = !S.sound;
  e.currentTarget.classList.toggle("on", S.sound);
  if(S.sound) beep(900, .07);
};

/* ─── builders ────────────────────────────────────────────── */
function buildLayouts(host, showDelete = false){
  const all = FRAMES();
  host.innerHTML = Object.entries(all).map(([k, f]) => {
    const cells = Array(Math.min(shotsOf(f), 12)).fill('<i></i>').join("");
    return `<button class="lay ${k === S.frame && !showDelete ? "on" : ""}" data-f="${k}">
      ${showDelete && S.custom[k] ? `<span class="del" data-del="${k}" title="Delete">✕</span>` : ""}
      <span class="mini" style="grid-template-columns:repeat(${f.cols},1fr)">${cells}</span>
      <b>${esc(f.label)}</b><small>${shotsOf(f)} photo${shotsOf(f) > 1 ? "s" : ""}</small>
    </button>`;
  }).join("");
  host.querySelectorAll("[data-f]").forEach(b => b.onclick = e => {
    if(e.target.closest("[data-del]")) return;
    if(showDelete) return;
    S.frame = b.dataset.f;
    S.shots = []; S.stickers = []; S.sel = null;
    $("#toStep4").disabled = true; setShoot("start");
    buildLayouts($("#layouts"));
    $("#shotLine").textContent = `${shotsOf(F())} shot${shotsOf(F()) > 1 ? "s" : ""}, one after another. Tap any photo to retake it.`;
  });
  host.querySelectorAll("[data-del]").forEach(b => b.onclick = () => {
    if(!confirm("Delete this strip layout?")) return;
    delete S.custom[b.dataset.del];
    saveCustom(); buildLayouts($("#adminList"), true); buildLayouts($("#layouts"));
  });
}

function buildChips(host, obj, key, after){
  host.innerHTML = Object.entries(obj).map(([k, v]) =>
    `<button class="chip ${S[key] === k ? "on" : ""}" data-k="${k}">${v.label}</button>`).join("");
  host.querySelectorAll("[data-k]").forEach(b => b.onclick = () => {
    S[key] = b.dataset.k;
    buildChips($("#looks2"), LOOKS, "look");
    buildChips($("#looks3"), LOOKS, "look");
    applyCamFilter(); renderShots(); if(after) after();
  });
}

function buildTimers(){
  const opts = [0, 3, 5, 10];
  $("#timers").innerHTML = opts.map(n =>
    `<button class="chip ${S.timer === n ? "on" : ""}" data-n="${n}">${n === 0 ? "Instant" : n + "s"}</button>`).join("");
  $("#timers").querySelectorAll("[data-n]").forEach(b => b.onclick = () => { S.timer = +b.dataset.n; buildTimers(); });
}

function buildSwatches(){
  $("#swatches").innerHTML = COLORS.map(c =>
    `<button class="sw ${S.bg === c ? "on" : ""}" data-c="${c}" style="background:${c}" aria-label="${c}"></button>`).join("");
  $("#swatches").querySelectorAll("[data-c]").forEach(b => b.onclick = () => { S.bg = b.dataset.c; buildSwatches(); drawPreview(); });
}

function buildEmoji(){
  $("#tabs").innerHTML = Object.keys(EMOJI).map(k =>
    `<button class="${k === S.cat ? "on" : ""}" data-t="${k}">${k}</button>`).join("");
  $("#tabs").querySelectorAll("[data-t]").forEach(b => b.onclick = () => { S.cat = b.dataset.t; buildEmoji(); });
  $("#emoji").innerHTML = EMOJI[S.cat].split(" ").filter(Boolean).map(e =>
    `<button data-e="${e}">${e}</button>`).join("");
  $("#emoji").querySelectorAll("[data-e]").forEach(b => b.onclick = () => addSticker(b.dataset.e));
}

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));

/* ─── camera ──────────────────────────────────────────────── */
let stream = null;
function applyCamFilter(){
  $("#cam").style.filter = LOOKS[S.look].css;
}
function prepShots(){
  const n = shotsOf(F());
  if(S.shots.length !== n) S.shots = new Array(n).fill(null);
  renderShots();
  $("#shotLine").textContent = `${n} shot${n > 1 ? "s" : ""}, one after another. Tap any photo to retake it.`;
}
async function startCam(){
  try{
    stopCam();
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: S.facing, width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false
    });
    const v = $("#cam");
    v.srcObject = stream; await v.play();
    $("#camMsg").style.display = "none";
    applyCamFilter(); applyMirror();
    return true;
  }catch(err){
    console.error(err);
    $("#camMsg").style.display = "grid";
    $("#camMsg").textContent = err.name === "NotAllowedError"
      ? "Camera access was blocked. Allow it in your browser's site settings, then tap Start camera again."
      : "No camera found on this device.";
    toast("Camera did not start", "bad");
    return false;
  }
}
function stopCam(){
  if(stream){ stream.getTracks().forEach(t => t.stop()); stream = null; }
  const v = $("#cam"); if(v) v.srcObject = null;
}
function applyMirror(){
  const on = S.mirror && S.facing === "user";
  $("#cam").classList.toggle("mir", on);
  $("#mirBtn").classList.toggle("on", S.mirror);
  $("#mirTog").classList.toggle("on", S.mirror);
  $("#mirTog").setAttribute("aria-checked", S.mirror);
}
$("#mirBtn").onclick = () => { S.mirror = !S.mirror; applyMirror(); };
$("#mirTog").onclick = () => { S.mirror = !S.mirror; applyMirror(); };
$("#flipBtn").onclick = async () => {
  S.facing = S.facing === "user" ? "environment" : "user";
  if(stream) await startCam(); else applyMirror();
};

/* ─── capture ─────────────────────────────────────────────── */
function setShoot(mode){
  const b = $("#shoot");
  b.dataset.mode = mode;
  b.textContent = { start:"Start camera", shoot:"Take the photos", busy:"Hold still…", redo:"Shoot again" }[mode];
  b.disabled = mode === "busy";
}
$("#shoot").onclick = async () => {
  const m = $("#shoot").dataset.mode;
  if(m === "start"){ if(await startCam()) setShoot("shoot"); return; }
  if(m === "busy") return;
  runSequence();
};

async function runSequence(){
  if(!stream && !(await startCam())) return;
  S.busy = true; setShoot("busy");
  const n = shotsOf(F());
  S.shots = new Array(n).fill(null); renderShots();
  for(let i = 0; i < n; i++){
    await countdown(S.timer);
    flash(); shutter();
    S.shots[i] = grab();
    renderShots();
    await wait(520);
  }
  S.busy = false; setShoot("redo");
  $("#toStep4").disabled = false;
  beep(760, .1); setTimeout(() => beep(1020, .14), 110);
  toast("Strip ready", "good");
}

async function retakeOne(i){
  if(S.busy) return;
  if(!stream && !(await startCam())) return;
  setShoot("busy"); S.busy = true;
  await countdown(S.timer);
  flash(); shutter();
  S.shots[i] = grab();
  renderShots();
  S.busy = false;
  setShoot(S.shots.every(Boolean) ? "redo" : "shoot");
  if(S.shots.every(Boolean)) $("#toStep4").disabled = false;
}

async function countdown(secs){
  const el = $("#cdown");
  if(!secs){ await wait(180); return; }
  for(let i = secs; i > 0; i--){
    el.textContent = i; el.classList.remove("on"); void el.offsetWidth; el.classList.add("on");
    beep(i === 1 ? 980 : 680, .07, .16);
    await wait(1000);
  }
  el.classList.remove("on"); el.textContent = "";
}
function flash(){ const f = $("#flash"); f.classList.remove("on"); void f.offsetWidth; f.classList.add("on"); }

function grab(){
  const v = $("#cam");
  const c = document.createElement("canvas");
  c.width = v.videoWidth || 1280; c.height = v.videoHeight || 960;
  const x = c.getContext("2d");
  if(S.mirror && S.facing === "user"){ x.translate(c.width, 0); x.scale(-1, 1); }
  x.drawImage(v, 0, 0, c.width, c.height);
  return c;
}

function renderShots(){
  const n = shotsOf(F());
  $("#shots").innerHTML = Array.from({ length: n }, (_, i) => {
    const s = S.shots[i];
    return `<button class="shot" data-i="${i}">${
      s ? `<img src="${s.toDataURL("image/jpeg", .55)}" alt="Photo ${i+1}" style="filter:${LOOKS[S.look].css}"><span class="re">Retake</span>`
        : (i + 1)
    }</button>`;
  }).join("");
  $("#shots").querySelectorAll("[data-i]").forEach(b => b.onclick = () => retakeOne(+b.dataset.i));
}

/* ─── strip drawing ───────────────────────────────────────── */
const overlayCache = {};
function overlayFor(f){
  if(!f.overlay) return null;
  if(overlayCache[f.overlay]) return overlayCache[f.overlay];
  const img = new Image();
  img.onload = () => { drawPreview(); };
  img.src = f.overlay;
  overlayCache[f.overlay] = img;
  return img;
}
function stripSize(f){
  return {
    w: f.pad * 2 + f.cols * f.cw + f.gap * (f.cols - 1),
    h: f.pad * 2 + f.rows * f.ch + f.gap * (f.rows - 1) + f.foot
  };
}
function isDark(hex){
  const c = hex.replace("#", "");
  const n = parseInt(c.length === 3 ? c.split("").map(x => x + x).join("") : c, 16);
  return (0.2126 * ((n>>16)&255) + 0.7152 * ((n>>8)&255) + 0.0722 * (n&255)) < 140;
}
function roundRect(x, a, b, w, h, r){
  x.beginPath();
  if(x.roundRect) x.roundRect(a, b, w, h, r);
  else{ x.moveTo(a+r,b); x.arcTo(a+w,b,a+w,b+h,r); x.arcTo(a+w,b+h,a,b+h,r); x.arcTo(a,b+h,a,b,r); x.arcTo(a,b,a+w,b,r); x.closePath(); }
}

function drawStrip(canvas, { withStickers = false, frame = null, shots = null } = {}){
  const f = frame || F();
  const src = shots || S.shots;
  const { w, h } = stripSize(f);
  canvas.width = w; canvas.height = h;
  const x = canvas.getContext("2d");
  x.fillStyle = S.bg; x.fillRect(0, 0, w, h);

  let i = 0;
  for(let r = 0; r < f.rows; r++) for(let c = 0; c < f.cols; c++, i++){
    const px = f.pad + c * (f.cw + f.gap), py = f.pad + r * (f.ch + f.gap);
    x.save(); roundRect(x, px, py, f.cw, f.ch, f.rad ?? 10); x.clip();
    const s = src[i];
    if(s){
      const sr = s.width / s.height, dr = f.cw / f.ch;
      let sw, sh, sx, sy;
      if(sr > dr){ sh = s.height; sw = sh * dr; sx = (s.width - sw) / 2; sy = 0; }
      else       { sw = s.width;  sh = sw / dr; sx = 0; sy = (s.height - sh) / 2; }
      x.filter = LOOKS[S.look].css;
      x.drawImage(s, sx, sy, sw, sh, px, py, f.cw, f.ch);
      x.filter = "none";
    }else{
      x.fillStyle = isDark(S.bg) ? "rgba(255,255,255,.07)" : "rgba(20,16,19,.07)";
      x.fillRect(px, py, f.cw, f.ch);
    }
    x.restore();
  }

  if(f.foot > 0){
    const ink = isDark(S.bg) ? "#FFF4E4" : "#231A2B";
    const cap = (S.caption || "").trim();
    const baseY = h - f.foot / 2 + f.pad / 3;
    x.textAlign = "center"; x.fillStyle = ink;
    if(cap){
      x.font = `700 ${Math.round(f.foot * .34)}px 'Plus Jakarta Sans', sans-serif`;
      x.fillText(cap, w / 2, baseY, w - f.pad * 2);
    }
    if(S.date){
      const d = new Date(), p = n => String(n).padStart(2, "0");
      x.globalAlpha = .55;
      x.font = `500 ${Math.round(f.foot * .2)}px Inter, sans-serif`;
      x.fillText(`${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`, w / 2, cap ? baseY + f.foot * .3 : baseY);
      x.globalAlpha = 1;
    }
  }

  const ov = overlayFor(f);
  if(ov && ov.complete && ov.naturalWidth) x.drawImage(ov, 0, 0, w, h);

  if(withStickers){
    S.stickers.forEach(s => {
      x.save();
      x.translate(s.x * w, s.y * h); x.rotate(s.rot * Math.PI / 180);
      x.font = `${s.size * w}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
      x.textAlign = "center"; x.textBaseline = "middle";
      x.fillText(s.emoji, 0, 0);
      x.restore();
    });
  }
  return canvas;
}

function drawPreview(){
  const f = F(), { w, h } = stripSize(f);
  drawStrip($("#preview"));
  const stage = $("#stage");
  const maxH = Math.max(320, window.innerHeight * .62);
  stage.style.width = Math.round(Math.min(w, maxH * (w / h))) + "px";
  stage.style.maxWidth = "100%";
  layoutStickers();
}
window.addEventListener("resize", () => { if(S.step === 4) drawPreview(); });

/* ─── stickers ────────────────────────────────────────────── */
function addSticker(emoji){
  const s = { id: Date.now() + Math.random(), emoji, x: .5, y: .4, size: .12, rot: 0 };
  S.stickers.push(s); S.sel = s.id;
  layoutStickers(); renderStkBar();
}
function layoutStickers(){
  const stage = $("#stage");
  stage.querySelectorAll(".stk").forEach(e => e.remove());
  const rect = $("#preview").getBoundingClientRect();
  S.stickers.forEach(s => {
    const el = document.createElement("div");
    el.className = "stk" + (S.sel === s.id ? " sel" : "");
    el.textContent = s.emoji;
    el.style.fontSize = (s.size * rect.width) + "px";
    place(el, s, rect);
    el.addEventListener("pointerdown", ev => dragStart(ev, s, el));
    stage.appendChild(el);
  });
}
function place(el, s, rect){
  const r = rect || $("#preview").getBoundingClientRect();
  el.style.left = (s.x * r.width) + "px";
  el.style.top = (s.y * r.height) + "px";
  el.style.transform = `translate(-50%,-50%) rotate(${s.rot}deg)`;
}
let drag = null;
function dragStart(ev, s, el){
  ev.preventDefault();
  S.sel = s.id; renderStkBar();
  $$(".stk").forEach(e => e.classList.remove("sel")); el.classList.add("sel");
  const r = $("#preview").getBoundingClientRect();
  drag = { s, el, r };
  el.setPointerCapture(ev.pointerId);
  el.style.cursor = "grabbing";
}
document.addEventListener("pointermove", ev => {
  if(!drag) return;
  const { s, el, r } = drag;
  s.x = Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width));
  s.y = Math.min(1, Math.max(0, (ev.clientY - r.top) / r.height));
  place(el, s, r);
});
document.addEventListener("pointerup", () => { if(drag){ drag.el.style.cursor = "grab"; drag = null; } });

function renderStkBar(){
  const s = S.stickers.find(k => k.id === S.sel);
  const bar = $("#stkBar");
  if(!s){ bar.innerHTML = `<span class="hint" style="margin:0">Tap a sticker to add it, then drag it onto the strip.</span>`; return; }
  bar.innerHTML = `
    <button class="chip" data-a="small">– size</button>
    <button class="chip" data-a="big">+ size</button>
    <button class="chip" data-a="left">↺</button>
    <button class="chip" data-a="right">↻</button>
    <button class="chip" data-a="del">Remove</button>`;
  bar.querySelectorAll("[data-a]").forEach(b => b.onclick = () => {
    const a = b.dataset.a;
    if(a === "small") s.size = Math.max(.04, s.size - .02);
    if(a === "big")   s.size = Math.min(.5, s.size + .02);
    if(a === "left")  s.rot -= 15;
    if(a === "right") s.rot += 15;
    if(a === "del"){ S.stickers = S.stickers.filter(k => k.id !== s.id); S.sel = null; }
    layoutStickers(); renderStkBar();
  });
}

/* ─── caption / toggles ───────────────────────────────────── */
$("#caption").addEventListener("input", e => { S.caption = e.target.value; drawPreview(); });
$("#dateTog").onclick = e => {
  S.date = !S.date;
  e.currentTarget.classList.toggle("on", S.date);
  e.currentTarget.setAttribute("aria-checked", S.date);
  drawPreview();
};

/* ─── save (device + Discord) ─────────────────────────────── */
async function postToDiscord(blob){
  try{
    const fd = new FormData();
    fd.append("file", blob, `${CONFIG.name}-${Date.now()}.png`);
    const res = await fetch(CONFIG.discordEndpoint, { method: "POST", body: fd });
    return res.ok;
  }catch(e){ return false; }
}

$("#saveBtn").onclick = async () => {
  const btn = $("#saveBtn");
  btn.disabled = true; btn.textContent = "Saving…";
  const c = drawStrip(document.createElement("canvas"), { withStickers: true });
  const blob = await new Promise(r => c.toBlob(r, "image/png"));

  // 1 — save to the device
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${CONFIG.name}-strip.png`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  pushGallery(c);
  beep(880, .1); setTimeout(() => beep(1180, .13), 110);

  // 2 — send the same strip to Discord
  const ok = await postToDiscord(blob);
  toast(ok ? "Saved to your device and to Discord" : "Saved to your device", "good");
  btn.disabled = false; btn.textContent = "Save to my device";
};

function pushGallery(canvas){
  const u = canvas.toDataURL("image/jpeg", .5);
  if(S.gallery.includes(u)) return;
  S.gallery.unshift(u); S.gallery = S.gallery.slice(0, 8);
  $("#galWrap").hidden = false;
  $("#gal").innerHTML = S.gallery.map(x => `<img src="${x}" alt="Saved strip">`).join("");
}
$("#gal").onclick = e => { if(e.target.tagName === "IMG") window.open(e.target.src, "_blank"); };

$("#againBtn").onclick = () => {
  S.shots = []; S.stickers = []; S.sel = null;
  S.caption = CONFIG.defaultCaption; $("#caption").value = S.caption;
  $("#toStep4").disabled = true; setShoot("start");
  go(2);
};

/* ══════════════════════════════════════════════════════════
   ADMIN — add strip layouts
   ══════════════════════════════════════════════════════════ */
const KEY = "smora_strips_v1";
function loadCustom(){
  try{ S.custom = JSON.parse(localStorage.getItem(KEY) || "{}"); }catch(e){ S.custom = {}; }
}
function saveCustom(){
  try{ localStorage.setItem(KEY, JSON.stringify(S.custom)); }
  catch(e){ toast("Storage is full — remove an overlay image", "bad"); }
}

let tapCount = 0, tapT;
$("#brandBtn").onclick = () => {
  tapCount++; clearTimeout(tapT);
  tapT = setTimeout(() => tapCount = 0, 900);
  if(tapCount >= 5){ tapCount = 0; openAdmin(); }
};
function openAdmin(){ $("#adminModal").classList.add("on"); }
$("#adminClose").onclick = () => $("#adminModal").classList.remove("on");
$("#adminModal").addEventListener("click", e => { if(e.target.id === "adminModal") $("#adminModal").classList.remove("on"); });

$("#adminGo").onclick = () => {
  if($("#adminPass").value !== CONFIG.adminPass){ toast("Wrong passcode", "bad"); return; }
  $("#adminLock").hidden = true; $("#adminBody").hidden = false;
  buildLayouts($("#adminList"), true); drawFormPreview();
};
$("#adminPass").addEventListener("keydown", e => { if(e.key === "Enter") $("#adminGo").click(); });

let formOverlay = null;
const formFields = ["fName","fCols","fRows","fCw","fCh","fPad","fGap","fFoot","fRad"];
formFields.forEach(id => $("#" + id).addEventListener("input", drawFormPreview));

function readForm(){
  return {
    label: ($("#fName").value || "Custom strip").slice(0, 26),
    cols: clamp(+$("#fCols").value, 1, 6),
    rows: clamp(+$("#fRows").value, 1, 8),
    cw:   clamp(+$("#fCw").value, 120, 2000),
    ch:   clamp(+$("#fCh").value, 120, 2000),
    pad:  clamp(+$("#fPad").value, 0, 200),
    gap:  clamp(+$("#fGap").value, 0, 200),
    foot: clamp(+$("#fFoot").value, 0, 400),
    rad:  clamp(+$("#fRad").value, 0, 120),
    overlay: formOverlay || null
  };
}
const clamp = (n, a, b) => Math.min(b, Math.max(a, isNaN(n) ? a : n));

function drawFormPreview(){
  const f = readForm();
  const blanks = new Array(shotsOf(f)).fill(null);
  const c = $("#fPrev");
  const keepBg = S.bg; S.bg = "#FFFFFF";
  drawStrip(c, { frame: f, shots: blanks });
  S.bg = keepBg;
}

$("#fOver").addEventListener("change", async e => {
  const file = e.target.files[0];
  if(!file) return;
  if(file.size > 2.5 * 1024 * 1024){ toast("Overlay must be under 2.5 MB", "bad"); e.target.value = ""; return; }
  formOverlay = await downscale(file, 1400);
  delete overlayCache[formOverlay];
  drawFormPreview();
  toast("Overlay loaded", "good");
});

function downscale(file, max){
  return new Promise(res => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const sc = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas");
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/png"));
      };
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

$("#fSave").onclick = () => {
  const f = readForm();
  if(shotsOf(f) > CONFIG.maxShots){ toast(`That is ${shotsOf(f)} photos — the limit is ${CONFIG.maxShots}`, "bad"); return; }
  const key = "c_" + Date.now().toString(36);
  S.custom[key] = f;
  saveCustom();
  formOverlay = null; $("#fOver").value = ""; $("#fName").value = "";
  buildLayouts($("#adminList"), true); buildLayouts($("#layouts"));
  drawFormPreview();
  toast(`“${f.label}” added`, "good");
};

$("#fExport").onclick = () => {
  const blob = new Blob([JSON.stringify(S.custom, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = "strips.json";
  a.click(); URL.revokeObjectURL(a.href);
};
$("#fImportBtn").onclick = () => $("#fImport").click();
$("#fImport").addEventListener("change", e => {
  const file = e.target.files[0]; if(!file) return;
  const r = new FileReader();
  r.onload = () => {
    try{
      const data = JSON.parse(r.result);
      Object.assign(S.custom, data); saveCustom();
      buildLayouts($("#adminList"), true); buildLayouts($("#layouts"));
      toast("Strips imported", "good");
    }catch(err){ toast("That file is not valid JSON", "bad"); }
  };
  r.readAsText(file);
});

/* ─── boot ────────────────────────────────────────────────── */
(async function init(){
  $("#brandName").textContent = CONFIG.name;
  loadCustom();

  // strips.json shipped with the site loads for everyone
  try{
    const res = await fetch("strips.json", { cache: "no-store" });
    if(res.ok) S.custom = { ...(await res.json()), ...S.custom };
  }catch(e){}

  buildLayouts($("#layouts"));
  buildChips($("#looks2"), LOOKS, "look");
  buildChips($("#looks3"), LOOKS, "look");
  buildTimers(); buildSwatches(); buildEmoji();
  renderStkBar(); setShoot("start"); prepShots();
  $("#caption").value = S.caption;
  go(1);

  if(new URLSearchParams(location.search).has("admin")) openAdmin();
})();
