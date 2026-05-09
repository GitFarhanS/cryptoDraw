---
name: Harden Block Dataflow
overview: Ensure data is reliably transferred along edges between blocks using a deterministic full-graph recompute model, and add validation/observability so transfer issues are visible immediately.
todos:
  - id: lock-evaluator-contract
    content: Enforce evaluator-only data transfer contract and add guardrails in evaluate-graph.js
    status: completed
  - id: strengthen-edge-validation
    content: Ensure edge handling preserves single-writer-per-input and ignores invalid endpoints safely
    status: completed
  - id: add-transfer-diagnostics
    content: Add dev-only diagnostics for unresolved ports/orphan edges/empty propagation
    status: completed
  - id: add-e2e-dataflow-tests
    content: Create targeted tests for input->transform->output, split/join, ops, rewiring, and cycles
    status: completed
  - id: verify-ui-read-path
    content: Confirm output and display blocks read only from evaluation.portBytes and expose clear empty state
    status: completed
isProject: false
---

# Full DAG Recompute Dataflow Plan

## Approach
Adopt a **single source of truth + deterministic evaluator** pattern (widely used by block/node systems early on): keep graph structure in UI state, and derive all port values from a pure topological evaluation pass. Your code already follows this direction; this plan hardens it for correctness and debuggability.

## What to change
- Confirm and enforce the contract that **only `evaluateGraph()` computes wire values** and UI blocks only read from `evaluation.portBytes`.
- Add transfer invariants in the evaluator and edge validation, so each input port receives at most one payload and invalid/missing endpoints are safely ignored.
- Add lightweight graph-level diagnostics (in dev mode) for transfer visibility: orphan edges, unresolved source ports, and empty payload propagation.
- Add focused tests for canonical flows to prove block-to-block transfer works end-to-end.

## Target files
- [`../src/graph/evaluate-graph.js`](../src/graph/evaluate-graph.js)
  - Keep topological order and per-edge payload copy, then add explicit guards and diagnostics around port write/read behavior.
- [`../src/graph/edge-types.js`](../src/graph/edge-types.js)
  - Keep `upsertEdgeForInputPort()` as the single-input guarantee and add any missing helper validation checks used by evaluation.
- [`../src/App.jsx`](../src/App.jsx)
  - Keep single call site for `evaluateGraph(placedBlocks, edges)`; surface optional dev diagnostics near where `evaluation` is produced.
- [`../src/output-block/output-block.jsx`](../src/output-block/output-block.jsx)
  - Keep output rendering from `evaluation.portBytes`; optionally show an explicit “no wired input” state for easier debugging.

## Validation plan
- Unit tests for `evaluateGraph()` covering:
  - input -> formatConvert -> output transfer
  - splitIntoLots -> joinLots reconstruction behavior
  - operation blocks (`in:a`, `in:b` -> `out`) deterministic output
  - edge removal/rewire updates propagated values
  - cycle rejection and safe empty output behavior
- Smoke test in UI: wire/unwire blocks and verify output updates immediately and consistently.

## Why this is the best method here
- Matches established node-editor practice: **graph as data, evaluator as pure function, UI as projection**.
- Minimizes sync bugs versus ad-hoc push events between components.
- Keeps implementation simple now, while leaving a clean upgrade path later to incremental propagation if graph size demands it.