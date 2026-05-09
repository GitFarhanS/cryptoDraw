import { createContext, useContext } from 'react'

/** @typedef {import('./edge-types.js').GraphEdge} GraphEdge */

/**
 * @typedef {object} WireDragState
 * @property {string} fromBlockId
 * @property {string} fromPortKey
 * @property {'input' | 'output'} fromKind
 * @property {number} pointerId
 * @property {number} clientX
 * @property {number} clientY
 */

/**
 * @typedef {object} CanvasGraphContextValue
 * @property {(blockId: string, portKey: string, el: Element | null) => void} registerAnchor
 * @property {(event: React.PointerEvent, fromKind: 'input' | 'output', fromBlockId: string, fromPortKey: string) => void} onPortPointerDown
 * @property {WireDragState | null} wireDrag
 * @property {number} zoom
 */

export const CanvasGraphContext = createContext(
  /** @type {CanvasGraphContextValue | null} */ (null),
)

export function useCanvasGraph() {
  const ctx = useContext(CanvasGraphContext)
  return ctx
}
