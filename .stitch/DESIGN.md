# DESIGN.md - PrivLocal Design System

## 🎯 Brand Identity

**Product Name:** PrivLocal (智程日历)
**Domain:** https://privlocal.com
**Tagline:** "Your Calendar. Your Device. Your Data."
**Core Value Proposition:** AI-powered local-first scheduling that never leaves your computer

### Brand Personality
- **Trustworthy**: Conveys security and reliability
- **Professional**: Clean, modern SaaS aesthetic
- **Innovative**: Cutting-edge AI technology
- **Privacy-Focused**: Data sovereignty champion

---

## 🎨 Color Palette

### Primary Colors
| Token | Hex | Usage | Role |
|-------|-----|-------|------|
| `--color-primary` | `#0F172A` | Deep Navy | Backgrounds, text, trust |
| `--color-primary-light` | `#1E293B` | Lighter Navy | Cards, surfaces |
| `--color-accent` | `#10B981` | Emerald Green | CTAs, success states, privacy indicators |
| `--color-accent-hover` | `#059669` | Darker Emerald | Hover states |
| `--color-secondary` | `#3B82F6` | Soft Blue | Links, interactive elements, tech feel |
| `--color-secondary-light` | `#93C5FD` | Light Blue | Highlights, badges |

### Neutral Colors
| Token | Hex | Usage |
|-------|-----|--------|
| `--color-bg` | `#FFFFFF` | Page background (light mode) |
| `--color-bg-dark` | `#F8FAFC` | Section backgrounds |
| `--color-surface` | `#F1F5F9` | Card backgrounds |
| `--color-border` | `#E2E8F0` | Borders, dividers |
| `--color-text` | `#1E293B` | Primary text |
| `--color-text-secondary` | `#64748B` | Secondary text |
| `--color-text-muted` | `#94A3B8` | Muted text, placeholders |

### Semantic Colors
| Token | Hex | Usage |
|-------|-----|--------|
| `--color-success` | `#10B981` | Success messages |
| `--color-warning` | `#F59E0B` | Warnings |
| `--color-error` | `#EF4444` | Errors |
| `--color-info` | `#3B82F6` | Informational |

---

## 🔤 Typography

### Font Stack
```css
--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 (Hero) | 56px / 3.5rem | 800 (ExtraBold) | 1.1 | -0.02em |
| H2 (Section) | 40px / 2.5rem | 700 (Bold) | 1.2 | -0.01em |
| H3 (Card Title) | 24px / 1.5rem | 600 (SemiBold) | 1.3 | 0 |
| H4 (Small Title) | 20px / 1.25rem | 600 (SemiBold) | 1.4 | 0 |
| Body Large | 18px / 1.125rem | 400 (Regular) | 1.6 | 0 |
| Body | 16px / 1rem | 400 (Regular) | 1.6 | 0 |
| Body Small | 14px / 0.875rem | 400 (Regular) | 1.5 | 0 |
| Caption | 12px / 0.75rem | 500 (Medium) | 1.4 | 0.02em |
| Button | 16px / 1rem | 600 (SemiBold) | 1 | 0 |

---

## 📐 Spacing & Layout

### Spacing Scale (8px base)
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-5: 20px;
--space-6: 24px;
--space-8: 32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;
--space-20: 80px;
--space-24: 96px;
```

### Container Widths
- **Max Content**: 1200px
- **Wide Layout**: 1400px
- **Narrow Content**: 800px (text-heavy sections)

### Grid System
- **Columns**: 12-column grid
- **Gutter**: 24px (desktop), 16px (tablet), 12px (mobile)
- **Breakpoints**:
  - Mobile: < 640px
  - Tablet: 640px - 1024px
  - Desktop: > 1024px
  - Wide: > 1400px

---

## 🎭 Components

### Buttons

#### Primary Button (CTA)
```css
background: linear-gradient(135deg, #10B981 0%, #059669 100%);
color: #FFFFFF;
padding: 14px 28px;
border-radius: 12px;
font-weight: 600;
font-size: 16px;
box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
transition: all 0.2s ease;

&:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(16, 185, 129, 0.35);
}
```

#### Secondary Button
```css
background: transparent;
color: #10B981;
border: 2px solid #10B981;
padding: 12px 26px;
border-radius: 12px;
font-weight: 600;

&:hover {
  background: rgba(16, 185, 129, 0.05);
}
```

#### Ghost Button
```css
background: transparent;
color: #64748B;
padding: 12px 24px;

&:hover {
  color: #1E293B;
  background: #F1F5F9;
}
```

### Cards
```css
background: #FFFFFF;
border: 1px solid #E2E8F0;
border-radius: 16px;
padding: 32px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
transition: all 0.3s ease;

&:hover {
  border-color: #CBD5E1;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-4px);
}
```

### Navigation Bar
```css
position: fixed;
top: 0;
left: 0;
right: 0;
z-index: 100;
background: rgba(255, 255, 255, 0.85);
backdrop-filter: blur(12px);
border-bottom: 1px solid rgba(226, 232, 240, 0.5);
padding: 16px 32px;
```

### Form Inputs
```css
background: #FFFFFF;
border: 2px solid #E2E8F0;
border-radius: 12px;
padding: 14px 18px;
font-size: 16px;
transition: border-color 0.2s;

&:focus {
  outline: none;
  border-color: #10B981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}
```

---

## ✨ Effects & Animations

### Shadows (Elevation)
| Level | Value | Usage |
|-------|-------|-------|
| SM | `0 1px 3px rgba(0,0,0,0.05)` | Subtle lift |
| MD | `0 4px 12px rgba(0,0,0,0.08)` | Cards default |
| LG | `0 8px 24px rgba(0,0,0,0.12)` | Hover state |
| XL | `0 16px 48px rgba(0,0,0,0.16)` | Modals, dropdowns |

### Border Radius
| Size | Value | Usage |
|------|-------|-------|
| SM | 8px | Small elements, tags |
| MD | 12px | Buttons, inputs |
| LG | 16px | Cards, modals |
| XL | 24px | Hero elements |
| Full | 9999px | Pills, avatars, badges |

### Transitions
```css
/* Standard */
--transition-fast: 150ms ease;
--transition-base: 250ms ease;
--transition-slow: 350ms ease;

/* Hover lift */
transform: translateY(-4px);

/* Fade in on scroll */
opacity: 0;
transform: translateY(20px);
animation: fadeInUp 0.6s ease forwards;
```

---

## 🎬 Motion Principles

1. **Purposeful**: Every animation should guide attention or provide feedback
2. **Subtle**: Avoid jarring or distracting movements
3. **Consistent**: Use same easing curves throughout (ease-out for enters, ease-in for exits)
4. **Performant**: Prefer transform/opacity changes for 60fps animations
5. **Respect prefers-reduced-motion**: Always provide fallback

### Key Animations
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(16, 185, 129, 0); }
}
```

---

## 📱 Responsive Behavior

### Mobile-First Approach
- Design for mobile first, enhance for larger screens
- Touch targets minimum 44x44px
- Simplified navigation (hamburger menu on mobile)
- Stacked layouts on small screens

### Breakpoint Adjustments
- **Tablet+**: 2-column grids, side-by-side layouts
- **Desktop+**: Full navigation visible, 3-column grids
- **Wide**: Max-width containers, generous whitespace

---

## ♿ Accessibility Standards

### Color Contrast (WCAG 2.1 AA)
- Normal text: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- All combinations in this palette meet requirements

### Focus States
- Visible focus ring (2px offset, #10B981 color)
- Logical tab order
- Skip-to-content link

### Semantic HTML
- Proper heading hierarchy (h1 → h2 → h3)
- ARIA labels where needed
- Alt text for images
- Form labels associated with inputs

---

## 🖼️ Iconography

### Style
- **Type**: Outline icons (stroke-based)
- **Weight**: 1.5px stroke width
- **Size**: 24px default (20px small, 32px large)
- **Color**: Current color inherit, or specific semantic colors

### Recommended Libraries
- [Lucide Icons](https://lucide.dev) (consistent, modern)
- [Heroicons](https://heroicons.com) (alternative)

---

## 🌍 Internationalization

### Supported Languages
- 简体中文 (zh-CN)
- 繁體中文 (zh-TW)
- English (en-US)
- 日本語 (ja-JP)
- 한국어 (ko-KR)

### RTL Support
- Not required for current languages
- CSS logical properties used where possible

---

## 📦 Component Library Mapping

This design system maps to these implementation technologies:

| Concept | React Component | Styling |
|---------|----------------|---------|
| Button | `<Button variant="primary">` | SCSS Module + CSS Variables |
| Card | `<Card hoverable>` | SCSS Module |
| Input | `<Input>` | SCSS Module |
| Layout | Flexbox/Grid | CSS Modules |
| Typography | Semantic HTML (`h1`, `p`, etc.) | Global Styles |
| Icons | Lucide React `<Icon>` | SVG inline |

---

## 🚀 Landing Page Specifics

### Page Structure (privlocal.com)
1. **Navigation** (sticky, glassmorphism)
2. **Hero** (above-fold, value prop + CTA)
3. **Trust Strip** (social proof, stats)
4. **Features Grid** (3-col, icon cards)
5. **Product Demo** (screenshot/mockup)
6. **Security Deep-Dive** (privacy features)
7. **Testimonials** (3 cards)
8. **Pricing** (3 tiers)
9. **FAQ** (accordion)
10. **Final CTA** (conversion focused)
11. **Footer** (links, legal)

### Conversion Funnel
```
Awareness (Hero) → Interest (Features) → Desire (Demo/Social Proof) → Action (CTA/Pricing)
```

### Key Metrics to Optimize
- **Above-fold CTR**: Hero section engagement
- **Scroll depth**: Content consumption
- **Time on page**: Engagement quality
- **Conversion rate**: Sign-up/purchase completion

---

## 📝 Usage Notes

When generating or editing designs with Stitch:

1. **Always reference this document** as the source of truth
2. **Use token names** (e.g., `--color-accent`) instead of hardcoded values
3. **Maintain consistency** across all screens
4. **Test at multiple breakpoints**
5. **Validate accessibility** with automated tools

---

*Last Updated: 2026-04-14*
*Version: 1.0.0*
*Status: Active*
