---
name: Drawer-sync strip flex
overview: "Lift side panel open state to App, replace `@starting-style` with a two-frame explicit “start” class for the expanded strip, and add `contain: layout`, `will-change: flex-basis`, and longhand flex transitions on the track/strips so expand/collapse stays in sync when the drawer opens and closes."
todos:
  - id: lift-drawer-state
    content: Lift side panel open state to App.jsx; make SidePanel controlled (open + onOpenChange); pass drawerOpen to GrayscalePanels.
    status: completed
  - id: grayscale-sync-entry
    content: "GrayscalePanels: reset expansion when drawer closes; guard clicks when closed; add is-expanded-start + double rAF to replace @starting-style."
    status: completed
  - id: css-contain-willchange
    content: "App.css: contain:layout on .grayscale-panels-track; strip transitions for flex-basis/grow/shrink + will-change; .is-expanded-start; remove @starting-style and duplicate transition on .is-expanded only."
    status: completed
  - id: drawer-easing
    content: Align .side-panel-drawer width transition easing/duration with strip (0.32s cubic-bezier).
    status: completed
isProject: false
---

# Drawer-synced strip transitions (flex-only)

## Current behavior

- [`../src/App.css`](../src/App.css): `.grayscale-panels-track` is a row flex container; strips use `flex: 1 1 0` by default. When [`.grayscale-panels--has-expanded`](../src/App.css) is on the parent, non-expanded strips get `flex: 0 0 var(--grayscale-collapsed-w)` and the expanded strip gets a large `flex-basis` with **`transition: flex-basis` only** on the expanded rule.
- [`@starting-style`](../src/App.css) (lines 210–214) seeds `flex-basis: calc(100% / var(--grayscale-strip-count))` so the first transition has a defined “from” value. As you noted, this does not reliably re-fire when the drawer subtree’s layout is re-established on reopen—only an explicit entry state fixes that.
- [`../src/side-panel.jsx`](../src/side-panel.jsx): `open` is local; [`../src/grayscale-panels.jsx`](../src/grayscale-panels.jsx) has no knowledge of the drawer, so expansion cannot be gated or reset in sync with the drawer.

## 1. Lift drawer open state and pass `drawerOpen` into strips

- In [`../src/App.jsx`](../src/App.jsx), add `sidePanelOpen` / `setSidePanelOpen` (or `open` / `setOpen`) and pass it to both `SidePanel` and `GrayscalePanels`.
- Change [`../src/side-panel.jsx`](../src/side-panel.jsx) to a **controlled** panel: props `open` and `onOpenChange` (boolean setter pattern). Remove internal `useState` for open; wire the toggle to `onOpenChange(!open)`.
- Pass `drawerOpen={sidePanelOpen}` into `GrayscalePanels`.

**Sync rules (JS):**

- `useEffect` in `GrayscalePanels`: when `drawerOpen` becomes `false`, set `expandedIndex` to `null` (and clear any expand-entry flag) so expanded layout never fights a zero-width drawer.
- In `toggleStrip` / click handler: if `!drawerOpen`, return early (belt-and-suspenders even if hit targets are odd at `width: 0`).

Optional polish: add `className={\`side-panel ... ${open ? 'is-open' : ''}\`}` remains; no change to DOM structure.

## 2. Replace `@starting-style` with explicit entry classes

- Remove the `@starting-style` block from [`../src/App.css`](../src/App.css).
- In `GrayscalePanels`, when transitioning **to** expanded (user picks a strip that was not already expanded):
  1. Set `expandedIndex` to `index` (parent gets `grayscale-panels--has-expanded`, strip gets `is-expanded`).
  2. On the same commit, also set an **`is-expanded-start`** (name as you prefer) class on that strip so CSS forces the **same** longhands as the final expanded strip but **`flex-basis: calc(100% / var(--grayscale-strip-count))`** (match the old `@starting-style` intent).
  3. After **two** `requestAnimationFrame` callbacks (or `useLayoutEffect` + double rAF), remove `is-expanded-start` so the stylesheet’s normal `.is-expanded` `flex-basis` applies and the browser runs one transition from equal share → wide basis.
- Collapsing (`expandedIndex` → `null`): no entry class; just clear state.
- If the user toggles **same** strip to collapse, skip the entry sequence.

CSS addition (conceptually):

- `.grayscale-panels--has-expanded .grayscale-panels-strip.is-expanded.is-expanded-start { flex-grow: 0; flex-shrink: 0; flex-basis: calc(100% / var(--grayscale-strip-count)); }` (mirror non-start expanded longhands so only basis differs).

## 3. `contain: layout` on the track

- On [`.grayscale-panels-track`](../src/App.css), add `contain: layout;` to limit upward flex/reflow impact (per your note). Keep existing flex/width/min-height as-is unless something conflicts (unlikely).

## 4. `will-change` + transition all three flex longhands

- On [`.grayscale-panels-strip`](../src/App.css) (base rule, not only `.is-expanded`): add  
  `transition: flex-basis 0.32s cubic-bezier(0.4, 0, 0.2, 1), flex-grow 0.32s cubic-bezier(0.4, 0, 0.2, 1), flex-shrink 0.32s cubic-bezier(0.4, 0, 0.2, 1);`  
  and `will-change: flex-basis;` as requested.
- **Remove** the narrower `transition: flex-basis only` from [`.grayscale-panels--has-expanded .grayscale-panels-strip.is-expanded`](../src/App.css) so one unified transition applies (avoids grow/shrink jumping while basis interpolates).

If transitions feel redundant on every hover/focus, we can later narrow `will-change` to “while `--has-expanded`” only; initial implementation follows your spec literally.

## 5. Reduce drawer vs strip layout jank

- Align [`.side-panel-drawer`](../src/App.css) timing/easing with the strip curve (e.g. `0.32s cubic-bezier(0.4, 0, 0.2, 1)` instead of `0.2s ease`) so width and flex animations are not on totally different clocks. Strip `will-change: flex-basis` stays the main compositor hint for the strip layer.

## Files touched

| File | Change |
|------|--------|
| [`../src/App.jsx`](../src/App.jsx) | Panel state; pass props to `SidePanel` and `GrayscalePanels` |
| [`../src/side-panel.jsx`](../src/side-panel.jsx) | Controlled `open` / `onOpenChange` |
| [`../src/grayscale-panels.jsx`](../src/grayscale-panels.jsx) | `drawerOpen` prop, effect reset, guarded toggle, entry class + rAF |
| [`../src/App.css`](../src/App.css) | Remove `@starting-style`, add `contain`, strip transitions + `will-change`, `.is-expanded-start`, drawer easing, dedupe expanded-only transition |

## Verification

- Open drawer → expand a strip → should animate from equal-width basis to wide basis **every time**, not only on first page load.
- Close drawer → strips should return to default column layout (no stuck `is-expanded` / `--has-expanded`).
- Reopen drawer → expand again → same smooth entry.
- Quick sanity in Chrome + Firefox (starting-style removal means behavior no longer depends on that feature).
