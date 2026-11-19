/* Studio pictures: every piece in the wardrobe gets a clean product photo on the same background.
   - Clean studio picture: a template photo of that clothing type, recoloured to the piece's colour.
   - My photo, cleaned: the user's own photo with the background removed, centred on the studio background. */

/* Extra template photos, one per clothing type that has no sample product (made in Canva). */
const TEMPLATE_EXTRA = ["henley","tank","sweater","cardigan","turtleneck","ziphoodie","sweatshirt","denimjacket","leatherjacket"]
  .map(st => ({style:st, tone:{denimjacket:"blue", leatherjacket:"charcoal"}[st] || "grey", img:"img/items/tpl-" + st + ".jpg"}))
  /* Real photos behind the colour buttons */
  .concat(Object.entries(PHOTO_OPTIONS).flatMap(([st, list]) => list.filter(o => !PHOTO_PENDING.has(o[1])).map(([tone, img]) => ({style:st, tone, img}))));
/* Best template to recolour for each type (mid tones keep the folds visible) */
const TEMPLATE_BASE = {tee:"grey-tee", shirt:"navy-shirt", hoodie:"red-hoodie", jeans:"blue-jeans", trousers:"grey-trousers",
  chinos:"beige-chinos", sneakers:"black-sneakers", boots:"tan-suede-boots", loafers:"brown-loafers", cap:"beige-cap", scarf:"grey-wool-scarf",
  gloves:"brown-leather-gloves", socks:"black-dress-socks", belt:"brown-leather-belt", tie:"navy-tie"};
/* Until a type has its own template, borrow the closest one */
const TEMPLATE_SIMILAR = {longsleeve:"tee", tank:"tee", henley:"tee", flannel:"shirt", denimshirt:"shirt", sweater:"hoodie", sweatshirt:"hoodie",
  cardigan:"jacket", turtleneck:"hoodie", ziphoodie:"hoodie", denimjacket:"jacket", leatherjacket:"bomber", puffer:"bomber", gilet:"jacket",
  blazer:"jacket", coat:"jacket", joggers:"chinos", cargo:"chinos", runners:"sneakers", chelsea:"boots", oxfords:"loafers", sandals:"loafers",
  slides:"loafers", beanie:"cap", hat:"cap", beltcasual:"belt"};
/* Metal and glass pieces look wrong when recoloured: use the closest real photo instead */
const NO_RECOLOUR = ["watch","sunglasses","glasses","chain","bracelet","ring"];
const STUDIO_SIZE = 480;
let STUDIO_BG = [236, 235, 239];

function studioPhotos(){
  const seen = new Set(), out = [];
  [...TEMPLATE_EXTRA, ...DEFAULT_WARDROBE, ...SHOP].forEach(x => {
    if(x.img && typeof x.img === "string" && !x.img.startsWith("data:") && !seen.has(x.img)){ seen.add(x.img); out.push({style:x.style, tone:x.tone, img:x.img}); }
  });
  return out;
}
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
function toLab([r, g, b]){
  const f = c => { c /= 255; return c > .04045 ? Math.pow((c + .055) / 1.055, 2.4) : c / 12.92; };
  const R = f(r), G = f(g), B = f(b);
  let x = (R * .4124 + G * .3576 + B * .1805) / .95047, y = R * .2126 + G * .7152 + B * .0722, z = (R * .0193 + G * .1192 + B * .9505) / 1.08883;
  const h = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  x = h(x); y = h(y); z = h(z);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}
const labDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function toneDistance(a, b){ return labDist(toLab(hexRgb(TONES[a].hex)), toLab(hexRgb(TONES[b].hex))); }

function loadImg(src){
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
}
/* Pixels that belong to the background: similar to the border colour and connected to the edge */
function backgroundMask(px, w, h, tol){
  const d = px.data, border = [];
  for(let x = 0; x < w; x += 2){ border.push(x, x + (h - 1) * w); }
  for(let y = 0; y < h; y += 2){ border.push(y * w, y * w + w - 1); }
  const med = [0, 1, 2].map(c => border.map(i => d[4 * i + c]).sort((a, b) => a - b)[border.length >> 1]);
  const bg = new Uint8Array(w * h), stack = [];
  const near = i => Math.abs(d[4 * i] - med[0]) + Math.abs(d[4 * i + 1] - med[1]) + Math.abs(d[4 * i + 2] - med[2]) < tol;
  border.forEach(i => { if(!bg[i] && near(i)){ bg[i] = 1; stack.push(i); } });
  while(stack.length){
    const i = stack.pop(), x = i % w, y = (i / w) | 0;
    const nb = [x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1, y > 0 ? i - w : -1, y < h - 1 ? i + w : -1];
    for(const j of nb) if(j >= 0 && !bg[j] && near(j)){ bg[j] = 1; stack.push(j); }
  }
  return {bg, colour: med};
}

/* Main colour of the piece in a photo, best first: [[tone, score 0..1], ...] */
function photoTones(canvas){
  const w = 72, h = 72, c = document.createElement("canvas"); c.width = w; c.height = h;
  const ctx = c.getContext("2d", {willReadFrequently: true}); ctx.drawImage(canvas, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h), d = px.data;
  const {bg} = backgroundMask(px, w, h, 60);
  let fg = []; for(let i = 0; i < w * h; i++) if(!bg[i]) fg.push(i);
  if(fg.length < w * h * .08){        // busy background: use the middle of the photo
    fg = []; for(let y = h * .25 | 0; y < h * .75; y++) for(let x = w * .25 | 0; x < w * .75; x++) fg.push(y * w + x);
  }
  const labs = fg.map(i => toLab([d[4 * i], d[4 * i + 1], d[4 * i + 2]]));
  /* k-means with 3 groups; the biggest group is the main colour */
  let cent = [labs[0], labs[labs.length >> 1], labs[labs.length - 1]].map(x => [...x]);
  let assign = new Array(labs.length).fill(0);
  for(let it = 0; it < 8; it++){
    labs.forEach((p, i) => { let b = 0, bd = Infinity; cent.forEach((q, k) => { const dd = labDist(p, q); if(dd < bd){ bd = dd; b = k; } }); assign[i] = b; });
    cent = cent.map((q, k) => { const m = labs.filter((_, i) => assign[i] === k); return m.length ? [0, 1, 2].map(j => m.reduce((s, p) => s + p[j], 0) / m.length) : q; });
  }
  const counts = [0, 0, 0]; assign.forEach(k => counts[k]++);
  const main = cent[counts.indexOf(Math.max(...counts))];
  const sc = Object.keys(TONES).map(t => [t, Math.exp(-labDist(main, toLab(hexRgb(TONES[t].hex))) / 9)]);
  const sum = sc.reduce((s, x) => s + x[1], 0);
  return sc.map(([t, s]) => [t, s / sum]).sort((a, b) => b[1] - a[1]);
}

/* Recolour a template photo: keep its folds and shadows, change the colour of the piece only */
async function recolour(src, tone){
  const img = await loadImg(src), S = STUDIO_SIZE;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const ctx = c.getContext("2d", {willReadFrequently: true}); ctx.drawImage(img, 0, 0, S, S);
  const px = ctx.getImageData(0, 0, S, S), d = px.data;
  const {bg} = backgroundMask(px, S, S, 34);
  const m = new Uint8Array(S * S);
  for(let i = 0; i < S * S; i++){
    if(!bg[i]){ m[i] = 1; continue; }
    const x = i % S;   // grow the piece by one pixel so its edge is recoloured too
    if((x > 0 && !bg[i - 1]) || (x < S - 1 && !bg[i + 1]) || (i >= S && !bg[i - S]) || (i < S * S - S && !bg[i + S])) m[i] = 2;
  }
  const lum = i => (.2126 * d[4 * i] + .7152 * d[4 * i + 1] + .0722 * d[4 * i + 2]) / 255;
  let n = 0, sum = 0, sq = 0;
  for(let i = 0; i < S * S; i++) if(m[i] === 1){ const l = lum(i); n++; sum += l; sq += l * l; }
  if(!n) return c.toDataURL("image/jpeg", .86);
  const mean = sum / n, sd = Math.max(Math.sqrt(sq / n - mean * mean), .03);
  const t = hexRgb(TONES[tone] ? TONES[tone].hex : tone).map(v => v / 255);   // a colour name or a #hex
  for(let i = 0; i < S * S; i++){
    if(!m[i]) continue;
    let k = Math.max(-.42, Math.min(.42, (lum(i) - mean) / sd * .12));
    for(let ch = 0; ch < 3; ch++){
      const v = k < 0 ? t[ch] * (1 + k) : t[ch] + (1 - t[ch]) * k;
      const o = Math.round(v * 255);
      d[4 * i + ch] = m[i] === 2 ? (d[4 * i + ch] + o) >> 1 : o;
    }
  }
  ctx.putImageData(px, 0, 0);
  return c.toDataURL("image/jpeg", .86);
}

/* Clean studio picture for a type and colour. Resolves to an image URL. */
const cleanCache = {};
function cleanPicture(style, tone, hex){
  const key = style + "|" + (hex || tone);
  if(cleanCache[key]) return cleanCache[key];
  return cleanCache[key] = (async () => {
    const all = studioPhotos();
    let st = style, list = all.filter(p => p.style === st);
    if(!list.length && TEMPLATE_SIMILAR[style]){ st = TEMPLATE_SIMILAR[style]; list = all.filter(p => p.style === st); }
    if(!list.length) return null;
    if(hex){   // colour picker: tint the real photo whose colour is closest
      const lab = toLab(hexRgb(hex));
      const near = [...list].sort((a, b) => labDist(lab, toLab(hexRgb(TONES[a.tone].hex))) - labDist(lab, toLab(hexRgb(TONES[b.tone].hex))))[0];
      return recolour(near.img, hex);
    }
    const exact = list.find(p => p.tone === tone);
    if(exact) return exact.img;
    if(NO_RECOLOUR.includes(style)) return [...list].sort((a, b) => toneDistance(a.tone, tone) - toneDistance(b.tone, tone))[0].img;
    const base = (TEMPLATE_BASE[st] && list.find(p => p.img.endsWith("/" + TEMPLATE_BASE[st] + ".jpg"))) || list[0];
    return recolour(base.img, tone);
  })().catch(e => { delete cleanCache[key]; throw e; });
}

/* The user's cut-out photo, cropped to the piece and centred on the studio background with a soft shadow */
function studioFromCutout(cut){
  const S = STUDIO_SIZE, w = cut.width, h = cut.height;
  const a = cut.getContext("2d").getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(a[4 * (y * w + x) + 3] > 40){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  if(x1 <= x0 || y1 <= y0){ x0 = 0; y0 = 0; x1 = w - 1; y1 = h - 1; }
  const bw = x1 - x0 + 1, bh = y1 - y0 + 1, sc = Math.min(S * .8 / bw, S * .8 / bh);
  const dw = bw * sc, dh = bh * sc, dx = (S - dw) / 2, dy = (S - dh) / 2;
  const c = document.createElement("canvas"); c.width = c.height = S;
  const ctx = c.getContext("2d");
  const g = ctx.createRadialGradient(S / 2, S * .45, S * .1, S / 2, S / 2, S * .75);
  g.addColorStop(0, `rgb(${STUDIO_BG.map(v => Math.min(255, v + 8)).join(",")})`); g.addColorStop(1, `rgb(${STUDIO_BG.join(",")})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.18)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 8;
  ctx.drawImage(cut, x0, y0, bw, bh, dx, dy, dw, dh);
  ctx.restore();
  return c.toDataURL("image/jpeg", .88);
}
/* Measure the background of the sample photos once, so cut-outs use exactly the same colour */
loadImg("img/items/grey-tee.jpg").then(img => {
  const c = document.createElement("canvas"); c.width = c.height = 40;
  const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, 40, 40);
  const d = ctx.getImageData(0, 0, 4, 4).data; const avg = [0, 1, 2].map(k => { let s = 0; for(let i = 0; i < 16; i++) s += d[4 * i + k]; return Math.round(s / 16); });
  STUDIO_BG = avg;
}).catch(() => {});
