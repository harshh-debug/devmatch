# Design

## Theme

Both light and dark modes, respecting `prefers-color-scheme`.

Light mode uses pure white as the architectural surface (Vercel/Stripe approach) — the brand personality lives in the primary accent and typography, not in the background. Dark mode uses near-black with the same restrained approach.

## Color Palette

### Light Mode

| Role | Value | Usage |
|------|-------|-------|
| `--color-bg` | `oklch(1 0 0)` | Page background — pure white |
| `--color-surface` | `oklch(0.97 0.003 330)` | Card, section, or panel backgrounds |
| `--color-ink` | `oklch(0.12 0.008 330)` | Body text — near-black with brand hint |
| `--color-primary` | `oklch(0.58 0.22 342)` | Primary brand accent (vibrant rose-pink) — used for CTAs, links, focus rings |
| `--color-primary-hover` | `oklch(0.52 0.23 342)` | Primary hover state |
| `--color-accent` | `oklch(0.55 0.12 210)` | Secondary brand accent (cool blue-teal) — badges, status pills, secondary links |
| `--color-muted` | `oklch(0.50 0.005 330)` | Secondary text, captions, placeholders |
| `--color-border` | `oklch(0.90 0.003 330)` | Hairline rules, dividers, input borders |
| `--color-ring` | `oklch(0.58 0.22 342)` | Focus ring — matches primary |

### Dark Mode

| Role | Value | Usage |
|------|-------|-------|
| `--color-bg` | `oklch(0.08 0 0)` | Page background — near-black |
| `--color-surface` | `oklch(0.12 0.003 330)` | Card, section, or panel backgrounds |
| `--color-ink` | `oklch(0.93 0.005 330)` | Body text — near-white |
| `--color-primary` | `oklch(0.72 0.17 342)` | Primary brand accent — bright rose for dark mode |
| `--color-primary-hover` | `oklch(0.76 0.17 342)` | Primary hover state |
| `--color-accent` | `oklch(0.65 0.10 210)` | Secondary brand accent |
| `--color-muted` | `oklch(0.55 0.005 330)` | Secondary text, captions, placeholders |
| `--color-border` | `oklch(0.20 0.003 330)` | Hairline rules, dividers, input borders |
| `--color-ring` | `oklch(0.72 0.17 342)` | Focus ring — matches primary |

### Color Rationale

The seed `oklch(0.45 0.15 330)` — a deep, muted rose — is the unexpected signature. On a developer tool, this hue is distinctive without being loud. It reads as "restrained confidence" rather than the expected blue or green. The cool blue-teal accent (`210°`) provides a complementary second note for badges and decorative elements, while the near-black/white architecture keeps the page feeling like a precision tool.

### Text-on-Color Contrast

- Primary/accent filled elements: always use near-white text (from `--color-bg` in matching mode)
- This follows the Helmholtz-Kohlrausch principle: saturated colors appear brighter than their luminance, so white text on mid-luminance fills reads better than dark text

## Typography

### Font Stack

| Role | Family | Fallback |
|------|--------|----------|
| Display / Headings | `"Space Grotesk"` | `sans-serif` |
| Body | `"Inter"` | `sans-serif` |
| Code / Mono | `"JetBrains Mono"` | `monospace` |

Space Grotesk for headings gives a geometric, slightly characterful presence — technical but not cold. Inter for body provides maximum readability at small sizes, the developer-tool standard. JetBrains Mono for code snippets and data displays.

### Type Scale

```css
--text-xs:   0.75rem;   /* 12px — captions, metadata */
--text-sm:   0.875rem;  /* 14px — small body, nav */
--text-base: 1rem;      /* 16px — body */
--text-lg:   1.125rem;  /* 18px — large body */
--text-xl:   1.25rem;   /* 20px — small heading */
--text-2xl:  1.5rem;    /* 24px — heading */
--text-3xl:  1.875rem;  /* 30px — section heading */
--text-4xl:  2.25rem;   /* 36px — large heading */
--text-5xl:  3rem;      /* 48px — hero heading */
--text-6xl:  3.75rem;   /* 60px — display (clamped max) */
```

### Type Rules

- Body line length: 65–75ch
- `text-wrap: balance` on h1–h3
- `text-wrap: pretty` on long prose paragraphs
- Display heading letter-spacing: ≥ -0.04em (no tighter)
- Hero heading clamp ceiling: max 6rem (~96px)

## Spacing

A 4px base unit scale:

```css
--space-1:  0.25rem;  /*  4px */
--space-2:  0.5rem;   /*  8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-5:  1.25rem;  /* 20px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

## Border Radius

```css
--radius-sm:   0.25rem;   /*  4px */
--radius-md:   0.5rem;    /*  8px */
--radius-lg:   0.75rem;   /* 12px */
--radius-xl:   1rem;      /* 16px */
--radius-full: 9999px;    /* pills */
```

## Shadows

Subtle, no floating effects. Applied to elevated components only.

```css
--shadow-sm:   0 1px 2px oklch(0 0 0 / 0.05);
--shadow-md:   0 4px 6px -1px oklch(0 0 0 / 0.08);
--shadow-lg:   0 10px 15px -3px oklch(0 0 0 / 0.10);
```

## z-Index Scale

```css
--z-dropdown:  100;
--z-sticky:    200;
--z-modal-bg:  300;
--z-modal:     400;
--z-toast:     500;
--z-tooltip:   600;
```

## Motion

Subtle, purposeful. Every animation is default "off" and opts in via `prefers-reduced-motion: no-preference`.

### Durations

```css
--duration-fast:    150ms;
--duration-normal:  300ms;
--duration-slow:    500ms;
```

### Easing

```css
--ease-out: cubic-bezier(0.16, 1, 0.3, 1);     /* expo-like — standard exit */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1); /* standard in-out */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* micro-interactions */
```

### Animation Types

- **Scroll reveals:** fade-in + translateY(24px) → translateY(0) at --duration-slow
- **Hover micro-interactions:** scale(1.02) or color transitions at --duration-fast
- **Page load:** staggered fade-in of hero elements (headline → subtitle → CTA) at 100ms intervals
- **Reduced motion:** all animations collapse to instant (duration 0ms) or crossfade only

## Layout Principles

- Sections use generous vertical rhythm (--space-24 to --space-32 between sections)
- Content max-width: 1200px, centered with auto margins
- No card grids by default — vary section layout for rhythm
- Flexbox for 1D, Grid for 2D
- Responsive: single-column on mobile, multi-column on tablet/desktop
- Mobile: 1rem padding, Desktop: 2rem padding

## Component-Specific

### Buttons

- Border-radius: --radius-md
- Padding: 0.75rem 1.5rem (horizontal), 0.5rem 1.25rem (compact)
- Primary: filled --color-primary background, white text
- Secondary: transparent background, --color-border border, --color-ink text
- Ghost: no border/background, --color-ink text
- Focus ring: 2px solid --color-ring, 2px offset

### Navigation

- Sticky top bar, backdrop-blur support
- Max 5 items
- Active state: --color-primary text

### Links

- --color-primary text, underline on hover
- No blue-by-default — use primary hue

## Responsive Breakpoints

```css
--bp-sm:  640px;
--bp-md:  768px;
--bp-lg:  1024px;
--bp-xl:  1280px;
```