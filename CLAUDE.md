# ÉLOW Estúdio Design — Project Notes

## Overview
- Brazilian branding/design studio: "Identidade visual que vende"
- Single `index.html` — all CSS and JS are inline (no external files)
- Custom cursor (`#cur`, `#cur2`) — keep it, it's intentional

## Page Sections (in order)
| Section | Class/ID | Background |
|---|---|---|
| Nav | `#nav` | Transparent → dark on scroll |
| Hero | `.hero` | `--navy3` + texture image |
| Problem | `.problem` | `--cream` (light section) |
| Portfolio | `.portfolio` | `--navy3` |
| Transform | `.transform` | `--navy2` |
| Stats Bar | `.stats-bar` | `--orange` |
| Deliverables | `.deliverables` | `--cream` (light section) |
| About | `.about` | `--navy3` |
| Process | `.process` | — |
| Testimonials | `.testimonials` | — |
| CTA | `.cta-section` | `--navy3` |
| Footer | `footer` | — |

## Design System

### Colours
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

### Font
- **League Spartan** — single font family, weights 300–900
- No icon library — SVG icons inline

### Button Style
- `.btn-primary` — orange, `clip-path: polygon(...)` cut-corner shape
- `.nav-cta` — same clip-path, smaller padding
- All CTAs currently link to WhatsApp: `https://wa.me/5521992247324`

### CTA Box (`.cta-box`)
- Large clip-path cut-corner box (48px cuts)
- Orange background with texture overlay
- Grid: `1fr auto` — heading left, button right (stacks on mobile)

## Key Design Details
- Cut-corner (polygon clip-path) is a core aesthetic — preserve it on all buttons and boxes
- Background images loaded via JS into CSS custom properties (`--img-textura_azul`, etc.)
- `.reveal` class: scroll-triggered fade-in via IntersectionObserver
- Logo: hosted externally at `elowestudiodesign.com.br`

## Mobile Breakpoints
- `768px` — nav collapses, grids stack
- `480px` — tighter padding, font sizes flatten

## Notes
- Do NOT add external CSS or JS files — keep everything inline per project structure
- Do NOT use frameworks — vanilla only
- Tone: bold, premium, Brazilian market
