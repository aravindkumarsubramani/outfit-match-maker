/* Photo analyser and background remover. Everything runs on this device: the photo is never uploaded.
   - Type, material and colour: Marqo FashionSigLIP (Apache-2.0), image half only (the text half is in scan-labels.js).
   - Background removal: BRIA RMBG-1.4 (free for non-commercial use, fine for this student prototype).
   The models download once (about 90 MB and 45 MB) and the browser keeps them for next time. */
import { SCAN_LABELS } from "./scan-labels.js";

const TF_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.5";
const SIGLIP = "Marqo/marqo-fashionSigLIP";
const RMBG = "briaai/RMBG-1.4";

let tfP = null;
function tf(){
  if(!tfP) tfP = import(TF_URL).then(T => { T.env.allowLocalModels = false; return T; }).catch(e => { tfP = null; throw e; });
  return tfP;
}
/* Progress over all files of one model, 0..1 */
function tracker(onProgress){
  const files = {};
  return p => {
    if(p.status !== "progress" || !p.total) return;
    files[p.file] = [p.loaded, p.total];
    let l = 0, t = 0; Object.values(files).forEach(([a, b]) => { l += a; t += b; });
    if(onProgress && t > 2e6) onProgress(l / t);
  };
}

/* ---------- Analyser ---------- */
let siglipP = null;
const listeners = new Set();
export function loadAnalyser(onProgress){
  if(onProgress) listeners.add(onProgress);
  if(!siglipP){
    const cb = tracker(f => listeners.forEach(fn => fn(f)));
    siglipP = (async () => {
      const T = await tf();
      const [processor, model] = await Promise.all([
        T.AutoProcessor.from_pretrained(SIGLIP, {progress_callback: cb}),
        T.SiglipVisionModel.from_pretrained(SIGLIP, {dtype: "q8", progress_callback: cb})
      ]);
      return {T, processor, model};
    })().catch(e => { siglipP = null; throw e; });
  }
  return siglipP.finally(() => { if(onProgress) listeners.delete(onProgress); });
}

let labelVecs = null;
function vectors(){
  if(labelVecs) return labelVecs;
  const L = SCAN_LABELS, bin = atob(L.data), n = bin.length / L.dims, out = [];
  for(let i = 0; i < n; i++){
    const v = new Float32Array(L.dims); let s = 0;
    for(let j = 0; j < L.dims; j++){ let b = bin.charCodeAt(i * L.dims + j); if(b > 127) b -= 256; v[j] = b; s += b * b; }
    s = Math.sqrt(s) || 1; for(let j = 0; j < L.dims; j++) v[j] /= s;
    out.push(v);
  }
  return labelVecs = out;
}
function ranked(emb, from, names){
  const V = vectors(), sc = names.map((_, i) => { let d = 0; const v = V[from + i]; for(let j = 0; j < v.length; j++) d += v[j] * emb[j]; return d; });
  const mx = Math.max(...sc), ex = sc.map(s => Math.exp(100 * (s - mx))), sum = ex.reduce((a, b) => a + b, 0);
  return names.map((k, i) => [k, ex[i] / sum]).sort((a, b) => b[1] - a[1]);
}
/* canvas → {types:[[style, p]], materials:[[name, p]], tones:[[tone, p]]} */
export async function analysePhoto(canvas, onProgress){
  const {T, processor, model} = await loadAnalyser(onProgress);
  const image = await T.RawImage.fromCanvas(canvas);
  const inputs = await processor(image);
  const {image_embeds} = await model(inputs);
  const e = image_embeds.normalize().data;
  const L = SCAN_LABELS, nT = L.types.length, nM = L.materials.length;
  return {
    types: ranked(e, 0, L.types),
    materials: ranked(e, nT, L.materials),
    tones: ranked(e, nT + nM, L.tones)
  };
}

/* ---------- Background removal ---------- */
let rmbgP = null;
export function loadCutter(onProgress){
  if(!rmbgP){
    const cb = tracker(onProgress);
    rmbgP = (async () => {
      const T = await tf();
      const model = await T.AutoModel.from_pretrained(RMBG, {config: {model_type: "custom"}, dtype: "q8", progress_callback: cb});
      const processor = await T.AutoProcessor.from_pretrained(RMBG, {config: {
        do_normalize: true, do_pad: false, do_rescale: true, do_resize: true, image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor", image_std: [1, 1, 1], resample: 2,
        rescale_factor: 0.00392156862745098, size: {width: 1024, height: 1024}}});
      return {T, model, processor};
    })().catch(e => { rmbgP = null; throw e; });
  }
  return rmbgP;
}
/* canvas → canvas of the same size whose alpha keeps only the item */
export async function cutOut(canvas, onProgress){
  const {T, model, processor} = await loadCutter(onProgress);
  const image = await T.RawImage.fromCanvas(canvas);
  const {pixel_values} = await processor(image);
  const {output} = await model({input: pixel_values});
  const mask = await T.RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(canvas.width, canvas.height);
  const out = document.createElement("canvas"); out.width = canvas.width; out.height = canvas.height;
  const ctx = out.getContext("2d"); ctx.drawImage(canvas, 0, 0);
  const px = ctx.getImageData(0, 0, out.width, out.height);
  for(let i = 0; i < mask.data.length; i++) px.data[4 * i + 3] = mask.data[i];
  ctx.putImageData(px, 0, 0);
  return out;
}
