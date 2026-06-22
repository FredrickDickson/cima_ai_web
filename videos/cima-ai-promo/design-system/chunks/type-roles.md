# Type-roles atlas — Neo-Brutalism

Phase 4b scene worker reads this when text outside §6 components is needed (hero displays, ledes, pill rows, CTA buttons, …). Workflow: pick role by id → paste the CSS rule into scene `<style>` with `s<N>-` prefix on the class names → wrap content using the prefixed class. Family tokens (`var(--font-*)`) resolve to brand DNA at scene-render time.

## type-role: display-cover

- family: display · px: 200–340 · weight: 800
- leading: 0.86 · tracking: -0.04em · case: upper
- purpose: cover hero at maximum scale — one huge thing per scene, ink on canvas

```css
.t-trole-display-cover {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(120px, 16vw, 340px);
  line-height: 0.86;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-display-cover">BRAND</div>
```

## type-role: headline

- family: display · px: 96–160 · weight: 800
- leading: 0.9 · tracking: -0.03em · case: upper
- purpose: primary slide headline — declarative manifesto voice

```css
.t-trole-headline {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(72px, 9vw, 160px);
  line-height: 0.9;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-headline">TEAMS. SHIP.</div>
```

## type-role: statement

- family: display · px: 56–96 · weight: 800
- leading: 1 · tracking: -0.02em · case: upper
- purpose: framed declarative quote on canvas — thick border + hard offset shadow

```css
.t-trole-statement {
  display: inline-block;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(48px, 6vw, 96px);
  line-height: 1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: var(--ink);
  background: var(--canvas);
  border: var(--border-bold);
  box-shadow: var(--shadow-hard);
  padding: 24px 32px;
  max-width: 22ch;
}
```

Sample:

```html
<div><span class="t-trole-statement">ONE HUGE THING. NO APOLOGY.</span></div>
```

## type-role: number-hero

- family: display · px: 120–240 · weight: 800
- leading: 0.9 · tracking: -0.04em · case: upper
- purpose: hero statistic numeral — ink on canvas, no decoration

```css
.t-trole-number-hero {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(96px, 14vw, 240px);
  line-height: 0.9;
  letter-spacing: -0.04em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-number-hero">340%</div>
```

## type-role: h2

- family: display · px: 56–96 · weight: 800
- leading: 0.95 · tracking: -0.03em · case: upper
- purpose: secondary headline / section title

```css
.t-trole-h2 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(48px, 6vw, 96px);
  line-height: 0.95;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-h2">Section title</div>
```

## type-role: h3

- family: display · px: 32–48 · weight: 800
- leading: 1 · tracking: -0.02em · case: upper
- purpose: panel title / card heading

```css
.t-trole-h3 {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(28px, 3.2vw, 48px);
  line-height: 1;
  letter-spacing: -0.02em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-h3">Sub-headline</div>
```

## type-role: eyebrow

- family: body · px: 24–30 · weight: 700
- leading: 1.2 · tracking: 0.18em · case: upper
- purpose: eyebrow label above a headline — tracked uppercase Inter 700

```css
.t-trole-eyebrow {
  font-family: var(--font-body);
  font-weight: 700;
  font-size: clamp(24px, 1.8vw, 30px);
  line-height: 1.2;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-eyebrow">Vol. 01 — Manifesto</div>
```

## type-role: lead

- family: body · px: 28–40 · weight: 500
- leading: 1.4 · tracking: 0 · case: sentence
- purpose: lead paragraph / opening sentence (Inter 500)

```css
.t-trole-lead {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: clamp(28px, 2.6vw, 40px);
  line-height: 1.4;
  color: var(--ink);
  max-width: 48ch;
  margin: 0;
}
```

Sample:

```html
<p class="t-trole-lead">Hard edges. Declarative typography. Shadow is weight, not depth.</p>
```

## type-role: body

- family: body · px: 24–30 · weight: 500
- leading: 1.55 · tracking: 0 · case: sentence
- purpose: default body paragraph (Inter 500)

```css
.t-trole-body {
  font-family: var(--font-body);
  font-weight: 500;
  font-size: clamp(24px, 1.7vw, 30px);
  line-height: 1.55;
  color: var(--ink);
  max-width: 60ch;
  margin: 0;
}
```

Sample:

```html
<p class="t-trole-body">Body sits at Inter 500. Sentence case, terse. The manifesto is in the display; the body is the receipt.</p>
```

## type-role: caption

- family: mono · px: 24–28 · weight: 700
- leading: 1.4 · tracking: 0.04em · case: sentence
- purpose: caption / source attribution (Space Mono 700)

```css
.t-trole-caption {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(24px, 1.5vw, 28px);
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: color-mix(in srgb, var(--ink) 72%, transparent);
  margin: 0;
}
```

Sample:

```html
<p class="t-trole-caption">Source: internal data, 2026.</p>
```

## type-role: label-mono

- family: mono · px: 24–28 · weight: 700
- leading: 1.3 · tracking: 0.16em · case: upper
- purpose: tracked uppercase mono label — chrome bar, slide counter, chip metadata

```css
.t-trole-label-mono {
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: clamp(24px, 1.5vw, 28px);
  line-height: 1.3;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-label-mono">01 / MANIFESTO</div>
```

## type-role: chip-loud

- family: display · px: 26–36 · weight: 800
- leading: 1 · tracking: 0.04em · case: upper
- purpose: ink pill chip — canvas text on ink fill, thick border, slight tilt

```css
.t-trole-chip-loud {
  display: inline-block;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(26px, 2vw, 36px);
  line-height: 1;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  background: var(--ink);
  color: var(--canvas);
  border: 2px solid var(--ink);
  padding: 10px 22px;
  transform: rotate(var(--tilt-l));
}
```

Sample:

```html
<div><span class="t-trole-chip-loud">SHIP IT</span></div>
```

## type-role: cta-arrow

- family: display · px: 28–44 · weight: 800
- leading: 1 · tracking: -0.01em · case: upper
- purpose: arrow-prefixed CTA — declarative imperative with hit-and-stick weight

```css
.t-trole-cta-arrow {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(24px, 2.6vw, 44px);
  line-height: 1;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  color: var(--ink);
}
```

Sample:

```html
<div class="t-trole-cta-arrow">→ JOIN THE DROP</div>
```
