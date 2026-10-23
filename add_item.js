#!/usr/bin/env node
// Add one item: copies photo(s) into images/, appends to products.json, rebuilds.
// node add_item.js --title "JBL Tune 510BT Headphones" --brand JBL --category "Audio & Earbuds" \
//   --condition Good --price 45000 --desc "Tested, battery ~20h." --photo /path/a.jpg [--photo /path/b.jpg]
// Mark sold:   node add_item.js --sold <id>
// Remove all examples: node add_item.js --remove-examples
const fs = require('fs'), path = require('path'), { execFileSync } = require('child_process');
const ROOT = __dirname, PJ = path.join(ROOT, 'products.json');
const a = process.argv.slice(2), opt = { photo: [] };
for (let i = 0; i < a.length; i++) { const k = a[i].replace(/^--/, ''); const v = a[i + 1];
  if (k === 'remove-examples') { opt[k] = true; continue; }
  if (k === 'photo') opt.photo.push(v); else opt[k] = v; i++; }
const list = JSON.parse(fs.readFileSync(PJ, 'utf8'));
const save = l => { fs.writeFileSync(PJ, JSON.stringify(l, null, 2) + '\n'); execFileSync('node', [path.join(ROOT, 'build.js')], { stdio: 'inherit' }); };
if (opt['remove-examples']) { const keep = list.filter(p => p.status !== 'example');
  list.filter(p => p.status === 'example').flatMap(p => p.photos).forEach(f => fs.rmSync(path.join(ROOT, f), { force: true }));
  save(keep); console.log('Examples removed'); process.exit(0); }
if (opt.sold) { const p = list.find(x => x.id === opt.sold); if (!p) throw new Error('No item ' + opt.sold); p.status = 'sold'; save(list); console.log('Marked sold: ' + p.id); process.exit(0); }
for (const k of ['title', 'brand', 'category', 'condition', 'price', 'desc']) if (!opt[k]) throw new Error('Missing --' + k);
if (!opt.photo.length) throw new Error('Need at least one --photo');
const base = opt.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'item';
let id = base, n = 2; while (list.some(p => p.id === id)) id = `${base}-${n++}`;
const photos = opt.photo.map((src, i) => { const ext = path.extname(src).toLowerCase() || '.jpg';
  const rel = `images/${id}${i ? '-' + (i + 1) : ''}${ext}`; fs.copyFileSync(src, path.join(ROOT, rel)); return rel; });
const item = { id, title: opt.title, brand: opt.brand, category: opt.category, condition: opt.condition,
  price_mmk: parseInt(String(opt.price).replace(/[^0-9]/g, ''), 10), description: opt.desc, photos,
  status: 'available', date_added: new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Yangon' }) };
list.push(item); save(list); console.log('Added: ' + id);
