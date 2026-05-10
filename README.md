# cryptoDrawer

A visual, node-based playground for exploring how data is encoded, transformed, and combined at the byte and bit level. Drag blocks onto an canvas, wire them together, and watch values flow through the graph in real time.

**Live demo:** [https://cryptodraw.farhanshaikh.uk](https://cryptodraw.farhanshaikh.uk)

## What it is

cryptoDrawer is a flowchart-style editor for poking at binary, hex, decimal, and ASCII data. You build a graph of small, focused blocks — each one parses, formats, splits, joins, or operates on bytes — and the canvas continuously evaluates it as you change inputs or rewire ports.

It is a learning and tinkering tool, not a production cryptography library: useful for visualizing bit-level mechanics, walking through small encoding/decoding pipelines, and prototyping toy ciphers.

## Features

- **Pannable, zoomable canvas** with a live mini-map for navigation.
- **Drag-and-drop palette** organized into expandable side-panel sections (Input, Converter, Operations, Output, Flowchart, Templates).
- **Bezier wires** between typed input/output ports, with cycle detection to prevent invalid graphs.
- **Live evaluation**: every edit re-runs the graph and updates downstream blocks immediately.
- **Import/export** the entire flowchart as a Base64 string — paste it back later or share it with someone else.
- **Deployed automatically** to GitHub Pages on every push to `main`.

## Block catalogue

### Input blocks

Producers of byte sequences from human-readable text:

- **Binary** — bits like `0100 1000 0110 1001`
- **Hex** — `48 69`
- **Decimal** — comma- or space-separated bytes
- **ASCII** — plain text

### Converter blocks

- **Split into lots** — chop a byte stream into N equal-ish chunks for parallel processing.
- **Join lots** — reassemble lots back into a single stream.
- **Format convert** — re-render the same bytes in a different textual format (binary / hex / decimal / ASCII).

### Operations blocks

Bit and arithmetic operations that take wired operands and produce a result:

- **XOR**, **AND** — bitwise logic
- **Left shift**, **Right shift** — with logical or circular modes
- **MOD** — remainder after division
- **Exponentiation**, **Addition**, **Multiplication**

Each operation supports automatic or manual display formatting.

### Output block

Renders the final value in a chosen format so you can see what your pipeline produced.

### Flowchart I/O

Export the entire graph (placed blocks + edges) to a Base64 string, or paste a string back in to restore it. Useful for saving work or sharing a flowchart in chat.

### Cipher templates

Load a starter scaffold for common algorithms (RSA, ChaCha20, DES, 3DES, AES) and swap in the blocks you need while experimenting.

## How to use it

1. Open the live site or run it locally.
2. Click the side-panel toggle and pick a category (Input, Converter, Operations, Output, Flowchart, Templates).
3. Drag a block onto the canvas.
4. Drag from a block's output port to another block's input port to wire them together.
5. Type into input blocks — downstream blocks update immediately.
6. Use the Flowchart panel to export your graph as Base64 or import an existing one. Use Templates to load a starter cipher flowchart.

Pan the canvas by dragging empty space; zoom with the mouse wheel; use the mini-map in the corner to jump around quickly.

## Tech stack

- [React 19](https://react.dev/) with hooks, no global state library.
- [Vite](https://vite.dev/) for dev server and bundling.
- [Vitest](https://vitest.dev/) for unit tests on graph evaluation and flowchart serialization.
- [ESLint](https://eslint.org/) with the `react-hooks` and `react-refresh` plugins.
- [gh-pages](https://github.com/tschaub/gh-pages) plus a GitHub Actions workflow for automatic deployment.

The graph evaluator and flowchart import/export are pure JS modules under `src/graph/` and are covered by unit tests.

## Getting started

Requires Node.js 22+ and pnpm.

```bash
git clone https://github.com/GitFarhanS/cryptoDraw.git
cd cryptoDraw
pnpm install
pnpm run dev
```

The dev server prints a local URL (typically `http://localhost:5173/cryptoDraw/`).

### Available scripts

| Command            | What it does                                               |
| ------------------ | ---------------------------------------------------------- |
| `pnpm run dev`     | Start the Vite dev server with HMR.                        |
| `pnpm run build`   | Produce a production build in `dist/`.                     |
| `pnpm run preview` | Serve the production build locally for a final smoke test. |
| `pnpm run lint`    | Run ESLint over the project.                               |
| `pnpm test`        | Run the Vitest unit-test suite once.                       |
| `pnpm run deploy`  | Build and publish `dist/` to the `gh-pages` branch.        |

## Deployment

Every push to `main` triggers `.github/workflows/deploy-pages.yml`, which builds the project and publishes `dist/` to GitHub Pages. The Vite `base` is set to `/cryptoDraw/` in `vite.config.js` so asset URLs resolve correctly under the project page.

## Project structure

```
src/
  App.jsx                   Canvas, viewport, drag handling, top-level state
  canvas-placed-block.jsx   A block rendered on the canvas
  canvas-wires.jsx          SVG layer that draws the bezier wires
  side-panel*.jsx           Collapsible side panel and its expandable sections
  mini-map.jsx              Mini-map navigator
  port-handle.jsx           Input/output port dot with hit-testing

  input-blocks/             Binary, hex, decimal, ASCII source blocks + palette drag
  converter-block/          Split / join / format-convert blocks
  operations-block/         XOR, AND, shifts, MOD, POW, ADD, MUL definitions and UI
  output-block/             Final-value display block
  cipher-templates-panel.tsx Starter cipher flowchart templates
  flowchart-io-panel.jsx    Base64 import/export dialog

  graph/
    canvas-graph-context.jsx
    edge-types.js           Port keys, cycle detection, edge upserts
    evaluate-graph.js       Topological evaluation of the whole graph
    flowchart-io.js         JSON + Base64 serialization
    placed-block-defaults.js
    bezier-path.js          Wire path math
    *.test.js               Vitest unit tests
```

## Contributing / development notes

- Run `pnpm run lint` and `pnpm test` before opening a PR.
- Graph-shape changes (new block types, new ports) usually need updates in `evaluate-graph.js`, `edge-types.js`, and `flowchart-io.js` together — the tests in `src/graph/` are the easiest way to lock in the new behaviour.
- The canvas uses CSS-driven panning/zooming; coordinates in placed blocks are in unscaled canvas space.

See [`CONTRIBUTORS.md`](./CONTRIBUTORS.md) for the list of people who have helped build cryptoDrawer.

## License

Released under the [MIT License](./LICENSE) — see the `LICENSE` file for the full text.
