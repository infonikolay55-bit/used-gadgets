# ADD_ITEM.md: how a bot adds an item

Project: /workspace/used-gadgets-site  (no npm install needed; Node 18+)

## 1. Add an item (photo + price from Naing)
```bash
cd /workspace/used-gadgets-site
node add_item.js \
  --title "JBL Tune 510BT Wireless Headphones" \
  --brand "JBL" \
  --category "Audio & Earbuds" \
  --condition "Good" \
  --price 45000 \
  --desc "Tested, all buttons work, battery about 20h. Light wear on headband." \
  --photo /path/to/photo1.jpg --photo /path/to/photo2.jpg
```
What it does: copies each photo to `images/<id>[-n].ext`, appends a JSON entry to `products.json`
(status `available`, date_added = today in Asia/Yangon), then runs `node build.js` → `docs/`.

Rules:
- condition: exactly `Like New`, `Good`, or `Fair`
- price: integer MMK (commas are stripped: "45,000" ok)
- category, use one of: `Phone Accessories`, `Chargers & Cables`, `Audio & Earbuds`, `Keyboards & Mice`,
  `Storage & Laptop Parts`, `Laptops & Tablets`, `Other Gadgets` (new ones are allowed; they become filter buttons)
- title: English, brand + model + key spec. Never invent specs you cannot see in the photo or Naing's message.
- Photos: JPG/PNG/WebP; resize large phone photos to ~1200px wide first if possible, e.g.
  `convert in.jpg -resize 1200x1200\> -quality 80 out.jpg`

## 2. Mark sold
`node add_item.js --sold <item-id>` (page stays up with SOLD badge; Offer availability becomes SoldOut)

## 3. Remove the 3 example items (do this once the first real item is added)
`node add_item.js --remove-examples`

## 4. Manual way (equivalent)
1. `cp photo.jpg images/<id>.jpg`
2. Append to `products.json`:
```json
{ "id": "lowercase-dash-id", "title": "...", "brand": "...", "category": "...",
  "condition": "Good", "price_mmk": 45000, "description": "...",
  "photos": ["images/<id>.jpg"], "status": "available", "date_added": "YYYY-MM-DD" }
```
3. `node build.js` (validates fields and fails loudly on mistakes)

## 5. Publish
Output is in `docs/`. If the site is on GitHub Pages (branch main, folder /docs):
`git add -A && git commit -m "Add <id>" && git push`

## Settings
`site.config.json`: shop name, base_url (MUST be the live URL, used in sitemap/JSON-LD/llms.txt),
Telegram link, Viber phone, delivery area, payment note. Rebuild after editing.
