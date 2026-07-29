#!/usr/bin/env python3
import re, os
with open('articles-data.js', encoding='utf-8', errors='replace') as f:
    content = f.read()
slugs = re.findall(r'slug:\s*"([^"]+)"', content)
cats = re.findall(r'category:\s*"([^"]+)"', content)
titles = re.findall(r'title:\s*"([^"]+)"', content)
unique_cats = sorted(set(cats))
html = [f for f in os.listdir('.') if f.endswith('.html') and os.path.isfile(f)]
print(f"Articles: {len(slugs)}")
print(f"HTML files: {len(html)}")
print(f"Categories: {unique_cats}")
if slugs:
    print(f"First: {titles[0]} -> {slugs[0]}")
