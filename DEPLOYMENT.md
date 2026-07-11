# Deployment
This site deploys via **GitHub Pages** from the main branch.

## How it works
1. Push changes to main branch
2. GitHub Pages auto-builds from repo root
3. Cloudflare DNS (grey cloud, unproxied) routes requests to GitHub Pages IPs

## Never
- Do NOT request Cloudflare API tokens
- Do NOT use Cloudflare Pages or Workers for hosting
- Cloudflare is DNS management only

See shared/DEPLOYMENT-STANDARD.md for full policy.

