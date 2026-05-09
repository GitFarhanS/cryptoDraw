---
name: Input and split notches
overview: Add bottom outgoing notches to the four input blocks and implement split block notch behavior with one top incoming notch and dynamic bottom outgoing notches driven by a repurposed Number of blocks field.
todos:
    - id: css-notch-foundation
      content: Add reusable notch styles in App.css for input and split blocks
      status: completed
    - id: input-block-notch-markup
      content: Tag Binary/Hex/Decimal/ASCII blocks to show bottom outgoing notch only
      status: completed
    - id: split-block-dynamic-notches
      content: Repurpose split field to Number of blocks and render 1 top + N bottom notches
      status: completed
    - id: lint-check
      content: Run lints for edited files and resolve any new issues
      status: completed
isProject: false
---

# Add Input And Split Notches

## Scope Confirmed

- Apply bottom outgoing notch only to the four input blocks: [binary-block.jsx](../src/input-blocks/binary-block.jsx), [hex-block.jsx](../src/input-blocks/hex-block.jsx), [decimal-block.jsx](../src/input-blocks/decimal-block.jsx), and [ascii-block.jsx](../src/input-blocks/ascii-block.jsx).
- In [split-into-lots-block.jsx](../src/converter-block/split-into-lots-block.jsx), use a single top incoming notch and dynamic bottom outgoing notches.
- Repurpose the existing split numeric field from block size to number of blocks.

## Implementation Steps

- Update [App.css](../src/App.css) to add reusable notch styles:
    - Base notch container/positioning hooks for top and bottom.
    - Bottom outgoing notch visual for input blocks.
    - Split-specific notch styles supporting one top notch and a dynamic row of bottom notches.
- Update the four input block components to add a class modifier (e.g. input variant class) that enables the bottom outgoing notch styling without affecting converter/output cards.
- Refactor [split-into-lots-block.jsx](../src/converter-block/split-into-lots-block.jsx):
    - Rename state/labels/aria text to `number of blocks`.
    - Keep integer validation (`>= 1`) and clamp render count to a safe max for UI stability.
    - Render one top notch element.
    - Render N bottom notch elements based on the numeric value.
- Run lint diagnostics for changed files and adjust class names/markup if needed.

## Notes

- The notch visuals will be purely presentational (no connection logic yet), but DOM structure will be ready for future wiring.
- Existing drag-and-drop behavior remains unchanged because changes are limited to class names and internal block markup.
