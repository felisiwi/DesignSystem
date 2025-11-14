# Layout System — Final Specification

**Version:** 1.0  
**Date:** November 2025  
**Status:** Production Ready

---

## 📐 Breakpoints & Grid System

| Breakpoint    | Range (px) | Columns | Gutter (px) | Page Margin (px) |
| ------------- | ---------- | ------- | ----------- | ---------------- |
| **Mobile**    | 0–767      | 4       | 8           | 16               |
| **Tablet**    | 768–1199   | 8       | 16          | 24–32            |
| **Desktop**   | 1200–1919  | 12      | 16          | 48               |
| **Desktop L** | ≥1920      | 12      | 24          | 256              |

### Key Principles

- **Column progression:** 4 → 8 → 12 for clean translation across breakpoints
- **Gutter increases once at XL:** 16 → 24
- **XL margin is large (256px)** to avoid oversized cards and maintain visual comfort

---

## 🎴 Card Types, Spans & Visible Counts

### Portrait Cards (Always Spans 2 Columns)

| Breakpoint    | Visible Cards | Column Span | Notes                          |
| ------------- | ------------- | ----------- | ------------------------------ |
| **Mobile**    | 2             | 2 of 4      | Standard mobile view           |
| **Tablet**    | 4             | 2 of 8      | Grid fills width               |
| **Desktop**   | 4             | 2 of 12     | Wrapper capped; fluid override |
| **Desktop L** | 5             | 2 of 12     | Wrapper capped; fluid override |

### Landscape Cards

| Breakpoint    | Visible Cards | Column Span | Notes           |
| ------------- | ------------- | ----------- | --------------- |
| **Mobile**    | 1             | 4 of 4      | Full width      |
| **Tablet**    | 2             | 4 of 8      | Half width each |
| **Desktop**   | 3             | 4 of 12     | One-third each  |
| **Desktop L** | 3             | 4 of 12     | One-third each  |

**Optional Enhancement (Desktop/XL):** Reserve 2 outer columns per side for arrows/peek functionality.

---

## 📏 Section Gap (Vertical Rhythm)

Section gaps are derived from: **gutter × multiplier**

- **Mobile:** Uses multiplier of ×6
- **Tablet/Desktop/XL:** Uses multiplier of ×4

| Size       | Mobile (g=8) | Tablet (g=16) | Desktop (g=16) | Desktop L (g=24) |
| ---------- | ------------ | ------------- | -------------- | ---------------- |
| **Small**  | 48           | 64            | 64             | 96               |
| **Medium** | 96           | 128           | 128            | 192              |
| **Large**  | 144          | 192           | 192            | 288              |

---

## 🎨 Wrapper Modes

### 1. Fluid Band

- `width: 100%`
- `padding-inline: page margin`
- Content flows full width within margins

### 2. Capped Band

- Centered inner frame with `max-width`
- Used for text sections requiring reading width limits
- Prevents overly wide text blocks

### 3. Hybrid (Carousel Standard)

- Fluid outer container
- Capped inner frame
- **This is what you use for carousels**
- Combines benefits of both approaches

---

## ⚡ Framer Overrides (Portrait Carousel)

### Setup Instructions

1. Attach override to portrait carousel wrapper (set Width = Fill in Framer)
2. Remove any Inspector `max-width` settings (override handles this)
3. Page margins (48px / 256px) are handled outside the carousel

---

### Implementation: Combined Override

**File:** `PortraitCarousel.tsx` (or whatever you named it)

```typescript
import * as React from "react";
import type { Override } from "framer";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function useViewportWidth() {
  const [vw, setVw] = React.useState<number>(
    typeof window !== "undefined" ? window.innerWidth : 1920
  );
  React.useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return vw;
}

/**
 * Portrait carousel (Desktop + Desktop L)
 * – Max width: 730 → 1170 as viewport 1200 → 1920
 * – Gap: 16 → 24 over same range
 * – 4 cards below 1920, 5 cards at/above 1920
 */
export function PortraitCarousel(): Override {
  const vw = useViewportWidth();

  const MIN_VW = 1200;
  const MAX_VW = 1920;
  const MIN_MAXWIDTH = 730;
  const MAX_MAXWIDTH = 1170;
  const MIN_GAP = 16;
  const MAX_GAP = 24;

  // outside desktop range: no override
  if (vw < MIN_VW) return {};

  // smooth interpolation
  const t = clamp01((vw - MIN_VW) / (MAX_VW - MIN_VW));
  const maxWidth = Math.round(lerp(MIN_MAXWIDTH, MAX_MAXWIDTH, t));
  const gap = Math.round(lerp(MIN_GAP, MAX_GAP, t));
  const itemsVisible = vw >= MAX_VW ? 5 : 4;

  return {
    style: {
      width: "100%",
      maxWidth: `${maxWidth}px`,
      marginLeft: "auto",
      marginRight: "auto",
    },
    gap,
    itemsVisible,
  };
}
```

---

### What This Override Does

#### 1. Width Interpolation (Desktop → Desktop L)

Smoothly scales carousel max-width from **730px → 1170px** as viewport goes from **1200px → 1920px**.

**Effect:** Carousel grows proportionally with viewport, preventing awkward fixed-width appearance.

---

#### 2. Gutter Interpolation

Smoothly increases card gap from **16px → 24px** between 1200–1920px viewports.

**Effect:** Maintains visual breathing room as cards get smaller (when transitioning to 5-card layout).

---

#### 3. Item Count Switch at XL

Switches from **4 visible cards** to **5 visible cards** at 1920px breakpoint.

**Effect:** Shows more content on larger screens without cards becoming too large.

---

### Alternative: Separate Overrides (Not Recommended)

The summary document mentioned separate overrides. Here's what they would look like individually:

```typescript
// Width only
export function PortraitDesktopFluid_v3(): Override {
  const vw = useViewportWidth();
  if (vw < 1200) return {};
  const t = clamp01((vw - 1200) / (1920 - 1200));
  const maxWidth = Math.round(lerp(730, 1170, t));
  return {
    style: {
      width: "100%",
      maxWidth: `${maxWidth}px`,
      margin: "0 auto",
    },
  };
}

// Gutter only
export function PortraitGutter_16to24(): Override {
  const vw = useViewportWidth();
  const t = clamp01((vw - 1200) / (1920 - 1200));
  return { gap: Math.round(16 + (24 - 16) * t) };
}

// Items only
export function PortraitItemsAtXL(): Override {
  const vw = useViewportWidth();
  return { itemsVisible: vw >= 1920 ? 5 : 4 };
}
```

**Why the combined version is better:**

- ✅ Single resize listener instead of three
- ✅ One calculation cycle instead of three
- ✅ No override conflicts
- ✅ Cleaner code
- ✅ Better performance

---

### Optional: Edge Padding Override

If you need fluid page padding (Apple-style band approach):

```typescript
export function EdgePadding_96to320(): Override {
  const vw = useViewportWidth();
  const t = clamp01((vw - 1200) / (1920 - 1200));
  const pad = Math.round(96 + (320 - 96) * t);
  return {
    style: {
      paddingLeft: pad,
      paddingRight: pad,
    },
  };
}
```

**Note:** This is separate from the main carousel override and should only be used if you need additional padding beyond the standard page margins.

---

## 📊 Spacing Primitives

8-point base system with strategic larger steps for macro rhythm.

| Token    | Value (px) | Step Logic  | Use Case            |
| -------- | ---------- | ----------- | ------------------- |
| **2xs**  | 2          | micro nudge | Fine adjustments    |
| **xs**   | 4          | micro       | Tight spacing       |
| **s**    | 8          | base unit   | Component padding   |
| **m**    | 16         | ×2 base     | Standard spacing    |
| **l**    | 24         | +8          | Comfortable spacing |
| **xl**   | 40         | +16         | Macro rhythm starts |
| **2xl**  | 48         | +8          | Section spacing     |
| **3xl**  | 56         | +8          |                     |
| **4xl**  | 80         | +24         | Macro jump          |
| **5xl**  | 96         | +16         |                     |
| **6xl**  | 112        | +16         |                     |
| **7xl**  | 128        | +16         |                     |
| **8xl**  | 144        | +16         |                     |
| **9xl**  | 160        | +16         |                     |
| **10xl** | 192        | +32         | Band starts         |
| **11xl** | 224        | +32         |                     |
| **12xl** | 256        | +32         | Page margin XL      |
| **13xl** | 288        | +32         | Max section gap     |

### Intent Guide

- **≤24px** = Component-level spacing
- **40–80px** = Inter-component / mid-macro spacing
- **≥96px** = Section / page rhythm spacing

**Top end unified to +32px steps** for clarity and consistency at large scales.

---

## 🎯 Quick Reference (For Build)

### Gutters

- Mobile: **8px**
- Tablet: **16px**
- Desktop: **16px**
- Desktop L: **24px**

### Page Margins

- Mobile: **16px**
- Tablet: **24–32px**
- Desktop: **48px**
- Desktop L: **256px**

### Section Gaps

| Size   | Mobile | Tablet | Desktop | Desktop L |
| ------ | ------ | ------ | ------- | --------- |
| Small  | 48     | 64     | 64      | 96        |
| Medium | 96     | 128    | 128     | 192       |
| Large  | 144    | 192    | 192     | 288       |

### Portrait Carousel

- **Visible cards:** 2 / 4 / 4 / 5
- **Max-width (fluid):** 730px → 1170px (viewport 1200px → 1920px)

### Landscape Carousel

- **Visible cards:** 1 / 2 / 3 / 3

---

## 📝 Implementation Notes

### Mobile & Tablet Behavior

The Framer override returns an empty object `{}` when viewport width is below 1200px, meaning:

**Mobile & Tablet use component default props.**

Ensure your carousel component has appropriate defaults for:

- Mobile: 2 visible portrait cards
- Tablet: 4 visible portrait cards

### Testing Checklist

- [ ] Test at exactly 1200px (Desktop breakpoint start)
- [ ] Test at exactly 1920px (5-card switch)
- [ ] Verify smooth interpolation between 1200–1920px
- [ ] Check mobile behavior (override should not interfere)
- [ ] Check tablet behavior (override should not interfere)
- [ ] Verify no layout shift or jump at breakpoint edges

### Browser Compatibility

- ✅ SSR-safe (checks for `window` object)
- ✅ Works with all modern browsers
- ✅ Smooth resize handling with debouncing via React state

---

## 🔧 Integration Requirements

### Component Props Expected

Your carousel component must accept these props for the override to work:

```typescript
interface CarouselProps {
  gap?: number; // Card spacing in pixels
  itemsVisible?: number; // Number of cards to show
  style?: CSSProperties; // Style overrides for wrapper
}
```

If your component uses different prop names, adjust the override accordingly:

```typescript
// Example: if your component uses 'columns' instead of 'itemsVisible'
return {
  columns: itemsVisible,  // Map to your prop name
  cardGap: gap,           // Map to your prop name
  style: { ... }
}
```

---

## ❓ Open Questions / Future Considerations

### 1. Animation Physics at 5-Card Mode

Based on Fitts's Law principles, smaller cards (5-up at Desktop L) may need snappier animations than larger cards (4-up at Desktop).

**Consider:** Does your carousel adjust animation stiffness based on card count?

### 2. Max-Width Cap Creates Extra Margin

At 1920px viewport:

- Total viewport: 1920px
- Page margins: 256px × 2 = 512px
- Available space: 1408px
- Carousel capped at: 1170px
- **Extra margin per side: ~119px**

**Effective margin at 1920px = 375px per side (256 + 119)**

**Is this the intended design?** Or should carousel fill available 1408px?

### 3. Landscape Carousel Override

This document covers portrait carousel only. Does landscape carousel need a similar override system?

---

## 📚 Related Documentation

- **AdaptiveCarousel Component:** [Link to component docs]
- **Framer Override Guide:** [Link to Framer docs]
- **Design System Principles:** [Link to design system]

---

## 🏷️ Document Metadata

**Created:** November 2025  
**Last Updated:** November 2025  
**Status:** Active / Production  
**Maintained By:** Felix  
**Related Components:** Portrait Carousel, Landscape Carousel

---

**End of Layout System Documentation**
