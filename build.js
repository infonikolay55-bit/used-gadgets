#!/usr/bin/env node
// Build the static shop from products.json + site.config.json into ./docs
// Usage: node build.js        (no dependencies)
const fs = require('fs'), path = require('path');
const ROOT = __dirname, OUT = path.join(ROOT, 'docs');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'site.config.json'), 'utf8'));
const products = JSON.parse(fs.readFileSync(path.join(ROOT, 'products.json'), 'utf8'));
const BASE = cfg.base_url.replace(/\/$/, '');
const CONDITIONS = { 'Like New': 'အသစ်နီးပါး', 'Good': 'ကောင်း', 'Fair': 'သင့်တင့်' };
const STATUS = ['available', 'sold', 'example'];

// ---------- validate ----------
const ids = new Set();
for (const p of products) {
  for (const k of ['id','title','brand','category','condition','price_mmk','description','photos','status','date_added'])
    if (p[k] === undefined) throw new Error(`Product ${p.id||'?'} missing "${k}"`);
  if (!/^[a-z0-9-]+$/.test(p.id)) throw new Error(`Bad id "${p.id}" (use lowercase a-z 0-9 -)`);
  if (ids.has(p.id)) throw new Error(`Duplicate id ${p.id}`); ids.add(p.id);
  if (!CONDITIONS[p.condition]) throw new Error(`${p.id}: condition must be Like New | Good | Fair`);
  if (!STATUS.includes(p.status)) throw new Error(`${p.id}: status must be ${STATUS.join(' | ')}`);
  if (!Number.isInteger(p.price_mmk) || p.price_mmk <= 0) throw new Error(`${p.id}: price_mmk must be a positive integer`);
  for (const ph of p.photos) if (!fs.existsSync(path.join(ROOT, ph))) throw new Error(`${p.id}: photo not found ${ph}`);
}

// ---------- helpers ----------
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mmk = n => n.toLocaleString('en-US') + ' MMK';
const slug = s => s.toLowerCase().replace(/&/g,'and').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const itemUrl = p => `${BASE}/item/${p.id}/`;
const abs = ph => `${BASE}/${ph}`;
const isPublic = p => p.status !== 'example';
const sorted = [...products].sort((a,b) => b.date_added.localeCompare(a.date_added));
const live = sorted.filter(isPublic);
const write = (rel, data) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), {recursive:true}); fs.writeFileSync(f, data); };
const jsonLd = obj => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g,'\\u003c')}</script>`;
const msg = p => encodeURIComponent(`Hi, I want to buy: ${p.title} (${mmk(p.price_mmk)}) ${itemUrl(p)}`);

const store = { '@type': 'Store', '@id': `${BASE}/#store`, name: cfg.shop_name, alternateName: cfg.shop_name_my,
  url: `${BASE}/`, description: cfg.tagline, telephone: cfg.viber_phone, currenciesAccepted: 'MMK',
  paymentAccepted: 'Cash, KPay', areaServed: cfg.delivery_area,
  address: { '@type': 'PostalAddress', addressLocality: cfg.city, addressCountry: cfg.country } };

function productLd(p) {
  return { '@context': 'https://schema.org', '@type': 'Product', '@id': itemUrl(p) + '#product',
    name: p.title, sku: p.id, brand: { '@type': 'Brand', name: p.brand }, category: p.category,
    description: p.description, image: p.photos.map(abs), url: itemUrl(p),
    itemCondition: 'https://schema.org/UsedCondition',
    additionalProperty: [{ '@type': 'PropertyValue', name: 'Condition grade', value: p.condition }],
    offers: { '@type': 'Offer', url: itemUrl(p), price: p.price_mmk, priceCurrency: 'MMK',
      itemCondition: 'https://schema.org/UsedCondition',
      availability: p.status === 'available' ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
      seller: { '@id': `${BASE}/#store` } } };
}

function layout({ title, desc, rel, canonical, body, ld = [], og = {}, noindex = false }) {
  return `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="canonical" href="${esc(canonical)}">
<link rel="stylesheet" href="${rel}styles.css">
<link rel="alternate" type="application/atom+xml" title="New items" href="${rel}feed.xml">
<link rel="alternate" type="application/json" title="Products JSON" href="${rel}products.json">
<meta property="og:type" content="${og.type || 'website'}">
<meta property="og:site_name" content="${esc(cfg.shop_name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${esc(canonical)}">
${og.image ? `<meta property="og:image" content="${esc(og.image)}">` : ''}
<meta name="twitter:card" content="summary_large_image">
${ld.map(jsonLd).join('\n')}
</head><body>
<header class="top"><a class="brand" href="${rel}index.html">${esc(cfg.shop_name)}<span class="my">${esc(cfg.shop_name_my)}</span></a>
<a class="btn tg small" href="${esc(cfg.telegram_url)}" rel="nofollow">Telegram</a></header>
<main>${body}</main>
<footer>
<p><strong>How to buy</strong><br><span class="my">ဝယ်ယူနည်း</span></p>
<p>Message us on Telegram or Viber with the item link.<br><span class="my">Telegram သို့မဟုတ် Viber မှ ဆက်သွယ်ပါ</span></p>
<p>Payment: ${esc(cfg.payment_note)}.<br><span class="my">${esc(cfg.payment_note_my)}</span></p>
<p>Delivery area: ${esc(cfg.delivery_area)}<br>Phone / Viber: ${esc(cfg.phone_display)}</p>
<p class="links"><a href="${rel}products.json">products.json</a> · <a href="${rel}feed.xml">Atom feed</a> · <a href="${rel}llms.txt">llms.txt</a> · <a href="${rel}sitemap.xml">sitemap</a></p>
<p class="small">© ${new Date().getFullYear()} ${esc(cfg.shop_name)}</p>
</footer></body></html>`;
}

function badge(p) {
  if (p.status === 'example') return '<span class="badge ex">EXAMPLE</span>';
  if (p.status === 'sold') return '<span class="badge sold">SOLD</span>';
  return '<span class="badge ok">Available</span>';
}
function card(p, rel) {
  return `<a class="card" href="${rel}item/${p.id}/" data-cat="${esc(slug(p.category))}">
<img src="${rel}${esc(p.photos[0])}" alt="${esc(p.title)}" loading="lazy" width="400" height="300">
<div class="c-body">${badge(p)}<h2>${esc(p.title)}</h2>
<p class="meta">${esc(p.brand)} · ${esc(p.condition)} <span class="my">(${CONDITIONS[p.condition]})</span></p>
<p class="price">${mmk(p.price_mmk)}</p></div></a>`;
}

// ---------- build ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'images'), path.join(OUT, 'images'), { recursive: true });
fs.copyFileSync(path.join(ROOT, 'src', 'styles.css'), path.join(OUT, 'styles.css'));
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

// home
const cats = [...new Set(sorted.map(p => p.category))].sort();
const homeBody = `<section class="hero"><h1>${esc(cfg.tagline)}</h1><p class="my">${esc(cfg.tagline_my)}</p>
<p>Used phone accessories, chargers, earbuds, keyboards, mice, SSDs and laptop parts. Prices in MMK.</p></section>
<nav class="filters"><button data-f="all" class="on">All<br><span class="my">အားလုံး</span></button>
${cats.map(c => `<button data-f="${slug(c)}">${esc(c)}</button>`).join('')}</nav>
<section class="grid">${sorted.map(p => card(p, '')).join('\n')}</section>
<script>document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.filters button').forEach(x=>x.classList.remove('on'));b.classList.add('on');document.querySelectorAll('.card').forEach(c=>c.style.display=(b.dataset.f==='all'||c.dataset.cat===b.dataset.f)?'':'none')})</script>`;
write('index.html', layout({ title: `${cfg.shop_name} – Used IT Accessories & Gadgets in Myanmar`, desc: cfg.tagline, rel: '',
  canonical: `${BASE}/`, body: homeBody,
  ld: [{ '@context': 'https://schema.org', ...store },
       { '@context': 'https://schema.org', '@type': 'ItemList', name: 'Items for sale',
         itemListElement: live.map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: itemUrl(p), name: p.title })) }] }));

// items
for (const p of sorted) {
  const rel = '../../';
  const body = `<article class="item">
<div class="gallery">${p.photos.map(ph => `<img src="${rel}${esc(ph)}" alt="${esc(p.title)}" width="800" height="600">`).join('')}</div>
<div class="info">${badge(p)}
<h1>${esc(p.title)}</h1>
<p class="price big">${mmk(p.price_mmk)}</p>
<table class="specs">
<tr><th>Brand<br><span class="my">အမှတ်တံဆိပ်</span></th><td>${esc(p.brand)}</td></tr>
<tr><th>Category<br><span class="my">အမျိုးအစား</span></th><td>${esc(p.category)}</td></tr>
<tr><th>Condition<br><span class="my">အခြေအနေ</span></th><td>Used – ${esc(p.condition)}<br><span class="my">${CONDITIONS[p.condition]}</span></td></tr>
<tr><th>Listed<br><span class="my">တင်သည့်ရက်</span></th><td>${esc(p.date_added)}</td></tr>
</table>
<p class="desc">${esc(p.description)}</p>
${p.status === 'sold' ? '<p class="soldnote">This item is sold.<br><span class="my">ရောင်းပြီးပါပြီ</span></p>' : `
<div class="buy">
<a class="btn tg" href="${esc(cfg.telegram_url)}?text=${msg(p)}" rel="nofollow">Buy / Ask on Telegram<br><span class="my">Telegram မှ ဝယ်မည်</span></a>
<a class="btn vb" href="viber://chat?number=${encodeURIComponent(cfg.viber_phone)}" rel="nofollow">Viber<br><span class="my">Viber မှ မေးမည်</span></a>
<a class="btn ph" href="tel:${esc(cfg.viber_phone)}" rel="nofollow">Call<br><span class="my">ဖုန်းဆက်မည်</span></a>
</div>`}
<p><a href="${rel}index.html">← All items</a></p>
</div></article>`;
  write(`item/${p.id}/index.html`, layout({ title: `${p.title} – ${mmk(p.price_mmk)} (Used, ${p.condition}) | ${cfg.shop_name}`,
    desc: `${p.description}`.slice(0, 160), rel, canonical: itemUrl(p), body, noindex: !isPublic(p),
    og: { type: 'product', image: abs(p.photos[0]) },
    ld: [productLd(p), { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE}/` },
      { '@type': 'ListItem', position: 2, name: p.title, item: itemUrl(p) }] }] }));
}

// public data (examples excluded)
const pub = live.map(p => ({ ...p, url: itemUrl(p), photos: p.photos.map(abs), currency: 'MMK' }));
write('products.json', JSON.stringify({ shop: cfg.shop_name, url: `${BASE}/`, currency: 'MMK',
  contact: { telegram: cfg.telegram_url, viber: cfg.viber_phone }, updated: new Date().toISOString(), items: pub }, null, 2));

const now = new Date().toISOString();
write('feed.xml', `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
<title>${esc(cfg.shop_name)} – New items</title><id>${BASE}/</id><updated>${now}</updated>
<link href="${BASE}/feed.xml" rel="self"/><link href="${BASE}/"/>
${live.slice(0, 50).map(p => `<entry><title>${esc(p.title)} – ${mmk(p.price_mmk)}</title><id>${itemUrl(p)}</id>
<link href="${itemUrl(p)}"/><updated>${p.date_added}T00:00:00Z</updated>
<summary>${esc(`[${p.status}] Used – ${p.condition}. ${p.description}`)}</summary></entry>`).join('\n')}
</feed>`);

write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url><loc>${BASE}/</loc><lastmod>${now.slice(0,10)}</lastmod></url>
${live.map(p => `<url><loc>${itemUrl(p)}</loc><lastmod>${p.date_added}</lastmod></url>`).join('\n')}
</urlset>`);

const bots = ['GPTBot','OAI-SearchBot','ChatGPT-User','PerplexityBot','Perplexity-User','Google-Extended','Googlebot','Bingbot','ClaudeBot','Claude-Web','anthropic-ai','Applebot','Applebot-Extended','CCBot','Meta-ExternalAgent','Bytespider','DuckDuckBot','YandexBot','cohere-ai'];
write('robots.txt', bots.map(b => `User-agent: ${b}\nAllow: /\n`).join('\n') + `\nUser-agent: *\nAllow: /\n\nSitemap: ${BASE}/sitemap.xml\n`);

write('llms.txt', `# ${cfg.shop_name} (${cfg.shop_name_my})

> ${cfg.tagline}. A small second-hand shop in ${cfg.city}, Myanmar selling used IT accessories and gadgets (phone accessories, chargers, cables, earbuds, keyboards, mice, SSDs, laptop parts). All prices are in Myanmar Kyat (MMK). Each item is a single used unit with a condition grade: Like New, Good, or Fair.

- How to buy: message on Telegram (${cfg.telegram_url}) or Viber/phone (${cfg.phone_display}) with the item link.
- Payment: ${cfg.payment_note}. No online card checkout.
- Delivery area: ${cfg.delivery_area}
- Machine-readable data: [products.json](${BASE}/products.json) (all items, prices, status), [Atom feed](${BASE}/feed.xml), [sitemap](${BASE}/sitemap.xml). Every item page has schema.org Product/Offer JSON-LD.

## Items for sale
${live.filter(p => p.status === 'available').map(p => `- [${p.title}](${itemUrl(p)}): ${mmk(p.price_mmk)}, used – ${p.condition}, ${p.brand}, ${p.category}`).join('\n') || '- (no items listed yet)'}

## Recently sold
${live.filter(p => p.status === 'sold').slice(0, 20).map(p => `- [${p.title}](${itemUrl(p)}): sold, was ${mmk(p.price_mmk)}`).join('\n') || '- (none)'}
`);

write('404.html', layout({ title: 'Not found', desc: 'Page not found', rel: '/', canonical: `${BASE}/`, noindex: true,
  body: '<p>Item not found or sold.<br><span class="my">မတွေ့ပါ</span></p><p><a href="/">Home</a></p>' }));

console.log(`Built ${sorted.length} item pages (${live.length} public, ${sorted.length - live.length} examples) -> docs/`);
