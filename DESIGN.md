---
name: Benchly
description: Mental-health AI benchmark catalog — a rigorous monochrome ledger with one amber highlighter
colors:
  paper: "#EBEBEB"
  surface: "#E2E2E2"
  ink: "#080807"
  muted: "#66666B"
  hairline: "#CFCFCF"
  amber: "#EF9043"
  dark-panel: "#181715"
  night: "#0b0a09"
  bone: "#EDEBE4"
  bone-muted: "#8C887E"
  tier-strong: "#3C6E5A"
  tier-moderate: "#8A6D3B"
  tier-limited: "#B5502E"
  tier-unrated: "#938F8A"
typography:
  display:
    fontFamily: "'Lexend', 'Segoe UI', system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 40px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-.03em"
  headline:
    fontFamily: "'Lexend', 'Segoe UI', system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    letterSpacing: "-.02em"
  body:
    fontFamily: "'Cairo', 'Segoe UI', system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Space Mono', 'Roboto Mono', ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: ".12em"
rounded:
  chip: "999px"
  card: "8px"
  panel: "16px"
spacing:
  xs: "8px"
  sm: "12px"
  md: "18px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "#ffffff"
    rounded: "{rounded.chip}"
    padding: "13px 28px"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "12px 26px"
  button-amber:
    backgroundColor: "{colors.amber}"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "12px 26px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "18px"
---

# Design System: Benchly

## Overview

**Creative North Star: "The Research Ledger"**

Benchly reads like a rigorous, modern registry: evidence recorded in near-black ink on off-white grey paper, with exactly one highlighter — signature amber (#EF9043) — reserved for the moments that matter (primary CTAs, the dashboard's data bars). The system is monochrome by conviction, sharp and contemporary in voice (Lexend display, Cairo body, Space Mono metadata), and lets its muted category and tier colors do the only other talking. Whitespace is generous; borders are hairlines; nothing decorative competes with the data.

The site runs two registers of the same ledger: the light catalog world (paper `#EBEBEB`, ink `#080807`) for browsing and comparing, and the night world (`#0b0a09` / `#080A21`, bone text `#EDEBE4`) for the landing, methodology, and access-gate pages — same typography, same pill shapes, same amber accent, inverted mood.

**Key Characteristics:**
- Monochrome ink-on-paper base; color is always semantic (tier, category) or the single amber accent
- Two humanist sans voices: regular-weight Lexend headlines with tight tracking, rounded Cairo text, Space Mono uppercase labels
- Pill-shaped interactive elements against rectangular, hairline-bordered data surfaces
- Two inverted registers (paper catalog / night landing) sharing one voice

## Colors

A monochrome ledger with one highlighter and a strictly semantic supporting cast.

### Primary
- **Ink** (#080807): Primary text, primary buttons, nav, chart bars. The brand color IS the text color — monochrome like a printed registry.
- **Signature Amber** (#EF9043): The one highlighter. Primary CTAs ("Browse the catalog"), gate accept button, dashboard bar gradients (#F5A55F → #E0782F). Always carries ink text, never light text.

### Neutral
- **Paper** (#EBEBEB): Page background of the catalog world.
- **Surface** (#E2E2E2): Cards, inputs, toggles.
- **Muted** (#66666B): Secondary text on paper.
- **Hairline** (#CFCFCF): Borders and dividers — always 1px.
- **Night** (#0b0a09, with #080A21 variant): Landing/method/gate page backgrounds and the dark footer (#181715).
- **Bone** (#EDEBE4): Primary text on night surfaces; **Bone Muted** (#8C887E) for secondary. Translucent bone (`rgba(237,235,228,.06–.35)`) forms dark-world fields and outlines.

### Tertiary (semantic only)
- **Tier colors**: Strong (#3C6E5A, forest), Moderate (#8A6D3B, ochre), Limited (#B5502E, rust), Unrated (#938F8A, warm grey). Used exclusively for rigor-tier badges, ticks, and charts.
- **Category palette**: eight muted editorial hues (rust #B4553E, dusty blue #4F7183, ochre #8F6E2E, moss #5F7A55, coffee #8A6D4B, indigo #6B6191, teal #3F7E74, mauve #8A5560) — one per task category, used for card color-bands and category coding. Tuned to sit on the paper background and carry light text.

### Named Rules
**The One Highlighter Rule.** Amber appears only where the user should act or look next — never as decoration, never more than one amber element per viewport region. Its rarity is the point.
**The Semantic Color Rule.** Every non-neutral color on screen must mean something (a tier, a category, or the accent). No mood colors.

## Typography

**Display Font:** Lexend ('Segoe UI' / system-ui fallback)
**Body Font:** Cairo ('Segoe UI' / system-ui fallback)
**Label/Mono Font:** Space Mono (Roboto Mono fallback)

**Character:** Two humanist sans voices: Lexend's open, legibility-first headlines — always regular weight, never bold — over Cairo's rounded, friendly body, with monospace uppercase kickers doing the wayfinding.

### Hierarchy
- **Display** (400, clamp(28px–40px), 1.02, -.03em): Page heroes ("Before you enter", landing headline).
- **Headline** (400, 18–19px, -.02em): Wordmark, section titles, FAQ questions.
- **Title** (400, 15px): Card titles, panel headings.
- **Body** (400–500, 13–14.5px): Descriptions, nav items, table content.
- **Label** (400–600, 10.5–12px, .08–.16em tracking, UPPERCASE, Space Mono): Kickers, field labels, metadata, footer legal. The system's signature texture.

### Named Rules
**The Mono Kicker Rule.** Every section and form field is introduced by a Space Mono uppercase label with wide tracking. It is the ledger's stamp — do not replace it with sans-serif or sentence case.

## Layout

Max content width 1200px, centered, 24px side padding. Generous vertical whitespace between sections; data-dense within panels. Catalog cards sit in a responsive grid with a color top-band per category. The dashboard uses dark rounded panels (radius 16–18px) with amber bar charts. Spacing rhythm is loose multiples of 6–8px (8/12/18/24).

## Elevation & Depth

Essentially flat. Depth is conveyed by surface tone shifts (paper → surface → dark panel) and 1px hairlines, not shadows. The access-gate modal is the one exception: a translucent dark panel (`rgba(18,17,13,.74)`) with `backdrop-filter: blur(6px)`. Hover states may lift subtly (`.lift`), never with heavy drop shadows.

**The Flat Ledger Rule.** No box-shadows at rest. Separation comes from tone and hairline, matching the printed-registry metaphor.

## Shapes

Two form languages, deliberately opposed: **interactive elements are pills** (borderRadius 999 — buttons, chips, filter toggles, progress tracks), while **content surfaces are rectangles with small radii** (cards 8px, dark dashboard panels 16–18px). Little square swatches (10px, radius 2–3px) act as color-key markers next to the wordmark and legends. Borders are always 1px hairlines.

## Components

### Buttons
- **Shape:** Full pill (999px)
- **Primary:** Ink background, white text, 13px 28px padding, 14px/600 Cairo
- **Amber CTA:** Amber background, ink text, 700 weight — reserved for the single most important action
- **Outline:** Transparent with 1px ink border (light world) or `rgba(237,235,228,.35)` border with bone text (dark world)
- **Disabled:** `rgba(237,235,228,.15)` background, half-opacity text, not-allowed cursor

### Chips / Tags
- **Style:** Pill, paper background, 2px 8px padding, 11px text (mono when metadata)
- **Tier badge:** tier-colored tick marks (6×12px, radius 1) + Space Mono 11px label in the tier color

### Cards / Containers
- **Catalog card:** Surface background, 1px hairline border, 8px radius, 18px padding; category color top-band; 26×2px accent underline strip
- **Dark dashboard panel:** 16–18px radius, dark background, amber gradient bars, bone text
- **Border:** 1px hairline (#CFCFCF light / translucent bone dark)

### Inputs / Fields
- **Dark world:** `rgba(237,235,228,.06)` fill, 1px `rgba(237,235,228,.2)` border, 8px radius, 11px 13px padding, bone text; Space Mono uppercase label above
- **Light world:** surface-grey fill, hairline border, same geometry

### Navigation
- **Style:** Ink wordmark (Lexend 600, 18px) with 10px square color swatch; Cairo 13px items, weight 600 when active; page-context banner strip (mono 11.5px) below on catalog pages; dark footer (#181715) with bone-muted mono metadata

## Do's and Don'ts

### Do:
- **Do** keep amber (#EF9043) paired exclusively with ink text and limited to one focal action per region.
- **Do** introduce every section/field with a Space Mono uppercase kicker (.12em+ tracking).
- **Do** use pills for anything clickable and small radii (8–18px) for anything that holds content.
- **Do** pull semantic colors from the existing tier and category palettes rather than inventing new hues.

### Don't:
- **Don't** add box-shadows at rest or gradients outside the amber data-bars.
- **Don't** introduce new accent colors — the system is monochrome plus amber plus semantic hues.
- **Don't** use light text on amber, or amber on the light paper background in large fields.
- **Don't** substitute the committed faces (Lexend / Cairo / Space Mono) or add new font families.
