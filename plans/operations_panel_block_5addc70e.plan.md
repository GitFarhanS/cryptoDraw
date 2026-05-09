---
name: Operations panel block
overview: Rename side panel row "Panel 3" to "Operations", add a palette of eight draggable operation mini-blocks that reuse existing `input-block` styling and drag plumbing, and register their types for canvas placement.
todos:
    - id: rename-panel
      content: Rename PANELS[2] to Operations and render OperationsBlocks when expanded
      status: completed
    - id: drag-types
      content: Add OPERATION_BLOCK_TYPES and extend PLACED_BLOCK_TYPES in drag-constants.js
      status: completed
    - id: operations-ui
      content: Create operations-block/ with OperationsBlocks + reusable OperationBlock (8 variants)
      status: completed
    - id: canvas-map
      content: Register all operation types in canvas-placed-block.jsx BLOCK_BY_TYPE
      status: completed
isProject: false
---

# Operations panel (replace Panel 3)

## Current behavior

- Expandable rows are defined in [`../src/side-panel-expandable-panels.jsx`](../src/side-panel-expandable-panels.jsx): `PANELS[2]` is `'Panel 3'`, which falls through to the placeholder paragraph.
- Draggable palette blocks use `section.input-block` (+ optional `input-block--palette-draggable`), [`attachPaletteDragData`](../src/input-blocks/palette-drag.js), and types listed in [`PLACED_BLOCK_TYPES`](../src/input-blocks/drag-constants.js); [`canvas-placed-block.jsx`](../src/canvas-placed-block.jsx) maps each type string to a React component.

## Implementation

1. **Rename panel label** — In [`side-panel-expandable-panels.jsx`](../src/side-panel-expandable-panels.jsx), change `'Panel 3'` to `'Operations'` in `PANELS`.

2. **Wire expanded body** — In the same file, extend the conditional in `sp-panel-expanded-body`: when `title === 'Operations'`, render a new `<OperationsBlocks />` component (same pattern as `Input` / `Converter`).

3. **Drag types** — In [`../src/input-blocks/drag-constants.js`](../src/input-blocks/drag-constants.js):
    - Add `OPERATION_BLOCK_TYPES` with eight stable camelCase ids, e.g. `opXor`, `opLeftShift`, `opRightShift`, `opBitwiseAnd`, `opMod`, `opPow`, `opAdd`, `opMul`.
    - Spread them into `PLACED_BLOCK_TYPES` so [`isPlacedBlockType`](../src/input-blocks/palette-drag.js) and canvas drop handling keep working without further changes.

4. **New UI module** (mirror [`converter-block/converter-blocks.jsx`](../src/converter-block/converter-blocks.jsx)):
    - Add [`../src/operations-block/operations-blocks.jsx`](../src/operations-block/operations-blocks.jsx): wrapper `div className="input-blocks"` listing eight blocks with `draggableToCanvas`.
    - Add [`../src/operations-block/operation-block.jsx`](../src/operations-block/operation-block.jsx): single reusable component taking `title`, `hint`, `blockType`, `draggableToCanvas` — same structure as [`join-lots-block.jsx`](../src/converter-block/join-lots-block.jsx) (section + `input-block-title` + `input-block-hint`, drag handlers via `attachPaletteDragData`). No extra CSS: rely on existing [`.input-block`](../src/App.css) rules.
    - Map human-readable titles to hints consistent with converter stubs (e.g. note binary/bitwise vs arithmetic where relevant; mention that operand wiring is deferred, matching “Join lots” tone).

5. **Canvas registry** — In [`canvas-placed-block.jsx`](../src/canvas-placed-block.jsx): import the same `OperationBlock` eight times with distinct `blockType` defaults (or one wrapper that reads a fixed prop per import — simplest is eight thin default-export wrappers or a single component used with inline `type` prop via tiny wrapper exports). Register each type in `BLOCK_BY_TYPE`.

## Scope note

- No computation graph or operand wiring in this task — only palette + placed visuals consistent with existing blocks (like Join lots / placeholders).
