$ErrorActionPreference = 'Stop'
$wt = 'C:\Users\SAMPC\zerobudgeting-us-astro'
$bodiesDir = "$wt\src\bodies"
$pagesDir = "$wt\src\pages"
$utf8 = New-Object System.Text.UTF8Encoding($false)

New-Item -ItemType Directory -Force -Path $bodiesDir | Out-Null

# ---------------------------------------------------------------
# 0. Stage public assets: crown css + assets + og-images into public/
# ---------------------------------------------------------------
$publicDir = "$wt\public"
New-Item -ItemType Directory -Force -Path $publicDir | Out-Null
foreach ($src in @("$wt\crown-design-system.css", "$wt\assets", "$wt\og-images")) {
  if (Test-Path $src) {
    Copy-Item $src $publicDir -Recurse -Force
    Write-Host "staged: $src -> public/"
  }
}
if (Test-Path "$wt\CNAME") { Copy-Item "$wt\CNAME" $publicDir -Force; Write-Host "staged: CNAME" }

# ---------------------------------------------------------------
# 1. Remove old category-dir stub pages (they are stubs + wrong URL shape)
# ---------------------------------------------------------------
$oldDirs = @('budgeting', 'general', 'meme-coins', 'saving', 'investing')
foreach ($d in $oldDirs) {
  $p = "$pagesDir\$d"
  if (Test-Path $p) { Remove-Item $p -Recurse -Force; Write-Host "removed old stub dir: $d" }
}

# ---------------------------------------------------------------
# 2. Extract article-content from each root HTML file
# ---------------------------------------------------------------
$htmlFiles = Get-ChildItem $wt -Filter *.html -File
$meta = @{}
$cleaned = @()
foreach ($f in $htmlFiles) {
  $slug = $f.BaseName
  $c = [System.IO.File]::ReadAllText($f.FullName)

  # title + description from head
  $title = ''
  $tm = [regex]::Match($c, '<title>([\s\S]*?)</title>')
  if ($tm.Success) { $title = $tm.Groups[1].Value.Trim() }
  $desc = ''
  $dm = [regex]::Match($c, '<meta name="description" content="([^"]*)"')
  if ($dm.Success) { $desc = $dm.Groups[1].Value.Trim() }
  # guard: malformed desc (contains HTML/newlines) -> fall back to og:description -> empty
  if ($desc -match '<' -or $desc -match "[\r\n]") {
    $ogm = [regex]::Match($c, '<meta property="og:description" content="([^"]*)"')
    $desc = if ($ogm.Success) { $ogm.Groups[1].Value.Trim() } else { '' }
    if ($desc -match '<' -or $desc -match "[\r\n]") { $desc = '' }
  }
  $canon = ''
  $cm = [regex]::Match($c, '<link rel="canonical" href="([^"]*)"')
  if ($cm.Success) { $canon = $cm.Groups[1].Value.Trim() }

  # body: extract <article class="article-content">...</article> if present, else full body
  $body = ''
  $am = [regex]::Match($c, '<article class="article-content">([\s\S]*?)</article>', 'IgnoreCase')
  if ($am.Success) {
    $body = $am.Groups[1].Value.Trim()
  } else {
    $bStart = $c.IndexOf('<body')
    $bEnd = $c.IndexOf('</body>')
    if ($bStart -ge 0 -and $bEnd -gt $bStart) {
      $body = $c.Substring($bStart, $bEnd - $bStart)
      $gtIdx = $body.IndexOf('>')
      if ($gtIdx -ge 0) { $body = $body.Substring($gtIdx + 1) }
      # strip old nav/footer/scripts
      $body = [regex]::Replace($body, '<nav[^>]*>[\s\S]*?</nav>', '', 'IgnoreCase')
      $body = [regex]::Replace($body, '<footer[^>]*>[\s\S]*?</footer>', '', 'IgnoreCase')
      $body = [regex]::Replace($body, '<script[\s\S]*?</script>', '', 'IgnoreCase')
      $body = $body.Trim()
    }
  }
  # strip any leftover old-site nav/footer/scripts inside extracted content
  $body = [regex]::Replace($body, '<nav[^>]*>[\s\S]*?</nav>', '', 'IgnoreCase')
  $body = [regex]::Replace($body, '<footer[^>]*>[\s\S]*?</footer>', '', 'IgnoreCase')
  $body = [regex]::Replace($body, '<script[\s\S]*?</script>', '', 'IgnoreCase')

  if ($body.Length -lt 50) { Write-Host "WARN short body: $slug ($($body.Length))" }

  [System.IO.File]::WriteAllBytes("$bodiesDir\$slug.html", $utf8.GetBytes($body))
  $meta[$slug] = @{ title = $title; desc = $desc; canonical = $canon }
  $cleaned += $slug
}
Write-Host "`nExtracted bodies: $($cleaned.Count)"

# ---------------------------------------------------------------
# 3. decode HTML entities (hex + named) in titles/descs
# ---------------------------------------------------------------
$web = [System.Net.WebUtility]
foreach ($k in @($meta.Keys)) {
  $m = $meta[$k]
  $m.title = [regex]::Replace($m.title, '&#x([0-9A-Fa-f]+);', { param($mm) [char]::ConvertFromUtf32([Convert]::ToInt32($mm.Groups[1].Value, 16)) })
  $m.desc = [regex]::Replace($m.desc, '&#x([0-9A-Fa-f]+);', { param($mm) [char]::ConvertFromUtf32([Convert]::ToInt32($mm.Groups[1].Value, 16)) })
  $m.title = $web::HtmlDecode($m.title)
  $m.desc = $web::HtmlDecode($m.desc)
  $meta[$k] = $m
}

# ---------------------------------------------------------------
# 4. Write meta.json (proper JSON serialization)
# ---------------------------------------------------------------
$obj = [ordered]@{}
foreach ($k in ($meta.Keys | Sort-Object)) { $obj[$k] = $meta[$k] }
$json = ConvertTo-Json $obj -Depth 4
[System.IO.File]::WriteAllBytes("$bodiesDir\meta.json", $utf8.GetBytes($json))
Write-Host "meta.json written: $($obj.Count) entries"

# ---------------------------------------------------------------
# 5. Generate per-slug article .astro pages (flat URLs)
# ---------------------------------------------------------------
$skipPages = @('index', '404', 'about', 'all-articles', 'contact', 'privacy', 'disclaimer', 'checklist', 'store', 'thank-you', 'checkout', 'products')
$tpl = @'
---
import BaseLayout from '../layouts/BaseLayout.astro';
import CTA from '../components/CTA.astro';
import body from '../bodies/{SLUG}.html?raw';

const title = {TITLE_JSON};
const description = {DESC_JSON};
const canonical = {CANON_JSON};
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: title,
  description: description,
  url: canonical,
  mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
  publisher: { '@type': 'Organization', name: 'ZeroBudgeting' },
};
---

<BaseLayout title={title} description={description} canonical={canonical}>
  <script type="application/ld+json" set:html={JSON.stringify(jsonLd)} />
  <article class="mx-auto max-w-4xl px-4 py-8">
    <Fragment set:html={body} />
    <div class="mt-12 text-center">
      <CTA href="/all-articles" text="Browse More Articles" variant="secondary" />
    </div>
  </article>
</BaseLayout>
'@

$pageCount = 0
foreach ($slug in $cleaned) {
  if ($skipPages -contains $slug) { continue }
  $m = $meta[$slug]
  $content = $tpl.Replace('{SLUG}', $slug).Replace('{TITLE_JSON}', (ConvertTo-Json $m.title)).Replace('{DESC_JSON}', (ConvertTo-Json $m.desc)).Replace('{CANON_JSON}', (ConvertTo-Json ($m.canonical)))
  [System.IO.File]::WriteAllBytes("$pagesDir\$slug.astro", $utf8.GetBytes($content))
  $pageCount++
}
Write-Host "Generated article pages: $pageCount"

# ---------------------------------------------------------------
# 6. Generate special pages
# ---------------------------------------------------------------
$specialTpl = @'
---
import BaseLayout from '../layouts/BaseLayout.astro';
import body from '../bodies/{SLUG}.html?raw';

const title = {TITLE_JSON};
const description = {DESC_JSON};
const canonical = {CANON_JSON};
---

<BaseLayout title={title} description={description} canonical={canonical}>
  <div class="mx-auto max-w-4xl px-4 py-8">
    <Fragment set:html={body} />
  </div>
</BaseLayout>
'@

foreach ($slug in $skipPages) {
  $bfile = "$bodiesDir\$slug.html"
  if (-not (Test-Path $bfile)) { Write-Host "WARN no body for special page: $slug"; continue }
  $m = $meta[$slug]
  if (-not $m) { $m = @{ title = $slug; desc = ''; canonical = "https://zerobudgeting.com/$slug" } }
  $content = $specialTpl.Replace('{SLUG}', $slug).Replace('{TITLE_JSON}', (ConvertTo-Json $m.title)).Replace('{DESC_JSON}', (ConvertTo-Json $m.desc)).Replace('{CANON_JSON}', (ConvertTo-Json ($m.canonical)))
  [System.IO.File]::WriteAllBytes("$pagesDir\$slug.astro", $utf8.GetBytes($content))
  Write-Host "special page: $slug.astro"
}

Write-Host "`nDONE. bodies=$($cleaned.Count) pages=$($pageCount + $skipPages.Count)"
