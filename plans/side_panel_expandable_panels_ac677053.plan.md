---
name: Side panel expandable panels
overview: Add a new JSX component that renders five stacked grayscale rows inside the side panel; clicking one expands it to fill the panel inner area, with an explicit control to collapse back to the five-row layout.
todos:
    - id: add-component
      content: Create side-panel-expandable-panels.jsx with 5 rows, expandedIndex state, full-height expanded view + close control
      status: completed
    - id: add-css
      content: Add grayscale flex layout styles to App.css under sp-panels namespace
      status: completed
    - id: wire-app
      content: Import component and render as SidePanel children in App.jsx
      status: completed
isProject: false
---

# Expandable grayscale panels in side panel

## Context

- [`../src/side-panel.jsx`](../src/side-panel.jsx) renders `children` inside `.side-panel-inner` (flex column, scrollable, fixed width ~288px).
- [`../src/App.jsx`](../src/App.jsx) mounts `<SidePanel>` with **empty** `children` today — the new component will be passed as those children.

## Behavior (single “expanded” slot)

- **Collapsed:** Five equal-height (or flex-distributed) grayscale rows stacked vertically, each clearly tappable (entire row expands, or a primary hit target + optional chevron). Only **one** panel expanded at a time; expanding another switches which one is full-size (matches “each … on its own”).
- **Expanded:** The chosen panel becomes a **flex: 1** child with `min-height: 0` so it fills all remaining vertical space inside `.side-panel-inner` (the usable “whole” of the drawer content). A **close/back** control (e.g. top bar with “Back” or ×) sets expansion back to none so all five return to their compact strip form.

## Implementation

1. **New file** [`../src/side-panel-expandable-panels.jsx`](../src/side-panel-expandable-panels.jsx) (name can be shortened if you prefer, e.g. `expandable-panels.jsx`):
    - `useState` for `expandedIndex` (`null` | `0`–`4`).
    - Map over a fixed array of 5 items (placeholder labels like “Panel 1” … “Panel 5”, or a small `PANELS` constant).
    - **Collapsed UI:** container `display: flex; flex-direction: column; flex: 1; min-height: 0; gap` — five `button` elements (type `button`) for accessibility: `aria-expanded={expandedIndex === i}`, optional `aria-controls` for the expanded region id.
    - **Expanded UI:** when `expandedIndex === i`, render either (a) only that panel’s full view, or (b) keep the list in DOM but visually hide others — (a) is simpler: one fragment that shows either the list or the single expanded panel.
    - Expanded body: header row with close + title; body area `flex: 1; overflow: auto; min-height: 0` for long content later.

2. **Styles** in [`../src/App.css`](../src/App.css) (alongside existing `.side-panel-inner` rules):
    - Namespace classes e.g. `.sp-panels`, `.sp-panel-row`, `.sp-panel-expanded`, `.sp-panel-expanded-header`.
    - **Grayscale:** neutral backgrounds (`#eaeaec`, `#e2e4e8`, etc.), borders `#c5c9d1` / `#b0b4bd`, text `#3d3d42` — consistent with the app’s existing cool grays but clearly monochrome.
    - Rows: `min-height` ~44–56px, `border-radius` 6–8px, hover/focus-visible aligned with `.side-panel-toggle:focus-visible` (reuse outline pattern).
    - Expanded: full flex height of parent; close button styled like existing controls (no new design system).

3. **Wire-up** in [`../src/App.jsx`](../src/App.jsx):
    - `import SidePanelExpandablePanels from './side-panel-expandable-panels'` (or chosen filename).
    - `<SidePanel ...><SidePanelExpandablePanels /></SidePanel>`.

## Accessibility

- Expand/collapse via `button`, not `div` + `onClick`.
- `aria-expanded` on each row button; expanded region `role="region"` + `aria-labelledby` pointing at header title id (optional but good).

## Out of scope (unless you ask)

- Animating height between collapsed/expanded (can add a short CSS transition later).
- Persisting which panel was open across sessions.
- Custom content per panel beyond placeholders.
