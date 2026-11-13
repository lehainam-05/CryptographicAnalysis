---
name: Tiền số & Cổ phiếu
description: Dark, evidence-first analytics dashboard for Vietnamese stocks and crypto
colors:
  page: "#0F172A"
  panel: "#1E293B"
  inset: "#172033"
  line: "#475569"
  ink: "#F8FAFC"
  ink-secondary: "#CBD5E1"
  ink-muted: "#94A3B8"
  accent: "#2563EB"
  accent-hover: "#1E40AF"
  accent-soft: "#3B82F6"
  market-stock: "#3B82F6"
  market-crypto: "#D97706"
  forecast: "#F59E0B"
  up: "#10B981"
  down: "#F43F5E"
typography:
  headline:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 700
  title:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
  stat:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "30px"
    fontWeight: 700
  body:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "Inter, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    letterSpacing: "0.05em"
  numeric:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "4px"
  metric: "5px"
  field: "8px"
  panel: "10px"
  pill: "9999px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 20px"
    height: "42px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "6px 12px"
  field-select:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 12px"
    height: "42px"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.panel}"
    padding: "20px"
  metric-row:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.metric}"
    padding: "10px 12px"
  nav-link:
    textColor: "{colors.ink-secondary}"
    padding: "20px 12px"
  nav-link-active:
    textColor: "{colors.ink}"
---

# Design System: Tiền số & Cổ phiếu

## Overview

**Creative North Star: "The Lab Notebook"**

A dark, quiet working surface where data is the only thing that shines. Every panel reads like a
page of a lab notebook: a numbered title, a one-line note on what is measured and how, the chart
or table, then a short reading of the result. Nothing on screen is decorative; colour, weight and
position all carry meaning.

The system is dense but calm. Slate layers separate regions instead of shadows, a single blue
accent marks interaction, and semantic colours (market identity, rise/fall, forecast) are reserved
for data. Typography is one sans family; numbers switch to monospace so columns line up and read as
measurements. Refinement keeps this world: tighten consistency, legibility on a projector-free
laptop and on a phone, and the "note under every chart" habit.

**Key Characteristics:**
- Dark slate layering (page → panel → inset), flat, bordered.
- One interactive accent (blue); data colours never double as UI colours.
- Numbered panel titles with a source/method subtitle.
- Monospace numerals for every measured value.
- Each chart ends with a one-line plain-Vietnamese reading.

## Colors

A cool slate field with one blue accent and a small, strictly semantic data palette.

### Primary
- **Signal Blue** (accent): primary buttons, active nav underline, focus and hover borders. Hover
  deepens to **Deep Signal Blue** (accent-hover); **Soft Signal Blue** (accent-soft) is the
  underline and border-highlight tint.

### Neutral
- **Night Slate** (page): page background and inset controls (selects, metric rows).
- **Panel Slate** (panel): panels, header bar, footer.
- **Ink Well** (inset): table headers and row hover, one step below panel.
- **Graphite Rule** (line): every border and divider.
- **Chalk** (ink): headings, values, active nav.
- **Slate Mist** (ink-secondary): body copy, labels, inactive nav. Replaces the earlier warm grey
  `#C3C2C2`, which fought the cool slate field.
- **Fog** (ink-muted): subtitles, axis labels, captions.

### Data (semantic, never used for UI chrome)
- **Stock Blue** (market-stock): Vietnamese stocks in every chart, badge and legend.
- **Copper Crypto** (market-crypto): crypto in every chart, badge and legend. Replaces the earlier
  purple crypto badge so one market has one colour across the app.
- **Forecast Amber** (forecast): model forecast lines, always dashed.
- **Gain Green** (up) / **Loss Rose** (down): rise and fall only (candles, MACD histogram, signed
  changes).
- Correlation heatmaps use a diverging blue → slate → rose scale; coverage heatmaps a single-hue
  dark-to-light blue ramp.

### Named Rules
**The One Market, One Colour Rule.** Stock is always Stock Blue and crypto always Copper Crypto,
in charts, badges and legends alike. A filter never repaints a series.

**The Accent Is For Hands Rule.** Signal Blue means "you can act here". Data that happens to be
blue uses Stock Blue in a chart context, never on a control.

## Typography

**Body Font:** Inter (with Arial, sans-serif)
**Numeric Font:** system monospace stack

**Character:** One neutral grotesque for all prose keeps the notebook calm; monospace numerals
make every metric look measured and keep columns aligned.

### Hierarchy
- **Headline** (700, 25px): page title, one per page.
- **Title** (600, 16px): panel titles, numbered ("1. Phân phối lợi suất ngày").
- **Stat** (700, 30px): headline numbers on overview stat cards.
- **Body** (400, 14px, 1.6): descriptions and readings; keep to ~75ch.
- **Label** (600, 12px, 0.05em, uppercase): table headers and stat-card labels only.
- **Numeric** (600, 14px, monospace): values in metric rows and tables.

### Named Rules
**The Measured Number Rule.** Any value computed from data is set in monospace with its unit;
prose never carries a bare number without its unit or period.

## Layout

Single centred column, max width 1400px, 20px side gutter, 24px vertical rhythm between sections
(`gap-6`). Pages open with a header block (title + one-paragraph description), optional filter bar,
then panels in responsive grids: one column on small screens, two columns from `xl`, or a wide main
panel with a 320px side panel. Inside panels: 20px padding, 10–12px gaps between metric rows. The
header bar is sticky; its nav scrolls horizontally on narrow screens. Mobile is a first-class target
(the lecturer opens the app from a QR code), so every grid must collapse to one column without
horizontal page scroll.

## Elevation & Depth

Flat by default. Depth comes from tonal layering (page `#0F172A` → panel `#1E293B` → inset
`#172033`) plus 1px Graphite Rule borders. The only shadow is the metric row's low ambient lift.

### Shadow Vocabulary
- **Metric lift** (`box-shadow: 0 5px 20px rgba(0,0,0,0.25)`): metric rows inside panels.

### Named Rules
**The Layer Not Shadow Rule.** New surfaces separate by tone and border, never by adding shadows.

## Shapes

Soft but disciplined corners: 10px panels, 8px fields, 5px metric rows, 4px buttons, full pills
for badges. All containers carry a 1px border; chart bars end in 4px rounded caps.

## Components

### Buttons
- **Shape:** gently squared (4px), 42px tall.
- **Primary:** Signal Blue fill, white 14px semibold text, 20px side padding.
- **Hover / Focus:** deepens to Deep Signal Blue and lifts 2px; disabled turns slate with muted
  text and no lift.
- **Secondary:** Night Slate fill, Graphite Rule border, small 12px text; border turns Soft Signal
  Blue on hover. Used for "Thử lại" and table actions.

### Chips (badges)
- **Style:** full pill, 1px border at 40% of the tone, 10% tinted fill, light text in the tone.
- **State:** static labels (asset class, model method, status), not interactive.

### Cards / Containers
- **Corner Style:** 10px.
- **Background:** Panel Slate with Graphite Rule border; header row separated by a border.
- **Shadow Strategy:** none (see Elevation).
- **Internal Padding:** 20px; header 20px × 16px.

### Inputs / Fields
- **Style:** 42px select, Night Slate fill, Graphite Rule border, 8px corners, label above in Slate
  Mist.
- **Focus:** border turns Soft Signal Blue. Disabled text turns slate-500.

### Navigation
- **Style:** sticky Panel Slate bar; brand mark + name at left; 15px links in Slate Mist.
- **Hover / Active:** text turns Chalk and a 3px Soft Signal Blue underline grows across the link.
- **Mobile:** the link row scrolls horizontally.

### Metric Row (signature)
Label left in Slate Mist, monospace value right in Chalk, optional note below in Fog; border
highlights Soft Signal Blue on hover. The building block of every side panel.

### State Box (signature)
Centred icon + message for loading (spinning blue), error (rose, with "Thử lại" button) and empty
(slate) states. Every data panel uses it instead of a blank area.

## Do's and Don'ts

### Do:
- **Do** number panel titles and give each a subtitle naming the method or source.
- **Do** end every chart panel with a one-line reading of what it shows.
- **Do** keep Stock Blue (`#3B82F6`) and Copper Crypto (`#D97706`) identical across charts,
  badges and legends.
- **Do** draw forecast lines dashed in Forecast Amber (`#F59E0B`) and keep the Naive baseline
  visible next to any model result.
- **Do** set measured values in monospace with units.

### Don't:
- **Don't** use Signal Blue on data or semantic colours on controls.
- **Don't** add shadows, gradients or glows to separate surfaces.
- **Don't** rely on colour alone: every multi-series chart has a legend or direct labels.
- **Don't** introduce a second accent hue or a warm grey into the slate neutrals.
