#!/usr/bin/env python3
"""Batch convert all ZeroBudgeting articles to Astro pages - v3."""
import re, os, json

with open('articles-data.js', encoding='utf-8', errors='replace') as f:
    raw = f.read()

pattern = r'\{([^}]+)\}'
matches = re.findall(pattern, raw)

articles = []
for m in matches:
    slug = re.search(r'slug:\s*"([^"]+)"', m)
    title = re.search(r'title:\s*"([^"]+)"', m)
    category = re.search(r'category:\s*"([^"]+)"', m)
    date = re.search(r'date:\s*"([^"]+)"', m)
    excerpt = re.search(r'excerpt:\s*"([^"]+)"', m)
    tags_raw = re.search(r'tags:\s*\[([^\]]+)\]', m)

    if slug and title and category:
        tags = []
        if tags_raw:
            tags = re.findall(r'"([^"]+)"', tags_raw.group(1))
        articles.append({
            'slug': slug.group(1),
            'title': title.group(1),
            'category': category.group(1),
            'date': date.group(1) if date else '2026',
            'excerpt': excerpt.group(1) if excerpt else '',
            'tags': tags
        })

print(f"Parsed {len(articles)} articles")
pages_dir = 'src/pages'
count = 0

for art in articles:
    cat = art['category']
    slug = art['slug']
    page_dir = os.path.join(pages_dir, cat, slug)
    os.makedirs(page_dir, exist_ok=True)

    tags_html = ''
    if art['tags']:
        tag_spans = '\n        '.join(
            f'<span class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">{t}</span>'
            for t in art['tags']
        )
        tags_html = f'\n      <div class="mt-3 flex gap-2 flex-wrap">\n        {tag_spans}\n      </div>'

    # Aggressively clean HTML from title and excerpt
    clean_title = re.sub(r'<[^>]*>', '', art['title'])
    clean_title = re.sub(r'<[^>]*$', '', clean_title)
    clean_title = re.sub(r'[<>]', '', clean_title)
    clean_excerpt = re.sub(r'<[^>]*>', '', art['excerpt'])
    clean_excerpt = re.sub(r'<[^>]*$', '', clean_excerpt)
    clean_excerpt = re.sub(r'[<>]', '', clean_excerpt)

    # Use JSON.stringify for safe JS value encoding
    title_json = json.dumps(clean_title)
    desc_json = json.dumps(clean_excerpt)

    content = f'''---
import BaseLayout from '../../../layouts/BaseLayout.astro';

const cat = '{cat.replace("-", " ").title()}';
const pageTitle = {title_json};
const pageDesc = {desc_json};
---

<BaseLayout title={{pageTitle}} description={{pageDesc}}>
  <article class="mx-auto max-w-4xl px-4 py-8">
    <header class="mb-8">
      <p class="text-sm text-brand-500 font-medium mb-2">{{cat}}</p>
      <h1 class="text-3xl md:text-4xl font-bold text-white mb-3">{{pageTitle}}</h1>
      <time class="text-sm text-gray-500">{art['date']}</time>
      {tags_html}
    </header>
    <div class="prose prose-invert prose-gray max-w-none">
      <p>{{pageDesc}}</p>
    </div>
  </article>
</BaseLayout>
'''

    filepath = os.path.join(page_dir, 'index.astro')
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    count += 1

    if count % 50 == 0:
        print(f"  Progress: {count}/{len(articles)}")

print(f"Created {count} Astro article pages")
print(f"Categories: {sorted(set(a['category'] for a in articles))}")
