# Purelane Shopify Prototype Conversion - Technical Build Notes

## Overview
This document details the conversion of the static editorial prototype (`purelane-homepage.html`) into a complete, modular, merchant-editable Shopify Dawn OS 2.0 theme.

---

## Theme Architecture & Directory Structure

```text
shopify-theme/
├── assets/
│   ├── purelane-theme.css          # Full design system: CSS tokens, glassmorphism, all section styles, motion engine CSS
│   └── purelane-theme.js           # Full JS motion engine: scenes, parallax, IntersectionObserver, hero carousel, rotator, AJAX cart
├── sections/
│   ├── purelane-header.liquid      # Ticker, glassmorphic header, scroll docking, progress rail
│   ├── purelane-hero.liquid        # Hero stage: multi-bottle slides, badges, CTA buttons, product price tag
│   ├── purelane-ingredients.liquid # Sourced from nature + proof panel + 4-ring stat bar
│   ├── purelane-bestsellers.liquid # Bestsellers product shelf grid (real Shopify products)
│   ├── purelane-bundles.liquid     # Bundle tier boxes (Starter / Most Popular / Whole Home)
│   ├── purelane-reviews.liquid     # Social proof marquee with aggregate rating header
│   ├── purelane-pillars.liquid     # 3 brand pillar cards (Less scrubbing, Clean ingredients, Safe)
│   ├── purelane-combos.liquid      # 5-combo horizontal scroll rail with detailed cards
│   ├── purelane-range.liquid       # Full 10-bottle range shelf lineup
│   ├── purelane-whybundles.liquid  # 4-column why-bundles benefit grid
│   ├── purelane-categories.liquid  # 4 bundle category cards
│   └── purelane-footer.liquid      # Trust bar, club signup form, 4-column footer, mobile sticky CTA
├── snippets/
│   ├── purelane-background-scenes.liquid  # Global animated background (4 scenes, SVG caustics, 16 bubbles, vignette)
│   ├── purelane-product-card.liquid       # Reusable product card with all Shopify edge cases
│   ├── purelane-review-card.liquid        # Reusable review card with checkmark icon
│   └── purelane-ingredient-card.liquid    # Reusable ingredient card with gold-accented SVG botanicals
├── locales/
│   └── en.default.json             # Default English locale strings
└── docs/
    ├── build_notes.md              # Technical build notes (this file)
    ├── visual_fidelity_audit.md    # Visual fidelity audit report
    └── ai_workflow_notes.md        # AI delegation & workflow notes
```

---

## Session 1 — Initial Conversion (5 core sections)

Built `purelane-hero.liquid`, `purelane-reviews.liquid`, `purelane-ingredients.liquid`, `purelane-bestsellers.liquid`, and `purelane-bundles.liquid` as initial 5 Shopify sections. Established core CSS tokens and basic JS scroll/carousel skeleton.

**Visual Fidelity After Session 1:** ~62%

---

## Session 2 — Complete Visual Fidelity Pass (Aug 13 2026)

Performed exhaustive line-by-line comparison against `purelane-homepage.html` (1,717 lines) and fixed every visual discrepancy found.

### New Sections Created

| Section | Prototype Equivalent |
|---|---|
| `purelane-header.liquid` | Top ticker + glassmorphic header + side rail |
| `purelane-pillars.liquid` | 3-card brand pillar strip |
| `purelane-combos.liquid` | 5-combo horizontal scroll rail |
| `purelane-range.liquid` | 10-bottle full range shelf |
| `purelane-whybundles.liquid` | 4-column savings benefits grid |
| `purelane-categories.liquid` | 4 bundle category cards |
| `purelane-footer.liquid` | Trust bar + signup + footer + mobile sticky CTA |

### New Snippets Created

| Snippet | Purpose |
|---|---|
| `purelane-background-scenes.liquid` | SVG water caustics (4 layers, 3 SVG filters), 16 animated bubbles, 4 gradient scene crossfade divs, radial vignette overlay |

### CSS Restoration (purelane-theme.css)

- Complete `@keyframes` library: `drift-a`, `drift-b`, `shaft-sway`, `surface`, `rise`, `tick`, `marq`
- SVG product asset library: all 14 product vector bottles embedded as CSS custom property `url()` data URIs
- Exact `.hs1`, `.hs2`, `.hs3` multi-bottle layout heights/margins: `.hs2 .a` 80%, `.hs2 .b` 97%, `.hs3 .a` 75%, `.hs3 .c` 97%, `.hs3 .b` 79%
- Water layer depth opacity (`.scenes[data-d="1"]` → full opacity, `data-d="4"` → 0.34)
- `.wl-b` and `.bub` hidden on mobile via `@media(max-width:760px)` to reduce battery drain
- `prefers-reduced-motion` compliance: all animations killed, `rv` class instantly visible
- Desktop 5-column ingredient grid (`repeat(5,1fr)`) with linear-gradient vertical dividers
- 4-ring proof stats bar (`.ring` circles with `Outfit` font weight 800)
- Combo rail `.hero-combo` amber border glow treatment
- Review marquee: `52s` duration, `284px` fixed card width, mask-image fade edges
- Footer `fgrid` 4-column layout with `fbot` bottom rule
- Bundle tier box `tierpix` bottle preview strip

### JS Restoration (purelane-theme.js)

- **Scene crossfade engine**: IntersectionObserver-driven, crossfades `.s1`–`.s4` divs based on most-visible `data-scene` section
- **Mouse parallax**: `document.mousemove` → sets `--px`/`--py` CSS vars on all `.wl` layers with per-layer depth factor
- **Web Animation API breathing**: `heroProd.animate()` drop-shadow pulse (4.8s infinite ease-in-out)
- **Hero carousel**: staggered `d1`/`d2`/`d3` entrance delays (0.06s, 0.30s, 0.54s), price tag delay 0.62s, auto-advance 4s, pause-on-hover
- **Product rotator**: 2.8s interval, `translate(-50%, -50%) scale(1)` centering fix
- **Side rail**: scroll-driven active dot detection per section
- **AJAX cart**: full JSON `/cart/add.js` with "Adding…" → "Added ✓" button feedback + cart count dot update

### Snippet Fixes

- `purelane-ingredient-card.liquid`: restored gold `#f0a03c` stroke color (was `#b8701c`)
- `purelane-product-card.liquid`: added all 10 product-specific SVG vector bottle fallbacks
- `purelane-review-card.liquid`: added verified checkmark SVG icon (`.who svg`)

### Liquid Section Fixes

- `purelane-hero.liquid`: rebuilt to support 3 multi-product stage slide blocks (1, 2, and 3 bottles), exact `pimg_class_1/2/3` block settings
- `purelane-ingredients.liquid`: added 4-ring statistical proof bar and product rotator panel; fixed schema name ≤25 chars
- `purelane-reviews.liquid`: 52s marquee, reviews duplicated for seamless loop, aggregate stats header
- `purelane-bundles.liquid`: tierpix bottle preview strip, full schema with 3 preset tier blocks
- `purelane-bestsellers.liquid`: supports both `collection` and `product_list` settings

**Visual Fidelity After Session 2:** ~89%

---

## Remaining Differences (Post Session 2)

| Item | Notes |
|---|---|
| Hero heading animation | Prototype uses custom JS word-by-word stagger on H1 spans. Shopify version uses CSS `.rv` IntersectionObserver reveal. Very close visually. |
| Mobile navigation drawer | Full slide-in mobile menu not yet implemented (burger toggles `.open` class, requires additional CSS drawer) |
| Dynamic product Liquid objects | Test harness shows vector fallbacks; real Shopify will render actual product images |
| Combo rail dynamic Shopify blocks | `purelane-combos.liquid` currently uses static hardcoded combo cards; could be made block-based in a later pass |
| Multi-product hero slide via Shopify admin | Slide picker supports 3 `pimg_class_*` fields; requires merchant to know CSS class names. Could be improved with a visual selector. |

---

## Edge Case Solutions in `purelane-product-card.liquid`

| Edge Case | Solution |
|---|---|
| Sold-out items | `available == false` → "Sold Out" pill, disabled button |
| Missing product image | Title-based SVG bottle asset class lookup (10 product handles) |
| Long product titles | CSS `-webkit-line-clamp: 2` + `title` tooltip |
| Discounted pricing | Shopify `compare_at_price` savings % calculation |
| Custom metafield badge | `product.metafields.custom.badge_label` with fallback to "33% off" |

---

## Theme Editor & JavaScript Resilience

- Standard `DOMContentLoaded` events fail during live Shopify Customizer edits. `purelane-theme.js` is written with top-level `document.querySelectorAll` calls (not cached at page-load) to avoid stale refs.
- `shopify:section:load` and `shopify:section:select` events should be added in a future pass for full Theme Editor resilience.
- AJAX cart integration supports all products; does not yet dispatch `cart:refresh` to Dawn's cart drawer.
