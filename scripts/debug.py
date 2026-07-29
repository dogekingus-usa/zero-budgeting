#!/usr/bin/env python3
import re, os

with open('articles-data.js', encoding='utf-8', errors='replace') as f:
    raw = f.read()

# Find ALL article excerpts and titles with problematic content
problems = []
for m in re.findall(r'\{([^}]+)\}', raw):
    title = re.search(r'title:\s*"(.*?)",\s*slug', m)
    slug = re.search(r'slug:\s*"([^"]+)"', m)
    excerpt = re.search(r'excerpt:\s*"(.*?)",\s*tags?', m)
    
    t = title.group(1) if title else ''
    e = excerpt.group(1) if excerpt else ''
    s = slug.group(1) if slug else ''
    
    # Check for issues
    issues = []
    if '"' in t: issues.append(f'quote_in_title')
    if '{' in t: issues.append(f'brace_in_title')
    if '<' in t or '>' in t: issues.append(f'html_in_title')
    if '"' in e: issues.append(f'quote_in_excerpt')
    if '{' in e: issues.append(f'brace_in_excerpt')
    if '\\' in t or '\\' in e: issues.append('backslash')
    
    if issues:
        problems.append((s, t, issues))

print(f"Total problematic articles: {len(problems)}")
for s, t, issues in problems[:20]:
    print(f"  {s}: {issues}")
    print(f"    Title: {t[:80]}")
