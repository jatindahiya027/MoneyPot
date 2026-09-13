---
name: MoneyPot
description: A calm, precise interface for private personal finance management.
colors:
  primary-blue: "#5a82e1"
  primary-blue-hover: "#7099f0"
  canvas: "#0b0d10"
  panel: "#202224"
  card: "#181818"
  card-hover: "#222222"
  text: "#f0ffff"
  text-muted: "#9a9999"
  success: "#4ade80"
  danger: "#f87171"
  warning: "#fbbf24"
typography:
  headline:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.3
  amount:
    fontFamily: "DM Mono, monospace"
    fontSize: "21px"
    fontWeight: 700
    lineHeight: 1.3
rounded:
  sm: "7px"
  md: "10px"
  lg: "14px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary-blue}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.text}"
    rounded: "{rounded.lg}"
    padding: "20px"
---

# Design System: MoneyPot

## Overview

**Creative North Star: "The Financial Control Desk"**

MoneyPot feels like a focused workspace for reviewing sensitive personal information: composed, legible, and exact. Data receives the strongest emphasis, while navigation and controls remain restrained and familiar. Density is purposeful, with enough breathing room to scan quickly without turning routine financial work into a sparse presentation.

The system rejects playful consumer-fintech decoration, promotional dashboard theatrics, and dense enterprise accounting software. Every screen uses one coherent control vocabulary and exposes clear keyboard focus, disabled, loading, empty, and error states.

**Key Characteristics:**

- Calm dark surfaces with a single blue action accent
- Tabular numerals for financial values
- Compact but comfortably clickable controls
- Structural borders and tonal layers instead of decorative shadows
- Predictable responsive navigation and forms

## Colors

The existing dark neutral palette remains the identity; restrained blue marks action and selection, while green, red, and amber communicate financial status.

### Primary

- **Control Blue:** Used only for primary actions, keyboard focus, active navigation, and selected controls.
- **Control Blue Hover:** Used for direct hover feedback on primary actions.

### Neutral

- **Night Canvas:** The application background and main workspace.
- **Raised Panel:** Dialogs, authentication panels, and secondary navigation regions.
- **Ledger Card:** Cards, fields, toolbars, and table controls.
- **Primary Ink:** Main copy, labels, and values.
- **Muted Ink:** Supporting copy and secondary metadata; never used below AA contrast for required text.

### Named Rules

**The Data Owns Color Rule.** Blue marks interaction. Green, red, and amber mark financial meaning. No other decorative color is introduced.

## Typography

**Display Font:** DM Sans (sans-serif fallback)
**Body Font:** DM Sans (sans-serif fallback)
**Label/Mono Font:** DM Mono (monospace fallback)

**Character:** One clean sans-serif keeps the product quiet and consistent. A restrained mono face aligns currency and numerical comparisons without making the interface feel like a terminal.

### Hierarchy

- **Headline** (700, 24px, 1.2): Page and dialog titles.
- **Title** (600, 16px, 1.3): Card and section headings.
- **Body** (400, 14px, 1.5): Instructions and descriptions, capped near 70 characters where prose appears.
- **Label** (600, 12px, normal case): Form labels, filters, and table metadata.
- **Amount** (700, 21px, 1.3): Overview values and significant totals.

### Named Rules

**The Ledger Numeral Rule.** Currency, percentages, dates in dense tables, and comparative values use DM Mono with tabular numerals.

## Elevation

MoneyPot is flat by default. Depth comes from distinct dark surfaces and precise low-contrast borders. Shadows are reserved for overlays and floating popovers where separation from the workspace is necessary.

### Named Rules

**The Structural Depth Rule.** Resting cards use a border or tonal contrast, never a decorative wide shadow paired with a border.

## Components

### Buttons

- **Shape:** Gently curved rectangle (10px radius), minimum 38px height.
- **Primary:** Control Blue with white text and semibold label.
- **Hover / Focus:** Lighter blue on hover; a visible blue focus ring with offset.
- **Secondary / Ghost:** Ledger Card or transparent background with restrained neutral text.

### Chips

- **Style:** Compact rounded status element with a tinted semantic background and explicit text label.
- **State:** Selected filters use blue tint and border; financial state badges retain green or red text.

### Cards / Containers

- **Corner Style:** Restrained rounding (12–14px).
- **Background:** Ledger Card on Night Canvas.
- **Shadow Strategy:** Flat at rest.
- **Border:** One low-contrast full perimeter border.
- **Internal Padding:** 16–24px according to content density.

### Inputs / Fields

- **Style:** 40px control height, Ledger Card background, 9–10px radius, clear label above.
- **Focus:** Blue border and soft three-pixel focus halo.
- **Error / Disabled:** Error uses both red border and message; disabled reduces opacity and blocks interaction.

### Navigation

The desktop sidebar uses icon-and-label rows with a tinted active state. Mobile uses a labeled bottom bar and an accessible top navigation trigger. Hover, active, and focus treatments are consistent with buttons.

## Do's and Don'ts

### Do:

- **Do** preserve Control Blue as the only interaction accent.
- **Do** use at least 38px-high controls and visible keyboard focus.
- **Do** align financial figures with DM Mono and tabular numerals.
- **Do** provide clear empty, loading, error, disabled, hover, and active states.
- **Do** use concise action labels such as “Save changes” and “Delete transaction.”

### Don't:

- **Don't** use playful consumer-fintech decoration or promotional dashboard theatrics.
- **Don't** add excessive gradients, glow, oversized metrics without context, or new colors.
- **Don't** imitate dense enterprise accounting software that obscures common tasks.
- **Don't** use inconsistent controls for the same action across screens.
- **Don't** alter graph implementations or their color assignments during interface polish.
