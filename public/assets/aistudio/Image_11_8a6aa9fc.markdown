---
name: FinAI Design System
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3d4947'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6d7a77'
  outline-variant: '#bcc9c6'
  surface-tint: '#006a61'
  primary: '#00685f'
  on-primary: '#ffffff'
  primary-container: '#008378'
  on-primary-container: '#f4fffc'
  inverse-primary: '#6bd8cb'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#00694c'
  on-tertiary: '#ffffff'
  tertiary-container: '#1e8462'
  on-tertiary-container: '#f5fff7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#89f5e7'
  primary-fixed-dim: '#6bd8cb'
  on-primary-fixed: '#00201d'
  on-primary-fixed-variant: '#005049'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#97f5cc'
  tertiary-fixed-dim: '#7bd8b1'
  on-tertiary-fixed: '#002115'
  on-tertiary-fixed-variant: '#00513a'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  currency-display:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  currency-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

The design system embodies a modern, institutional fintech standard designed for conversational expense tracking and intelligent financial clarity. Built around reliability, speed, and approachability, the system translates complex personal balance sheets and AI-driven categorization into calm, highly scannable interfaces.

The design movement combines **Corporate Modern** structure with **tactile, accessible digital banking affordances**. Surfaces are kept airy and uncluttered, relying on crisp data presentation, disciplined spacing, and purposeful semantic color coding rather than decorative noise. The interface instills trust, precision, and financial empowerment, optimized natively for Brazilian Portuguese (pt-BR) data structures and localized currency formats (BRL - R$).

## Colors

The core color palette relies on an authoritative teal and emerald foundation, conveying fiscal growth and security. Semantic and category tokens are strictly calibrated for WCAG AA compliance against their corresponding surface tokens.

### Key Identity Colors
- **Primary (`#0D9488`)**: Primary brand actions, active navigation states, interactive highlights.
- **Secondary (`#10B981`)**: Positive cash flow, completed statuses, AI insights, affirmative metrics.
- **Tertiary (`#047857`)**: High-contrast active states, interactive focus rings, secure confirmations.
- **Neutral (`#0F172A`)**: High-contrast slate base for typography and foundational wireframes.

### Expense Category Semantic Tints
Category tags and transaction markers map to a standardized categorical taxonomy:
- **Alimentação (Food & Dining)**: `#F97316` (Deep Orange)
- **Transporte (Mobility & Transit)**: `#3B82F6` (Electric Blue)
- **Educação (Education & Growth)**: `#8B5CF6` (Vibrant Purple)
- **Lazer (Leisure & Entertainment)**: `#EC4899` (Warm Pink)
- **Outros (General & Utilities)**: `#64748B` (Neutral Slate)

### Surfaces & Backgrounds
- **Surface Base**: `#F8FAFC` (Canvas background)
- **Surface Container**: `#FFFFFF` (Card surfaces, modals, popovers)
- **Surface Muted**: `#F1F5F9` (Segmented controls, disabled inputs, table headers)
- **Border Default**: `#E2E8F0` (Card outlines, dividers)

## Typography

The type system is powered entirely by **Inter**, leveraging its tall x-height, neutral geometric forms, and contextual alternates designed for numerical precision and computational legibility.

### Rules & Formatting
- **Currency & Metric Figures**: Numbers, currency symbols (`R$`), and decimal separations must activate tabular figures (`font-feature-settings: 'tnum' 1, 'cv05' 1`) to preserve vertical column alignment across ledgers.
- **Hierarchy Structure**: Large totals and account summaries use `display-lg` and `currency-display` with negative tracking for punchy clarity. Structural subheadings rely on `title-md` and `headline-sm` with semi-bold weights (`600`).
- **Data Densities**: Secondary dates, breakdown tags, and transaction categories use `label-md` uppercase or sentence-cased microcopy to establish distinction from primary ledger values.

## Layout & Spacing

The layout is built on an **8pt spatial rhythm** structured within a 12-column responsive fluid grid on desktop and a single-column layout on mobile.

### Grid & Breakpoints
- **Mobile (320px – 767px)**: 4-column layout, `margin-mobile` (1rem), `gutter-mobile` (1rem). Single vertical stack for dashboard cards and transaction logs. Bottom navigation dock handles global view switching.
- **Tablet (768px – 1023px)**: 8-column layout, `margin` (2rem), `gutter` (1.5rem). Split views for account cards and recent activity tables.
- **Desktop (1024px+)**: 12-column layout maxed at 1280px container width. Fixed 280px left sidebar for navigation and persistent conversational assistant widget, paired with dynamic fluid data grids for ledger analytics.

### Spacing Principles
- `space-xs` (4px) and `space-sm` (8px) are reserved for internal component padding (badges, buttons, pill margins).
- `space-md` (16px) establishes internal padding for inputs and standard list items.
- `space-lg` (24px) controls card-level interior breathing room.
- `space-xl` (32px) defines section margins and separated content blocks.

## Elevation & Depth

Visual hierarchy uses a hybrid strategy of **tonal surface separation** combined with **subtle ambient shadows** to establish physical affordance without visual clutter.

### Elevation Levels
- **Level 0 (Flat / Canvas)**: Pure `#F8FAFC`. Used for global backgrounds and inactive section panels.
- **Level 1 (Cards & Data Panels)**: `#FFFFFF` surface accompanied by a razor-thin border (`1px solid #E2E8F0`) and an ambient drop shadow: `0px 1px 3px rgba(15, 23, 42, 0.05), 0px 1px 2px rgba(15, 23, 42, 0.03)`.
- **Level 2 (Dropdowns, Floating AI Prompts, Hovered Cards)**: Raised state with ambient teal-tinted shadow: `0px 4px 6px -1px rgba(15, 23, 42, 0.07), 0px 2px 4px -2px rgba(13, 148, 136, 0.06)`.
- **Level 3 (Modals, Overlays, Chat Drawer)**: Focused state with high-spread diffusion: `0px 20px 25px -5px rgba(15, 23, 42, 0.1), 0px 8px 10px -6px rgba(15, 23, 42, 0.05)`.

## Shapes

The design system implements a cohesive `roundedness: 2` (base 0.5rem / 8px) scale, extending smoothly to `rounded-lg` (1rem / 16px) and `rounded-xl` (1.25rem - 1.5rem / 20px - 24px) for prominent visual cards and modular panels.

### Geometric Standards
- **Standard Controls (Inputs, Buttons, Tags)**: 8px border-radius (`0.5rem`). Delivers high clickability affordance with clean modern boundaries.
- **Cards, Ledger Containers, Summary Widgets**: 16px (`1rem`) to 20px (`rounded-xl`). Creates friendly, contained zones that group related numerical metrics naturally.
- **Floating Prompts & AI Badges**: 9999px (full pill) for status badges, conversational suggestions, and prompt chips.

## Components

### Buttons
- **Primary**: Solid `#0D9488` background with `#FFFFFF` text. Minimum height of 44px, horizontal padding `space-lg`, border-radius 8px. Hover state deepens to `#047857` with a 150ms ease-in-out transition. Active state applies a scale transform (`0.98`).
- **Secondary / Outlined**: `#FFFFFF` background with `1px solid #E2E8F0` and `#0F172A` text. Hover adds subtle teal tint `#F0FDFA`.
- **Ghost**: Transparent background, `#0D9488` text, used within table rows and inline contextual actions.

### Category Chips & Badges
- Constructed with a 12% opacity tint of the respective category color for the background, 100% saturation for the text, and a matching 20% opacity border:
  - *Alimentação*: BG `#FFF7ED`, Text/Border `#EA580C`
  - *Transporte*: BG `#EFF6FF`, Text/Border `#2563EB`
  - *Educação*: BG `#F5F3FF`, Text/Border `#7C3AED`
  - *Lazer*: BG `#FDF2F8`, Text/Border `#DB2777`
  - *Outros*: BG `#F8FAFC`, Text/Border `#475569`
- Pill shape (full radius), height 24px, typography `label-md`.

### Cards & Ledger Rows
- **Card**: White background, 16px border-radius, Level 1 shadow, 1px `#E2E8F0` border. Internal padding: `space-lg` (24px).
- **Transaction Item**: Flex row container with 12px vertical padding. Left slot houses a rounded (12px) category icon box (40x40px). Center column contains transaction name and date (`body-md` and `label-md`). Right column features BRL amount formatted with tabular figures. Positive amounts display `#047857` with a leading `+`, negative amounts use `#0F172A`.

### Input Fields
- Height 44px, background `#FFFFFF`, border `1px solid #CBD5E1`, border-radius 8px, padding `0 space-md`.
- Focus state triggers border `#0D9488` and an outer ring of `3px rgba(13, 148, 136, 0.15)`.
- Currency input features a fixed prefix (`R$`) rendered in muted `#64748B` with automatic numerical cursor positioning.

### Checkboxes & Radio Buttons
- 20x20px dimension, border-radius 4px (checkbox) or 9999px (radio). Border `1.5px solid #CBD5E1`. Checked state transitions to `#0D9488` with a crisp `#FFFFFF` checkmark or inner dot.

### AI Assistant Query Bar
- Floating rounded card with 20px radius and Level 2 elevation.
- Contains an active sparkling indicator in `#10B981`, a natural language text input ("Ex: Almoço no boteco R$ 45 no débito..."), and a compact send action button.