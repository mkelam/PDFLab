# Design System Architect - Expert Skill

**Version:** 1.0
**Last Updated:** 2025-11-08
**Complementary Skills:** motion-performance-expert.SKILL
**Domain:** Complete UI/UX system implementation across different contexts

---

## Overview

The **Design System Architect** is an expert system for implementing complete, cohesive UI/UX systems in any application context. While motion-performance-expert focuses on animation performance, this skill addresses:

- **Design system foundations** (color systems, typography, spacing)
- **Component architecture** (reusable patterns, composability)
- **Context adaptation** (different frameworks, design requirements)
- **Cross-cutting concerns** (theming, accessibility, responsiveness)
- **Integration patterns** (how animations, layout, and styling work together)

---

## Table of Contents

1. [Skill Scope](#skill-scope)
2. [Core Competencies](#core-competencies)
3. [Context Analysis Framework](#context-analysis-framework)
4. [Implementation Workflow](#implementation-workflow)
5. [Design Token System](#design-token-system)
6. [Component Architecture Patterns](#component-architecture-patterns)
7. [Accessibility & Inclusive Design](#accessibility--inclusive-design)
8. [Framework Adaptation Strategies](#framework-adaptation-strategies)
9. [Quality Assurance Checklist](#quality-assurance-checklist)
10. [Integration with Motion Performance Expert](#integration-with-motion-performance-expert)

---

## Skill Scope

### What This Skill Covers

✅ **Design System Foundations**
- Color systems (OKLCH, HSL, RGB strategies)
- Typography scales and hierarchy
- Spacing systems (4px/8px grids)
- Elevation and layering strategies

✅ **Component Architecture**
- Atomic design principles
- Component composition patterns
- Prop API design
- Variant management

✅ **Context Adaptation**
- Framework selection criteria (React, Vue, Svelte, vanilla)
- CSS methodology (Tailwind, CSS Modules, Styled Components, CSS-in-JS)
- Design language translation (Material → Glassmorphism, Bootstrap → Custom)
- Platform considerations (web, mobile, desktop)

✅ **Cross-Cutting Concerns**
- Dark/light theme systems
- Responsive design strategies
- Accessibility (WCAG 2.1 AA/AAA)
- Internationalization (RTL support, font loading)

✅ **System Integration**
- Animation system integration (with motion-performance-expert)
- Form validation patterns
- Loading states and skeleton screens
- Error handling patterns

### What This Skill Does NOT Cover

❌ **Animation Performance** → Use motion-performance-expert.SKILL
❌ **Backend Architecture** → Out of scope
❌ **Business Logic** → Application-specific
❌ **DevOps/Deployment** → Infrastructure concern

---

## Core Competencies

### 1. Design Token Architecture

**Definition:** Design tokens are the atomic values that define a design system (colors, spacing, typography).

**Key Principles:**
- **Single source of truth** - All values defined in one place
- **Semantic naming** - `--color-primary` not `--color-blue-500`
- **Hierarchical structure** - Global → semantic → component tokens
- **Platform agnostic** - Can export to CSS, SCSS, JS, JSON

**Example Structure:**

```
Design Tokens Hierarchy:
├── Global Tokens (raw values)
│   ├── --color-blue-500: oklch(0.6 0.1 240)
│   ├── --space-4: 1rem
│   └── --font-sans: Inter, system-ui
├── Semantic Tokens (purpose-based)
│   ├── --color-primary: var(--color-blue-500)
│   ├── --spacing-medium: var(--space-4)
│   └── --font-body: var(--font-sans)
└── Component Tokens (context-specific)
    ├── --button-bg: var(--color-primary)
    └── --card-padding: var(--spacing-medium)
```

---

### 2. Color System Selection

**Decision Matrix:**

| Color System | Use When | Pros | Cons |
|--------------|----------|------|------|
| **OKLCH** | Modern apps, wide gamut displays | Perceptually uniform, predictable | Limited browser support (2023+) |
| **HSL** | General web apps | Human-readable, good browser support | Not perceptually uniform |
| **RGB/HEX** | Legacy support needed | Universal support | Hard to manipulate programmatically |
| **Tailwind Colors** | Rapid prototyping | Pre-designed palettes | Less unique |

**PDFLab Example (OKLCH):**
```css
/* Why OKLCH for PDFLab: */
--primary: oklch(0.6 0.1 180);      /* Teal - consistent perceived brightness */
--background: oklch(0.05 0 0);      /* Dark gray - precise control */
--border: oklch(1 0 0 / 0.12);      /* White 12% - mathematical precision */
```

---

### 3. Typography Scale System

**Recommended Approach: Modular Scale**

```css
/* Base setup */
:root {
  --font-base-size: 16px;           /* Base font size */
  --font-scale-ratio: 1.25;         /* Major Third (5:4) */

  /* Generated scale */
  --font-xs: 0.64rem;               /* 10.24px */
  --font-sm: 0.8rem;                /* 12.8px */
  --font-base: 1rem;                /* 16px */
  --font-lg: 1.25rem;               /* 20px */
  --font-xl: 1.563rem;              /* 25px */
  --font-2xl: 1.953rem;             /* 31.25px */
  --font-3xl: 2.441rem;             /* 39.06px */
  --font-4xl: 3.052rem;             /* 48.83px */
}
```

**Common Scale Ratios:**
- 1.125 (Major Second) - Subtle, compact
- 1.25 (Major Third) - **Balanced (recommended)**
- 1.333 (Perfect Fourth) - Dramatic
- 1.5 (Perfect Fifth) - Very dramatic
- 1.618 (Golden Ratio) - Organic, elegant

---

### 4. Spacing System

**8-Point Grid System (Industry Standard):**

```css
:root {
  --space-0: 0;
  --space-1: 0.125rem;  /* 2px - hairline */
  --space-2: 0.25rem;   /* 4px - minimal */
  --space-3: 0.5rem;    /* 8px - tight */
  --space-4: 0.75rem;   /* 12px - comfortable */
  --space-5: 1rem;      /* 16px - standard */
  --space-6: 1.5rem;    /* 24px - spacious */
  --space-8: 2rem;      /* 32px - section */
  --space-10: 2.5rem;   /* 40px - large section */
  --space-12: 3rem;     /* 48px - major section */
  --space-16: 4rem;     /* 64px - page margin */
}
```

**Usage Guidelines:**
- **Components:** --space-3 to --space-6 (8px-24px)
- **Sections:** --space-8 to --space-12 (32px-48px)
- **Page Layout:** --space-12 to --space-16 (48px-64px)

---

## Context Analysis Framework

### Step 1: Understand Current Context

Before implementing a design system, analyze the target context:

```markdown
## Context Analysis Checklist

### Technical Environment
- [ ] Framework: React / Vue / Svelte / Angular / Vanilla
- [ ] CSS Approach: Tailwind / CSS Modules / Styled Components / Plain CSS
- [ ] Build System: Vite / Webpack / Next.js / Astro
- [ ] Browser Targets: Modern (ES6+) / IE11 support needed
- [ ] Platform: Web / Mobile Web / Desktop (Electron) / All

### Design Requirements
- [ ] Existing brand guidelines: Yes / No / Partial
- [ ] Design language: Material / Fluent / Custom / Glassmorphism
- [ ] Theme support: Dark only / Light only / Both / Multiple themes
- [ ] Accessibility target: WCAG 2.1 A / AA / AAA
- [ ] Animation requirements: Minimal / Standard / Rich

### Application Characteristics
- [ ] Content density: Sparse / Moderate / Dense
- [ ] User base: General public / Enterprise / Technical / Mixed
- [ ] Interaction patterns: Reading / Forms / Data manipulation / All
- [ ] Device support: Desktop only / Mobile first / Universal

### Constraints
- [ ] Performance budget: < 1MB / < 500KB / < 200KB
- [ ] File size: Not important / Important / Critical
- [ ] Browser support: Modern only / Last 2 versions / IE11+
- [ ] Timeline: Weeks / Months / Ongoing
```

---

### Step 2: Define Design System Scope

**Minimal Design System (1-2 weeks):**
- Color palette (5-7 colors)
- Typography scale (4-5 sizes)
- Spacing system (8-point grid)
- 5-10 core components (Button, Input, Card, Modal, Navigation)

**Standard Design System (1-2 months):**
- Complete color system with semantic tokens
- Full typography scale with variants
- 20-30 components
- Icon system
- Animation library
- Documentation site

**Comprehensive Design System (3-6 months):**
- Multi-theme support
- 50+ components
- Advanced patterns (drag-drop, virtualization)
- Accessibility testing suite
- Design tool integration (Figma tokens)
- Component playground

---

### Step 3: Identify Adaptation Points

**From PDFLab Glassmorphism to Different Contexts:**

| Context | Adaptation Strategy | Example Changes |
|---------|-------------------|-----------------|
| **Light Theme App** | Invert glass opacity, adjust borders | `oklch(1 0 0 / 0.5)` (50% white) |
| **Material Design** | Replace glass with elevation shadows | `box-shadow: 0 2px 4px rgba(0,0,0,0.1)` |
| **Minimalist** | Remove borders, reduce opacity | Remove `border`, use `oklch(0 0 0 / 0.3)` |
| **Vibrant/Colorful** | Add accent colors to glass | `oklch(0.6 0.15 280 / 0.3)` (purple glass) |
| **Enterprise/Corporate** | Increase opacity for readability | `oklch(0 0 0 / 0.8)` (80% black) |

---

## Implementation Workflow

### Phase 1: Foundation Setup (Week 1)

**Task 1.1: Define Design Tokens**

Create `design-tokens.css`:

```css
:root {
  /* ============================================
     GLOBAL TOKENS (Raw Values)
     ============================================ */

  /* Colors - OKLCH */
  --color-neutral-950: oklch(0.05 0 0);
  --color-neutral-900: oklch(0.1 0 0);
  --color-neutral-100: oklch(0.9 0 0);
  --color-neutral-50: oklch(0.95 0 0);

  --color-primary-600: oklch(0.6 0.1 180);  /* Teal */
  --color-primary-500: oklch(0.65 0.1 180);
  --color-primary-400: oklch(0.7 0.1 180);

  --color-success-500: oklch(0.6 0.15 140); /* Green */
  --color-error-500: oklch(0.5 0.2 25);     /* Red */
  --color-warning-500: oklch(0.65 0.15 60); /* Yellow */

  /* Spacing */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */

  /* Typography */
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'Fira Code', 'Courier New', monospace;

  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */

  /* Border Radius */
  --radius-sm: 0.25rem;   /* 4px */
  --radius-md: 0.5rem;    /* 8px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-xl: 1rem;      /* 16px */

  /* ============================================
     SEMANTIC TOKENS (Purpose-Based)
     ============================================ */

  --background: var(--color-neutral-950);
  --foreground: var(--color-neutral-50);

  --primary: var(--color-primary-600);
  --primary-foreground: var(--color-neutral-50);

  --border: oklch(1 0 0 / 0.12);
  --border-subtle: oklch(1 0 0 / 0.08);

  --text-heading: var(--color-neutral-50);
  --text-body: var(--color-neutral-100);
  --text-muted: var(--color-neutral-300);

  /* ============================================
     COMPONENT TOKENS
     ============================================ */

  --button-radius: var(--radius-lg);
  --card-padding: var(--space-6);
  --input-border: var(--border);
}
```

**Task 1.2: Create Base Styles**

```css
/* base.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;  /* Base for rem calculations */
}

body {
  font-family: var(--font-sans);
  font-size: var(--font-size-base);
  line-height: 1.5;
  color: var(--foreground);
  background: var(--background);
  min-height: 100vh;

  /* Performance */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Focus styles for accessibility */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

---

### Phase 2: Component Architecture (Week 2-3)

**Atomic Design Pattern:**

```
Atoms (Smallest units)
├── Button
├── Input
├── Label
├── Icon
└── Badge

Molecules (Combinations of atoms)
├── FormField (Label + Input + Error)
├── SearchBox (Input + Button)
└── Card (Container + Header + Body)

Organisms (Complex components)
├── Navigation (Logo + Links + Actions)
├── DataTable (Header + Rows + Pagination)
└── Modal (Overlay + Card + Actions)

Templates (Page layouts)
├── DashboardLayout
├── AuthLayout
└── ContentLayout

Pages (Actual pages)
├── Dashboard
├── Login
└── Settings
```

**Component API Design Pattern:**

```typescript
// Good component API design
interface ButtonProps {
  // Variants
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';

  // States
  disabled?: boolean;
  loading?: boolean;

  // Content
  children: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  // Behavior
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';

  // Style overrides (escape hatch)
  className?: string;
}
```

---

### Phase 3: Theme System (Week 3-4)

**Multi-Theme Support:**

```css
/* themes/dark.css */
[data-theme="dark"] {
  --background: oklch(0.05 0 0);
  --foreground: oklch(0.95 0 0);
  --glass-bg: oklch(0 0 0 / 0.5);
}

/* themes/light.css */
[data-theme="light"] {
  --background: oklch(0.98 0 0);
  --foreground: oklch(0.1 0 0);
  --glass-bg: oklch(1 0 0 / 0.5);  /* White glass */
}

/* themes/high-contrast.css (Accessibility) */
[data-theme="high-contrast"] {
  --background: oklch(0 0 0);      /* Pure black */
  --foreground: oklch(1 0 0);      /* Pure white */
  --primary: oklch(0.7 0.2 60);    /* High saturation yellow */
  --border: oklch(1 0 0 / 0.5);    /* 50% white borders */
}
```

**Theme Switcher (React Example):**

```typescript
// useTheme.ts
import { useState, useEffect } from 'react';

export function useTheme() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'high-contrast'>('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return { theme, setTheme };
}
```

---

## Design Token System

### Token Naming Convention

**Format:** `--{category}-{property}-{variant}-{state}`

```css
/* Category: color, space, font, radius, shadow */
/* Property: primary, background, text, etc. */
/* Variant: sm, md, lg, 100-900 */
/* State: hover, active, disabled (optional) */

Examples:
--color-primary-500
--color-primary-500-hover
--space-md
--font-size-lg
--radius-xl
--shadow-card
```

### Token Categories

**1. Color Tokens**

```css
:root {
  /* Neutral palette (9 shades) */
  --color-neutral-950: oklch(0.05 0 0);   /* Darkest */
  --color-neutral-900: oklch(0.15 0 0);
  --color-neutral-800: oklch(0.25 0 0);
  --color-neutral-700: oklch(0.35 0 0);
  --color-neutral-600: oklch(0.45 0 0);
  --color-neutral-500: oklch(0.55 0 0);   /* Mid-point */
  --color-neutral-400: oklch(0.65 0 0);
  --color-neutral-300: oklch(0.75 0 0);
  --color-neutral-200: oklch(0.85 0 0);
  --color-neutral-100: oklch(0.9 0 0);
  --color-neutral-50: oklch(0.95 0 0);    /* Lightest */

  /* Primary palette */
  --color-primary-900: oklch(0.4 0.12 180);
  --color-primary-600: oklch(0.6 0.1 180);
  --color-primary-400: oklch(0.7 0.1 180);
  --color-primary-100: oklch(0.9 0.05 180);
}
```

**2. Spacing Tokens**

```css
:root {
  /* T-shirt sizing */
  --space-xs: 0.25rem;   /* 4px */
  --space-sm: 0.5rem;    /* 8px */
  --space-md: 1rem;      /* 16px */
  --space-lg: 1.5rem;    /* 24px */
  --space-xl: 2rem;      /* 32px */
  --space-2xl: 3rem;     /* 48px */
  --space-3xl: 4rem;     /* 64px */

  /* OR numeric scale */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
}
```

**3. Typography Tokens**

```css
:root {
  /* Font families */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-serif: 'Merriweather', Georgia, serif;
  --font-mono: 'Fira Code', 'Courier New', monospace;

  /* Font sizes */
  --font-size-xs: 0.75rem;    /* 12px */
  --font-size-sm: 0.875rem;   /* 14px */
  --font-size-base: 1rem;     /* 16px */
  --font-size-lg: 1.125rem;   /* 18px */
  --font-size-xl: 1.25rem;    /* 20px */
  --font-size-2xl: 1.5rem;    /* 24px */
  --font-size-3xl: 1.875rem;  /* 30px */
  --font-size-4xl: 2.25rem;   /* 36px */

  /* Line heights */
  --line-height-tight: 1.25;
  --line-height-normal: 1.5;
  --line-height-relaxed: 1.75;

  /* Font weights */
  --font-weight-normal: 400;
  --font-weight-medium: 500;
  --font-weight-semibold: 600;
  --font-weight-bold: 700;
}
```

---

## Component Architecture Patterns

### Pattern 1: Compound Components

**Use Case:** Complex components with multiple parts (Accordion, Tabs, Select)

```typescript
// Accordion.tsx
export const Accordion = {
  Root: AccordionRoot,
  Item: AccordionItem,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
};

// Usage:
<Accordion.Root>
  <Accordion.Item value="item-1">
    <Accordion.Trigger>What is glassmorphism?</Accordion.Trigger>
    <Accordion.Content>
      Glassmorphism is a design trend featuring translucent backgrounds...
    </Accordion.Content>
  </Accordion.Item>
</Accordion.Root>
```

**Benefits:**
- Clear component relationships
- Flexible composition
- Easy to understand hierarchy

---

### Pattern 2: Polymorphic Components

**Use Case:** Components that can render as different HTML elements

```typescript
// Button.tsx
interface ButtonProps<T extends React.ElementType = 'button'> {
  as?: T;
  variant?: 'primary' | 'secondary';
  children: React.ReactNode;
}

export function Button<T extends React.ElementType = 'button'>({
  as,
  variant = 'primary',
  children,
  ...props
}: ButtonProps<T> & React.ComponentPropsWithoutRef<T>) {
  const Component = as || 'button';
  return <Component className={`btn btn-${variant}`} {...props}>{children}</Component>;
}

// Usage:
<Button>Normal button</Button>
<Button as="a" href="/home">Link styled as button</Button>
<Button as={Link} to="/profile">React Router Link as button</Button>
```

---

### Pattern 3: Headless Components

**Use Case:** Logic-only components, styling provided by consumer

```typescript
// useAccordion.ts (Headless logic)
export function useAccordion() {
  const [expanded, setExpanded] = useState<string[]>([]);

  const toggle = (value: string) => {
    setExpanded(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  return { expanded, toggle, isExpanded: (value: string) => expanded.includes(value) };
}

// Consumer provides styling:
function MyAccordion() {
  const { expanded, toggle, isExpanded } = useAccordion();

  return (
    <div className="my-custom-accordion">
      {items.map(item => (
        <div key={item.id}>
          <button onClick={() => toggle(item.id)} className="my-trigger">
            {item.title}
          </button>
          {isExpanded(item.id) && <div className="my-content">{item.content}</div>}
        </div>
      ))}
    </div>
  );
}
```

---

## Accessibility & Inclusive Design

### WCAG 2.1 Compliance Checklist

**Level A (Minimum):**
- [ ] All images have alt text
- [ ] Keyboard navigation works
- [ ] No keyboard traps
- [ ] Color is not the only visual means of conveying information

**Level AA (Recommended):**
- [ ] Contrast ratio ≥ 4.5:1 for normal text (18px and below)
- [ ] Contrast ratio ≥ 3:1 for large text (18px+ or 14px+ bold)
- [ ] Focus indicators visible
- [ ] Text can be resized up to 200% without loss of functionality

**Level AAA (Enhanced):**
- [ ] Contrast ratio ≥ 7:1 for normal text
- [ ] Contrast ratio ≥ 4.5:1 for large text
- [ ] No flashing content

### Contrast Ratio Calculator

```javascript
// Calculate WCAG contrast ratio
function getContrastRatio(color1, color2) {
  const l1 = getRelativeLuminance(color1);
  const l2 = getRelativeLuminance(color2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// PDFLab Example:
// Background: oklch(0.05 0 0) → L ≈ 0.01
// Foreground: oklch(0.95 0 0) → L ≈ 0.85
// Contrast: (0.85 + 0.05) / (0.01 + 0.05) ≈ 15:1 ✅ AAA Compliant
```

### Accessibility Patterns

**1. Focus Management**

```css
/* Visible focus indicator */
:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* Custom focus styles for components */
.glass-button:focus-visible {
  outline: 2px solid oklch(0.6 0.1 180);
  outline-offset: 4px;
}
```

**2. ARIA Patterns**

```tsx
// Accordion with proper ARIA
<div className="accordion">
  <h3>
    <button
      aria-expanded={isExpanded}
      aria-controls="panel-1"
      id="trigger-1"
    >
      Section 1
    </button>
  </h3>
  <div
    id="panel-1"
    role="region"
    aria-labelledby="trigger-1"
    hidden={!isExpanded}
  >
    Content
  </div>
</div>
```

**3. Screen Reader Support**

```tsx
// Visually hidden text for context
<span className="sr-only">
  Close modal
</span>

// CSS for sr-only
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

---

## Framework Adaptation Strategies

### React/Next.js Implementation

**Recommended Stack:**
- **Styling:** Tailwind CSS + CSS Custom Properties
- **Components:** Radix UI (headless) + custom styling
- **Animation:** Framer Motion + motion-performance-expert patterns
- **Icons:** Lucide React / Heroicons

**File Structure:**

```
src/
├── styles/
│   ├── design-tokens.css
│   ├── base.css
│   ├── utilities.css
│   └── themes/
│       ├── dark.css
│       └── light.css
├── components/
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   └── layout/
│       ├── Navigation.tsx
│       └── Sidebar.tsx
├── hooks/
│   ├── useTheme.ts
│   └── useMediaQuery.ts
└── lib/
    └── utils.ts
```

---

### Vue/Nuxt Implementation

**Recommended Stack:**
- **Styling:** UnoCSS + CSS Custom Properties
- **Components:** Headless UI Vue + custom styling
- **Animation:** Vue Transition + motion-performance-expert patterns
- **Icons:** Unplugin Icons

**File Structure:**

```
src/
├── assets/
│   └── styles/
│       ├── design-tokens.css
│       └── base.css
├── components/
│   ├── base/
│   │   ├── VButton.vue
│   │   ├── VCard.vue
│   │   └── VInput.vue
│   └── layout/
│       └── TheNavigation.vue
├── composables/
│   ├── useTheme.ts
│   └── useAccordion.ts
└── utils/
    └── classNames.ts
```

---

### Svelte/SvelteKit Implementation

**Recommended Stack:**
- **Styling:** Tailwind CSS + CSS Custom Properties
- **Components:** Melt UI (headless) + custom styling
- **Animation:** Svelte transitions + motion-performance-expert patterns
- **Icons:** Unplugin Icons

---

### Vanilla JS/HTML Implementation

**Recommended Stack:**
- **Styling:** Plain CSS + CSS Custom Properties
- **Components:** Web Components (Custom Elements)
- **Animation:** CSS Animations + WAAPI
- **Build:** Vite or none (for simple projects)

**Example Web Component:**

```javascript
// glass-card.js
class GlassCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          background: var(--glass-bg, oklch(0 0 0 / 0.5));
          border: 1px solid var(--glass-border, oklch(1 0 0 / 0.15));
          border-radius: var(--radius-lg, 0.75rem);
          padding: var(--space-6, 1.5rem);
          transform: translateZ(0);
          will-change: opacity, transform;
          contain: layout style paint;
        }
      </style>
      <slot></slot>
    `;
  }
}

customElements.define('glass-card', GlassCard);
```

---

## Quality Assurance Checklist

### Pre-Launch Checklist

**Design System Completeness:**
- [ ] All design tokens defined
- [ ] Color contrast ratios verified (WCAG AA minimum)
- [ ] Typography scale implemented
- [ ] Spacing system consistent
- [ ] 20+ core components built

**Performance:**
- [ ] All animations use only `transform` and `opacity`
- [ ] No `backdrop-filter: blur()` (unless intentional)
- [ ] Chrome DevTools Performance tab shows 60fps
- [ ] Paint calls < 10 per frame
- [ ] Bundle size < 500KB (gzipped)

**Accessibility:**
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators visible
- [ ] ARIA attributes correct
- [ ] Screen reader tested (NVDA/JAWS/VoiceOver)
- [ ] Color contrast meets WCAG AA
- [ ] `prefers-reduced-motion` respected

**Responsiveness:**
- [ ] Mobile (375px) works
- [ ] Tablet (768px) works
- [ ] Desktop (1440px) works
- [ ] Ultra-wide (1920px+) works
- [ ] Touch targets ≥ 44×44px

**Browser Support:**
- [ ] Chrome (latest)
- [ ] Safari (latest)
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Documentation:**
- [ ] Component API documented
- [ ] Usage examples provided
- [ ] Accessibility notes included
- [ ] Performance considerations documented

---

## Integration with Motion Performance Expert

### Workflow Integration

**Step 1: Design System Architect** → Define structure
- Create design tokens
- Build component architecture
- Set up theming system

**Step 2: Motion Performance Expert** → Optimize animations
- Add GPU acceleration to interactive components
- Implement carousel/accordion patterns
- Eliminate flicker and jank

**Example Integration:**

```css
/* Step 1: Design System Architect defines the component */
.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}

/* Step 2: Motion Performance Expert adds animation optimization */
.glass-card {
  /* Design System properties */
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);

  /* Motion Performance Expert properties */
  transform: translateZ(0);           /* GPU acceleration */
  will-change: opacity, transform;    /* Compositor hint */
  contain: layout style paint;        /* Paint isolation */
  backface-visibility: hidden;        /* Subpixel fix */

  /* Transition only composited properties */
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.glass-card:hover {
  opacity: 0.9;
  transform: scale(1.02) translateZ(0);
}
```

---

## Example: Adapting PDFLab Design to Different Context

### Scenario: E-commerce Product Site

**Context Differences:**
- Needs light theme (product photos)
- More colorful (product badges, CTAs)
- Higher content density
- Image-heavy

**Adaptation Strategy:**

```css
/* 1. Invert glass for light theme */
[data-theme="light"] {
  --background: oklch(0.98 0 0);           /* Almost white */
  --foreground: oklch(0.1 0 0);            /* Almost black */
  --glass-bg: oklch(1 0 0 / 0.6);          /* 60% white glass */
  --glass-border: oklch(0 0 0 / 0.1);      /* 10% black border */
}

/* 2. Add vibrant accent colors for CTAs */
:root {
  --color-cta-orange: oklch(0.65 0.18 50); /* Vibrant orange */
  --color-sale-red: oklch(0.55 0.22 25);   /* Bold red */
  --color-new-badge: oklch(0.6 0.15 140);  /* Fresh green */
}

/* 3. Adjust spacing for product grids */
:root {
  --product-grid-gap: var(--space-4);      /* Tighter than PDFLab */
  --card-padding: var(--space-4);          /* More compact */
}

/* 4. Use product images as glass backgrounds */
.product-card {
  background:
    linear-gradient(oklch(1 0 0 / 0.7), oklch(1 0 0 / 0.7)),
    url('/product.jpg') center / cover;
  backdrop-filter: blur(20px);  /* OK here - product showcase */
}
```

**Component Variations:**

```tsx
// ProductCard.tsx (adapted from PDFLab Card)
<Card className="glass hover:scale-102 transition-all">
  <CardImage src={product.image} alt={product.name} />
  <CardBadge variant="sale">-30%</CardBadge>
  <CardContent>
    <h3 className="text-lg font-semibold">{product.name}</h3>
    <p className="text-2xl font-bold text-cta-orange">${product.price}</p>
    <Button variant="cta" className="w-full">Add to Cart</Button>
  </CardContent>
</Card>
```

---

## Summary

The **Design System Architect** skill provides:

✅ **Foundation** - Design tokens, color systems, typography, spacing
✅ **Architecture** - Component patterns, composition, API design
✅ **Adaptation** - Framework-agnostic strategies for different contexts
✅ **Quality** - Accessibility, performance, browser support
✅ **Integration** - Works seamlessly with motion-performance-expert.SKILL

### When to Use Each Skill:

| Task | Use This Skill |
|------|----------------|
| Setting up color system | Design System Architect |
| Creating component library | Design System Architect |
| Implementing animations | Motion Performance Expert |
| Fixing animation jank | Motion Performance Expert |
| Theming/dark mode | Design System Architect |
| Carousel/accordion | Both (structure + animation) |
| Accessibility audit | Design System Architect |
| Performance profiling | Motion Performance Expert |

### Skill Synergy:

```
Design System Architect: "Build me a card component with proper spacing and colors"
                              ↓
Motion Performance Expert: "Now animate it without jank at 60fps"
                              ↓
                    Complete Production-Ready Component
```

---

**Next Steps:**
1. Analyze your target application context using the Context Analysis Framework
2. Define design tokens appropriate for your brand
3. Build component library following atomic design principles
4. Apply motion-performance-expert.SKILL for animations
5. Test accessibility and performance
6. Document and deploy

**Related Documentation:**
- [motion-performance-expert.SKILL.md](./motion-performance-expert.SKILL.md)
- [GLASSMORPHISM_DESIGN_SYSTEM.md](./GLASSMORPHISM_DESIGN_SYSTEM.md)
- [GLASSMORPHISM_IMPLEMENTATION_GUIDE.md](./GLASSMORPHISM_IMPLEMENTATION_GUIDE.md)
