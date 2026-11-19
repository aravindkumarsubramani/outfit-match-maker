/* ================= Storage ================= */
const store = {
  get(key, fallback){
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch(e){ return fallback; }
  },
  set(key, value){
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch(e){ toast("Couldn't save on this device. Your changes last until you close the page."); return false; }
  }
};

let wardrobe = store.get("mm-wardrobe", null);
/* Version 3: new demo wardrobe with photos (5 shirts, 5 pants, 5 shoes and 3 of each accessory).
   Pieces you added yourself (ids starting with "u") are kept. */
if(!wardrobe) wardrobe = DEFAULT_WARDROBE.map(x => ({...x}));
else if(store.get("mm-wardrobe-v", 1) < 4){
  wardrobe = [...wardrobe.filter(x => String(x.id).startsWith("u")), ...DEFAULT_WARDROBE.map(x => ({...x}))];
  store.set("mm-wardrobe", wardrobe);
  try { localStorage.removeItem("mm-board"); localStorage.removeItem("mm-saved"); } catch(e){}
}
store.set("mm-wardrobe-v", 4);
const PROFILE_DEFAULTS = {name:"Guest", age:"22", prefs:["Casual"], height:"175", weight:"70", shirt:"M", pantWaist:"W32", pantLength:"L32", shoe:"42"};
let profile = store.get("mm-profile", {name:"", age:"", city:"", style:"Casual", colors:["black","white"], skin:""});
/* Fill default values into any of these fields that are still empty */
Object.entries(PROFILE_DEFAULTS).forEach(([k, v]) => {
  const cur = profile[k];
  if(cur === undefined || cur === null || (Array.isArray(cur) ? cur.length === 0 : String(cur).trim() === "")) profile[k] = Array.isArray(v) ? [...v] : v;
});
const board = {top:null, bottom:null, shoes:null, acc:[]};   // acc: several accessories, one per category
let ranked = [];
let bag = store.get("mm-bag", []);          // [{key, id, tone, size}]
let wish = store.get("mm-wish", []);        // shop product ids saved with the heart

const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const catLabel = {top:"Top", bottom:"Bottom", shoes:"Shoes", acc:"Accessory"};
const icon = (name, cls = "") => `<svg class="i ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

function toast(msg){
  const t = $("#toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
}
function pic(item, cls = ""){
  const extra = cls ? " " + cls : "";
  return item.img ? `<img class="pic${extra}" src="${item.img}" alt="">` : garmentSVG(item).replace('class="pic"', `class="pic${extra}"`);
}
function findItem(source, id){
  return (source === "shop" ? SHOP : wardrobe).find(x => x.id === id);
}
/* Close buttons inside any dialog */
document.addEventListener("click", e => {
  const c = e.target.closest("[data-close]");
  if(c){ const d = c.closest("dialog"); if(d) d.close(); }
});

/* ================= Router ================= */
const PAGES = ["home","wardrobe","outfits","shop","profile","product"];
let movedInApp = false;
function route(){
  let h = (location.hash || "#home").slice(1);
  if(h === "dashboard") h = "home";
  let [page, arg] = h.split("/");
  if(!PAGES.includes(page)) page = "home";
  if(page === "product" && !SHOP.find(p => p.id === arg)) page = "shop";
  $$(".page").forEach(p => p.hidden = p.id !== "page-" + page);
  $("#main").dataset.page = page;
  const navKey = page === "product" ? "shop" : page;
  $$("[data-nav]").forEach(a => { if(a.dataset.nav === navKey) a.setAttribute("aria-current","page"); else a.removeAttribute("aria-current"); });
  $("#topbar").hidden = page === "product";
  $("#product-bar").hidden = page !== "product";
  $("#tabbar").hidden = page === "product";       // product pages use the back arrow instead, like the design
  $("#open-search").hidden = page !== "shop";
  if(page === "home") renderHome();
  if(page === "wardrobe"){ if(arg && (arg === "all" || arg === "fav" || GROUPS.some(g => g.id === arg))) wardCat = arg; renderWardrobe(); }
  if(page === "outfits"){ renderBoard(); if(arg === "saved") setTimeout(() => { if(obWide()) openSavedDialog(); else { const w = $("#saved-wrap"); if(w.hidden) toast("No saved outfits yet. Tap the heart on an outfit to save it."); else w.scrollIntoView({behavior:"smooth", block:"start"}); } }, 80); }
  if(page === "shop") renderShop();
  if(page === "product") renderProduct(arg);
  $("#main").focus({preventScroll:true});
  window.scrollTo(0,0);
  if(page === "profile") setTimeout(askForDetails, 250);
}
window.addEventListener("hashchange", () => { movedInApp = true; route(); });
$("#open-bell").addEventListener("click", () => toast("No new notifications"));

/* ================= Colour matching ================= */
/* 2 = great, 1 = works, 0 = rethink */
function pair(a, b){
  const A = TONES[a], B = TONES[b];
  if(!A || !B) return [1, ""];
  if(a === b){
    if(a === "black") return [2, "All black looks sharp and confident."];
    if(a === "blue")  return [1, "Denim on denim is risky. Keep the shades clearly different."];
    if(a === "white") return [1, "All white is bold. Keep it very clean."];
    return [0, `${A.name} on ${B.name.toLowerCase()} blends together. Add contrast.`];
  }
  const key = [a,b].sort().join("+");
  const special = {
    "black+navy":[0,"Navy and black are too close. They look like a mistake."],
    "beige+red":[0,"Red and beige clash a little. Black or denim works better with red."],
    "grey+olive":[0,"Olive and grey look dull together. Try black or denim."],
    "blue+lightblue":[1,"Two blues work, but beige or grey would look fresher."],
    "black+lightblue":[1,"Works, but light shirts look better with lighter bottoms."],
    "beige+white":[2,"Light and fresh, great for summer."],
    "beige+navy":[2,"A timeless pairing. Smart and relaxed."],
    "black+white":[2,"Clean, classic contrast."],
    "blue+white":[2,"The safest combo there is."],
    "brown+olive":[2,"Earthy tones that sit well together."]
  };
  if(special[key]) return special[key];
  if(A.neutral && B.neutral) return [2, "Neutral colours that always work together."];
  if(A.neutral || B.neutral) return [2, "A calm base lets the colour stand out."];
  return [0, `${A.name} and ${B.name.toLowerCase()} compete for attention. Pair one of them with a neutral.`];
}
function shoePair(bottom, shoes){
  if(shoes.tone === "brown" || shoes.tone === "white" || shoes.tone === "black") {
    if(shoes.tone === "brown" && bottom.tone === "black") return [1, "Brown shoes with black bottoms are okay. Black shoes would be cleaner."];
    return [2, ""];
  }
  return pair(bottom.tone, shoes.tone);
}
function formality(item){ return (STYLES[item.style] || {formal:0}).formal; }

function judge(o){
  const tips = []; let score = 2;
  if(o.top && o.bottom){
    const [s,t] = pair(o.top.tone, o.bottom.tone); score = Math.min(score, s); if(t) tips.push(t);
    if(o.bottom.style === "shorts" && formality(o.top) === 2){ score = Math.min(score,1); tips.push("A formal shirt with shorts looks unbalanced. Try chinos."); }
  }
  if(o.bottom && o.shoes){
    const [s,t] = shoePair(o.bottom, o.shoes); score = Math.min(score, s); if(t) tips.push(t);
  }
  if(o.top && o.shoes){
    const gap = Math.abs(formality(o.top) - formality(o.shoes));
    if(gap === 2){ score = Math.min(score,1); tips.push(formality(o.shoes) === 2 ? "Loafers are too formal for this top. Sneakers fit better." : "Sneakers are too casual for this top. Try loafers or boots."); }
  }
  return {score, tips};
}


/* ================= Outfit builder (scroll mode) ================= */
const SLOT_CATS = ["top","bottom","shoes"];
const GROUP_ONE = {shirts:"Shirt", pants:"Pants", shoes:"Shoes", watches:"Watch", belts:"Belt", caps:"Cap", glasses:"Glasses", jewellery:"Jewellery", ties:"Tie", scarves:"Scarf", gloves:"Gloves", socks:"Socks"};
let verdictShown = false;            // kept for older calls
let boardReady = false, moreIdx = 0;
let saved = store.get("mm-saved", []);
const accPick = {};                  // group id → item shown on the accessory tile
const obWide = () => matchMedia("(min-width:1100px)").matches;
const onBoard = it => it.cat === "acc" ? board.acc.some(a => a.id === it.id) : !!(board[it.cat] && board[it.cat].id === it.id);

/* Remember the outfit between visits */
const ref = it => it ? {src: it.shop ? "shop" : "wardrobe", id: it.id, tone: it.tone} : null;
function unref(r){
  if(!r) return null;
  const base = findItem(r.src, r.id); if(!base) return null;
  return r.src === "shop" ? {...base, tone: r.tone || base.tone} : base;
}
function saveBoard(){ store.set("mm-board", {top:ref(board.top), bottom:ref(board.bottom), shoes:ref(board.shoes), acc:board.acc.map(ref)}); }
(function loadBoard(){
  const b = store.get("mm-board", null); if(!b) return;
  board.top = unref(b.top); board.bottom = unref(b.bottom); board.shoes = unref(b.shoes);
  board.acc = (b.acc || []).map(unref).filter(Boolean);
})();

/* How well an outfit works (higher is better) */
function outfitScore(o){
  if(!o.top || !o.bottom || !o.shoes) return -99;
  return 3 * pair(o.top.tone, o.bottom.tone)[0] + 1.5 * shoePair(o.bottom, o.shoes)[0]
    - .8 * (Math.abs(formality(o.top) - formality(o.shoes)) + Math.abs(formality(o.top) - formality(o.bottom)));
}
function reasonFor(it, cur){
  const T = TONES[it.tone] || {}, C = cur ? TONES[cur.tone] || {} : {};
  if(it.style === "sneakers" && cur && cur.style !== "sneakers") return "A sportier, modern touch";
  if(cur && formality(it) > formality(cur)) return "A more formal style";
  if(cur && formality(it) < formality(cur)) return "A more relaxed, casual feel";
  if(T.light && !C.light) return "A cleaner, brighter look";
  if(T.dark && !C.dark) return "A darker, sharper look";
  return "A fresh colour combination";
}
function bestAccInGroup(gid){
  let best = null;
  wardrobe.filter(x => x.cat === "acc" && groupOf(x).id === gid).forEach(a => {
    const s = (board.top ? matchScore(board.top, a) : 0) + (board.bottom ? matchScore(board.bottom, a) : 0) + (a.fav ? .3 : 0);
    if(!best || s > best.s) best = {a, s};
  });
  return best ? best.a : null;
}
/* Fill a product's outfit with the best pieces from the wardrobe */
function buildOutfitAround(p){
  if(p.cat === "acc"){
    board.acc = board.acc.filter(a => groupOf(a).id !== groupOf(p).id); board.acc.push(p);
    SLOT_CATS.forEach(c => { if(!board[c]) board[c] = wardrobe.find(x => x.cat === c) || null; });
  } else {
    const o = {top:board.top, bottom:board.bottom, shoes:board.shoes};
    o[p.cat] = p;
    const order = p.cat === "shoes" ? ["bottom","top"] : p.cat === "top" ? ["bottom","shoes"] : ["top","shoes"];
    order.forEach(slot => {
      let best = null;
      wardrobe.filter(x => x.cat === slot).forEach(x => {
        const t = {...o, [slot]:x};
        ["top","bottom","shoes"].forEach(c => { if(!t[c]) t[c] = wardrobe.find(w => w.cat === c); });
        const s = outfitScore(t) + (x.fav ? .2 : 0);
        if(!best || s > best.s) best = {x, s};
      });
      if(best) o[slot] = best.x;
    });
    Object.assign(board, o);
  }
  saveBoard();
}

function carItems(cat){
  const list = wardrobe.filter(x => x.cat === cat);
  if(board[cat] && !list.includes(board[cat])) list.unshift(board[cat]);   // a Shop product being tried on
  return list;
}
function centerOn(el, i, smooth){
  const item = el.querySelectorAll(".car-item")[i]; if(!item) return;
  el.scrollTo({left: item.offsetLeft - (el.clientWidth - item.offsetWidth) / 2, behavior: smooth ? "smooth" : "auto"});
}
function markCenter(el){
  const items = el.querySelectorAll(".car-item"); if(!items.length) return -1;
  const mid = el.scrollLeft + el.clientWidth / 2;
  let best = 0, dist = Infinity;
  items.forEach((it, i) => { const d = Math.abs(it.offsetLeft + it.offsetWidth / 2 - mid); if(d < dist){ dist = d; best = i; } });
  items.forEach((it, i) => { it.classList.toggle("is-center", i === best); it.setAttribute("aria-pressed", i === best); });
  return best;
}
function renderCar(cat){
  const el = $("#car-" + cat), list = carItems(cat);
  el._list = list;
  if(!list.length){ el.innerHTML = `<p class="empty small">Nothing here yet. <a href="#wardrobe">Add clothes</a>.</p>`; board[cat] = null; return; }
  if(!board[cat] || !list.includes(board[cat])) board[cat] = list[0];
  el.innerHTML = `<div class="car-track">${list.map((it, i) => `
    <button type="button" class="car-item" data-i="${i}" aria-label="${esc(it.name)}">
      <span class="car-ph">${pic(it)}${it.shop ? `<span class="shop-tag">Shop</span>` : ""}</span>
      <span class="nm">${esc(it.name)}</span>
    </button>`).join("")}</div>`;
  const idx = list.indexOf(board[cat]);
  el._silent = true;
  setTimeout(() => { centerOn(el, idx, false); markCenter(el); setTimeout(() => el._silent = false, 200); }, 0);
}
/* Scrolling picks the item in the centre */
$$(".car").forEach(el => {
  const cat = el.dataset.cat;
  el.addEventListener("scroll", () => {
    markCenter(el);
    clearTimeout(el._t);
    el._t = setTimeout(() => {
      if(el._silent) return;
      const i = markCenter(el), it = (el._list || [])[i];
      if(it && board[cat] !== it){ board[cat] = it; afterChange(); }
    }, 140);
  }, {passive:true});
  el.addEventListener("click", e => {
    const b = e.target.closest(".car-item"); if(!b) return;
    centerOn(el, +b.dataset.i, true);
  });
});
function setSlot(cat, item){
  if(cat === "acc"){ board.acc = board.acc.filter(a => groupOf(a).id !== groupOf(item).id); board.acc.push(item); renderAccCol(); afterChange(); return; }
  board[cat] = item;
  const el = $("#car-" + cat);
  if(el._list && el._list.includes(item)){ centerOn(el, el._list.indexOf(item), true); }
  else renderCar(cat);
  afterChange();
}

/* Accessories column */
function accGroups(){ return GROUPS.filter(g => g.cat === "acc" && wardrobe.some(x => groupOf(x).id === g.id)); }
function renderAccCol(){
  const groups = accGroups();
  $("#acc-col").innerHTML = groups.length ? groups.map(g => {
    const chosen = board.acc.find(a => groupOf(a).id === g.id);
    if(chosen) accPick[g.id] = chosen;
    if(!accPick[g.id] || !wardrobe.includes(accPick[g.id]) && !accPick[g.id].shop) accPick[g.id] = bestAccInGroup(g.id);
    const it = accPick[g.id]; if(!it) return "";
    const many = wardrobe.filter(x => groupOf(x).id === g.id).length > 1;
    return `<div class="acc-tile${chosen ? " on" : ""}">
      <button type="button" class="acc-main" data-acc-toggle="${g.id}" aria-pressed="${!!chosen}" aria-label="${chosen ? "Remove" : "Add"} ${esc(it.name)}">${pic(it)}<span>${esc(GROUP_ONE[g.id] || g.label)}</span></button>
      ${many ? `<button type="button" class="acc-swap" data-acc-swap="${g.id}" aria-label="Show another ${esc((GROUP_ONE[g.id] || g.label).toLowerCase())}">${icon("shuffle")}</button>` : ""}
    </div>`;
  }).join("") : `<p class="muted small">No accessories yet.</p>`;
}
$("#acc-col").addEventListener("click", e => {
  const t = e.target.closest("[data-acc-toggle]"), s = e.target.closest("[data-acc-swap]");
  if(t){
    const gid = t.dataset.accToggle, it = accPick[gid];
    if(board.acc.some(a => groupOf(a).id === gid)) board.acc = board.acc.filter(a => groupOf(a).id !== gid);
    else board.acc.push(it);
  } else if(s){
    const gid = s.dataset.accSwap, list = wardrobe.filter(x => groupOf(x).id === gid);
    const next = list[(list.indexOf(accPick[gid]) + 1) % list.length];
    accPick[gid] = next;
    if(board.acc.some(a => groupOf(a).id === gid)){ board.acc = board.acc.filter(a => groupOf(a).id !== gid); board.acc.push(next); }
  } else return;
  renderAccCol(); afterChange();
});

/* Live AI suggestion while choosing */
let liveTip = null;
function computeTip(){
  if(!board.top || !board.bottom || !board.shoes) return null;
  const cur = outfitScore(board); let best = null;
  SLOT_CATS.forEach(cat => wardrobe.filter(x => x.cat === cat && x !== board[cat]).forEach(x => {
    const s = outfitScore({...board, [cat]:x});
    if(!best || s > best.s) best = {cat, x, s};
  }));
  if(best && best.s > cur + .6){
    const why = reasonFor(best.x, board[best.cat]).toLowerCase();
    const text = best.cat === "top" ? `Try the ${best.x.name.toLowerCase()} with these pants for ${why}.`
      : best.cat === "bottom" ? `Try the ${best.x.name.toLowerCase()} with this top for ${why}.`
      : `Swap to the ${best.x.name.toLowerCase()} for ${why}.`;
    return {cat:best.cat, item:best.x, text};
  }
  for(const gid of ["watches","belts","scarves","caps","glasses"]){
    if(board.acc.some(a => groupOf(a).id === gid)) continue;
    const a = bestAccInGroup(gid);
    if(a && matchScore(board.top, a) >= 2) return {cat:"acc", item:a, text:`Great match! Add the ${a.name.toLowerCase()} to finish the look.`};
  }
  return {cat:null, text:"Great match! This outfit is balanced and ready to wear."};
}
function renderAiTip(){
  liveTip = computeTip();
  const el = $("#ai-tip");
  el.hidden = !liveTip;
  if(!liveTip) return;
  el.innerHTML = `${icon("sparkle", "spark")}<span><strong>AI Suggestion</strong><span>${esc(liveTip.text)}</span></span>${liveTip.cat ? icon("chev") : ""}`;
  el.disabled = !liveTip.cat;
}
$("#ai-tip").addEventListener("click", () => { if(liveTip && liveTip.cat) setSlot(liveTip.cat, liveTip.item); });

/* "Your Outfit" result */
function outfitBadge(){
  const s = Math.min(judge(board).score, accessoryTips().score);
  return {s, text:["Rethink This","It Works","Great Match"][s], ic:["x","check","check"][s]};
}
function outfitWhy(){
  const {top, bottom, shoes} = board, lines = [];
  const [ps, pt] = pair(top.tone, bottom.tone);
  const A = (TONES[top.tone] || {name:"These"}).name, B = (TONES[bottom.tone] || {name:"those"}).name.toLowerCase();
  lines.push(ps === 2 ? `${A} and ${B} create a balanced, timeless look.` : ps === 1 ? `${A} and ${B} work together. ${pt}` : `${A} and ${B} compete a little. ${pt}`);
  const f = formality(shoes);
  lines.push(`${shoes.name} ${["keep it casual and modern.","add a smart-casual edge.","make it sharp and formal."][f]}`);
  const avg = (formality(top) + formality(bottom) + formality(shoes)) / 3;
  lines.push(avg < .7 ? "Works well for college, casual meetups and daily wear." : avg < 1.4 ? "Great for dinners, dates and smart-casual plans." : "Ready for interviews, work and formal events.");
  const tips = [...judge(board).tips, ...accessoryTips().tips].filter(t => t && t !== pt);
  return lines.concat(tips.slice(0, 2));
}
function renderResult(){
  const ok = board.top && board.bottom && board.shoes;
  $("#ob-result").classList.toggle("empty-state", !ok);
  if(!ok){ $("#yo-badge").textContent = ""; $("#yo-preview").innerHTML = `<p class="muted">Choose a top, pants and shoes to see your outfit.</p>`; $("#yo-sugs").innerHTML = ""; $("#yo-why").innerHTML = ""; return; }
  const b = outfitBadge();
  $("#yo-badge").dataset.score = b.s;
  $("#yo-badge").innerHTML = `${icon(b.ic)} ${b.text}`;
  $("#yo-preview").innerHTML = SLOT_CATS.map(c => `<div class="yo-piece">${pic(board[c])}</div>`).join("")
    + (board.acc.length ? `<div class="yo-acc">${board.acc.map(a => `<span title="${esc(a.name)}">${pic(a)}</span>`).join("")}</div>` : "");
  const sugs = [];
  SLOT_CATS.forEach(cat => {
    let best = null;
    wardrobe.filter(x => x.cat === cat && x !== board[cat]).forEach(x => { const s = outfitScore({...board, [cat]:x}); if(!best || s > best.s) best = {x, s}; });
    if(best) sugs.push({cat, x:best.x});
  });
  $("#yo-sugs").innerHTML = sugs.map(({cat, x}) => `
    <button type="button" class="yo-sug" data-sug-cat="${cat}" data-sug-id="${x.id}">
      <span class="yo-sug-ph">${pic(x)}</span>
      <span><strong>${esc(x.name)}</strong><span>${esc(reasonFor(x, board[cat]))}</span></span>
    </button>`).join("");
  $("#yo-why").innerHTML = outfitWhy().map(l => `<li>${icon("check")}<span>${esc(l)}</span></li>`).join("");
}
$("#yo-sugs").addEventListener("click", e => {
  const b = e.target.closest("[data-sug-id]"); if(!b) return;
  const it = wardrobe.find(x => x.id === b.dataset.sugId); if(it) setSlot(b.dataset.sugCat, it);
  toast(`Swapped in the ${it.name.toLowerCase()}`);
});
$("#more-sugs").addEventListener("click", () => {
  const T = wardrobe.filter(x => x.cat === "top"), B = wardrobe.filter(x => x.cat === "bottom"), S = wardrobe.filter(x => x.cat === "shoes");
  const all = [];
  T.forEach(top => B.forEach(bottom => S.forEach(shoes => all.push({top, bottom, shoes, s: outfitScore({top, bottom, shoes})}))));
  all.sort((a, b) => b.s - a.s);
  const pool = all.slice(0, 12).filter(o => !(o.top === board.top && o.bottom === board.bottom && o.shoes === board.shoes));
  if(!pool.length) return;
  const o = pool[moreIdx++ % pool.length];
  board.top = o.top; board.bottom = o.bottom; board.shoes = o.shoes;
  SLOT_CATS.forEach(renderCar); afterChange();
  toast("Here's another matching outfit");
});

/* Saved outfits */
function renderSaved(){
  saved = saved.filter(s => unref(s.top) && unref(s.bottom) && unref(s.shoes));
  $("#saved-wrap").hidden = !saved.length;
  $("#saved-row").innerHTML = saved.map(s => `
    <div class="saved-card">
      <button type="button" class="saved-open" data-saved="${s.id}" aria-label="Open saved outfit">
        <span class="saved-pics">${[s.top, s.bottom, s.shoes].map(r => pic(unref(r))).join("")}</span>
        <span class="small">${esc(unref(s.top).name)} + ${esc(unref(s.bottom).name.toLowerCase())}</span>
      </button>
      <button type="button" class="icon-btn saved-x" data-unsave="${s.id}" aria-label="Delete saved outfit">${icon("x")}</button>
    </div>`).join("");
}
$("#save-outfit").addEventListener("click", () => {
  if(!board.top || !board.bottom || !board.shoes) return;
  const same = saved.find(s => s.top.id === board.top.id && s.bottom.id === board.bottom.id && s.shoes.id === board.shoes.id);
  if(same){ toast("This outfit is already saved"); return; }
  saved.unshift({id:"o" + Date.now(), top:ref(board.top), bottom:ref(board.bottom), shoes:ref(board.shoes), acc:board.acc.map(ref)});
  store.set("mm-saved", saved); renderSaved(); toast("Outfit saved");
});
function savedClick(e){
  const x = e.target.closest("[data-unsave]");
  if(x){ saved = saved.filter(s => s.id !== x.dataset.unsave); store.set("mm-saved", saved); renderSaved(); toast("Saved outfit removed"); return; }
  const o = e.target.closest("[data-saved]"); if(!o) return;
  const s = saved.find(v => v.id === o.dataset.saved); if(!s) return;
  board.top = unref(s.top); board.bottom = unref(s.bottom); board.shoes = unref(s.shoes); board.acc = (s.acc || []).map(unref).filter(Boolean);
  SLOT_CATS.forEach(renderCar); renderAccCol(); afterChange();
  if($("#saved-dialog").open) $("#saved-dialog").close();
  toast("Saved outfit loaded");
}
$("#saved-row").addEventListener("click", savedClick);
$("#saved-dialog-row").addEventListener("click", e => { savedClick(e); if($("#saved-dialog").open) openSavedDialog(); });
function openSavedDialog(){
  renderSaved();
  if(!saved.length){ if($("#saved-dialog").open) $("#saved-dialog").close(); toast("No saved outfits yet. Tap the heart on an outfit to save it."); return; }
  $("#saved-dialog-row").innerHTML = $("#saved-row").innerHTML;
  if(!$("#saved-dialog").open) $("#saved-dialog").showModal();
}
$("#open-saved").addEventListener("click", openSavedDialog);

/* Views: builder and result (side by side on wide screens) */
function afterChange(){ saveBoard(); renderAiTip(); renderResult(); }
function renderBoard(){
  if(!boardReady){
    boardReady = true;
    if(!board.top || !board.bottom || !board.shoes){
      const T = wardrobe.filter(x => x.cat === "top"), B = wardrobe.filter(x => x.cat === "bottom"), S = wardrobe.filter(x => x.cat === "shoes");
      let best = null;
      T.forEach(top => B.forEach(bottom => S.forEach(shoes => { const s = outfitScore({top, bottom, shoes}); if(!best || s > best.s) best = {top, bottom, shoes, s}; })));
      if(best){ board.top = board.top || best.top; board.bottom = board.bottom || best.bottom; board.shoes = board.shoes || best.shoes; }
    }
  }
  const view = (location.hash.split("/")[1] === "result") ? "result" : "build";
  $("#ob-layout").dataset.view = view;
  SLOT_CATS.forEach(renderCar); renderAccCol(); renderAiTip(); renderResult(); renderSaved();
}
function renderDashItems(){}   // kept for older calls
function accessoryTips(){
  const tips = []; let score = 2;
  const clothes = [board.top, board.bottom].filter(Boolean);
  board.acc.forEach(a => {
    if(a.style === "belt" && board.shoes && ["black","brown"].includes(a.tone) && ["black","brown"].includes(board.shoes.tone) && a.tone !== board.shoes.tone){
      score = Math.min(score, 1); tips.push(`Match your belt to your shoes: a ${TONES[board.shoes.tone].name.toLowerCase()} belt looks cleaner with ${board.shoes.name.toLowerCase()}.`);
      return;
    }
    const clash = clothes.find(c => pair(a.tone, c.tone)[0] === 0 && a.tone !== c.tone);
    if(clash){ score = Math.min(score, 1); tips.push(`The ${a.name.toLowerCase()} clashes with the ${clash.name.toLowerCase()}. A neutral colour would work better.`); }
    if(board.top && Math.abs(formality(a) - formality(board.top)) === 2){
      score = Math.min(score, 1); tips.push(`The ${a.name.toLowerCase()} is ${formality(a) > formality(board.top) ? "too formal" : "too casual"} for the ${board.top.name.toLowerCase()}.`);
    }
  });
  return {score, tips};
}
/* Older entry point: put a piece on the board */
function place(source, id){
  const it = findItem(source, id); if(!it) return;
  setSlot(it.cat, it);
}
$("#ob-back").addEventListener("click", () => { if(movedInApp && history.length > 1) history.back(); else location.hash = "#outfits"; });
let obWasWide = obWide();
window.addEventListener("resize", () => {
  if($("#main").dataset.page === "outfits"){ clearTimeout(window._obr); window._obr = setTimeout(() => SLOT_CATS.forEach(renderCar), 150); }
  if(obWide() !== obWasWide){ obWasWide = obWide(); if($("#main").dataset.page === "wardrobe") renderWardrobe(); }
});

/* ================= Stylist: understands what you're going to do ================= */
const OCCASIONS = [
  {key:"interview", words:["interview","office","work","meeting","presentation","business","formal","job"], formal:2, label:"an interview or work"},
  {key:"wedding",   words:["wedding","ceremony","church"], formal:2, label:"a wedding"},
  {key:"party",     words:["party","club","clubbing","night out","bar","concert","festival","birthday"], formal:1, dark:true, label:"a party"},
  {key:"date",      words:["date","dinner","restaurant","girlfriend","boyfriend"], formal:1, label:"a date or dinner"},
  {key:"college",   words:["college","uni","university","class","lecture","school","campus","exam"], formal:0, label:"college"},
  {key:"gym",       words:["gym","sport","run","football","workout"], formal:0, label:"sport"},
  {key:"travel",    words:["travel","trip","flight","airport","holiday","vacation","journey"], formal:0, label:"travel"},
  {key:"everyday",  words:["everyday","weekend","chill","casual","shopping","walk","friends","home"], formal:0, label:"an easy day"}
];
const COLOR_WORDS = {
  black:["black"], white:["white"], grey:["grey","gray"], navy:["navy"], beige:["beige","cream","sand"],
  blue:["denim","jeans"], lightblue:["light blue","sky"], olive:["olive","khaki"], brown:["brown"],
  red:["red"], green:["green"], pink:["pink"], burgundy:["burgundy","maroon"], cream:["cream","ivory"],
  charcoal:["charcoal"], yellow:["yellow","mustard"], orange:["orange"], purple:["purple"]
};
function readRequest(text){
  const t = " " + text.toLowerCase() + " ";
  const occ = OCCASIONS.find(o => o.words.some(w => t.includes(w))) || OCCASIONS[OCCASIONS.length-1];
  const want = [], avoid = [];
  for(const [tone, words] of Object.entries(COLOR_WORDS)){
    for(const w of words){
      if(new RegExp(`(no|not|without|avoid|except|hate)\\s+(any\\s+)?${w}`).test(t)) { avoid.push(tone); break; }
      if(t.includes(w)) { want.push(tone); break; }
    }
  }
  if(t.includes("blue") && !want.includes("lightblue") && !want.includes("navy") && !avoid.includes("blue")) want.push("blue","navy","lightblue");
  return {
    text, occ, want, avoid,
    dark: /\bdark\b/.test(t) || (occ.dark && !/\blight\b/.test(t) && !want.length),
    light: /\blight (colou?rs?|tones?)\b|\bbright\b|\bfresh\b/.test(t),
    cold: /\b(cold|winter|rain|raining|snow|freezing|chilly)\b|it's cold/.test(t),
    hot: /\b(hot|summer|sunny|warm day|heat)\b/.test(t)
  };
}
function scoreOutfit(o, r){
  const items = [o.top, o.bottom, o.shoes];
  let s = 3 * pair(o.top.tone, o.bottom.tone)[0] + 1.5 * shoePair(o.bottom, o.shoes)[0];
  s -= items.reduce((sum, it) => sum + 1.4 * Math.abs(formality(it) - r.occ.formal), 0);
  r.want.forEach(tone => { if(o.top.tone === tone) s += 3; if(o.bottom.tone === tone) s += 2; if(o.shoes.tone === tone) s += 1; });
  items.forEach(it => {
    const T = TONES[it.tone] || {};
    if(r.avoid.includes(it.tone)) s -= 8;
    if(r.dark && T.dark) s += 1.2;
    if(r.light && T.light) s += 1.2;
    if(r.cold && STYLES[it.style] && STYLES[it.style].warm) s += 1.6;
    if(r.hot && STYLES[it.style] && STYLES[it.style].warm) s -= 2;
    if(r.hot && T.light) s += .6;
    if((profile.colors || []).includes(it.tone)) s += .4;
  });
  if(o.bottom.style === "shorts" && (r.occ.formal >= 1 || r.cold)) s -= 5;
  if(o.bottom.style === "shorts" && r.hot) s += 1;
  return s;
}


/* ================= Home: AI outfit suggestions ================= */
const OCC_TILES = [
  {key:"college",   label:"College",   icon:"college"},
  {key:"party",     label:"Party",     icon:"party"},
  {key:"interview", label:"Interview", icon:"interview"},
  {key:"date",      label:"Date",      icon:"date"},
  {key:"travel",    label:"Travel",    icon:"travel"},
  {key:"everyday",  label:"Casual",    icon:"casual"},
  {key:"gym",       label:"Workout",   icon:"workout"},
  {key:"more",      label:"More",      icon:"more"}
];
const LOOK = {
  college:   {tag:"College Look",   titles:["Smart Casual","Easy Casual","Campus Cool","Fresh Basics"],               desc:"A comfortable and stylish look for college."},
  party:     {tag:"Party Look",     titles:["Night Out","After Dark","Party Ready","Bold Evening"],                    desc:"Dark, sharp and ready for the party."},
  interview: {tag:"Interview Look", titles:["Sharp & Smart","Clean Professional","Confident Classic","Polished Look"], desc:"Clean and professional, so you feel confident."},
  wedding:   {tag:"Wedding Look",   titles:["Wedding Guest","Elegant Classic","Celebration Smart","Refined Look"],     desc:"Smart and elegant for the big day."},
  date:      {tag:"Date Look",      titles:["Date Night","Relaxed Charm","Dinner Ready","Easy Elegance"],              desc:"Relaxed but put-together for a date."},
  travel:    {tag:"Travel Look",    titles:["Travel Ready","Comfy Journey","Airport Easy","On the Move"],              desc:"Easy pieces that stay comfy on the move."},
  everyday:  {tag:"Casual Look",    titles:["Relaxed Weekend","Easy Day","Laid-back Basics","Weekend Comfort"],        desc:"Laid-back pieces for an easy day."},
  gym:       {tag:"Workout Look",   titles:["Active Comfort","Easy Movement","Relaxed Fit","Light & Easy"],           desc:"The most relaxed pieces you own. Add sportswear for a real gym fit."}
};
let homeOcc = "college", aiOutfits = [], aiCustom = null, aiAll = false;

function rankOutfits(r){
  const T = wardrobe.filter(x => x.cat === "top"), B = wardrobe.filter(x => x.cat === "bottom"), S = wardrobe.filter(x => x.cat === "shoes");
  const all = [];
  T.forEach(top => B.forEach(bottom => S.forEach(shoes => { const o = {top, bottom, shoes}; all.push({o, s: scoreOutfit(o, r)}); })));
  return all.sort((a, b) => b.s - a.s);
}
function bestAccessory(o, r){
  const skip = r.cold ? [] : ["scarf","gloves","beanie"];
  let best = null;
  wardrobe.filter(a => a.cat === "acc" && a.style !== "socks" && !skip.includes(a.style)).forEach(a => {
    let s = matchScore(o.top, a) + matchScore(o.bottom, a) - 1.5 * Math.abs(formality(a) - r.occ.formal);
    if(a.style === "watch") s += 1.2;
    if(a.style === "tie" && r.occ.formal < 2) s -= 6;
    if(r.avoid.includes(a.tone)) s -= 8;
    if(!best || s > best.s) best = {a, s};
  });
  return best ? best.a : null;
}
function buildAI(r, custom){
  const ranked = rankOutfits(r), out = [], usedTops = new Set();
  for(const x of ranked){
    if(usedTops.has(x.o.top.id)) continue;
    usedTops.add(x.o.top.id);
    out.push({...x.o, acc: bestAccessory(x.o, r)});
    if(out.length === 8) break;
  }
  const look = LOOK[r.occ.key] || LOOK.everyday;
  return out.map((o, i) => {
    let desc = look.desc;
    if(custom){
      const bits = [];
      if(r.want.length) bits.push(`with ${[...new Set(r.want.map(t => TONES[t].name.toLowerCase()))].slice(0,2).join(" and ")} as you asked`);
      else if(r.dark) bits.push("in darker colours");
      else if(r.light) bits.push("in lighter colours");
      if(r.cold) bits.push("and warm enough for the cold");
      desc = `For ${r.occ.label}${bits.length ? " " + bits.join(" ") : ""}.`;
    }
    return {o, r, tag: custom ? "Your Look" : look.tag, title: custom ? ["Your Custom Look","Another Take","Fresh Idea","One More Option"][i % 4] : look.titles[i % look.titles.length], desc, score: Math.min(judge(o).score, 2)};
  });
}
function renderOccasions(){
  $("#occasions").innerHTML = OCC_TILES.map(t =>
    `<button type="button" class="occ" data-occ="${t.key}" aria-pressed="${t.key === homeOcc}">${icon(t.icon)}<span>${t.label}</span></button>`).join("");
}
function aiCardHTML(x, i){
  const o = x.o;
  const sv = isSavedOutfit(o);
  return `<article class="ai-card" data-i="${i}">
    <button type="button" class="fav ai-fav" data-ai-save="${i}" aria-pressed="${sv}" aria-label="${sv ? "Remove from" : "Save to"} Saved Outfits">${icon("heart")}</button>
    <div class="ai-art" role="img" aria-label="${esc(o.top.name)}, ${esc(o.bottom.name)}, ${esc(o.shoes.name)}${o.acc ? ", " + esc(o.acc.name) : ""}">${pic(o.top, "p-top")}${pic(o.bottom, "p-bottom")}${pic(o.shoes, "p-shoes")}${o.acc ? pic(o.acc, "p-acc") : ""}</div>
    <div class="ai-body">
      <span class="tag-pill">${esc(x.tag)}</span>
      <h3>${esc(x.title)}</h3>
      <p>${esc(x.desc)}</p>
      <button type="button" class="btn-dark" data-use="${i}">Use This Outfit ${icon("arrow")}</button>
    </div>
  </article>`;
}
function renderHome(){
  renderOccasions();
  const T = wardrobe.filter(x => x.cat === "top"), B = wardrobe.filter(x => x.cat === "bottom"), S = wardrobe.filter(x => x.cat === "shoes");
  if(!T.length || !B.length || !S.length){
    aiOutfits = [];
    $("#ai-track").innerHTML = `<p class="empty">Add at least one top, one bottom and one pair of shoes to <a href="#wardrobe">your wardrobe</a> to get outfit suggestions.</p>`;
    $("#ai-dots").innerHTML = "";
    return;
  }
  if(!aiOutfits.length) aiOutfits = aiCustom ? buildAI(aiCustom, true) : buildAI(readRequest(OCCASIONS.find(o => o.key === homeOcc).words[0]), false);
  const shown = aiAll ? aiOutfits : aiOutfits.slice(0, 4);
  $("#ai-track").classList.toggle("all", aiAll);
  $("#ai-track").innerHTML = shown.map(aiCardHTML).join("");
  $("#ai-dots").innerHTML = aiAll ? "" : shown.map((_, i) => `<i class="${i === 0 ? "on" : ""}"></i>`).join("");
  $("#ai-see-all").textContent = aiAll ? "Show less" : "See All";
  $("#ai-track").scrollLeft = 0;
  $("#profile-nudge").hidden = true;
}
$("#ai-track").addEventListener("scroll", () => {
  const t = $("#ai-track"), cards = t.querySelectorAll(".ai-card"); if(!cards.length) return;
  const w = cards[0].getBoundingClientRect().width + 16;
  const i = Math.round(t.scrollLeft / w);
  $$("#ai-dots i").forEach((d, k) => d.classList.toggle("on", k === i));
}, {passive:true});
$("#occasions").addEventListener("click", e => {
  const b = e.target.closest("[data-occ]"); if(!b) return;
  if(b.dataset.occ === "more"){ openCustom(); return; }
  homeOcc = b.dataset.occ; aiCustom = null; aiOutfits = []; aiAll = false;
  renderHome();
});
$("#ai-see-all").addEventListener("click", () => { aiAll = !aiAll; renderHome(); });
function isSavedOutfit(o){ return saved.some(s => s.top.id === o.top.id && s.bottom.id === o.bottom.id && s.shoes.id === o.shoes.id); }
$("#ai-track").addEventListener("click", e => {
  const h = e.target.closest("[data-ai-save]");
  if(h){
    const o = aiOutfits[+h.dataset.aiSave].o;
    if(isSavedOutfit(o)){ saved = saved.filter(s => !(s.top.id === o.top.id && s.bottom.id === o.bottom.id && s.shoes.id === o.shoes.id)); toast("Removed from Saved Outfits"); }
    else { saved.unshift({id:"o" + Date.now(), top:ref(o.top), bottom:ref(o.bottom), shoes:ref(o.shoes), acc:o.acc ? [ref(o.acc)] : []}); toast("Saved to Saved Outfits"); }
    store.set("mm-saved", saved);
    const on = isSavedOutfit(o); h.setAttribute("aria-pressed", on); h.setAttribute("aria-label", `${on ? "Remove from" : "Save to"} Saved Outfits`);
    return;
  }
  const b = e.target.closest("[data-use]"); if(!b) return;
  const x = aiOutfits[+b.dataset.use];
  board.top = x.o.top; board.bottom = x.o.bottom; board.shoes = x.o.shoes; board.acc = x.o.acc ? [x.o.acc] : [];
  saveBoard();
  verdictShown = true;
  location.hash = "#outfits";
  toast("Outfit placed on your board");
});

/* Custom look */
function openCustom(){ $("#custom-dialog").showModal(); setTimeout(() => $("#prompt").focus(), 50); }
$("#open-custom").addEventListener("click", openCustom);
function styleMe(text){
  aiCustom = readRequest(text); homeOcc = null; aiOutfits = []; aiAll = false;
  $("#custom-dialog").close();
  if(location.hash !== "#home" && location.hash !== "") location.hash = "#home"; else renderHome();
  setTimeout(() => $("#ai-track").scrollIntoView({behavior:"smooth", block:"center"}), 60);
}
$("#prompt-form").addEventListener("submit", e => {
  e.preventDefault();
  const text = $("#prompt").value.trim();
  if(!text){ toast("Tell me where you're going, for example \"party tonight\"."); $("#prompt").focus(); return; }
  styleMe(text);
});
$("#quick").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if(!b) return;
  $("#prompt").value = b.textContent; styleMe(b.textContent);
});


/* ================= Wardrobe ================= */
const HEART = icon("heart");
let wardCat = "fav";            // Favourites is the default category
let wardSel = null, wardMode = "view", wardSort = "new";
const wardWide = () => matchMedia("(min-width:1100px)").matches;
const money = v => (v === "" || v === undefined || v === null || isNaN(Number(v))) ? "" : "€" + Number(v).toFixed(2);
const styleLabel = it => (STYLES[it.style] || {}).label || "";
const categoryText = it => `${groupOf(it).label} · ${styleLabel(it)}`.replace(/ · $/, "");
function groupOptions(sel){ return GROUPS.map(g => `<option value="${g.id}"${g.id === sel ? " selected" : ""}>${g.label}</option>`).join(""); }
function styleOptions(gid, sel){
  const g = GROUPS.find(x => x.id === gid) || GROUPS[0];
  return g.styles.map(st => `<option value="${st}"${st === sel ? " selected" : ""}>${STYLES[st].label}</option>`).join("");
}
function toneOptions(sel){ return Object.entries(TONES).map(([k, t]) => `<option value="${k}"${k === sel ? " selected" : ""}>${t.name}</option>`).join(""); }
$("#material-list").innerHTML = MATERIALS.map(m => `<option value="${m}">`).join("");
document.body.insertAdjacentHTML("beforeend", `<datalist id="size-list">${SIZES.map(s => `<option value="${s}">`).join("")}</datalist>`);

/* Categories (left list) */
function inWardCat(x){ return wardCat === "all" ? true : wardCat === "fav" ? !!x.fav : groupOf(x).id === wardCat; }
function renderWardCats(){
  const count = id => id === "all" ? wardrobe.length : id === "fav" ? wardrobe.filter(x => x.fav).length : wardrobe.filter(x => groupOf(x).id === id).length;
  const base = ["shirts","pants","shoes","scarves","watches","belts","caps","glasses","jewellery"];
  const groups = GROUPS.filter(g => base.includes(g.id) || count(g.id) > 0);
  const row = (id, label, ic) => `<button type="button" class="w-cat" data-wcat="${id}" aria-current="${id === wardCat}">${icon(ic)}<span>${label}</span><b>${count(id)}</b></button>`;
  $("#ward-cats").innerHTML = row("all", "All Items", "wardrobe")
    + groups.map(g => row(g.id, g.label, g.id)).join("")
    + `<span class="w-cats-sep" aria-hidden="true"></span>` + row("fav", "Favourites", "heart");
}
$("#ward-cats").addEventListener("click", e => {
  const b = e.target.closest("[data-wcat]"); if(!b) return;
  wardCat = b.dataset.wcat; wardFilter.type = "";
  renderWardrobe();
  b.scrollIntoView({block:"nearest", inline:"nearest"});
});

/* Filters: brand, colour, type and price range */
const wardFilter = {brand:"", colour:"", type:"", min:"", max:""};
const numOrEmpty = v => { v = String(v).trim().replace(/[€\s]/g, "").replace(",", "."); return v === "" || isNaN(Number(v)) ? "" : Number(v); };
function renderFilterOptions(){
  const inCat = wardrobe.filter(inWardCat);
  const brands = [...new Set(wardrobe.map(x => (x.brand || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const tones = Object.keys(TONES).filter(k => wardrobe.some(x => x.tone === k));
  const types = [...new Set(inCat.map(x => x.style))].filter(st => STYLES[st]);
  if(wardFilter.brand && !brands.includes(wardFilter.brand)) wardFilter.brand = "";
  if(wardFilter.colour && !tones.includes(wardFilter.colour)) wardFilter.colour = "";
  if(wardFilter.type && !types.includes(wardFilter.type)) wardFilter.type = "";
  $("#f-brand").innerHTML = `<option value="">All Brands</option>` + brands.map(b => `<option value="${esc(b)}"${b === wardFilter.brand ? " selected" : ""}>${esc(b)}</option>`).join("");
  $("#f-colour").innerHTML = `<option value="">All Colours</option>` + tones.map(k => `<option value="${k}"${k === wardFilter.colour ? " selected" : ""}>${TONES[k].name}</option>`).join("");
  $("#f-type").innerHTML = `<option value="">All Types</option>` + types.map(st => `<option value="${st}"${st === wardFilter.type ? " selected" : ""}>${STYLES[st].label}</option>`).join("");
  const prices = wardrobe.map(x => x.price).filter(p => p !== "" && p !== undefined && p !== null && !isNaN(Number(p))).map(Number);
  $("#f-min").placeholder = prices.length ? "Min " + Math.floor(Math.min(...prices)) : "Min";
  $("#f-max").placeholder = prices.length ? "Max " + Math.ceil(Math.max(...prices)) : "Max";
  $$("#w-sort [data-sort]").forEach(b => b.setAttribute("aria-pressed", b.dataset.sort === wardSort));
}
function passesFilters(x){
  if(wardFilter.brand && (x.brand || "").trim() !== wardFilter.brand) return false;
  if(wardFilter.colour && x.tone !== wardFilter.colour) return false;
  if(wardFilter.type && x.style !== wardFilter.type) return false;
  const min = numOrEmpty(wardFilter.min), max = numOrEmpty(wardFilter.max);
  if(min !== "" || max !== ""){
    const p = x.price === "" || x.price === undefined || x.price === null ? NaN : Number(x.price);
    if(isNaN(p)) return false;                 // no price → hidden while a price range is set
    if(min !== "" && p < min) return false;
    if(max !== "" && p > max) return false;
  }
  return true;
}
const filtersActive = () => !!(wardFilter.brand || wardFilter.colour || wardFilter.type || String(wardFilter.min).trim() || String(wardFilter.max).trim());
function sortWard(list){
  const by = {
    new: (a, b) => wardrobe.indexOf(a) - wardrobe.indexOf(b),
    name: (a, b) => a.name.localeCompare(b.name),
    "price-asc": (a, b) => (Number(a.price) || 0) - (Number(b.price) || 0),
    "price-desc": (a, b) => (Number(b.price) || 0) - (Number(a.price) || 0)
  }[wardSort];
  return [...list].sort(by);
}

/* Grid */
function renderWardrobe(){
  renderWardCats(); renderFilterOptions();
  const inCat = wardrobe.filter(inWardCat);
  const list = sortWard(inCat.filter(passesFilters));
  const active = filtersActive();
  const nActive = [wardFilter.brand, wardFilter.colour, wardFilter.type, String(wardFilter.min).trim() || String(wardFilter.max).trim()].filter(Boolean).length;
  $("#filter-count").textContent = nActive; $("#filter-count").hidden = !nActive;
  const minN = numOrEmpty(wardFilter.min), maxN = numOrEmpty(wardFilter.max);
  $("#f-result").textContent = minN !== "" && maxN !== "" && minN > maxN ? "The minimum price is higher than the maximum."
    : active ? `${list.length} of ${inCat.length} item${inCat.length === 1 ? "" : "s"} match your filters` : "";
  const label = wardCat === "all" ? "All Items" : wardCat === "fav" ? "Favourites" : GROUPS.find(g => g.id === wardCat).label;
  $("#w-cat-title").textContent = label;
  $("#w-cat-count").textContent = `(${list.length} item${list.length === 1 ? "" : "s"})`;
  let empty = "";
  if(!list.length){
    empty = active && inCat.length ? `Nothing here matches your filters. <button type="button" class="link" data-clear-filters>Clear filters</button>`
      : wardCat === "fav" ? "No favourites yet. Tap the heart on a piece to add it here."
      : `No ${esc(label.toLowerCase())} yet. Add some with <strong>Add Clothes</strong>.`;
  }
  $("#ward-items").innerHTML = list.length ? list.map(it => `
    <div class="w-card${it.id === wardSel ? " selected" : ""}">
      <button type="button" class="open" data-open="${it.id}" aria-label="Open ${esc(it.name)}">
        ${pic(it)}<span class="body">${esc(it.name)}</span>
      </button>
      <button type="button" class="fav" data-fav="${it.id}" aria-pressed="${!!it.fav}" aria-label="${it.fav ? "Remove " + esc(it.name) + " from" : "Add " + esc(it.name) + " to"} favourites">${HEART}</button>
    </div>`).join("") : `<p class="empty">${empty}</p>`;
  updateCounts();
  /* Details panel beside the grid on wide screens */
  const showSide = wardWide() && !!wardrobe.find(x => x.id === wardSel);
  $("#w-layout").classList.toggle("has-detail", showSide);
  $("#w-detail").hidden = !showSide;
  if(showSide) $("#w-detail").innerHTML = detailHTML();
}
function updateCounts(){
  const n = wardrobe.length;
  $("#wardrobe-count").textContent = `${n} item${n === 1 ? "" : "s"}`;
}
function saveWardrobe(){ return store.set("mm-wardrobe", wardrobe); }
function toggleFav(id){
  const it = wardrobe.find(x => x.id === id); if(!it) return;
  it.fav = !it.fav; saveWardrobe();
  toast(it.fav ? `Added ${it.name} to Favourites` : `Removed ${it.name} from Favourites`);
  return it;
}
function clearFilters(){
  Object.assign(wardFilter, {brand:"", colour:"", type:"", min:"", max:""});
  $("#f-min").value = ""; $("#f-max").value = "";
  renderWardrobe();
}
$("#f-brand").addEventListener("change", e => { wardFilter.brand = e.target.value; renderWardrobe(); });
$("#f-colour").addEventListener("change", e => { wardFilter.colour = e.target.value; renderWardrobe(); });
$("#f-type").addEventListener("change", e => { wardFilter.type = e.target.value; renderWardrobe(); });
$("#f-min").addEventListener("input", e => { wardFilter.min = e.target.value; renderWardrobe(); });
$("#f-max").addEventListener("input", e => { wardFilter.max = e.target.value; renderWardrobe(); });

/* Small pop-up menus (sort + clear) */
function togglePop(btn, pop, open){
  const show = open === undefined ? pop.hidden : open;
  pop.hidden = !show; btn.setAttribute("aria-expanded", show);
}
document.addEventListener("click", e => {
  $$(".pop").forEach(pop => {
    const btn = pop.previousElementSibling;
    if(!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) togglePop(btn, pop, false);
  });
});
$("#w-sort-btn").addEventListener("click", () => togglePop($("#w-sort-btn"), $("#w-sort")));
$("#w-sort").addEventListener("click", e => {
  const s = e.target.closest("[data-sort]");
  if(s){ wardSort = s.dataset.sort; renderWardrobe(); }
  if(e.target.closest("#f-clear")) clearFilters();
  togglePop($("#w-sort-btn"), $("#w-sort"), false);
});

$("#ward-items").addEventListener("click", e => {
  if(e.target.closest("[data-clear-filters]")){ clearFilters(); return; }
  const f = e.target.closest("[data-fav]");
  if(f){ toggleFav(f.dataset.fav); renderWardrobe(); if($("#item-dialog").open) openItem(wardSel, wardMode); return; }
  const o = e.target.closest("[data-open]");
  if(o) openItem(o.dataset.open);
});

/* Delete with warning */
let pendingDelete = null;
function askDelete(id){
  const it = wardrobe.find(x => x.id === id); if(!it) return;
  pendingDelete = id;
  $("#del-title").textContent = `Delete “${it.name}”?`;
  $("#del-dialog").showModal();
  $("#del-cancel").focus();
}
$("#del-cancel").addEventListener("click", () => { pendingDelete = null; $("#del-dialog").close(); });
$("#del-ok").addEventListener("click", () => {
  const it = wardrobe.find(x => x.id === pendingDelete);
  $("#del-dialog").close(); pendingDelete = null;
  if(!it) return;
  wardrobe = wardrobe.filter(x => x.id !== it.id);
  ["top","bottom","shoes"].forEach(c => { if(board[c] && board[c].id === it.id) board[c] = null; });
  board.acc = board.acc.filter(a => a.id !== it.id);
  saved = saved.filter(s => ![s.top, s.bottom, s.shoes, ...(s.acc || [])].some(r => r && r.src === "wardrobe" && r.id === it.id));
  store.set("mm-saved", saved); saveBoard(); saveWardrobe();
  if(wardSel === it.id){ wardSel = null; if($("#item-dialog").open) $("#item-dialog").close(); }
  renderWardrobe();
  toast(`Deleted ${it.name}`);
});

/* Goes well with: used by outfit suggestions and the Shop */
function matchScore(a, b){
  let s;
  if(a.cat === "bottom" && b.cat === "shoes") s = shoePair(a, b)[0];
  else if(a.cat === "shoes" && b.cat === "bottom") s = shoePair(b, a)[0];
  else s = pair(a.tone, b.tone)[0];
  s = s * 2 - Math.abs(formality(a) - formality(b)) * .8;
  if(b.cat !== "acc") s += 1.5;   // matching clothes come before accessories
  if(b.fav) s += .2;
  return s;
}

/* The colour is read from the name ("Navy linen shirt" → navy) unless you pick one */
const TONE_WORDS = [["light blue","lightblue"],["sky blue","lightblue"],["baby blue","lightblue"],["navy","navy"],["denim","blue"],["blue","blue"],
  ["white","white"],["cream","cream"],["ivory","cream"],["off white","cream"],["black","black"],["charcoal","charcoal"],["grey","grey"],["gray","grey"],
  ["beige","beige"],["khaki","beige"],["tan","brown"],["sand","beige"],["camel","brown"],["olive","olive"],["khaki green","olive"],
  ["brown","brown"],["chocolate","brown"],["burgundy","burgundy"],["maroon","burgundy"],["wine","burgundy"],["red","red"],["green","green"],["pink","pink"],
  ["yellow","yellow"],["mustard","yellow"],["orange","orange"],["rust","orange"],["purple","purple"],["lilac","purple"],["lavender","purple"],
  ["silver","silver"],["gold","gold"]];
function toneFromName(name, fallback){
  const n = " " + name.toLowerCase().replace(/[^a-z]+/g, " ") + " ";
  const hit = [...TONE_WORDS].sort((x, y) => y[0].length - x[0].length).find(([w]) => n.includes(" " + w + " "));
  return hit ? hit[1] : fallback;
}

/* Details panel: one large image, the details, Edit and Use in Outfit */
function openItem(id, mode = "view"){
  const it = wardrobe.find(x => x.id === id); if(!it) return;
  wardSel = id; wardMode = mode;
  if(wardWide()){
    if($("#item-dialog").open) $("#item-dialog").close();
    renderWardrobe();
    const f = mode === "edit" ? $("#w-detail #e-name") : null; if(f) f.focus();
    return;
  }
  renderWardrobe();
  $("#item-body").innerHTML = detailHTML();
  if(!$("#item-dialog").open) $("#item-dialog").showModal();
  $("#item-dialog").scrollTop = 0;
  const focus = mode === "edit" ? $("#e-name") : $("#item-dialog [data-ip-close]");
  if(focus) focus.focus();
}
function detailHTML(){
  const it = wardrobe.find(x => x.id === wardSel); if(!it) return "";
  return wardMode === "edit" ? itemEditHTML(it) : itemViewHTML(it);
}
function itemViewHTML(it){
  const row = (ic, k, v) => `<div class="wd-row">${icon(ic)}<dt>${k}</dt><dd>${v || `<span class="muted">Not added</span>`}</dd></div>`;
  const tone = TONES[it.tone];
  return `<div class="wd">
    <div class="wd-top">
      <button type="button" class="wd-edit" data-ip-edit>${icon("edit")} Edit</button>
      <button type="button" class="icon-btn wd-x" data-ip-close aria-label="Close">${icon("x")}</button>
    </div>
    <div class="wd-photo">${pic(it)}</div>
    <div class="wd-name"><h2 id="ip-name">${esc(it.name)}</h2>
      <button type="button" class="fav wd-fav" data-ip-fav aria-pressed="${!!it.fav}" aria-label="${it.fav ? "Remove from" : "Add to"} favourites">${HEART}</button></div>
    <dl class="wd-facts">
      ${row("badge", "Brand", esc(it.brand || ""))}
      ${row("shirts", "Type", styleLabel(it) ? `${icon(groupOf(it).id, "sm")} ${esc(styleLabel(it))}` : "")}
      ${row("ruler", "Size", esc(it.size || ""))}
      ${row("layers", "Material", esc(it.material || ""))}
      ${row("palette", "Colour", tone ? `<i class="dot" style="background:${tone.hex}"></i> ${tone.name}` : "")}
      ${row("tag", "Price", money(it.price) ? `<strong>${money(it.price)}</strong>` : "")}
    </dl>
    <button type="button" class="btn-primary wd-use" data-use-outfit>${icon("hanger")} Use in Outfit</button>
  </div>`;
}
function itemEditHTML(it){
  const v = x => x === undefined || x === null ? "" : esc(x);
  const gid = groupOf(it).id;
  return `<div class="wd">
    <div class="wd-top"><h2 id="ip-name">Edit details</h2>
      <button type="button" class="icon-btn wd-x" data-ip-close aria-label="Close">${icon("x")}</button></div>
    <form class="ip-form" id="edit-form" novalidate>
      <div class="field"><label for="e-name">Clothing name</label><input id="e-name" value="${v(it.name)}" autocomplete="off"></div>
      <div class="field-pair">
        <div class="field"><label for="e-group">Category</label><select id="e-group">${groupOptions(gid)}</select></div>
        <div class="field"><label for="e-style">Clothing type</label><select id="e-style">${styleOptions(gid, it.style)}</select></div>
        <div class="field"><label for="e-brand">Brand</label><input id="e-brand" value="${v(it.brand)}" placeholder="e.g. Basico" autocomplete="off"></div>
        <div class="field"><label for="e-size">Size</label><input id="e-size" list="size-list" value="${v(it.size)}" placeholder="e.g. M" autocomplete="off"></div>
        <div class="field"><label for="e-material">Material</label><input id="e-material" list="material-list" value="${v(it.material)}" placeholder="e.g. Cotton" autocomplete="off"></div>
        <div class="field"><label for="e-tone">Colour</label><select id="e-tone">${toneOptions(it.tone)}</select></div>
        <div class="field"><label for="e-price">Price (€)</label><input id="e-price" inputmode="decimal" value="${it.price === undefined || it.price === "" ? "" : Number(it.price).toFixed(2)}" placeholder="e.g. 39.99" autocomplete="off"></div>
      </div>
      <p class="error" id="edit-error" aria-live="polite"></p>
      <div class="dialog-actions">
        <button class="btn-outline" type="button" data-ip-cancel>Cancel</button>
        <button class="btn-primary" type="submit">Save changes</button>
      </div>
      <p class="wd-delete"><button type="button" class="link danger" data-ip-delete>${icon("trash")} Delete this item</button></p>
    </form>
  </div>`;
}
function parsePrice(raw){
  raw = String(raw || "").trim().replace(/[€\s]/g, "").replace(",", ".");
  if(!raw) return {ok:true, value:""};
  const n = Number(raw);
  return isNaN(n) || n < 0 ? {ok:false} : {ok:true, value:Math.round(n * 100) / 100};
}
function closeDetail(){
  wardSel = null; wardMode = "view";
  if($("#item-dialog").open) $("#item-dialog").close();
  renderWardrobe();
}
function detailClick(e){
  if(e.target === $("#item-dialog")){ closeDetail(); return; }   // click on backdrop
  if(e.target.closest("[data-ip-close]")){ closeDetail(); return; }
  if(e.target.closest("[data-ip-edit]")){ openItem(wardSel, "edit"); return; }
  if(e.target.closest("[data-ip-delete]")){ askDelete(wardSel); return; }
  if(e.target.closest("[data-ip-cancel]")){ openItem(wardSel); return; }
  if(e.target.closest("[data-ip-fav]")){ toggleFav(wardSel); openItem(wardSel); return; }
  if(e.target.closest("[data-use-outfit]")){
    const it = wardrobe.find(x => x.id === wardSel); if(!it) return;
    if(it.cat === "acc"){ board.acc = board.acc.filter(a => groupOf(a).id !== groupOf(it).id); board.acc.push(it); }
    else board[it.cat] = it;
    saveBoard();
    if($("#item-dialog").open) $("#item-dialog").close();
    location.hash = "#outfits";
    toast(`${it.name} is in your outfit`);
  }
}
function detailChange(e){
  if(e.target.id === "e-group") $("#e-style").innerHTML = styleOptions(e.target.value);
}
function detailSubmit(e){
  if(e.target.id !== "edit-form") return;
  e.preventDefault();
  const it = wardrobe.find(x => x.id === wardSel); if(!it) return;
  const name = $("#e-name").value.trim();
  if(!name){ $("#edit-error").textContent = "Give the piece a name."; $("#e-name").focus(); return; }
  const price = parsePrice($("#e-price").value);
  if(!price.ok){ $("#edit-error").textContent = "Enter the price as a number, for example 39.99."; $("#e-price").focus(); return; }
  const g = GROUPS.find(x => x.id === $("#e-group").value) || groupOf(it);
  const cat = g.cat, style = $("#e-style").value;
  if(cat !== it.cat){
    if(it.cat === "acc") board.acc = board.acc.filter(a => a.id !== it.id);
    else if(board[it.cat] && board[it.cat].id === it.id) board[it.cat] = null;
  }
  const tone = $("#e-tone").value, looksChanged = style !== it.style || tone !== it.tone;
  Object.assign(it, {name, cat, style, tone, brand:$("#e-brand").value.trim(), size:$("#e-size").value.trim(), price:price.value, material:$("#e-material").value.trim()});
  saveWardrobe(); saveBoard();
  if(looksChanged && it.picMode === "clean") cleanPicture(style, tone).then(url => { if(url){ it.img = url; saveWardrobe(); renderWardrobe(); if($("#item-dialog").open) openItem(it.id); } }).catch(() => {});
  openItem(it.id);
  toast("Changes saved");
}
["#item-dialog", "#w-detail"].forEach(sel => {
  $(sel).addEventListener("click", detailClick);
  $(sel).addEventListener("change", detailChange);
  $(sel).addEventListener("submit", detailSubmit);
});
$("#item-dialog").addEventListener("close", () => { if(!wardWide()){ wardSel = null; wardMode = "view"; renderWardrobe(); } });

/* Add clothes: take a photo → the app reads type, colour and material → you tap to confirm → clean studio picture */
const add = {};
const nameWord = st => ((STYLES[st] || {}).label || "").split(/[(/]/)[0].trim().toLowerCase();
function autoName(){ return `${TONES[add.tone].name} ${nameWord(add.style)}`.replace(/^Denim blue /, "Blue "); }
function mySize(cat){
  if(cat === "top") return profile.shirt || "M";
  if(cat === "bottom") return [profile.pantWaist || "W32", profile.pantLength || "L32"].join(" ");
  if(cat === "shoes") return profile.shoe ? "EU " + Math.round(Number(profile.shoe)) : "EU 42";
  return "One size";
}
function resetAdd(gid){
  const g = GROUPS.find(x => x.id === gid) || GROUPS[0];
  Object.assign(add, {group:g.id, style:g.styles[0], tone:"black", material:MATERIALS_FOR[g.cat][0], size:mySize(g.cat),
    photo:null, cut:null, clean:null, pic:"clean", ai:null, touched:{}, nameTouched:false, scanId:(add.scanId || 0) + 1, allMats:false});
}
const radio = (attr, val, on, label, extra = "") => `<button type="button" role="radio" ${attr}="${esc(val)}" aria-checked="${on}"${extra}>${label}</button>`;
const aiMark = `<span class="ai-mark" title="Suggested from your photo">${icon("sparkle")}</span>`;
function renderAddChips(){
  const g = GROUPS.find(x => x.id === add.group), ai = add.ai || {};
  const aiTypes = (ai.types || []).filter(([st, p]) => g.styles.includes(st) && p > .08).map(x => x[0]);
  $("#a-groups").innerHTML = GROUPS.map(x => radio("data-agroup", x.id, x.id === add.group, `${icon(x.id)} ${esc(x.label)}${ai.group === x.id ? aiMark : ""}`)).join("");
  const types = [...aiTypes, ...g.styles.filter(st => !aiTypes.includes(st))];
  $("#a-types").innerHTML = types.map(st => radio("data-astyle", st, st === add.style, `${esc(STYLES[st].label)}${aiTypes.includes(st) ? aiMark : ""}`)).join("");
  const aiTone = ai.tone;
  $("#a-tones").innerHTML = Object.entries(TONES).map(([k, t]) => radio("data-atone", k, k === add.tone, `${k === aiTone ? aiMark : ""}`,
    ` style="--sw:${t.hex}" aria-label="${t.name}" title="${t.name}"`)).join("");
  $("#a-tone-name").textContent = TONES[add.tone].name;
  const base = MATERIALS_FOR[g.cat], aiMat = ai.material;
  let mats = add.allMats ? MATERIALS : base.slice(0, 8);
  if(aiMat && !mats.includes(aiMat)) mats = [aiMat, ...mats];
  if(add.material && !mats.includes(add.material)) mats = [add.material, ...mats];
  $("#a-mats").innerHTML = mats.map(m => radio("data-amat", m, m === add.material, `${esc(m)}${m === aiMat ? aiMark : ""}`)).join("")
    + (add.allMats ? "" : `<button type="button" class="chip-more" data-amore>More…</button>`);
  const sizes = [...SIZE_CHIPS[g.cat]]; if(add.size && !sizes.includes(add.size)) sizes.unshift(add.size);
  $("#a-sizes").innerHTML = sizes.map(sz => radio("data-asize", sz, sz === add.size, esc(sz))).join("");
  if(!add.nameTouched) $("#a-name").value = autoName();
}
function renderPicChoice(){
  $$("#pic-choice [data-pic]").forEach(b => b.setAttribute("aria-checked", b.dataset.pic === add.pic));
  $("#pc-photo-btn").hidden = !add.photo; $("#pic-choice").hidden = !add.photo;
  $("#pc-clean").innerHTML = add.clean ? `<img src="${add.clean}" alt="">` : `<span class="spin"></span>`;
  $("#pc-photo").innerHTML = add.cut ? `<img src="${add.cut}" alt="">` : add.photo ? `<img src="${add.photo}" alt="" class="raw">` : "";
  const big = add.pic === "photo" ? (add.cut || add.photo) : add.clean;
  $("#a-preview").hidden = !big; if(big) $("#a-preview").src = big;
  $("#upload").classList.toggle("has-pic", !!big);
  $("#upload-text").innerHTML = add.photo ? `${icon("edit")} Retake photo` : `${icon("plus")} Take or upload a photo`;
}
/* New clean picture whenever type or colour changes */
let cleanTicket = 0;
function refreshClean(){
  const t = ++cleanTicket; add.clean = null; renderPicChoice();
  cleanPicture(add.style, add.tone).then(url => {
    if(t !== cleanTicket) return;
    add.clean = url; renderPicChoice();
  }).catch(() => { if(t === cleanTicket){ add.clean = null; $("#pc-clean").innerHTML = pic({cat:GROUPS.find(g => g.id === add.group).cat, style:add.style, tone:add.tone}); } });
}
function scanStatus(msg, frac){
  $("#scan-status").hidden = !msg;
  $("#scan-msg").textContent = msg || "";
  $("#scan-bar").parentElement.hidden = frac === undefined;
  if(frac !== undefined) $("#scan-bar").style.width = Math.round(frac * 100) + "%";
}
function setStyle(st){
  const g = GROUPS.find(x => x.styles.includes(st)); if(!g) return;
  if(g.id !== add.group){
    add.group = g.id;
    if(!add.touched.material) add.material = MATERIALS_FOR[g.cat][0];
    if(!add.touched.size) add.size = mySize(g.cat);
  }
  add.style = st;
}
$("#add-dialog").addEventListener("click", e => {
  const b = e.target.closest("[data-agroup],[data-astyle],[data-atone],[data-amat],[data-asize],[data-amore],[data-pic]"); if(!b) return;
  const d = b.dataset;
  if(d.agroup){ const g = GROUPS.find(x => x.id === d.agroup); add.touched.style = true; setStyle(g.styles.includes(add.style) ? add.style : g.styles[0]); refreshClean(); }
  else if(d.astyle){ add.touched.style = true; setStyle(d.astyle); refreshClean(); }
  else if(d.atone){ add.touched.tone = true; add.tone = d.atone; refreshClean(); }
  else if(d.amat){ add.touched.material = true; add.material = d.amat; }
  else if(d.asize){ add.touched.size = true; add.size = d.asize; }
  else if(d.amore !== undefined){ add.allMats = true; }
  else if(d.pic){ add.pic = d.pic; if(d.pic === "photo") makeCutout(); renderPicChoice(); return; }
  renderAddChips();
});
$("#a-name").addEventListener("input", () => { add.nameTouched = $("#a-name").value.trim() !== ""; });

$("#open-add").addEventListener("click", () => {
  resetAdd(GROUPS.find(g => g.id === wardCat) ? wardCat : "shirts");
  $("#add-form").reset(); $("#add-error").textContent = ""; $("#a-photo").value = "";
  scanStatus(""); renderAddChips(); refreshClean();
  $("#add-dialog").showModal();
});

/* Photo → square canvas → colour now, type and material from the analyser */
let addCanvas = null;
$("#a-photo").addEventListener("change", e => {
  const f = e.target.files[0]; if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 600, c = document.createElement("canvas"), s = Math.min(img.width, img.height);
      c.width = c.height = size;
      c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
      addCanvas = c; add.photo = c.toDataURL("image/jpeg", .82); add.cut = null;
      startScan(c);
    };
    img.onerror = () => toast("This photo can't be opened. Try a JPG or PNG.");
    img.src = reader.result;
  };
  reader.readAsDataURL(f);
});
async function startScan(canvas){
  const id = ++add.scanId;
  let pix = [];
  try { pix = photoTones(canvas); } catch(err){}
  if(pix.length && !add.touched.tone){ add.tone = pix[0][0]; add.ai = {...(add.ai || {}), tone:pix[0][0]}; }
  renderAddChips(); refreshClean(); renderPicChoice();
  scanStatus("Reading your photo…");
  try {
    const scan = await import("./scan.js?v=20");
    const res = await scan.analysePhoto(canvas, f => { if(id === add.scanId) scanStatus("Getting the photo analyser ready (first time only)…", f); });
    if(id !== add.scanId) return;
    /* Colour: the analyser and the pixel colour together */
    const tone = {}; res.tones.forEach(([t, p]) => tone[t] = (tone[t] || 0) + .6 * p); pix.forEach(([t, p]) => tone[t] = (tone[t] || 0) + .4 * p);
    const bestTone = Object.entries(tone).sort((a, b) => b[1] - a[1])[0][0];
    let types = res.types;
    const denim = (res.materials.find(m => m[0] === "Denim") || [0, 0])[1];
    if(types[0][0] === "denimshirt" && denim < .3) types = [types.find(t => t[0] === "shirt"), ...types.filter(t => t[0] !== "shirt")];
    const bestStyle = types[0][0], group = GROUPS.find(g => g.styles.includes(bestStyle));
    const cat = group.cat, mats = res.materials.filter(([m]) => MATERIALS_FOR[cat].includes(m));
    add.ai = {types, tone:bestTone, group:group.id, material:(mats[0] || res.materials[0])[0]};
    if(!add.touched.style) setStyle(bestStyle);
    if(!add.touched.tone) add.tone = bestTone;
    if(!add.touched.material) add.material = add.ai.material;
    renderAddChips(); refreshClean();
    const conf = types[0][1];
    scanStatus(conf > .6 ? `Detected: ${TONES[add.tone].name.toLowerCase()} ${nameWord(add.style)}. Check the details and tap to change anything.`
      : `Best guess: ${nameWord(add.style)}. Not right? The ✦ marks show other likely types. Tap the right one.`);
  } catch(err){
    if(id !== add.scanId) return;
    console.warn(err);
    scanStatus(navigator.onLine === false ? "You're offline, so the photo can't be analysed right now. Pick the details below." : "The photo couldn't be analysed. Pick the details below.");
  }
}
/* "My photo, cleaned": remove the background on this device */
let cutTicket = 0;
async function makeCutout(){
  if(add.cut || !addCanvas) return;
  const t = ++cutTicket, canvas = addCanvas;
  scanStatus("Removing the background…");
  try {
    const scan = await import("./scan.js?v=20");
    const cut = await scan.cutOut(canvas, f => { if(t === cutTicket) scanStatus("Getting the background remover ready (first time only)…", f); });
    if(t !== cutTicket || canvas !== addCanvas) return;
    add.cut = studioFromCutout(cut);
    scanStatus("Background removed.");
  } catch(err){
    console.warn(err);
    if(t === cutTicket) scanStatus("The background couldn't be removed. Your photo will be used as it is.");
  }
  renderPicChoice();
}

$("#add-form").addEventListener("submit", e => {
  e.preventDefault();
  const name = $("#a-name").value.trim();
  if(!name){ $("#add-error").textContent = "Give the piece a name, for example \"Grey hoodie\"."; $("#a-name").focus(); return; }
  const price = parsePrice($("#a-price").value);
  if(!price.ok){ $("#add-error").textContent = "Enter the price as a number, for example 29.95."; $("#a-price").focus(); return; }
  const g = GROUPS.find(x => x.id === add.group) || GROUPS[0];
  const item = {id:"u" + Date.now(), name, cat:g.cat, style:add.style, tone:add.tone,
    brand:$("#a-brand").value.trim(), size:add.size || "", price:price.value, material:add.material || ""};
  const img = add.pic === "photo" ? (add.cut || add.photo) : add.clean;
  if(img) item.img = img;
  item.picMode = add.pic === "photo" ? "photo" : "clean";
  wardrobe.unshift(item);
  if(!saveWardrobe()){ wardrobe.shift(); $("#add-error").textContent = "This device is out of space for photos. Delete an item or use the clean studio picture."; return; }
  $("#add-dialog").close();
  wardCat = g.id; wardSel = item.id; wardMode = "view";
  renderWardrobe();
  toast(`Added ${name} to your wardrobe`);
});

/* ================= Shop ================= */
let shopCat = "all", shopQuery = "", recAll = false, completeAll = false, selectedProductId = null, shopSort = "match";
const shopFilter = {brand:"", colour:"", min:"", max:""};
const SHOP_ORDER = ["shirts","pants","shoes","watches","belts","caps","glasses","jewellery","ties","scarves","gloves","socks"];
const SHOP_TABS = [{id:"all", label:"All"}, ...SHOP_ORDER.map(id => GROUPS.find(g => g.id === id)).filter(g => g && SHOP.some(p => groupOf(p).id === g.id)).map(g => ({id:g.id, label:g.label}))];

/* How many of your pieces a product goes with (used for the badges) */
function goesWith(p){
  if(p.cat === "acc") return wardrobe.filter(w => w.cat !== "acc" && pair(p.tone, w.tone)[0] === 2).length;
  if(p.cat === "shoes") return wardrobe.filter(w => w.cat === "bottom" && shoePair(w, p)[0] === 2).length;
  return wardrobe.filter(w => w.cat !== p.cat && w.cat !== "shoes" && w.cat !== "acc" && pair(p.tone, w.tone)[0] === 2).length;
}
/* The pieces from your wardrobe that go with a product: best one per category, up to 4 */
function wardrobeMatches(p, max = 4){
  const order = p.cat === "top" ? ["pants","shoes","watches","scarves","belts","caps","glasses"]
    : p.cat === "bottom" ? ["shirts","shoes","belts","watches","caps"]
    : p.cat === "shoes" ? ["pants","shirts","socks","belts"]
    : ["shirts","pants","shoes"];
  const out = [];
  for(const gid of order){
    const best = wardrobe.filter(x => groupOf(x).id === gid).map(x => ({x, s: matchScore(p, x)})).filter(o => o.s >= 2.5).sort((a, b) => b.s - a.s)[0];
    if(best) out.push(best.x);
    if(out.length === max) break;
  }
  return out;
}
const matchBadge = (n, long) => n > 0 ? `<span class="match"><i>${icon("check")}</i>${long ? `Matches ${n} item${n === 1 ? "" : "s"}<br>in your wardrobe` : `Matches ${n} item${n === 1 ? "" : "s"}`}</span>` : "";
const favBtn = p => { const liked = wish.includes(p.id); return `<button type="button" class="fav" data-wish="${p.id}" aria-pressed="${liked}" aria-label="${liked ? "Remove from" : "Save to"} wishlist">${icon("heart")}</button>`; };
/* Big card: "Shirts for You" */
function pcardBig(p){
  const m = wardrobeMatches(p);
  return `<div class="pcard big${p.id === selectedProductId ? " selected" : ""}">
    <button type="button" class="ph" data-product="${p.id}" aria-label="View ${esc(p.name)}">${pic(p)}</button>
    ${favBtn(p)}
    <button type="button" class="pinfo" data-product="${p.id}"><span class="nm">${esc(p.name)}</span><span class="shop">${esc(p.shop)}</span><span class="price">€${p.price.toFixed(2)}</span></button>
    <div class="mbox">
      ${m.length ? `<p class="mtitle"><i>${icon("check")}</i>Matches with your wardrobe</p>
        <div class="mprev">${m.map(x => `<span title="${esc(x.name)}">${pic(x)}<small>${GROUP_ONE[groupOf(x).id] || ""}</small></span>`).join("")}</div>`
      : `<p class="mtitle none">No close matches in your wardrobe yet</p>`}
    </div>
    <button type="button" class="btn-view" data-view-outfit="${p.id}">${icon("hanger")}<span>View Outfit</span>${icon("arrow")}</button>
    <button type="button" class="btn-dark" data-addbag="${p.id}">${icon("bag")} Add to Bag</button>
  </div>`;
}
/* Small card: "Complete the Outfit" */
function pcardHTML(p){
  const n = goesWith(p);
  return `<div class="pcard">
    <button type="button" class="ph" data-product="${p.id}" aria-label="View ${esc(p.name)}">${pic(p)}${matchBadge(n)}</button>
    ${favBtn(p)}
    <button type="button" class="pinfo" data-product="${p.id}"><span class="nm">${esc(p.name)}</span><span class="shop">${esc(p.shop)}</span><span class="price">€${p.price.toFixed(2)}</span></button>
    <button type="button" class="btn-dark" data-addbag="${p.id}">${icon("bag")} Add to Bag</button>
  </div>`;
}
function shopMatches(p){
  if(shopCat !== "all" && groupOf(p).id !== shopCat) return false;
  if(shopFilter.brand && p.brand !== shopFilter.brand) return false;
  if(shopFilter.colour && p.tone !== shopFilter.colour) return false;
  const min = numOrEmpty(shopFilter.min), max = numOrEmpty(shopFilter.max);
  if(min !== "" && p.price < min) return false;
  if(max !== "" && p.price > max) return false;
  if(!shopQuery) return true;
  const q = shopQuery.toLowerCase();
  return [p.name, p.shop, p.brand, (TONES[p.tone] || {}).name, groupOf(p).label, (STYLES[p.style] || {}).label].join(" ").toLowerCase().includes(q);
}
function renderShopFilters(){
  const brands = [...new Set(SHOP.map(p => p.brand).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const tones = Object.keys(TONES).filter(k => SHOP.some(p => p.tone === k));
  $("#s-brand").innerHTML = `<option value="">All Brands</option>` + brands.map(b => `<option value="${esc(b)}"${b === shopFilter.brand ? " selected" : ""}>${esc(b)}</option>`).join("");
  $("#s-cat").innerHTML = SHOP_TABS.map(t => `<option value="${t.id}"${t.id === shopCat ? " selected" : ""}>${t.id === "all" ? "All Categories" : t.label}</option>`).join("");
  $("#s-colour").innerHTML = `<option value="">All Colours</option>` + tones.map(k => `<option value="${k}"${k === shopFilter.colour ? " selected" : ""}>${TONES[k].name}</option>`).join("");
  const dot = $("#s-colour-dot");
  dot.classList.toggle("rainbow", !shopFilter.colour);
  dot.style.background = shopFilter.colour ? TONES[shopFilter.colour].hex : "";
  const prices = SHOP.map(p => p.price);
  $("#s-min").placeholder = "Min " + Math.floor(Math.min(...prices));
  $("#s-max").placeholder = "Max " + Math.ceil(Math.max(...prices));
  const n = [shopFilter.brand, shopFilter.colour, String(shopFilter.min).trim() || String(shopFilter.max).trim(), shopCat !== "all"].filter(Boolean).length;
  $("#s-filter-count").textContent = n; $("#s-filter-count").hidden = !n;
  $$("#s-sort [data-ssort]").forEach(b => b.setAttribute("aria-pressed", b.dataset.ssort === shopSort));
}
function renderShopTabs(){
  $("#shop-tabs").innerHTML = SHOP_TABS.map(t => {
    const ic = t.id === "all" ? "all" : t.id;
    return `<button role="tab" type="button" class="cat" data-cat="${t.id}" aria-selected="${t.id === shopCat}">${icon(ic)}<span>${t.label}</span></button>`;
  }).join("");
}
function renderHeroArt(){
  /* Real product photos instead of drawings */
  const ph = ["s5-bomber-jacket","s1-oxford-shirt","s12-suede-boots"];
  $("#hero-art").innerHTML = ph.map((n, i) => `<img class="hp hp${i + 1}" src="img/items/${n}.jpg" alt="">`).join("");
}
function renderShop(){
  renderShopFilters(); renderShopTabs();
  let rec = SHOP.filter(shopMatches).map(p => ({p, m: wardrobeMatches(p).length, n: goesWith(p)}));
  const sorts = {
    match: (a, b) => (a.p.cat === "acc") - (b.p.cat === "acc") || b.m - a.m || b.n - a.n || a.p.price - b.p.price,
    "price-asc": (a, b) => a.p.price - b.p.price,
    "price-desc": (a, b) => b.p.price - a.p.price
  };
  rec.sort(sorts[shopSort]);
  const g = SHOP_TABS.find(t => t.id === shopCat);
  $("#rec-title").textContent = shopQuery ? `Results for “${shopQuery}”` : shopCat === "all" ? "Recommended for You" : `${g.label} for You`;
  $("#shop-items").classList.toggle("grid", recAll);
  $("#rec-all").textContent = recAll ? "Show less" : "See All";
  $("#rec-all").hidden = rec.length <= 4;
  $("#shop-items").innerHTML = rec.length ? (recAll ? rec : rec.slice(0, 8)).map(x => pcardBig(x.p)).join("")
    : `<p class="empty">No products match your filters. <button type="button" class="link" data-shop-clear>Clear filters</button></p>`;

  const base = SHOP.find(p => p.id === selectedProductId) || (rec[0] && rec[0].p);
  $("#complete-wrap").hidden = !base;
  if(base){
    const others = SHOP.filter(p => p.id !== base.id && groupOf(p).id !== groupOf(base).id)
      .map(p => ({p, s: matchScore(base, p)})).sort((a, b) => b.s - a.s);
    $("#complete-sub").textContent = `Items that go well with the ${base.name.toLowerCase()}`;
    $("#complete-items").classList.toggle("grid", completeAll);
    $("#complete-all").textContent = completeAll ? "Show less" : "See All";
    $("#complete-items").innerHTML = (completeAll ? others.slice(0, 12) : others.slice(0, 6)).map(x => pcardHTML(x.p)).join("");
  }
}
renderHeroArt();
function setShopCat(id){
  shopCat = id; recAll = false; renderShop();
  const nb = $(`#shop-tabs [data-cat="${shopCat}"]`); if(nb) nb.scrollIntoView({block:"nearest", inline:"nearest"});
}
$("#shop-tabs").addEventListener("click", e => { const b = e.target.closest("button"); if(b) setShopCat(b.dataset.cat); });
$("#s-cat").addEventListener("change", e => setShopCat(e.target.value));
$("#s-brand").addEventListener("change", e => { shopFilter.brand = e.target.value; renderShop(); });
$("#s-colour").addEventListener("change", e => { shopFilter.colour = e.target.value; renderShop(); });
$("#s-min").addEventListener("input", e => { shopFilter.min = e.target.value; renderShop(); });
$("#s-max").addEventListener("input", e => { shopFilter.max = e.target.value; renderShop(); });
function clearShopFilters(){
  Object.assign(shopFilter, {brand:"", colour:"", min:"", max:""}); shopCat = "all"; shopQuery = "";
  $("#s-min").value = ""; $("#s-max").value = ""; $("#shop-q").value = "";
  renderShop();
}
$("#s-sort-btn").addEventListener("click", () => togglePop($("#s-sort-btn"), $("#s-sort")));
$("#s-sort").addEventListener("click", e => {
  const s = e.target.closest("[data-ssort]");
  if(s){ shopSort = s.dataset.ssort; renderShop(); }
  if(e.target.closest("#s-clear")) clearShopFilters();
  togglePop($("#s-sort-btn"), $("#s-sort"), false);
});
$("#rec-all").addEventListener("click", () => { recAll = !recAll; renderShop(); });
$("#complete-all").addEventListener("click", () => { completeAll = !completeAll; renderShop(); });
$("#explore").addEventListener("click", () => { recAll = true; renderShop(); $("#rec-head").scrollIntoView({behavior:"smooth", block:"start"}); });
$("#open-search").addEventListener("click", () => {
  const s = $("#shop-search"); s.hidden = !s.hidden;
  if(!s.hidden) $("#shop-q").focus(); else { shopQuery = ""; $("#shop-q").value = ""; renderShop(); }
});
$("#shop-q").addEventListener("input", e => { shopQuery = e.target.value.trim(); renderShop(); });

function toggleWish(id){
  wish = wish.includes(id) ? wish.filter(x => x !== id) : [...wish, id];
  store.set("mm-wish", wish);
  const p = SHOP.find(x => x.id === id);
  toast(wish.includes(id) ? `Saved ${p.name} to your wishlist` : `Removed ${p.name} from your wishlist`);
  return wish.includes(id);
}
/* View Outfit: the product goes on the Outfit Board with matching pieces from your wardrobe */
function viewOutfit(p){
  selectedProductId = p.id;
  buildOutfitAround(p);
  location.hash = "#outfits";
  toast(`${p.name} is on your Outfit Board`);
}
/* Product cards anywhere in the shop */
document.addEventListener("click", e => {
  if(!e.target.closest("#page-shop")) return;
  if(e.target.closest("[data-shop-clear]")){ clearShopFilters(); return; }
  const w = e.target.closest("[data-wish]");
  if(w){ const on = toggleWish(w.dataset.wish); w.setAttribute("aria-pressed", on); return; }
  const vo = e.target.closest("[data-view-outfit]");
  if(vo){ viewOutfit(SHOP.find(x => x.id === vo.dataset.viewOutfit)); return; }
  const a = e.target.closest("[data-addbag]");
  if(a){
    const p = SHOP.find(x => x.id === a.dataset.addbag);
    addToBag(p, p.tone, defaultSize(p));
    if(selectedProductId !== p.id && p.cat !== "acc"){ selectedProductId = p.id; setTimeout(renderShop, 1500); }
    a.classList.add("added"); a.innerHTML = `${icon("check")} Added`;
    setTimeout(() => { a.classList.remove("added"); a.innerHTML = `${icon("bag")} Add to Bag`; }, 1400);
    return;
  }
  const v = e.target.closest("[data-product]");
  if(v) location.hash = "#product/" + v.dataset.product;
});

/* ================= Product page ================= */
let pd = {id:null, tone:null, size:null};
function colourOptions(p){
  const base = {top:["white","lightblue","navy","black","olive"], bottom:["black","navy","beige","grey","blue"], shoes:["white","black","brown"], acc:["black","brown","silver","gold"]}[p.cat];
  return [...new Set([p.tone, ...base])].slice(0, 5);
}
function sizeOptions(p){
  return {top:["S","M","L","XL","XXL"], bottom:["W28","W30","W32","W34","W36"], shoes:["40","41","42","43","44","45"], acc:["One size"]}[p.cat];
}
function defaultSize(p){
  const list = sizeOptions(p);
  const mine = p.cat === "top" ? profile.shirt : p.cat === "bottom" ? profile.pantWaist : p.cat === "shoes" ? String(Math.round(Number(profile.shoe) || 0)) : "One size";
  return list.includes(mine) ? mine : list[Math.min(1, list.length - 1)];
}
const sizeText = (p, s) => p.cat === "shoes" ? "EU " + s : s;
function whyLines(v, n, size){
  const f = formality(v), lines = [];
  lines.push(n > 0 ? `Matches ${n} piece${n === 1 ? "" : "s"} in your wardrobe` : "Brings a new colour into your wardrobe");
  lines.push(["Works for casual, college and weekend looks", "Works for casual, college and smart looks", "Works for smart, work and evening looks"][f] || "Works for many looks");
  if(STYLES[v.style] && STYLES[v.style].warm) lines.push("Keeps you warm on colder days");
  else if((TONES[v.tone] || {}).neutral) lines.push("A versatile essential for year-round use");
  else lines.push("Adds a pop of colour to neutral outfits");
  if(size === defaultSize(v) && v.cat !== "acc") lines.push(`Available in your size (${sizeText(v, size)})`);
  return lines;
}
function renderProduct(id){
  const p = SHOP.find(x => x.id === id); if(!p) return;
  if(pd.id !== id) pd = {id, tone:p.tone, size:defaultSize(p)};
  selectedProductId = id;
  const v = {...p, tone:pd.tone}, n = goesWith(v), cols = colourOptions(p), liked = wish.includes(id);
  $("#product-like").setAttribute("aria-pressed", liked);
  $("#product-like").classList.toggle("liked", liked);
  $("#product-body").innerHTML = `
    <div class="pd">
      <div class="pd-media">
        ${pic(v)}
        ${matchBadge(n, true)}
        <div class="dots" aria-hidden="true">${cols.map(c => `<i class="${c === pd.tone ? "on" : ""}"></i>`).join("")}</div>
      </div>
      <div class="pd-info">
        <div class="pd-title"><h1>${esc(p.name)}</h1><span class="price">€${p.price.toFixed(2)}</span></div>
        <button type="button" class="pd-shop" data-partner>${esc(p.shop)} ${icon("ext")}</button>

        <h3>Available Colours</h3>
        <div class="colours" role="group" aria-label="Colour">${cols.map(c => `<button type="button" data-tone="${c}" aria-pressed="${c === pd.tone}" aria-label="${TONES[c].name}" title="${TONES[c].name}" style="background:${TONES[c].hex}"></button>`).join("")}</div>

        <div class="pd-row"><h3>Sizes</h3>${p.cat !== "acc" ? `<button type="button" class="size-guide" data-size-guide>${icon("ruler")} Size Guide</button>` : ""}</div>
        <div class="sizes" role="group" aria-label="Size">${sizeOptions(p).map(s => `<button type="button" data-size="${s}" aria-pressed="${s === pd.size}">${s}</button>`).join("")}</div>

        <div class="why">
          <h3>${icon("sparkle")} Why this fits you</h3>
          <ul>${whyLines(v, n, pd.size).map(l => `<li>${icon("check")}<span>${esc(l)}</span></li>`).join("")}</ul>
        </div>

        <div class="pd-actions">
          <button type="button" class="btn-dark" data-pd-bag>${icon("bag")} Add to Bag</button>
          <button type="button" class="btn-outline" data-partner>Demo shop (not a real store) ${icon("ext")}</button>
        </div>
        <p class="pd-try"><button type="button" class="link" data-pd-try>Try it on your Outfit Board</button></p>
      </div>
    </div>`;
}
$("#product-body").addEventListener("click", e => {
  const p = SHOP.find(x => x.id === pd.id); if(!p) return;
  const t = e.target.closest("[data-tone]"); if(t){ pd.tone = t.dataset.tone; renderProduct(p.id); return; }
  const s = e.target.closest("[data-size]"); if(s){ pd.size = s.dataset.size; renderProduct(p.id); return; }
  if(e.target.closest("[data-size-guide]")){ openSizeGuide(p); return; }
  if(e.target.closest("[data-partner]")){ toast(`This is a demo shop. Nothing is sold in this prototype.`); return; }
  if(e.target.closest("[data-pd-bag]")){ addToBag(p, pd.tone, pd.size); return; }
  if(e.target.closest("[data-pd-try]")){
    const v = {...p, tone:pd.tone};
    buildOutfitAround(v);
    location.hash = "#outfits"; toast(`${p.name} is on your Outfit Board`);
  }
});
$("#product-back").addEventListener("click", () => { if(movedInApp && history.length > 1) history.back(); else location.hash = "#shop"; });
$("#product-like").addEventListener("click", () => { if(!pd.id) return; const on = toggleWish(pd.id); $("#product-like").setAttribute("aria-pressed", on); $("#product-like").classList.toggle("liked", on); });
$("#product-share").addEventListener("click", async () => {
  const p = SHOP.find(x => x.id === pd.id); if(!p) return;
  const text = `${p.name} – €${p.price.toFixed(2)} at ${p.shop} (via Outfit Match-maker)`;
  try {
    if(navigator.share){ await navigator.share({title:p.name, text}); return; }
    await navigator.clipboard.writeText(text); toast("Product details copied");
  } catch(err){ if(err && err.name !== "AbortError") toast("Sharing isn't available here"); }
});
function openSizeGuide(p){
  const rows = [["Shirt / T-shirt", profile.shirt], ["Pants", [profile.pantWaist, profile.pantLength].filter(Boolean).join(" ")], ["Shoes", profile.shoe ? "EU " + profile.shoe : ""], ["Chest", profile.chest ? profile.chest + " cm" : ""], ["Waist", profile.waist ? profile.waist + " cm" : ""]];
  $("#size-body").innerHTML = `<p class="muted small">Your sizes from your profile. Pick the same size here for the best fit.</p>
    <table class="size-table">${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v ? esc(v) : `<a href="#profile" data-close>Add</a>`}</td></tr>`).join("")}</table>`;
  $("#size-dialog").showModal();
}

/* ================= Bag ================= */
function updateBagCount(){
  const n = bag.length;
  ["#bag-count", "#bag-count-2"].forEach(s => { const el = $(s); el.textContent = n; el.hidden = n === 0; });
}
function addToBag(p, tone, size){
  bag.push({key: p.id + "-" + tone + "-" + size + "-" + Date.now(), id:p.id, tone, size});
  store.set("mm-bag", bag); updateBagCount();
  toast(`Added ${p.name} to your bag`);
}
function renderBag(){
  const items = bag.map(b => ({b, p: SHOP.find(x => x.id === b.id)})).filter(x => x.p);
  const total = items.reduce((s, x) => s + x.p.price, 0);
  $("#bag-body").innerHTML = `
    <div class="ip-top"><h2 id="bag-title">Your Bag</h2><button type="button" class="icon-btn" data-close aria-label="Close">${icon("x")}</button></div>
    ${items.length ? `<ul class="bag-list">${items.map(({b, p}) => `
      <li class="bag-item">${pic({...p, tone:b.tone})}
        <div class="bi"><strong>${esc(p.name)}</strong><span>${esc(p.shop)} · ${TONES[b.tone].name} · ${esc(sizeText(p, b.size))}</span></div>
        <span class="bp">€${p.price.toFixed(2)}</span>
        <button type="button" class="icon-btn" data-unbag="${b.key}" aria-label="Remove ${esc(p.name)}">${icon("x")}</button>
      </li>`).join("")}</ul>
      <div class="bag-total"><span>Total</span><span>€${total.toFixed(2)}</span></div>
      <div class="bag-foot">
        <button type="button" class="btn-dark" data-checkout>Demo only – no checkout</button>
        <p class="muted small" style="text-align:center;margin:0">This is a student prototype. Nothing is sold and no payment is taken.</p>
      </div>`
    : `<div style="padding:24px 20px"><p class="empty">Your bag is empty.</p><p style="text-align:center;margin-top:14px"><a class="btn-dark" href="#shop" data-close>Browse the Shop</a></p></div>`}`;
}
function openBag(){ renderBag(); $("#bag-dialog").showModal(); }
$("#open-bag").addEventListener("click", openBag);
$("#product-bag").addEventListener("click", openBag);
$("#bag-dialog").addEventListener("click", e => {
  if(e.target === $("#bag-dialog")){ $("#bag-dialog").close(); return; }
  const r = e.target.closest("[data-unbag]");
  if(r){ bag = bag.filter(b => b.key !== r.dataset.unbag); store.set("mm-bag", bag); updateBagCount(); renderBag(); return; }
  if(e.target.closest("[data-checkout]")) toast("Demo only – nothing is sold in this prototype");
});


/* ================= Profile ================= */
const range = (a, b, step = 1, f = x => x) => { const r = []; for(let i = a; i <= b; i += step) r.push(f(i)); return r; };
const LETTER = ["XS","S","M","L","XL","XXL","3XL"];
const STYLE_PREFS = ["Casual","Smart casual","Formal / business","Streetwear","Minimal","Sporty / athleisure","Classic","Trendy"];
const BODY_FAT = [
  {v:"8–12%",  w:20, abs:true,  d:"Very lean. Visible abs and muscle lines."},
  {v:"13–17%", w:23, abs:true,  d:"Fit. Abs faintly visible, flat stomach."},
  {v:"18–22%", w:26, abs:false, d:"Average. No visible abs, slight softness."},
  {v:"23–27%", w:30, abs:false, d:"Soft stomach and some love handles."},
  {v:"28%+",   w:34, abs:false, d:"Rounder stomach and fuller waist."}
];
const PROFILE_SECTIONS = [
  {id:"personal", title:"Personal details", desc:"Who you are and the styles you like.", icon:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>', fields:[
    {key:"name", label:"Name", req:true, type:"text"},
    {key:"age", label:"Age", req:true, type:"number", min:14, max:99, unit:"years"},
    {key:"city", label:"City", type:"text"},
    {key:"country", label:"Country", type:"text"},
    {key:"prefs", label:"Style preferences", req:true, type:"chips", wide:true, options:STYLE_PREFS, note:"Pick from the list, or type your own and press Enter. Remove one with ×."}
  ]},
  {id:"body", title:"Body data", desc:"Helps the app judge fit and proportions.", icon:'<path d="M12 3v18"/><path d="M8 7h8M8 12h8M8 17h8"/>', fields:[
    {key:"height", label:"Height", req:true, type:"number", min:120, max:230, unit:"cm"},
    {key:"weight", label:"Weight", req:true, type:"number", min:35, max:250, unit:"kg"},
    {key:"bodyFat", label:"Body fat", type:"seg", info:true, wide:true, options:BODY_FAT.map(b => b.v), hint:"Not sure? Open the guide to compare body shapes."}
  ]},
  {id:"sizes", title:"Clothing sizes", desc:"The sizes you usually buy.", icon:'<path d="M8 4 4 7l2 4 2-1v10h8V10l2 1 2-4-4-3c0 2-2 3-4 3S8 6 8 4Z"/>', fields:[
    {key:"shirt", label:"Shirt / T-shirt", req:true, type:"seg", wide:true, options:LETTER},
    {key:"jacket", label:"Jacket / coat", type:"seg", wide:true, options:LETTER},
    {key:"pantWaist", label:"Pant size: waist", req:true, type:"select", options:range(26,44,1,x => "W" + x)},
    {key:"pantLength", label:"Pant size: length", req:true, type:"select", options:range(28,36,1,x => "L" + x)},
    {key:"shoe", label:"Shoe size (EU)", req:true, type:"select", options:range(38,48,.5,x => String(x))},
    {key:"inner", label:"Innerwear", type:"seg", wide:true, options:LETTER},
    {key:"fit", label:"Preferred fit", type:"seg", wide:true, options:["Slim","Regular","Loose"]}
  ]},
  {id:"measure", title:"Body measurements", desc:"Use a soft measuring tape. Stand straight and keep it snug, not tight.", icon:'<rect x="3" y="8" width="18" height="8" rx="1"/><path d="M7 8v3M11 8v4M15 8v3M19 8v4"/>', fields:[
    {key:"chest", label:"Chest", type:"number", min:70, max:160, unit:"cm", hint:"Around the fullest part of your chest, under your arms."},
    {key:"waist", label:"Waist", type:"number", min:55, max:160, unit:"cm", hint:"Around your natural waist, just above the belly button."},
    {key:"hips", label:"Hips", type:"number", min:70, max:170, unit:"cm", hint:"Around the widest part of your hips."},
    {key:"shoulder", label:"Shoulder width", type:"number", min:30, max:65, unit:"cm", hint:"Across your back, from one shoulder edge to the other."},
    {key:"sleeve", label:"Sleeve length", type:"number", min:45, max:80, unit:"cm", hint:"From the shoulder edge to the wrist, arm relaxed."},
    {key:"neck", label:"Neck", type:"number", min:30, max:55, unit:"cm", hint:"Around the base of your neck, where a shirt collar sits."},
    {key:"inseam", label:"Inside leg (inseam)", type:"number", min:55, max:100, unit:"cm", hint:"From the crotch down to the ankle, on the inside of the leg."}
  ]}
];
const ALL_FIELDS = PROFILE_SECTIONS.flatMap(s => s.fields);
let pPrefs = [...(profile.prefs || [])];

const isEmpty = v => v === undefined || v === null || (Array.isArray(v) ? v.length === 0 : String(v).trim() === "");
function missingFields(p = profile){ return ALL_FIELDS.filter(f => isEmpty(p[f.key])); }

function bodySVG(b){
  const w = b.w, top = 30, ch = 46, wy = 92, hy = 118;
  const abs = b.abs ? `<g stroke="#000" stroke-width="1" opacity=".5"><line x1="50" y1="${ch+8}" x2="50" y2="${wy+4}"/><line x1="42" y1="${ch+18}" x2="58" y2="${ch+18}"/><line x1="42" y1="${ch+30}" x2="58" y2="${ch+30}"/><line x1="43" y1="${ch+42}" x2="57" y2="${ch+42}"/></g>` : "";
  const belly = w >= 30 ? `<path d="M${50-w+6} ${wy-6} Q50 ${wy+10} ${50+w-6} ${wy-6}" fill="none" stroke="#000" stroke-width="1" opacity=".4"/>` : "";
  return `<svg viewBox="0 0 100 130" aria-hidden="true"><circle cx="50" cy="14" r="10" fill="none" stroke="#000" stroke-width="1.5"/>
    <path d="M44 24 L44 ${top} Q20 ${top} 14 ${top+6} L12 ${ch} Q${50-w-2} ${ch+16} ${50-w} ${wy} L${50-w-2} ${hy} L${50+w+2} ${hy} L${50+w} ${wy} Q${50+w+2} ${ch+16} 88 ${ch} L86 ${top+6} Q80 ${top} 56 ${top} L56 24" fill="none" stroke="#000" stroke-width="1.5" stroke-linejoin="round"/>${abs}${belly}</svg>`;
}

let segVals = {};
function renderProfile(){
  pPrefs = [...(profile.prefs || [])];
  segVals = {};
  ALL_FIELDS.filter(f => f.type === "seg").forEach(f => segVals[f.key] = profile[f.key] || "");
  $("#pp-jump").innerHTML = PROFILE_SECTIONS.map(sec => `<a href="#sec-${sec.id}" data-jump="sec-${sec.id}">${sec.title}</a>`).join("") + `<a href="#sec-skin" data-jump="sec-skin">Skin tone</a>`;
  $("#p-fields").innerHTML = PROFILE_SECTIONS.map(sec => `
    <section class="ps" id="sec-${sec.id}">
      <div class="ps-side">
        <span class="ps-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${sec.icon}</svg></span>
        <h2>${sec.title}</h2>
        <p class="muted small">${sec.desc}</p>
        <p class="ps-count small" data-count="${sec.id}"></p>
      </div>
      <div class="ps-card"><div class="ps-grid">${sec.fields.map(f => fieldHTML(f)).join("")}</div></div>
    </section>`).join("");
  renderPrefs();
  applyProfile();
}
const reqTag = f => f.req ? ` <span class="req-tag">(required)</span>` : "";
function fieldHTML(f){
  const id = "p-" + f.key, val = profile[f.key] ?? "";
  const wide = f.wide ? " wide" : "";
  if(f.type === "chips"){
    return `<div class="pf${wide}"><span class="pf-label" id="${id}-label">${f.label}${reqTag(f)}</span>
      <div class="combo" id="pref-combo">
        <div class="box"><input id="pref-input" role="combobox" aria-expanded="false" aria-controls="pref-list" aria-autocomplete="list" autocomplete="off" placeholder="Choose a style or type your own" aria-labelledby="${id}-label" maxlength="40"><span class="chev" aria-hidden="true"></span></div>
        <ul class="combo-list" id="pref-list" role="listbox" hidden></ul>
      </div>
      <div class="tags" id="pref-tags" aria-live="polite"></div>
      <p class="hint">${f.note}</p></div>`;
  }
  if(f.type === "seg"){
    return `<div class="pf${wide}"><span class="pf-label" id="${id}-label">${f.label}${reqTag(f)}${f.info ? ` <button type="button" class="info" id="fat-info" aria-label="Open body fat guide">i</button>` : ""}</span>
      <div class="seg" id="${id}" role="radiogroup" aria-labelledby="${id}-label">${f.options.map(o => `<button type="button" role="radio" data-seg="${f.key}" data-val="${esc(o)}" aria-checked="${String(val) === String(o)}">${esc(o)}</button>`).join("")}</div>
      ${f.hint ? `<p class="hint">${f.hint}</p>` : ""}</div>`;
  }
  let input;
  if(f.type === "select"){
    input = `<select id="${id}"><option value="">Select</option>${f.options.map(o => `<option ${String(val) === String(o) ? "selected" : ""}>${o}</option>`).join("")}</select>`;
  } else {
    input = `<input id="${id}" type="${f.type === "number" ? "text" : f.type}" ${f.type === "number" ? 'inputmode="decimal"' : ""} value="${esc(val)}" placeholder="${f.type === "number" ? "–" : ""}" aria-describedby="${id}-err${f.hint ? " " + id + "-hint" : ""}">`;
  }
  return `<div class="pf${wide}">
    <label class="pf-label" for="${id}">${f.label}${reqTag(f)}</label>
    <div class="box${f.unit ? " has-unit" : ""}">${input}${f.unit ? `<span class="u">${f.unit}</span>` : ""}</div>
    ${f.hint ? `<p class="hint" id="${id}-hint">${f.hint}</p>` : ""}
    <p class="err" id="${id}-err"></p>
  </div>`;
}
function renderPrefs(){
  if(!$("#pref-tags")) return;
  $("#pref-tags").innerHTML = pPrefs.length
    ? pPrefs.map(p => `<span class="tag">${esc(p)}<button type="button" data-unpref="${esc(p)}" aria-label="Remove ${esc(p)}">×</button></span>`).join("")
    : `<span class="muted small">No styles added yet.</span>`;
}
function addPref(v){
  v = (v || "").trim().replace(/\s+/g, " ");
  if(!v) return false;
  if(pPrefs.some(p => p.toLowerCase() === v.toLowerCase())){ toast(`${v} is already added`); return false; }
  pPrefs.push(v); renderPrefs(); return true;
}
function applyProfile(){
  const name = profile.name || "there";
  $("#pp-avatar").textContent = (profile.name || "?").charAt(0).toUpperCase();
  $("#pp-name").textContent = profile.name || "My profile";
  $("#pp-sub").textContent = [profile.age && profile.age + " years", profile.city, profile.country].filter(Boolean).join(" · ") || "All details are optional. The more you add, the better the app can style you.";
  const h = new Date().getHours();
  $("#greeting").textContent = `${h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening"}, ${name} 👋`;
  const miss = missingFields(), total = ALL_FIELDS.length, done = total - miss.length, pct = Math.round(done / total * 100);
  $("#pp-ring").style.setProperty("--p", pct);
  $("#pp-pct").textContent = pct + "%";
  $("#p-progress-text").textContent = miss.length ? `${done} of ${total} details` : "Profile complete";
  PROFILE_SECTIONS.forEach(sec => {
    const el = document.querySelector(`[data-count="${sec.id}"]`); if(!el) return;
    const n = sec.fields.filter(f => !isEmpty(profile[f.key])).length;
    el.textContent = `${n} of ${sec.fields.length} filled`;
    el.classList.toggle("done", n === sec.fields.length);
  });
  $("#profile-nudge").hidden = true;
}
/* Key details for fit: when any is missing, Home shows a nudge and the app asks once per visit */
function needsDetails(){ return ["height","weight","shirt","pantWaist","shoe","chest","waist"].some(k => isEmpty(profile[k])); }
function readForm(){
  const out = {prefs:[...pPrefs], ...segVals}, errors = [];
  ALL_FIELDS.filter(f => f.type !== "chips" && f.type !== "seg").forEach(f => {
    const el = $("#p-" + f.key), err = $("#p-" + f.key + "-err");
    let v = el.value.trim();
    err.textContent = ""; el.removeAttribute("aria-invalid"); el.parentElement.classList.remove("bad");
    if(v !== "" && f.type === "number"){
      const n = Number(v.replace(",", "."));
      if(isNaN(n) || n < f.min || n > f.max){
        err.textContent = `Enter a number between ${f.min} and ${f.max}${f.unit ? " " + f.unit : ""}.`;
        el.setAttribute("aria-invalid","true"); el.parentElement.classList.add("bad"); errors.push(el);
      } else v = String(n);
    }
    out[f.key] = v;
  });
  return {out, errors};
}
$("#p-fields").addEventListener("click", e => {
  const un = e.target.closest("[data-unpref]");
  if(un){ pPrefs = pPrefs.filter(x => x !== un.dataset.unpref); renderPrefs(); $("#pref-input").focus(); return; }

  const sg = e.target.closest("[data-seg]");
  if(sg){
    const k = sg.dataset.seg, v = sg.dataset.val;
    segVals[k] = segVals[k] === v ? "" : v;
    $$(`[data-seg="${k}"]`).forEach(x => x.setAttribute("aria-checked", x.dataset.val === segVals[k]));
    return;
  }
  if(e.target.closest("#fat-info")) openFatGuide();
});

/* Style preference combobox: pick from list or type your own */
let comboItems = [], comboActive = -1;
function comboOpen(){
  const inp = $("#pref-input"), list = $("#pref-list");
  const q = inp.value.trim(), ql = q.toLowerCase();
  const left = STYLE_PREFS.filter(o => !pPrefs.includes(o) && o.toLowerCase().includes(ql));
  const exact = [...STYLE_PREFS, ...pPrefs].some(o => o.toLowerCase() === ql);
  comboItems = left.map(o => ({value:o, label:esc(o)}));
  if(q && !exact) comboItems.push({value:q, label:`<span class="add-own">+ Add “${esc(q)}”</span>`, custom:true});
  if(!comboItems.length){
    list.innerHTML = `<li class="combo-empty">${q ? "Already added" : "All styles added. Type your own."}</li>`;
  } else {
    if(comboActive >= comboItems.length) comboActive = comboItems.length - 1;
    list.innerHTML = comboItems.map((it, i) => `<li role="option" id="pref-opt-${i}" data-i="${i}" aria-selected="${i === comboActive}">${it.label}</li>`).join("");
  }
  list.hidden = false; inp.setAttribute("aria-expanded","true");
  if(comboActive >= 0) inp.setAttribute("aria-activedescendant","pref-opt-" + comboActive); else inp.removeAttribute("aria-activedescendant");
}
function comboClose(){
  const list = $("#pref-list"), inp = $("#pref-input"); if(!list) return;
  list.hidden = true; inp.setAttribute("aria-expanded","false"); inp.removeAttribute("aria-activedescendant"); comboActive = -1;
}
function comboPick(i){
  const it = comboItems[i]; if(!it) return;
  if(addPref(it.value)){ $("#pref-input").value = ""; }
  comboActive = -1; comboOpen(); $("#pref-input").focus();
}
$("#p-fields").addEventListener("focusin", e => { if(e.target.id === "pref-input") comboOpen(); });
$("#p-fields").addEventListener("input", e => { if(e.target.id === "pref-input"){ comboActive = e.target.value.trim() ? 0 : -1; comboOpen(); } });
$("#p-fields").addEventListener("mousedown", e => {
  const li = e.target.closest("#pref-list [data-i]");
  if(li){ e.preventDefault(); comboPick(+li.dataset.i); }
  if(e.target.closest("#pref-combo .chev")){ e.preventDefault(); const l = $("#pref-list"); l.hidden ? ($("#pref-input").focus(), comboOpen()) : comboClose(); }
});
$("#p-fields").addEventListener("keydown", e => {
  if(e.target.id !== "pref-input") return;
  if(e.key === "ArrowDown"){ e.preventDefault(); if($("#pref-list").hidden) comboOpen(); comboActive = Math.min(comboActive + 1, comboItems.length - 1); comboOpen(); }
  else if(e.key === "ArrowUp"){ e.preventDefault(); comboActive = Math.max(comboActive - 1, 0); comboOpen(); }
  else if(e.key === "Enter"){
    e.preventDefault();
    if(comboActive >= 0) comboPick(comboActive);
    else if(e.target.value.trim()){ if(addPref(e.target.value)) e.target.value = ""; comboOpen(); }
  }
  else if(e.key === "Escape"){ comboClose(); }
});
document.addEventListener("click", e => { if(!e.target.closest("#pref-combo")) comboClose(); });
$("#pp-jump").addEventListener("click", e => {
  const a = e.target.closest("[data-jump]"); if(!a) return;
  e.preventDefault();
  document.getElementById(a.dataset.jump).scrollIntoView({behavior: matchMedia("(prefers-reduced-motion:reduce)").matches ? "auto" : "smooth", block:"start"});
});

/* Body fat guide */
function openFatGuide(){
  const cur = segVals.bodyFat;
  $("#fat-grid").innerHTML = BODY_FAT.map(b => `<button type="button" data-fat="${b.v}" aria-pressed="${cur === b.v}">${bodySVG(b)}<strong>${b.v}</strong><span>${b.d}</span></button>`).join("");
  $("#fat-dialog").showModal();
}
$("#fat-grid").addEventListener("click", e => {
  const b = e.target.closest("[data-fat]"); if(!b) return;
  segVals.bodyFat = b.dataset.fat;
  $$('[data-seg="bodyFat"]').forEach(x => x.setAttribute("aria-checked", x.dataset.val === segVals.bodyFat));
  $("#fat-dialog").close();
  const sel = document.querySelector('[data-seg="bodyFat"][aria-checked="true"]'); if(sel) sel.focus();
  toast(`Body fat set to ${b.dataset.fat}. Save your profile to keep it.`);
});
$("#fat-close").addEventListener("click", () => $("#fat-dialog").close());

$("#profile-form").addEventListener("submit", e => {
  e.preventDefault();
  const {out, errors} = readForm();
  if(errors.length){
    $("#p-saved").textContent = "Some values look wrong. Check the fields marked in red.";
    errors[0].focus(); return;
  }
  profile = {...profile, ...out};
  store.set("mm-profile", profile);
  applyProfile(); renderShop(); aiOutfits = [];
  const miss = missingFields();
  $("#p-saved").textContent = miss.length ? `Profile saved. ${miss.length} detail${miss.length === 1 ? " is" : "s are"} still empty.` : "Profile saved. Everything is filled in.";
  toast("Profile saved");
});

/* Ask for details when key details are missing — only on the Profile page, once per visit */
function askForDetails(){
  if($("#main").dataset.page !== "profile" || !needsDetails()) return;
  let asked = false;
  try { asked = sessionStorage.getItem("mm-asked") === "1"; } catch(e){}
  if(asked) return;
  $("#ask-missing").textContent = `${missingFields().length} of ${ALL_FIELDS.length} details are still empty.`;
  $("#ask-dialog").showModal();
  try { sessionStorage.setItem("mm-asked","1"); } catch(e){}
}
$("#ask-later").addEventListener("click", () => $("#ask-dialog").close());
$("#ask-go").addEventListener("click", () => {
  $("#ask-dialog").close();
  setTimeout(() => { const first = missingFields().find(f => f.type !== "chips" && f.type !== "seg"); if(first) $("#p-" + first.key).focus(); }, 50);
});
$("#reset").addEventListener("click", () => {
  if(!confirm("Reset your wardrobe and profile to the demo data?")) return;
  try { localStorage.removeItem("mm-wardrobe"); localStorage.removeItem("mm-profile"); localStorage.removeItem("mm-bag"); } catch(e){}
  location.reload();
});


/* ================= Style insights ================= */
function insightsHTML(){
  const n = wardrobe.length; if(!n) return `<p class="empty">Add clothes to your wardrobe to see insights.</p>`;
  const pct = k => Math.round(k / n * 100);
  const neutral = wardrobe.filter(x => (TONES[x.tone] || {}).neutral).length;
  const tones = {}; wardrobe.forEach(x => tones[x.tone] = (tones[x.tone] || 0) + 1);
  const topTones = Object.entries(tones).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const groups = {}; wardrobe.forEach(x => { const g = groupOf(x).label; groups[g] = (groups[g] || 0) + 1; });
  const topGroups = Object.entries(groups).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const brands = {}; wardrobe.forEach(x => { if(x.brand) brands[x.brand] = (brands[x.brand] || 0) + 1; });
  const fav = Object.entries(brands).sort((a, b) => b[1] - a[1])[0];
  const value = wardrobe.reduce((s, x) => s + (Number(x.price) || 0), 0);
  const tops = wardrobe.filter(x => x.cat === "top"), bottoms = wardrobe.filter(x => x.cat === "bottom"), shoes = wardrobe.filter(x => x.cat === "shoes");
  const tips = [];
  if(tops.filter(x => (TONES[x.tone] || {}).light).length < 2) tips.push(`You have few light tops. A white or light blue shirt would add about ${bottoms.length * shoes.length} new outfits.`);
  if(pct(neutral) > 70) tips.push("Your wardrobe is mostly neutral. One coloured piece (olive, burgundy) would make outfits stand out.");
  if(!wardrobe.some(x => x.style === "loafers" || x.style === "trousers")) tips.push("Add smart trousers or loafers for interviews and formal events.");
  if(shoes.length < 3) tips.push("More shoe options would multiply your outfit combinations.");
  if(!tips.length) tips.push(`Nice balance! Your ${tops.length} tops, ${bottoms.length} bottoms and ${shoes.length} shoes make ${tops.length * bottoms.length * shoes.length} outfits.`);
  return `<div class="ins-stats">
      <div><strong>${n}</strong><span>pieces</span></div>
      <div><strong>${tops.length * bottoms.length * shoes.length}</strong><span>possible outfits</span></div>
      <div><strong>€${Math.round(value)}</strong><span>wardrobe value</span></div>
    </div>
    <h3 class="ins-h">Colour mix <span class="muted small">${pct(neutral)}% neutrals</span></h3>
    <div class="ins-bar">${topTones.map(([t, c]) => `<i style="flex:${c};background:${(TONES[t] || {}).hex}" title="${(TONES[t] || {}).name}"></i>`).join("")}</div>
    <p class="muted small">${topTones.map(([t, c]) => `${(TONES[t] || {}).name} ${pct(c)}%`).join(" · ")}</p>
    <h3 class="ins-h">Most owned</h3>
    <ul class="ins-list">${topGroups.map(([g, c]) => `<li><span>${g}</span><b>${c}</b></li>`).join("")}${fav ? `<li><span>Favourite brand</span><b>${esc(fav[0])}</b></li>` : ""}</ul>
    <h3 class="ins-h">Recommendations</h3>
    <ul class="yo-why">${tips.slice(0, 3).map(t => `<li>${icon("check")}<span>${esc(t)}</span></li>`).join("")}</ul>
    <a class="btn-primary ins-shop" href="#shop" data-close>Find matching items in the Shop ${icon("arrow")}</a>`;
}
$("#open-insights").addEventListener("click", () => { $("#insights-body").innerHTML = insightsHTML(); $("#insights-dialog").showModal(); });

/* ================= Start ================= */
renderProfile();
updateCounts();
updateBagCount();
route();
