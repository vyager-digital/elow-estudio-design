# ÉLOW Estúdio Design — Project Notes

Brazilian branding/design studio. Site is PT-BR. Tone: bold, premium, Brazilian market.
Retainer client plus a referral partnership — see `partnership-terms.md`.

## Repo & deployment
Repo: `vyager-digital/elow-estudio-design`. Repo root is this folder.
Two **Cloudflare Pages** projects, both git-connected to the same repo:

| Pages project | Build root | Serves |
|---|---|---|
| Main website | `website/` | elowestudiodesign.com.br |
| Landing page | `website/identidade-visual/` | paid-traffic LP |

**`index.html` at the repo root is the old single-page prototype. It is not deployed.**
Don't edit it thinking you're editing the site. The live home page is `website/index.html`.

## Pages (all in `website/`)
`index.html` (home) · `about.html` · `services.html` · `portfolio.html` ·
`projeto.html` (project detail, reads its slug from the URL) · `privacy.html` · `terms.html` ·
`identidade-visual/index.html` (the LP) · `admin/` (portfolio upload portal)

All CSS and JS are inline in each page. No external CSS/JS files, no frameworks.

## Working rules
- **Fix every page, not one.** Bugs exist independently in each `website/*.html`. Patch all of them.
- **Nav structure differs by page.** `index.html` puts the CTA and language switcher inside
  `.nav-desktop` (768px breakpoint). The other pages use an anonymous inline-styled flex
  wrapper with `.nav-menu` (960px). Check both patterns before touching nav CSS.
- **Diagnose before changing a live page.** Pages here receive paid traffic. Read the HTML
  structure first: inline styles, missing JS and wrong DOM order are invisible to a CSS-only
  read. Diagnose → explain → then apply.
- **If a change doesn't show, ask which page Sean is viewing** before blaming cache.
- **Sean doesn't read Portuguese.** All analysis and suggestions in English. Never quote a PT
  string inline without an English gloss.
- **Script tags go after the elements they reference.**
- **Hero vertical padding must use `clamp()`.** Fixed px on the hero repeatedly causes
  viewport overflow.

## Gotchas specific to this stack
- **Cloudflare recompresses file-served WebP at the edge**, even with Polish off and
  `no-transform` set. Critical CSS background textures must be inlined as base64 data URIs
  (encode at q95). Anything that looks blurry despite a clean source is this.
- **`_redirects` uses clean destinations.** `/projeto/* /projeto 200` — never `/projeto.html`,
  that causes a 308 loop. Cloudflare Pages serves `index.html` for unmatched routes unless a
  `404.html` exists.
- **Language switcher uses URL params** (`?lang=en`, `?lang=es`; PT is the default with no
  param), not Google Translate cookies — GT cookies break on shared `pages.dev` domains.

## Portfolio uploads
Élow adds projects via a Drive folder (`Élow Estúdio/Website Assets/Portfolio Uploads/`,
`Setor/Título - Categoria/`), then `node scripts/sync-portfolio.js [--dry-run]`.
Admin portal at `website/admin/`. Full detail: memory `elow_project_elow_portfolio_upload_system`.

## Design system — `website/` pages and the LP
League Spartan only, weights 300–900. Inline SVG icons, no icon library.
Custom cursor (`#cur`, `#cur2`) is intentional — keep it.
Cut-corner `clip-path: polygon(...)` is a core aesthetic — preserve it on all buttons and boxes.

| Variable | Hex | Usage |
|---|---|---|
| `--navy` | `#1C2C36` | Cards, UI elements |
| `--navy2` | `#162229` | Section backgrounds |
| `--navy3` | `#0f181e` | Main background |
| `--orange` | `#C57040` | Primary CTA, accents |
| `--golden` | `#C9892D` | Secondary accent, labels, eyebrows |
| `--cream` | `#F8EBCE` | Primary text, light section background |
| `--gold-light` | `#D5B26B` | Subtle highlights |
| `--gold-muted` | `#AC9157` | Muted accents |
| `--gray-light` | `#E3E3E3` | Borders on light sections |
| `--gray-dark` | `#706F6F` | Subdued text |

- Background textures load via JS into CSS custom properties (`--img-textura_azul`, etc.)
- `.reveal` — scroll-triggered fade-in via IntersectionObserver
- Breakpoints: 768px (nav collapses, grids stack) · 480px (tighter padding, flatter type)
- CTAs link to WhatsApp: `https://wa.me/5521992247324`

## Full project memory
`elow_index` in the memory store — 39 entries covering Google Ads, GTM tracking, the
partnership terms and dynamics, the proposal system, and collab leads.
