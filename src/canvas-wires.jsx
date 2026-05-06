import { useLayoutEffect, useState } from 'react'
import { bezierPathD } from './graph/bezier-path'
import { portRegistryKey } from './graph/edge-types'

/** @typedef {import('./graph/edge-types.js').GraphEdge} GraphEdge */

/**
 * @param {object} props
 * @param {GraphEdge[]} props.edges
 * @param {React.MutableRefObject<Map<string, HTMLElement>>} props.anchorsRef
 * @param {React.RefObject<HTMLElement | null>} props.canvasRef
 * @param {{ fromBlockId: string, fromPortKey: string, clientX: number, clientY: number } | null} props.rubberBand
 * @param {number} props.layoutEpoch
 */
function CanvasWires({ edges, anchorsRef, canvasRef, rubberBand, layoutEpoch }) {
  const [geometry, setGeometry] = useState({
    paths: /** @type {{ edge: GraphEdge, d: string }[]} */ ([]),
    rubberPath: /** @type {string | null} */ (null),
  })

  useLayoutEffect(() => {
    const canvasEl = canvasRef.current
    if (!canvasEl) {
      setGeometry({ paths: [], rubberPath: null })
      return
    }

    const canvasRect = canvasEl.getBoundingClientRect()

    /** @param {string} registryKey */
    function anchorPoint(registryKey) {
      const el = anchorsRef.current?.get(registryKey)
      if (!el) {
        return null
      }
      const r = el.getBoundingClientRect()
      return {
        x: r.left + r.width / 2 - canvasRect.left,
        y: r.top + r.height / 2 - canvasRect.top,
      }
    }

    /** @type {{ edge: GraphEdge, d: string }[]} */
    const paths = []
    for (const edge of edges) {
      const fromKey = portRegistryKey(edge.from.blockId, edge.from.portKey)
      const toKey = portRegistryKey(edge.to.blockId, edge.to.portKey)
      const p1 = anchorPoint(fromKey)
      const p2 = anchorPoint(toKey)
      if (!p1 || !p2) {
        continue
      }
      paths.push({ edge, d: bezierPathD(p1, p2) })
    }

    let rubberPath = null
    if (rubberBand) {
      const fromKey = portRegistryKey(rubberBand.fromBlockId, rubberBand.fromPortKey)
      const p1 = anchorPoint(fromKey)
      if (p1) {
        const p2 = {
          x: rubberBand.clientX - canvasRect.left,
          y: rubberBand.clientY - canvasRect.top,
        }
        rubberPath = bezierPathD(p1, p2)
      }
    }

    setGeometry({ paths, rubberPath })
  }, [edges, anchorsRef, canvasRef, rubberBand, layoutEpoch])

  return (
    <svg className="canvas-wires" aria-hidden>
      {geometry.paths.map(({ edge, d }) => (
        <path
          key={edge.id}
          className="canvas-wires__edge"
          d={d}
          fill="none"
          data-edge-id={edge.id}
        />
      ))}
      {geometry.rubberPath ? (
        <path className="canvas-wires__rubber" d={geometry.rubberPath} fill="none" />
      ) : null}
    </svg>
  )
}

export default CanvasWires
