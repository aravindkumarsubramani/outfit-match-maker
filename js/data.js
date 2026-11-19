/* Colours the app understands. "neutral" colours go with almost everything. */
const TONES = {
  white:     {name:"White",      hex:"#ffffff", neutral:true,  light:true},
  black:     {name:"Black",      hex:"#141414", neutral:true,  dark:true},
  grey:      {name:"Grey",       hex:"#9b9b9b", neutral:true},
  navy:      {name:"Navy",       hex:"#1f2a44", neutral:true,  dark:true},
  beige:     {name:"Beige",      hex:"#d8c7a8", neutral:true,  light:true},
  blue:      {name:"Denim blue", hex:"#3d5a80", neutral:true},
  lightblue: {name:"Light blue", hex:"#a9c4e0", light:true},
  olive:     {name:"Olive",      hex:"#5b6340"},
  brown:     {name:"Brown",      hex:"#6b4426", dark:true},
  red:       {name:"Red",        hex:"#a3242b"},
  green:     {name:"Green",      hex:"#2f6b4f"},
  pink:      {name:"Pink",       hex:"#e7b7c0", light:true},
  silver:    {name:"Silver",     hex:"#c4c7cc", neutral:true, light:true},
  gold:      {name:"Gold",       hex:"#c9a24a", neutral:true},
  charcoal:  {name:"Charcoal",   hex:"#3a3d42", neutral:true,  dark:true},
  cream:     {name:"Cream",      hex:"#efe6d2", neutral:true,  light:true},
  burgundy:  {name:"Burgundy",   hex:"#6b1f2e", dark:true},
  yellow:    {name:"Yellow",     hex:"#e3bf3a", light:true},
  orange:    {name:"Orange",     hex:"#d9762b"},
  purple:    {name:"Purple",     hex:"#5e3f86"}
};

/* formal: 0 = casual, 1 = smart casual, 2 = formal */
const STYLES = {
  /* tops */
  tee:{label:"T-shirt", formal:0}, longsleeve:{label:"Long-sleeve tee", formal:0}, tank:{label:"Tank top", formal:0},
  henley:{label:"Henley", formal:0}, polo:{label:"Polo", formal:1}, shirt:{label:"Shirt (Button-up)", formal:2},
  flannel:{label:"Flannel shirt", formal:1, warm:true}, denimshirt:{label:"Denim shirt", formal:1},
  sweater:{label:"Sweater / Jumper", formal:1, warm:true}, cardigan:{label:"Cardigan", formal:1, warm:true}, turtleneck:{label:"Turtleneck", formal:1, warm:true},
  hoodie:{label:"Hoodie", formal:0, warm:true}, ziphoodie:{label:"Zip hoodie", formal:0, warm:true}, sweatshirt:{label:"Sweatshirt", formal:0, warm:true},
  jacket:{label:"Overshirt", formal:1, warm:true}, bomber:{label:"Jacket", formal:1, warm:true}, denimjacket:{label:"Denim jacket", formal:0, warm:true},
  leatherjacket:{label:"Leather jacket", formal:1, warm:true}, puffer:{label:"Puffer jacket", formal:0, warm:true}, gilet:{label:"Gilet / Vest", formal:1, warm:true},
  blazer:{label:"Blazer", formal:2}, coat:{label:"Coat", formal:2, warm:true},
  /* bottoms */
  jeans:{label:"Jeans", formal:0}, chinos:{label:"Chinos", formal:1}, trousers:{label:"Trousers", formal:2}, shorts:{label:"Shorts", formal:0},
  joggers:{label:"Joggers", formal:0}, cargo:{label:"Cargo pants", formal:0},
  /* shoes */
  sneakers:{label:"Sneakers", formal:0}, runners:{label:"Running shoes", formal:0}, boots:{label:"Boots", formal:1, warm:true},
  chelsea:{label:"Chelsea boots", formal:1, warm:true}, loafers:{label:"Loafers", formal:2}, oxfords:{label:"Dress shoes", formal:2},
  sandals:{label:"Sandals", formal:0}, slides:{label:"Slides", formal:0},
  /* accessories */
  watch:{label:"Watch", formal:1}, belt:{label:"Belt", formal:1}, cap:{label:"Cap", formal:0},
  beanie:{label:"Beanie", formal:0, warm:true}, hat:{label:"Bucket hat", formal:0},
  sunglasses:{label:"Sunglasses", formal:0}, glasses:{label:"Glasses", formal:1},
  chain:{label:"Chain", formal:0}, bracelet:{label:"Bracelet", formal:0}, ring:{label:"Ring", formal:1},
  tie:{label:"Tie", formal:2}, bowtie:{label:"Bow tie", formal:2}, scarf:{label:"Scarf", formal:1, warm:true},
  gloves:{label:"Gloves", formal:1, warm:true}, socks:{label:"Socks", formal:0}
};

/* Wardrobe categories. cat = the slot the styling engine uses: top, bottom, shoes or acc (accessory). */
const GROUPS = [
  {id:"shirts",    label:"Shirts",    cat:"top",    styles:["tee","longsleeve","tank","henley","polo","shirt","flannel","denimshirt","sweater","cardigan","turtleneck","hoodie","ziphoodie","sweatshirt","jacket","bomber","denimjacket","leatherjacket","puffer","gilet","blazer","coat"]},
  {id:"pants",     label:"Pants",     cat:"bottom", styles:["jeans","chinos","trousers","shorts","joggers","cargo"]},
  {id:"shoes",     label:"Shoes",     cat:"shoes",  styles:["sneakers","runners","boots","chelsea","loafers","oxfords","sandals","slides"]},
  {id:"scarves",   label:"Scarves",   cat:"acc",    styles:["scarf"]},
  {id:"watches",   label:"Watches",   cat:"acc",    styles:["watch"]},
  {id:"belts",     label:"Belts",     cat:"acc",    styles:["belt"]},
  {id:"caps",      label:"Caps & Hats", cat:"acc",  styles:["cap","beanie","hat"]},
  {id:"glasses",   label:"Glasses",   cat:"acc",    styles:["sunglasses","glasses"]},
  {id:"jewellery", label:"Jewellery", cat:"acc",    styles:["chain","bracelet","ring"]},
  {id:"ties",      label:"Ties",      cat:"acc",    styles:["tie","bowtie"]},
  {id:"gloves",    label:"Gloves",    cat:"acc",    styles:["gloves"]},
  {id:"socks",     label:"Socks",     cat:"acc",    styles:["socks"]}
];
function groupOf(item){
  return GROUPS.find(g => g.styles.includes(item.style)) || GROUPS.find(g => g.cat === item.cat) || GROUPS[0];
}
const MATERIALS = ["Cotton","Denim","Wool","Linen","Polyester","Leather","Suede","Canvas","Silk","Satin","Cashmere","Corduroy","Fleece","Nylon","Velvet","Tweed","Flannel","Jersey","Knit","Rubber","Mesh","Down","Faux leather","Stainless steel","Sterling silver","Gold-plated","Metal","Acetate","Plastic"];
/* Materials shown first for each slot when you add a piece */
const MATERIALS_FOR = {
  top:["Cotton","Linen","Wool","Knit","Fleece","Jersey","Flannel","Denim","Polyester","Leather","Nylon","Down","Cashmere","Silk","Corduroy","Velvet","Tweed"],
  bottom:["Cotton","Denim","Wool","Linen","Polyester","Corduroy","Fleece","Nylon","Leather"],
  shoes:["Leather","Suede","Canvas","Rubber","Mesh","Faux leather","Nylon"],
  acc:["Leather","Stainless steel","Metal","Sterling silver","Gold-plated","Acetate","Plastic","Wool","Cashmere","Cotton","Silk","Satin","Knit","Velvet","Polyester"]
};
/* Size buttons for each slot */
const SIZE_CHIPS = {
  top:["XS","S","M","L","XL","XXL"],
  bottom:["W28 L32","W30 L32","W32 L32","W34 L32","W36 L32","W38 L32"],
  shoes:["EU 39","EU 40","EU 41","EU 42","EU 43","EU 44","EU 45","EU 46"],
  acc:["One size","S","M","L"]
};
const SIZES = ["XS","S","M","L","XL","XXL","W30 L32","W32 L32","W34 L32","EU 40","EU 41","EU 42","EU 43","EU 44","EU 42–46","One size"];

/* Photos: img/items/<name>.jpg (generated studio product photos). */
const P = n => "img/items/" + n + ".jpg";
const DEFAULT_WARDROBE = [
  /* Shirts / tops */
  {id:"w1",  name:"Navy shirt",        cat:"top",    style:"shirt",    tone:"navy",   brand:"Daily Basics",            size:"L",        price:39.99,  material:"Cotton",  img:P("navy-shirt"), fav:true},
  {id:"w2",  name:"White shirt",       cat:"top",    style:"shirt",    tone:"white",  brand:"Basico",         size:"M",        price:29.90,  material:"Cotton",  img:P("white-shirt")},
  {id:"w3",  name:"Grey tee",          cat:"top",    style:"tee",      tone:"grey",   brand:"Daily Basics",            size:"M",        price:9.99,   material:"Cotton",  img:P("grey-tee")},
  {id:"w4",  name:"Red hoodie",        cat:"top",    style:"hoodie",   tone:"red",    brand:"Fieldhouse",       size:"M",        price:59.95,  material:"Cotton",  img:P("red-hoodie")},
  {id:"w5",  name:"Olive overshirt",   cat:"top",    style:"jacket",   tone:"olive",  brand:"Workwell",       size:"M",        price:79.00,  material:"Cotton",  img:P("olive-overshirt")},
  /* Pants */
  {id:"w6",  name:"Beige chinos",      cat:"bottom", style:"chinos",   tone:"beige",  brand:"Chinova",        size:"W32 L32",  price:69.95,  material:"Cotton",  img:P("beige-chinos"), fav:true},
  {id:"w7",  name:"Black jeans",       cat:"bottom", style:"jeans",    tone:"black",  brand:"Denimco",         size:"W32 L32",  price:99.95,  material:"Denim",   img:P("black-jeans")},
  {id:"w8",  name:"Blue jeans",        cat:"bottom", style:"jeans",    tone:"blue",   brand:"Denimco",         size:"W32 L32",  price:99.95,  material:"Denim",   img:P("blue-jeans")},
  {id:"w9",  name:"Grey trousers",     cat:"bottom", style:"trousers", tone:"grey",   brand:"Casa Fina",  size:"W32 L32",  price:79.95,  material:"Wool",    img:P("grey-trousers")},
  {id:"w10", name:"Navy chinos",       cat:"bottom", style:"chinos",   tone:"navy",   brand:"Basico",         size:"W32 L32",  price:39.90,  material:"Cotton",  img:P("navy-chinos")},
  /* Shoes */
  {id:"w11", name:"White sneakers",    cat:"shoes",  style:"sneakers", tone:"white",  brand:"Trackline",         size:"EU 42",    price:99.95,  material:"Leather", img:P("white-sneakers"), fav:true},
  {id:"w12", name:"Black sneakers",    cat:"shoes",  style:"sneakers", tone:"black",  brand:"Kickflip",           size:"EU 42",    price:74.95,  material:"Canvas",  img:P("black-sneakers")},
  {id:"w13", name:"Brown loafers",     cat:"shoes",  style:"loafers",  tone:"brown",  brand:"Stepwell",         size:"EU 42",    price:119.95, material:"Leather", img:P("brown-loafers")},
  {id:"w14", name:"Black boots",       cat:"shoes",  style:"boots",    tone:"black",  brand:"Bootworks",    size:"EU 42",    price:189.00, material:"Leather", img:P("black-boots")},
  {id:"w15", name:"Tan suede boots",   cat:"shoes",  style:"boots",    tone:"brown",  brand:"Trailhaus",     size:"EU 42",    price:149.00, material:"Suede",   img:P("tan-suede-boots")},
  /* Watches */
  {id:"a1",  name:"Silver watch",      cat:"acc", style:"watch",      tone:"silver", brand:"Quartzy",             size:"One size", price:59.95,  material:"Stainless steel", img:P("silver-watch")},
  {id:"a2",  name:"Black leather watch", cat:"acc", style:"watch",    tone:"black",  brand:"Minute & Co", size:"One size", price:129.00, material:"Leather",         img:P("black-leather-watch")},
  {id:"a3",  name:"Gold watch",        cat:"acc", style:"watch",      tone:"gold",   brand:"Timberline Watch",            size:"One size", price:149.00, material:"Stainless steel", img:P("gold-watch")},
  /* Belts */
  {id:"a4",  name:"Brown leather belt", cat:"acc", style:"belt",      tone:"brown",  brand:"Denimco",            size:"90 cm",    price:34.95,  material:"Leather",         img:P("brown-leather-belt")},
  {id:"a5",  name:"Black leather belt", cat:"acc", style:"belt",      tone:"black",  brand:"Atelier Nord",         size:"90 cm",    price:59.95,  material:"Leather",         img:P("black-leather-belt")},
  {id:"a6",  name:"Tan braided belt",  cat:"acc", style:"belt",       tone:"brown",  brand:"Braid & Buckle",        size:"90 cm",    price:89.00,  material:"Leather",         img:P("tan-braided-belt")},
  /* Caps */
  {id:"a7",  name:"Navy cap",          cat:"acc", style:"cap",        tone:"navy",   brand:"Capstone",           size:"One size", price:29.95,  material:"Cotton",          img:P("navy-cap")},
  {id:"a8",  name:"Black cap",         cat:"acc", style:"cap",        tone:"black",  brand:"Stride",              size:"One size", price:24.95,  material:"Cotton",          img:P("black-cap")},
  {id:"a9",  name:"Beige cap",         cat:"acc", style:"cap",        tone:"beige",  brand:"Workwell",          size:"One size", price:29.00,  material:"Cotton",          img:P("beige-cap")},
  /* Glasses */
  {id:"a10", name:"Black sunglasses",  cat:"acc", style:"sunglasses", tone:"black",  brand:"Sunline",           size:"One size", price:149.00, material:"Acetate",         img:P("black-sunglasses")},
  {id:"a11", name:"Brown aviators",    cat:"acc", style:"sunglasses", tone:"brown",  brand:"Sunline",           size:"One size", price:169.00, material:"Metal",           img:P("brown-aviators")},
  {id:"a12", name:"Round glasses",     cat:"acc", style:"glasses",    tone:"gold",   brand:"Optica",        size:"One size", price:98.00,  material:"Metal",           img:P("round-glasses")},
  /* Jewellery */
  {id:"a13", name:"Silver chain",      cat:"acc", style:"chain",      tone:"silver", brand:"Silverleaf",           size:"50 cm",    price:79.00,  material:"Sterling silver", img:P("silver-chain")},
  {id:"a14", name:"Gold chain",        cat:"acc", style:"chain",      tone:"gold",   brand:"Lumen Jewels",       size:"50 cm",    price:149.00, material:"Gold-plated",     img:P("gold-chain")},
  {id:"a15", name:"Leather bracelet",  cat:"acc", style:"bracelet",   tone:"brown",  brand:"Timberline Watch",            size:"One size", price:39.00,  material:"Leather",         img:P("leather-bracelet")},
  /* Ties */
  {id:"a16", name:"Navy tie",          cat:"acc", style:"tie",        tone:"navy",   brand:"Harbour & Co",    size:"One size", price:49.95,  material:"Silk",            img:P("navy-tie")},
  {id:"a17", name:"Burgundy tie",      cat:"acc", style:"tie",        tone:"red",    brand:"Atelier Nord",         size:"One size", price:59.95,  material:"Silk",            img:P("burgundy-tie")},
  {id:"a18", name:"Black bow tie",     cat:"acc", style:"bowtie",     tone:"black",  brand:"Kingsley",           size:"One size", price:45.00,  material:"Satin",           img:P("black-bow-tie")},
  /* Scarves */
  {id:"a19", name:"Grey wool scarf",   cat:"acc", style:"scarf",      tone:"grey",   brand:"Studio Form",               size:"One size", price:59.00,  material:"Wool",            img:P("grey-wool-scarf")},
  {id:"a20", name:"Navy scarf",        cat:"acc", style:"scarf",      tone:"navy",   brand:"Basico",            size:"One size", price:29.90,  material:"Wool",            img:P("navy-scarf")},
  {id:"a21", name:"Camel scarf",       cat:"acc", style:"scarf",      tone:"brown",  brand:"Nordic Knit",      size:"One size", price:120.00, material:"Cashmere",        img:P("camel-scarf")},
  /* Gloves */
  {id:"a22", name:"Black leather gloves", cat:"acc", style:"gloves",  tone:"black",  brand:"Glovemark",             size:"M",        price:65.00,  material:"Leather",         img:P("black-leather-gloves")},
  {id:"a23", name:"Brown leather gloves", cat:"acc", style:"gloves",  tone:"brown",  brand:"Glovemark",             size:"M",        price:65.00,  material:"Leather",         img:P("brown-leather-gloves")},
  {id:"a24", name:"Grey knit gloves",  cat:"acc", style:"gloves",     tone:"grey",   brand:"Basico",            size:"M",        price:14.90,  material:"Wool",            img:P("grey-knit-gloves")},
  /* Socks */
  {id:"a25", name:"White sports socks", cat:"acc", style:"socks",     tone:"white",  brand:"Stride",              size:"EU 42–46", price:14.99,  material:"Cotton",          img:P("white-sports-socks")},
  {id:"a26", name:"Black dress socks", cat:"acc", style:"socks",      tone:"black",  brand:"Sockery",             size:"EU 42–46", price:15.00,  material:"Cotton",          img:P("black-dress-socks")},
  {id:"a27", name:"Navy striped socks", cat:"acc", style:"socks",     tone:"navy",   brand:"Joy Socks",       size:"EU 42–46", price:12.95,  material:"Cotton",          img:P("navy-striped-socks")}
];

/* Sample partner products. Shop names are placeholders for the prototype. */
const SHOP = [
  {id:"s1",  name:"Oxford shirt",         cat:"top",    style:"shirt",      tone:"white",  price:39.95,  shop:"Demo shop A", brand:"Basico",        material:"Cotton",          img:P("s1-oxford-shirt")},
  {id:"s2",  name:"Knit polo",            cat:"top",    style:"polo",       tone:"beige",  price:29.95,  shop:"Demo shop B", brand:"Moderno",          material:"Cotton",          img:P("s2-knit-polo")},
  {id:"s3",  name:"Heavy hoodie",         cat:"top",    style:"hoodie",     tone:"black",  price:45.00,  shop:"Demo shop C", brand:"Weekend Lab",       material:"Cotton",          img:P("s3-heavy-hoodie")},
  {id:"s4",  name:"Linen shirt",          cat:"top",    style:"shirt",      tone:"pink",   price:35.95,  shop:"Demo shop A", brand:"Mirella",         material:"Linen",           img:P("s4-linen-shirt")},
  {id:"s5",  name:"Bomber jacket",        cat:"top",    style:"bomber",     tone:"green",  price:69.95,  shop:"Demo shop B", brand:"Flightline", material:"Polyester",    img:P("s5-bomber-jacket")},
  {id:"s6",  name:"Boxy tee",             cat:"top",    style:"tee",        tone:"navy",   price:15.95,  shop:"Demo shop C", brand:"Studio Form",           material:"Cotton",          img:P("s6-boxy-tee")},
  {id:"s7",  name:"Slim chinos",          cat:"bottom", style:"chinos",     tone:"navy",   price:39.95,  shop:"Demo shop A", brand:"Chinova",       material:"Cotton",          img:P("s7-slim-chinos")},
  {id:"s8",  name:"Straight jeans",       cat:"bottom", style:"jeans",      tone:"grey",   price:49.95,  shop:"Demo shop B", brand:"Denimco",        material:"Denim",           img:P("s8-straight-jeans")},
  {id:"s9",  name:"Pleated trousers",     cat:"bottom", style:"trousers",   tone:"black",  price:55.00,  shop:"Demo shop C", brand:"Casa Fina", material:"Wool",            img:P("s9-pleated-trousers")},
  {id:"s10", name:"Cargo shorts",         cat:"bottom", style:"shorts",     tone:"olive",  price:29.95,  shop:"Demo shop A", brand:"Workwell",      material:"Cotton",          img:P("s10-cargo-shorts")},
  {id:"s11", name:"Leather sneakers",     cat:"shoes",  style:"sneakers",   tone:"black",  price:79.95,  shop:"Demo shop B", brand:"Greenstep",          material:"Leather",         img:P("s11-leather-sneakers")},
  {id:"s12", name:"Suede boots",          cat:"shoes",  style:"boots",      tone:"brown",  price:99.00,  shop:"Demo shop C", brand:"Stepwell",        material:"Suede",           img:P("s12-suede-boots")},
  /* Sample accessories */
  {id:"s13", name:"Leather strap watch",  cat:"acc",    style:"watch",      tone:"brown",  price:119.00, shop:"Demo shop A", brand:"Tickwell",         material:"Leather",         img:P("s13-leather-strap-watch")},
  {id:"s14", name:"Black woven belt",     cat:"acc",    style:"belt",       tone:"black",  price:39.95,  shop:"Demo shop B", brand:"Harbour & Co", material:"Polyester",      img:P("s14-black-woven-belt")},
  {id:"s15", name:"Beige corduroy cap",   cat:"acc",    style:"cap",        tone:"beige",  price:24.95,  shop:"Demo shop C", brand:"Workwell",      material:"Cotton",          img:P("s15-beige-cap")},
  {id:"s16", name:"Tortoiseshell glasses", cat:"acc",   style:"glasses",    tone:"brown",  price:89.00,  shop:"Demo shop A", brand:"Optica",    material:"Acetate",         img:P("s16-tortoiseshell-glasses")},
  {id:"s17", name:"Brown round sunglasses", cat:"acc",  style:"sunglasses", tone:"brown",  price:59.95,  shop:"Demo shop B", brand:"Sunline",       material:"Acetate",         img:P("s17-brown-sunglasses")},
  {id:"s18", name:"Silver cuff bracelet", cat:"acc",    style:"bracelet",   tone:"silver", price:49.00,  shop:"Demo shop C", brand:"Silverleaf",       material:"Sterling silver", img:P("s18-silver-bracelet")},
  {id:"s19", name:"Gold signet ring",     cat:"acc",    style:"ring",       tone:"gold",   price:89.95,  shop:"Demo shop A", brand:"Lumen Jewels",   material:"Gold-plated",     img:P("s19-gold-signet-ring")},
  {id:"s20", name:"Burgundy knit tie",    cat:"acc",    style:"tie",        tone:"red",    price:34.95,  shop:"Demo shop B", brand:"Atelier Nord",     material:"Wool", img:P("s20-burgundy-knit-tie")},
  {id:"s21", name:"Navy velvet bow tie",  cat:"acc",    style:"bowtie",     tone:"navy",   price:29.95,  shop:"Demo shop C", brand:"Kingsley",       material:"Velvet", img:P("s21-navy-velvet-bow-tie")},
  {id:"s22", name:"Burgundy wool scarf",  cat:"acc",    style:"scarf",      tone:"red",    price:49.95,  shop:"Demo shop A", brand:"Studio Form",           material:"Wool", img:P("s22-burgundy-wool-scarf")},
  {id:"s23", name:"Brown suede gloves",   cat:"acc",    style:"gloves",     tone:"brown",  price:45.00,  shop:"Demo shop B", brand:"Glovemark",         material:"Suede", img:P("s23-brown-suede-gloves")},
  {id:"s24", name:"Navy dress socks",     cat:"acc",    style:"socks",      tone:"navy",   price:12.95,  shop:"Demo shop C", brand:"Sockery",         material:"Cotton", img:P("s24-navy-dress-socks")}
];

const SKIN = [
  {id:"fair",   name:"Fair",   hex:"#f3d9c4"},
  {id:"light",  name:"Light",  hex:"#e2b996"},
  {id:"medium", name:"Medium", hex:"#c08a62"},
  {id:"tan",    name:"Tan",    hex:"#9a6640"},
  {id:"deep",   name:"Deep",   hex:"#5e3a23"}
];

/* ---------- Simple garment drawings ---------- */
function garmentSVG(item){
  const c = (TONES[item.tone] || TONES.grey).hex;
  const edge = c === "#ffffff" ? "#c8c8c8" : "none";
  const ALIAS = {longsleeve:"tee", tank:"tee", henley:"polo", flannel:"shirt", denimshirt:"shirt", sweater:"sweatshirt", cardigan:"jacket", turtleneck:"sweatshirt",
    ziphoodie:"hoodie", denimjacket:"jacket", leatherjacket:"jacket", blazer:"jacket", coat:"jacket", puffer:"bomber", gilet:"jacket",
    joggers:"jeans", cargo:"jeans", runners:"sneakers", chelsea:"boots", oxfords:"loafers", sandals:"loafers", slides:"loafers", beanie:"cap", hat:"cap"};
  const s = ALIAS[item.style] || item.style;
  let d = "";
  if(item.cat === "top"){
    const long = ["hoodie","jacket","shirt","sweatshirt","bomber"].includes(s);
    d = long
      ? `<path d="M38 12 L18 20 L6 86 L20 88 L28 44 L28 94 L92 94 L92 44 L100 88 L114 86 L102 20 L82 12 Q60 24 38 12 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`
      : `<path d="M38 12 L20 20 L8 42 L22 50 L28 40 L28 94 L92 94 L92 40 L98 50 L112 42 L100 20 L82 12 Q60 24 38 12 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    if(s === "shirt")  d += `<path d="M48 14 L60 28 L72 14" fill="none" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><line x1="60" y1="28" x2="60" y2="94" stroke="rgba(0,0,0,.25)" stroke-width="1.2"/>`;
    if(s === "polo")   d += `<path d="M50 14 L60 24 L70 14" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/><line x1="60" y1="24" x2="60" y2="38" stroke="rgba(0,0,0,.3)" stroke-width="1.5"/>`;
    if(s === "hoodie") d += `<path d="M44 14 Q60 2 76 14 Q60 28 44 14 Z" fill="rgba(0,0,0,.18)"/><rect x="42" y="64" width="36" height="14" fill="rgba(0,0,0,.14)"/>`;
    if(s === "jacket") d += `<line x1="60" y1="20" x2="60" y2="94" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/><rect x="36" y="56" width="14" height="10" fill="rgba(0,0,0,.15)"/><rect x="70" y="56" width="14" height="10" fill="rgba(0,0,0,.15)"/>`;
  } else if(item.cat === "bottom"){
    if(s === "shorts") d = `<path d="M30 20 L90 20 L96 70 L66 70 L60 44 L54 70 L24 70 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    else d = `<path d="M34 6 L86 6 L92 96 L66 96 L60 34 L54 96 L28 96 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    d += `<line x1="34" y1="14" x2="86" y2="14" stroke="rgba(0,0,0,.2)" stroke-width="1.2"/>`;
  } else if(item.cat === "acc"){
    d = accessorySVG(s, c);
  } else {
    if(s === "boots") d = `<path d="M24 20 L52 20 L52 54 L88 62 Q104 66 104 78 L104 84 L24 84 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    else if(s === "loafers") d = `<path d="M12 70 L14 56 Q34 50 54 58 L80 64 Q104 66 108 78 L108 82 L12 82 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/><path d="M50 62 L72 66" stroke="rgba(255,255,255,.4)" stroke-width="2"/>`;
    else d = `<path d="M12 68 L12 46 Q30 44 46 52 L70 60 Q100 62 106 74 L106 80 L12 80 Z" fill="${c}" stroke="${edge}" stroke-width="1.5"/>`;
    d += `<line x1="12" y1="84" x2="108" y2="84" stroke="#000" stroke-width="3"/>`;
  }
  return `<svg class="pic" viewBox="0 0 120 100" aria-hidden="true">${d}</svg>`;
}
function accessorySVG(s, c){
  const edge = c === "#ffffff" ? "#c8c8c8" : "rgba(0,0,0,.25)";
  const g = inner => `<g fill="${c}" stroke="${edge}" stroke-width="1.5" stroke-linejoin="round">${inner}</g>`;
  switch(s){
    case "watch": return g(`<rect x="50" y="2" width="20" height="96" rx="5"/>`) + `<circle cx="60" cy="50" r="20" fill="#fff" stroke="${c === "#ffffff" ? "#c8c8c8" : c}" stroke-width="5"/><path d="M60 50 L60 38 M60 50 L68 54" stroke="#141414" stroke-width="2" stroke-linecap="round"/>`;
    case "belt": return g(`<rect x="4" y="40" width="112" height="20" rx="3"/>`) + `<rect x="22" y="34" width="20" height="32" rx="3" fill="none" stroke="#9a9a9a" stroke-width="4"/><circle cx="66" cy="50" r="2.5" fill="#141414"/><circle cx="80" cy="50" r="2.5" fill="#141414"/><circle cx="94" cy="50" r="2.5" fill="#141414"/>`;
    case "cap": return g(`<path d="M22 66 Q22 22 60 22 Q98 22 98 66 Z"/><path d="M60 66 L116 66 Q118 78 102 78 L60 74 Z"/>`) + `<circle cx="60" cy="22" r="3" fill="rgba(0,0,0,.35)"/><path d="M60 24 Q52 44 54 66" fill="none" stroke="rgba(0,0,0,.2)" stroke-width="1.5"/>`;
    case "sunglasses":
    case "glasses": {
      const lens = s === "glasses" ? `fill="rgba(170,200,230,.25)"` : `fill="${c}"`;
      return `<g stroke="${s === "glasses" ? c : edge}" stroke-width="${s === "glasses" ? 4 : 1.5}"><rect x="12" y="36" width="40" height="30" rx="12" ${lens}/><rect x="68" y="36" width="40" height="30" rx="12" ${lens}/></g><path d="M52 46 Q60 38 68 46" fill="none" stroke="${c}" stroke-width="4"/><path d="M12 42 L2 38 M108 42 L118 38" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`;
    }
    case "chain": return `<path d="M22 12 Q60 120 98 12" fill="none" stroke="${c}" stroke-width="6" stroke-dasharray="7 3"/><path d="M22 12 Q60 120 98 12" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>` + g(`<path d="M60 68 L70 80 L60 94 L50 80 Z"/>`);
    case "bracelet": return `<ellipse cx="60" cy="52" rx="40" ry="26" fill="none" stroke="${c}" stroke-width="9"/><ellipse cx="60" cy="52" rx="40" ry="26" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1"/>`;
    case "ring": return `<circle cx="60" cy="56" r="26" fill="none" stroke="${c}" stroke-width="8"/>` + g(`<path d="M50 30 L60 16 L70 30 Z"/>`);
    case "tie": return g(`<path d="M52 4 L68 4 L65 18 L55 18 Z"/><path d="M55 18 L65 18 L76 78 L60 96 L44 78 Z"/>`) + `<path d="M49 46 L73 36 M47 62 L75 50" stroke="rgba(255,255,255,.25)" stroke-width="3"/>`;
    case "bowtie": return g(`<path d="M16 30 L54 46 L54 58 L16 74 Z"/><path d="M104 30 L66 46 L66 58 L104 74 Z"/><rect x="52" y="42" width="16" height="20" rx="3"/>`);
    case "scarf": return g(`<path d="M28 12 Q60 34 92 12 L92 30 Q60 52 28 30 Z"/><path d="M64 36 L82 34 L88 88 L70 90 Z"/>`) + `<path d="M72 90 L72 98 M77 90 L77 98 M82 89 L82 97 M87 88 L87 96" stroke="${c}" stroke-width="2"/>`;
    case "gloves": return g(`<rect x="40" y="16" width="10" height="40" rx="5"/><rect x="52" y="8" width="10" height="46" rx="5"/><rect x="64" y="10" width="10" height="44" rx="5"/><rect x="76" y="18" width="9" height="38" rx="4.5"/><rect x="22" y="46" width="28" height="11" rx="5.5" transform="rotate(-38 36 51)"/><rect x="38" y="40" width="48" height="40" rx="10"/><rect x="40" y="78" width="44" height="18" rx="2"/>`) + `<path d="M40 82 L84 82" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
    case "socks": return g(`<path d="M42 4 L72 4 L72 58 L100 72 Q112 82 100 94 L56 94 Q42 94 42 80 Z"/>`) + `<path d="M42 14 L72 14 M42 20 L72 20" stroke="rgba(0,0,0,.25)" stroke-width="3"/>`;
    default: return g(`<circle cx="60" cy="50" r="30"/>`);
  }
}
