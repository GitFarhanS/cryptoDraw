---
name: Operation Format Override
overview: Add format auto-detection to operation blocks with an optional manual override, using hex fallback for mixed input formats, and keep evaluation/display consistent across the graph.
todos: []
isProject: false
---

# Operation Format Detection + Override Plan

## Goal

Make operation blocks display values in the detected upstream format (binary/hex/ascii/decimal), while allowing users to override via a manual selector. If `in:a` and `in:b` formats differ, default to hex.

## Implementation Steps

- Extend operation block state model to store optional format override (e.g., `opDisplayFormat` on the placed block record).
- Derive effective operation display format from graph metadata:
    - if override exists, use it
    - else if both input formats match, use that format
    - else use `hex` (your chosen mixed-input policy)
- Update operation result rendering to use effective format instead of hardcoded hex.
- Add UI controls on operation blocks:
    - `Auto` mode (default)
    - manual format picker (binary/ascii/hex/decimal) enabled when override is active
- Ensure graph evaluation propagates enough metadata for operation blocks to infer input formats consistently.

## Target Files

- [`../src/operations-block/operation-block.jsx`](../src/operations-block/operation-block.jsx)
    - Replace fixed `hex` result rendering with effective format logic.
    - Add Auto/Manual toggle and format dropdown; wire to `onBlockPatch`.
- [`../src/graph/evaluate-graph.js`](../src/graph/evaluate-graph.js)
    - Confirm operation outputs carry `portFormats`/`portBitLengths` appropriate for downstream rendering.
    - Keep mixed-input fallback behavior deterministic (hex).
- [`../src/canvas-placed-block.jsx`](../src/canvas-placed-block.jsx)
    - Ensure operation block receives patch callback/state needed for format override.
- [`../src/graph/placed-block-defaults.js`](../src/graph/placed-block-defaults.js)
    - Add default fields for operation display mode/override where needed.
- [`../src/graph/evaluate-graph.test.js`](../src/graph/evaluate-graph.test.js)
    - Add tests for auto-detected same-format inputs, mixed-format fallback to hex, and manual override behavior.

## Validation

- Unit tests for:
    - operation auto mode with same-format inputs
    - operation auto mode with mixed formats -> hex fallback
    - operation manual override forcing binary/decimal/ascii/hex rendering
- Manual smoke check in UI:
    - wire binary->op and verify binary result display
    - wire mixed inputs and verify hex fallback
    - toggle manual mode and confirm displayed format changes immediately without breaking wire values.
