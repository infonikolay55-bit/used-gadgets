# Used gadgets shop (static, free)
- `products.json`: the only data file. `site.config.json`: shop settings (TODO placeholders!)
- `node build.js` → `docs/` (index, item/<id>/, products.json, feed.xml, sitemap.xml, robots.txt, llms.txt, 404)
- `node add_item.js ...`: see ADD_ITEM.md
- Host: GitHub Pages (main branch, /docs folder) or any static host. Set `base_url` first.
