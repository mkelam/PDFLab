# PDFLab Glassmorphism Design System

**Last Updated:** 2025-11-06
**Design Version:** 2.0
**Color System:** OKLCH (Perceptually uniform color space)

---

## Table of Contents

1. [Overview](#overview)
2. [What is Glassmorphism?](#what-is-glassmorphism)
3. [PDFLab Implementation](#pdflab-implementation)
4. [Color System (OKLCH)](#color-system-oklch)
5. [Glass Utility Classes](#glass-utility-classes)
6. [Component Examples](#component-examples)
7. [Visual Effects Breakdown](#visual-effects-breakdown)
8. [Best Practices](#best-practices)

---

## Overview

PDFLab uses a **modern glassmorphism design system** built with:

- **OKLCH color space** - Perceptually uniform colors for better design consistency
- **Clean glass effects** - 50% black backgrounds with 15% white borders (NO blur)
- **Circuit board background** - Tech-themed background pattern
- **Grain texture overlay** - Subtle noise for depth
- **Dark theme** - Professional dark interface optimized for PDFs

### Design Philosophy

> "Glass panels floating over a circuit board - clean, professional, tech-forward"

The design creates **visual depth hierarchy** through:
1. **Background layer** - Circuit board pattern with 50% opacity overlay
2. **Glass panels** - Semi-transparent black cards with white borders
3. **Content layer** - High-contrast text and interactive elements
4. **Grain overlay** - Subtle texture for organic feel

---

## What is Glassmorphism?

**Glassmorphism** is a design trend featuring:

- **Translucent backgrounds** - Semi-transparent panels that show underlying content
- **Backdrop blur** - Frosted glass effect (not used in PDFLab's clean variant)
- **Vivid colors** - Bright borders to define edges
- **Layered shadows** - Multi-layered depth
- **Light borders** - Subtle highlights on edges

### Traditional Glassmorphism (Industry Standard)

```css
/* Standard glassmorphism with blur */
.glass-standard {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
}
```

### PDFLab Glassmorphism (Clean Variant)

```css
/* Clean glassmorphism WITHOUT blur */
.glass {
  background-color: oklch(0 0 0 / 0.5); /* 50% black */
  border: 1px solid oklch(1 0 0 / 0.15); /* 15% white */
  border-radius: 0.75rem; /* 12px rounded corners */
}
```

**Key Difference:** PDFLab intentionally **removes backdrop blur** for:
- Better performance (no GPU-intensive blur filters)
- Cleaner aesthetic (sharp content, no distortion)
- Better text readability (no blur affecting legibility)

---

## PDFLab Implementation

### File Structure

```
PDFLab/
├── app/
│   └── globals.css                # Main stylesheet with glass utilities
├── tailwind.config.ts             # Tailwind configuration
└── components/                    # Components using glass classes
    ├── UnifiedConversionInterface.tsx
    ├── Navigation.tsx
    ├── admin/AdminNav.tsx
    └── ErrorDisplay.tsx
```

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                     Grain Overlay (2% opacity)              │
│  SVG noise texture for organic feel                        │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                  Glass Panels (50% black)                    │
│  Cards, Navigation, Modals with white borders               │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Background Overlay (50% opacity)                │
│  Semi-transparent black over circuit board                  │
└─────────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│              Circuit Board Background Image                  │
│  /images/circuit-board-bg.png (fixed, cover)               │
└─────────────────────────────────────────────────────────────┘
```

---

## Color System (OKLCH)

### What is OKLCH?

**OKLCH** (Lightness, Chroma, Hue) is a perceptually uniform color space that ensures:

- **Consistent brightness** - Colors with same L value appear equally bright
- **Predictable saturation** - Chroma adjustments are visually uniform
- **Better color manipulation** - Math works like human perception
- **Wide gamut support** - Access to more vibrant colors

### Syntax

```css
oklch(L C H / A)
```

- **L** (Lightness): 0 (black) → 1 (white)
- **C** (Chroma): 0 (grayscale) → 0.4+ (vibrant)
- **H** (Hue): 0-360 degrees (color wheel)
- **A** (Alpha): 0 (transparent) → 1 (opaque)

### PDFLab Color Palette

**File:** `app/globals.css` (lines 5-27)

```css
:root {
  /* Background & Surfaces */
  --background: oklch(0.05 0 0);           /* Very dark gray */
  --foreground: oklch(0.95 0 0);           /* Almost white text */
  --card: oklch(0 0 0);                    /* Pure black */
  --card-foreground: oklch(0.95 0 0);      /* White text on cards */

  /* Primary (Teal Accent) */
  --primary: oklch(0.6 0.1 180);           /* Teal blue */
  --primary-foreground: oklch(0.95 0 0);   /* White text */

  /* Secondary & Muted */
  --secondary: oklch(0.12 0 0);            /* Dark gray */
  --secondary-foreground: oklch(0.95 0 0); /* White text */
  --muted: oklch(0.12 0 0);                /* Muted background */
  --muted-foreground: oklch(0.65 0 0);     /* Gray text */

  /* Accent (Same as Primary) */
  --accent: oklch(0.6 0.1 180);            /* Teal */
  --accent-foreground: oklch(0.95 0 0);    /* White text */

  /* Destructive (Red) */
  --destructive: oklch(0.5 0.2 25);        /* Red-orange */
  --destructive-foreground: oklch(0.95 0 0); /* White text */

  /* Borders & Inputs */
  --border: oklch(1 0 0 / 0.12);           /* 12% white border */
  --input: oklch(0.15 0 0);                /* Dark input bg */
  --ring: oklch(0.84 0 0);                 /* Light gray focus ring */

  /* Border Radius */
  --radius: 0.75rem;                       /* 12px rounded corners */
}
```

### Color Breakdown

#### Teal Primary Color
```css
oklch(0.6 0.1 180)
```
- **L: 0.6** - Medium-light (60% brightness)
- **C: 0.1** - Low saturation (subtle, not vibrant)
- **H: 180** - Cyan/Teal hue (180° = cyan on color wheel)
- **Result:** Professional teal accent

#### Glass Background
```css
oklch(0 0 0 / 0.5)
```
- **L: 0** - Pure black
- **C: 0** - No color (grayscale)
- **H: 0** - Irrelevant (no chroma)
- **A: 0.5** - 50% transparent
- **Result:** Semi-transparent black panel

#### Glass Border
```css
oklch(1 0 0 / 0.15)
```
- **L: 1** - Pure white
- **C: 0** - No color (grayscale)
- **H: 0** - Irrelevant
- **A: 0.15** - 15% visible
- **Result:** Subtle white border

---

## Glass Utility Classes

**File:** `app/globals.css` (lines 62-84)

### 1. `.glass` (Standard Glass Panel)

**Purpose:** General-purpose glass effect for cards and containers

```css
.glass {
  background-color: oklch(0 0 0 / 0.5);  /* 50% black */
  border: 1px solid oklch(1 0 0 / 0.15); /* 15% white border */
  @apply rounded-xl;                      /* 0.75rem = 12px */
}
```

**Usage:**
```tsx
<Card className="glass">
  <CardContent>Content here</CardContent>
</Card>
```

**Visual Properties:**
- **Background:** Semi-transparent black (50% opacity)
- **Border:** Thin white outline (15% opacity)
- **Radius:** 12px rounded corners
- **Effect:** Panel "floating" over background

---

### 2. `.glass-strong` (Emphasized Glass)

**Purpose:** Primary cards, important sections, modals

```css
.glass-strong {
  background-color: oklch(0 0 0 / 0.5);  /* Same as .glass */
  border: 1px solid oklch(1 0 0 / 0.15);
  @apply rounded-xl;
}
```

**Usage:**
```tsx
<Card className="glass-strong border-border/50 shadow-2xl">
  <CardHeader>Important Content</CardHeader>
</Card>
```

**Note:** Currently identical to `.glass` - reserved for future customization

**Common Combinations:**
- `glass-strong border-border/50` - Enhanced border visibility
- `glass-strong shadow-2xl` - Large drop shadow for elevation
- `glass-strong max-w-md` - Constrain width for modals

---

### 3. `.glass-subtle` (Light Glass)

**Purpose:** Secondary elements, input fields, subtle containers

```css
.glass-subtle {
  background-color: oklch(0 0 0 / 0.5);  /* Same base */
  border: 1px solid oklch(1 0 0 / 0.15);
  @apply rounded-xl;
}
```

**Usage:**
```tsx
<Input
  className="glass-subtle bg-input/50 border-border/40"
  placeholder="Enter text"
/>
```

**Common Combinations:**
- `glass-subtle bg-input/50` - Input field background
- `glass-subtle border-border/40` - Softer border (8% opacity)
- `glass-subtle hover:border-primary/50` - Interactive hover state

---

### 4. `.glass-nav` (Navigation Bar)

**Purpose:** Fixed navigation header

```css
.glass-nav {
  background-color: oklch(0.05 0 0 / 0.85); /* 85% dark gray */
  border-bottom: 1px solid oklch(1 0 0 / 0.15);
}
```

**Usage:**
```tsx
<nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
  <div className="container">Navigation content</div>
</nav>
```

**Visual Properties:**
- **Background:** Slightly lighter than pure black (85% opacity)
- **Border:** Bottom border only (separator from content)
- **Position:** Typically `fixed` for sticky header
- **Z-Index:** High (50+) to stay above content

---

## Component Examples

### Example 1: Conversion Card (3-Card Pipeline)

**File:** `components/UnifiedConversionInterface.tsx`

```tsx
<Card className="glass w-full lg:flex-1 lg:max-w-[400px]">
  <CardHeader>
    <CardTitle className="flex items-center gap-2 text-foreground">
      <Upload className="w-5 h-5 text-primary" />
      Step 1: Upload
    </CardTitle>
  </CardHeader>
  <CardContent>
    {/* Upload dropzone */}
  </CardContent>
</Card>
```

**Visual Result:**
```
┌─────────────────────────────────────┐
│  📤 Step 1: Upload                 │ ← Title with teal icon
├─────────────────────────────────────┤
│                                     │
│   Drag & drop PDF here             │ ← Dropzone area
│   or click to browse               │
│                                     │
└─────────────────────────────────────┘
  ↑                                   ↑
  50% black bg                    15% white border
```

---

### Example 2: Admin Navigation

**File:** `components/admin/AdminNav.tsx`

```tsx
{/* Top Bar with glassmorphism */}
<div className="fixed top-0 left-0 right-0 h-16 glass-nav backdrop-blur-xl z-50">
  <div className="container flex items-center justify-between h-full px-6">
    <h1 className="text-xl font-bold text-gradient-primary">
      PDFLab Admin
    </h1>
    {/* User menu */}
  </div>
</div>

{/* Sidebar with glassmorphism */}
<div className="fixed left-0 top-16 bottom-0 w-64 glass backdrop-blur-xl border-r border-white/15">
  {/* Navigation links */}
</div>
```

**Visual Layout:**
```
┌─────────────────────────────────────────────────┐
│  PDFLab Admin                     User Menu     │ ← glass-nav header
└─────────────────────────────────────────────────┘
┌─────────────┬───────────────────────────────────┐
│ Dashboard   │                                   │
│ Users       │  Main content area                │ ← glass sidebar
│ Analytics   │  (cards use glass-strong)         │
│ Settings    │                                   │
└─────────────┴───────────────────────────────────┘
  ↑
  w-64 fixed sidebar
```

---

### Example 3: Error Dialog

**File:** `components/ErrorDisplay.tsx`

```tsx
<div className="glass-strong max-w-md w-full mx-4 p-6 rounded-2xl border border-white/20 shadow-2xl">
  <div className="flex items-start gap-4">
    <div className="flex-shrink-0">
      <AlertCircle className="w-8 h-8 text-destructive" />
    </div>
    <div className="flex-1">
      <h3 className="text-lg font-semibold text-foreground mb-2">
        File Too Large
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Your file exceeds the 10MB limit for free accounts.
      </p>
      <div className="flex gap-2">
        <Button className="flex-1 bg-primary hover:bg-primary/90">
          Upgrade Plan
        </Button>
        <Button variant="outline" className="flex-1 glass-subtle">
          Try Different File
        </Button>
      </div>
    </div>
  </div>
</div>
```

**Visual Result:**
```
┌───────────────────────────────────────────┐
│  ⚠️  File Too Large                      │
│                                           │
│  Your file exceeds the 10MB limit for    │
│  free accounts.                           │
│                                           │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Upgrade Plan│  │Try Different File│  │
│  └─────────────┘  └──────────────────┘  │
└───────────────────────────────────────────┘
  ↑                                       ↑
  glass-strong                      shadow-2xl
  border-white/20
```

---

### Example 4: Pricing Card

**File:** `app/pricing/page.tsx`

```tsx
<Card
  className={`glass-strong border-border/50 relative transition-all duration-300
              hover:scale-105 hover:shadow-2xl hover:shadow-primary/10
              ${plan.popular ? 'border-primary/50' : ''}`}
>
  {plan.popular && (
    <Badge className="absolute -top-3 right-4 bg-primary text-primary-foreground">
      Most Popular
    </Badge>
  )}
  <CardHeader>
    <CardTitle className="text-2xl text-foreground">{plan.name}</CardTitle>
    <div className="text-4xl font-bold text-gradient-primary">
      ${plan.price}
      <span className="text-sm text-muted-foreground">/month</span>
    </div>
  </CardHeader>
  <CardContent>
    <ul className="space-y-3">
      {plan.features.map((feature) => (
        <li key={feature} className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-primary" />
          <span className="text-sm text-foreground">{feature}</span>
        </li>
      ))}
    </ul>
    <Button className="w-full mt-6 bg-primary hover:bg-primary/90">
      Get Started
    </Button>
  </CardContent>
</Card>
```

**Hover Effect:**
```
Normal State:                    Hover State:
┌────────────────┐              ┌────────────────┐
│  Pro Plan      │              │  Pro Plan   ⭐ │
│  $29.99/month  │   →hover→    │  $29.99/month  │
│                │              │                │
│  ✓ Feature 1   │              │  ✓ Feature 1   │
│  ✓ Feature 2   │              │  ✓ Feature 2   │
│                │              │                │
│  [Get Started] │              │  [Get Started] │
└────────────────┘              └────────────────┘
                                   ↑         ↑
                              scale-105  shadow-2xl
```

---

## Visual Effects Breakdown

### 1. Background Composition

**File:** `app/globals.css` (lines 34-44)

```css
body {
  background:
    /* Layer 1: Semi-transparent black overlay (50%) */
    linear-gradient(
      oklch(0.05 0 0 / 0.5),
      oklch(0.05 0 0 / 0.5)
    ),
    /* Layer 2: Circuit board image (fixed, cover) */
    url("/images/circuit-board-bg.png") center / cover no-repeat fixed,
    /* Layer 3: Fallback solid black */
    oklch(0.05 0 0);

  min-height: 100vh;
  position: relative;
}
```

**Layering:**
```
Top → Bottom:
1. Grain overlay (2% noise)
2. Glass panels (50% black cards)
3. Black overlay (50% opacity) ← Dims circuit board
4. Circuit board image (fixed background)
5. Solid black fallback
```

---

### 2. Grain Texture Overlay

**File:** `app/globals.css` (lines 47-58)

```css
body::before {
  content: "";
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.02;  /* Very subtle - 2% */
  z-index: 1;
  pointer-events: none;  /* Allow clicks through */
  background-image: url("data:image/svg+xml,...");  /* SVG noise */
}
```

**Purpose:**
- Adds organic texture to flat surfaces
- Prevents "too digital" feel
- Mimics natural paper/material grain
- Extremely subtle (2% opacity)

**SVG Noise Generator:**
```xml
<svg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'>
  <filter id='noiseFilter'>
    <feTurbulence
      type='turbulence'
      baseFrequency='0.65'    <!-- Grain size -->
      numOctaves='3'          <!-- Detail levels -->
      stitchTiles='stitch'    <!-- Seamless tiling -->
    />
  </filter>
  <rect width='100%' height='100%' filter='url(#noiseFilter)' opacity='0.5'/>
</svg>
```

---

### 3. Text Gradients

**File:** `app/globals.css` (lines 86-92)

```css
.text-gradient {
  @apply bg-gradient-to-r from-foreground to-muted-foreground
         bg-clip-text text-transparent;
}

.text-gradient-primary {
  @apply bg-gradient-to-r from-primary via-teal-400 to-teal-300
         bg-clip-text text-transparent;
}
```

**How it Works:**
1. Create gradient background
2. Clip background to text shape (`bg-clip-text`)
3. Make text transparent to show gradient

**Visual Example:**
```
Normal Text:    PDFLab
Gradient Text:  P̶D̶F̶L̶a̶b̶  (white → gray fade)
Primary:        P̶D̶F̶L̶a̶b̶  (teal → cyan fade)
```

---

### 4. Interactive States

**Hover Effects:**

```css
/* Pricing card hover */
.hover\:scale-105:hover {
  transform: scale(1.05);  /* 5% larger */
}

.hover\:shadow-2xl:hover {
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.hover\:shadow-primary\/10:hover {
  box-shadow: 0 25px 50px -12px oklch(0.6 0.1 180 / 0.1);
  /* Teal-tinted shadow */
}
```

**Transition:**
```css
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}

.duration-300 {
  transition-duration: 300ms;
}
```

**Visual Progression:**
```
State 1 (Normal):
- scale: 1.0
- shadow: none
- border: border/50

→ Hover Transition (300ms) →

State 2 (Hover):
- scale: 1.05 (5% larger)
- shadow: large + teal glow
- border: border/60 (brighter)
```

---

## Best Practices

### 1. Glass Class Selection

**Use `.glass` for:**
- General cards
- Container panels
- List items
- Grid items

**Use `.glass-strong` for:**
- Modals and dialogs
- Primary content cards
- Hero sections
- Important alerts

**Use `.glass-subtle` for:**
- Input fields
- Secondary buttons
- Dropdown menus
- Tooltips

**Use `.glass-nav` for:**
- Navigation headers
- Sticky toolbars
- Breadcrumb bars

---

### 2. Border Opacity Layering

Create visual hierarchy with border opacity:

```tsx
{/* Primary element - brightest */}
<Card className="glass-strong border-border/50">  {/* 50% * 12% = 6% white */}

{/* Secondary element - medium */}
<Card className="glass border-border/40">         {/* 40% * 12% = 4.8% white */}

{/* Tertiary element - subtle */}
<Card className="glass-subtle border-border/30">  {/* 30% * 12% = 3.6% white */}
```

**Visual Hierarchy:**
```
Primary:   ┌─────────┐  (brightest border)
Secondary: ┌─────────┐  (medium border)
Tertiary:  ┌─────────┐  (subtle border)
```

---

### 3. Combining with Shadows

Enhance glass effect with shadows:

```tsx
{/* Elevated card */}
<Card className="glass-strong shadow-xl">

{/* Floating modal */}
<div className="glass-strong shadow-2xl">

{/* Glowing card */}
<Card className="glass-strong shadow-2xl shadow-primary/10">
```

**Shadow Scale:**
- `shadow-sm` - Subtle elevation (1-2px)
- `shadow-md` - Card elevation (4-6px)
- `shadow-lg` - Raised panel (10-15px)
- `shadow-xl` - Modal elevation (20-25px)
- `shadow-2xl` - Maximum depth (25-50px)

---

### 4. Color Contrast

Ensure readability on glass panels:

```tsx
{/* Good contrast */}
<Card className="glass">
  <h2 className="text-foreground">Title</h2>        {/* oklch(0.95) - bright */}
  <p className="text-muted-foreground">Body</p>    {/* oklch(0.65) - gray */}
</Card>

{/* Bad contrast - avoid */}
<Card className="glass">
  <h2 className="text-gray-700">Title</h2>         {/* Too dark on dark bg */}
</Card>
```

**Text Color Guide:**
- **Headings:** `text-foreground` (95% lightness)
- **Body:** `text-foreground` or `text-muted-foreground` (65%)
- **Secondary:** `text-muted-foreground` (65%)
- **Disabled:** `text-muted-foreground opacity-50` (32.5%)

---

### 5. Responsive Glass

Adjust glass effects for mobile:

```tsx
<Card className="glass lg:glass-strong">
  {/* Standard glass on mobile, strong on desktop */}
</Card>

<Card className="glass border-border/30 lg:border-border/50">
  {/* Softer border on mobile, stronger on desktop */}
</Card>
```

**Reasoning:**
- Mobile: Simpler visuals, less GPU power
- Desktop: Enhanced effects, better performance

---

### 6. Accessibility

Maintain WCAG AA contrast ratios:

```tsx
{/* Ensure interactive elements are visible */}
<Button className="glass-subtle border-primary/50 hover:border-primary">
  {/* Primary border visible on hover */}
</Button>

{/* Sufficient contrast for text */}
<Card className="glass">
  <p className="text-foreground">  {/* 95% white on 50% black = ~8:1 ratio ✓ */}
    High contrast text
  </p>
</Card>
```

**Contrast Requirements:**
- **Normal text:** Minimum 4.5:1
- **Large text (18pt+):** Minimum 3:1
- **Interactive elements:** Minimum 3:1

---

## Summary

PDFLab's glassmorphism design system creates a **professional, modern interface** through:

1. **OKLCH color space** - Perceptually uniform colors
2. **Clean glass panels** - 50% black backgrounds, NO blur
3. **Layered backgrounds** - Circuit board + overlay + grain
4. **Utility classes** - `.glass`, `.glass-strong`, `.glass-subtle`, `.glass-nav`
5. **Consistent hierarchy** - Border opacity + shadows for depth
6. **Interactive states** - Smooth transitions, hover effects
7. **Accessibility** - High contrast text, readable UI

### Key Design Decisions

✅ **NO backdrop blur** - Better performance, sharper text
✅ **50% black backgrounds** - Optimal transparency for depth
✅ **15% white borders** - Visible without being harsh
✅ **OKLCH colors** - Consistent, predictable color behavior
✅ **Circuit board bg** - Tech-themed, professional aesthetic
✅ **2% grain overlay** - Subtle organic texture

### Visual Formula

```
Glassmorphism Effect =
  Circuit Board Background
  + 50% Black Overlay
  + Semi-transparent Card (50% black)
  + 15% White Border
  + 2% Grain Texture
  + High Contrast Text (95% white)
  + Smooth Transitions
```

This creates the signature PDFLab look: **"Glass panels floating over circuit boards"** 🔲✨
