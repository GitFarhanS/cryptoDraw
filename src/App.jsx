import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import CanvasPlacedBlock from './canvas-placed-block'
import CanvasWires from './canvas-wires'
import { INPUT_BLOCK_DRAG_MIME, isPlacedBlockType } from './input-blocks/drag-constants'
import { CanvasGraphContext } from './graph/canvas-graph-context'
import {
  inputPortKeysForBlock,
  outputPortKeysForBlock,
  portRegistryKey,
  upsertEdgeForInputPort,
  wouldCreateCycle,
} from './graph/edge-types'
import { evaluateGraph } from './graph/evaluate-graph'
import { createPlacedBlock } from './graph/placed-block-defaults'
import MiniMap from './mini-map'
import SidePanel from './side-panel'
import SidePanelExpandablePanels from './side-panel-expandable-panels'

const CANVAS_SIZE = 8000
const MINIMAP_SIZE = 180

function App() {
  const [placedBlocks, setPlacedBlocks] = useState([])
  /** @type {import('./graph/edge-types.js').GraphEdge[]} */
  const [edges, setEdges] = useState([])
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [viewport, setViewport] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [layoutEpoch, setLayoutEpoch] = useState(0)
  const [wireDrag, setWireDrag] = useState(
    /** @type {null | { pointerId: number, fromKind: 'input' | 'output', fromBlockId: string, fromPortKey: string, clientX: number, clientY: number }} */ (
      null
    ),
  )

  const dragStateRef = useRef({
    pointerId: null,
    startX: 0,
    startY: 0,
    startScrollX: 0,
    startScrollY: 0,
  })

  const wireDragRef = useRef(wireDrag)
  const placedBlocksRef = useRef(placedBlocks)

  const canvasRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const anchorsRef = useRef(new Map())

  const bumpLayout = useCallback(() => {
    setLayoutEpoch((n) => n + 1)
  }, [])

  const registerAnchor = useCallback(
    (blockId, portKey, el) => {
      const key = portRegistryKey(blockId, portKey)
      if (el) {
        anchorsRef.current.set(key, el)
      } else {
        anchorsRef.current.delete(key)
      }
      bumpLayout()
    },
    [bumpLayout],
  )

  const evaluation = useMemo(
    () => evaluateGraph(placedBlocks, edges),
    [placedBlocks, edges],
  )

  const patchBlock = useCallback((id, patch) => {
    setPlacedBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    )
  }, [])

  const movePlacedBlock = useCallback(
    (blockId, nextX, nextY) => {
      setPlacedBlocks((prev) =>
        prev.map((block) =>
          block.id === blockId
            ? {
                ...block,
                x: nextX,
                y: nextY,
              }
            : block,
        ),
      )
      bumpLayout()
    },
    [bumpLayout],
  )

  const onPortPointerDown = useCallback((event, fromKind, fromBlockId, fromPortKey) => {
    event.preventDefault()
    setWireDrag({
      pointerId: event.pointerId,
      fromKind,
      fromBlockId,
      fromPortKey,
      clientX: event.clientX,
      clientY: event.clientY,
    })
  }, [])

  useEffect(() => {
    wireDragRef.current = wireDrag
  }, [wireDrag])

  useEffect(() => {
    placedBlocksRef.current = placedBlocks
  }, [placedBlocks])

  useEffect(() => {
    if (!wireDrag) {
      return undefined
    }

    const onMove = (e) => {
      const cur = wireDragRef.current
      if (!cur || e.pointerId !== cur.pointerId) {
        return
      }
      setWireDrag({
        ...cur,
        clientX: e.clientX,
        clientY: e.clientY,
      })
    }

    const finish = (e) => {
      const cur = wireDragRef.current
      if (!cur || e.pointerId !== cur.pointerId) {
        return
      }

      const el = document.elementFromPoint(e.clientX, e.clientY)
      const portEl = el?.closest?.('[data-port-kind]')
      setWireDrag(null)

      if (!(portEl instanceof HTMLElement)) {
        return
      }

      const targetKind = portEl.getAttribute('data-port-kind')
      const targetBlockId = portEl.getAttribute('data-block-id')
      const targetPortKey = portEl.getAttribute('data-port-key')
      if (
        !targetKind ||
        (targetKind !== 'input' && targetKind !== 'output') ||
        !targetBlockId ||
        !targetPortKey
      ) {
        return
      }

      if (targetKind === cur.fromKind) {
        return
      }

      const fromBlockId = cur.fromKind === 'output' ? cur.fromBlockId : targetBlockId
      const fromPortKey = cur.fromKind === 'output' ? cur.fromPortKey : targetPortKey
      const toBlockId = cur.fromKind === 'output' ? targetBlockId : cur.fromBlockId
      const toPortKey = cur.fromKind === 'output' ? targetPortKey : cur.fromPortKey

      setEdges((prevEdges) => {
        const blocks = placedBlocksRef.current
        const targetBlock = blocks.find((b) => b.id === toBlockId)
        const sourceBlock = blocks.find((b) => b.id === fromBlockId)
        if (!targetBlock || !sourceBlock) {
          return prevEdges
        }

        const paramsFor = (b) => ({
          blockCount: b.blockCount,
          joinCount: b.joinCount,
        })

        const validOut = outputPortKeysForBlock(sourceBlock.type, paramsFor(sourceBlock))
        const validIn = inputPortKeysForBlock(targetBlock.type, paramsFor(targetBlock))

        if (!validOut.includes(fromPortKey) || !validIn.includes(toPortKey)) {
          return prevEdges
        }

        const newEdge = {
          id: crypto.randomUUID(),
          from: { blockId: fromBlockId, portKey: fromPortKey },
          to: { blockId: toBlockId, portKey: toPortKey },
        }

        if (
          wouldCreateCycle(prevEdges, {
            from: { blockId: fromBlockId },
            to: { blockId: toBlockId },
          })
        ) {
          return prevEdges
        }

        return upsertEdgeForInputPort(prevEdges, newEdge)
      })
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
  }, [wireDrag])

  useEffect(() => {
    const updateViewport = () => {
      setViewport({
        left: window.scrollX,
        top: window.scrollY,
        width: window.innerWidth,
        height: window.innerHeight,
      })
      bumpLayout()
    }

    updateViewport()
    window.addEventListener('scroll', updateViewport, { passive: true })
    window.addEventListener('resize', updateViewport)

    return () => {
      window.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [bumpLayout])

  const canvasStyle = {
    width: `${CANVAS_SIZE}px`,
    height: `${CANVAS_SIZE}px`,
  }

  const navigateFromMinimap = (targetLeft, targetTop) => {
    const maxScrollLeft = Math.max(0, CANVAS_SIZE - window.innerWidth)
    const maxScrollTop = Math.max(0, CANVAS_SIZE - window.innerHeight)

    window.scrollTo({
      left: Math.min(Math.max(0, targetLeft), maxScrollLeft),
      top: Math.min(Math.max(0, targetTop), maxScrollTop),
    })
  }

  const startDrag = (event) => {
    if (event.button !== 0) {
      return
    }

    if (event.target !== event.currentTarget) {
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startScrollX: window.scrollX,
      startScrollY: window.scrollY,
    }
    setIsDragging(true)
  }

  const moveDrag = (event) => {
    if (!isDragging || dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    const dx = event.clientX - dragStateRef.current.startX
    const dy = event.clientY - dragStateRef.current.startY

    window.scrollTo({
      left: dragStateRef.current.startScrollX - dx,
      top: dragStateRef.current.startScrollY - dy,
    })
  }

  const endDrag = (event) => {
    if (dragStateRef.current.pointerId !== event.pointerId) {
      return
    }

    event.currentTarget.releasePointerCapture(event.pointerId)
    dragStateRef.current.pointerId = null
    setIsDragging(false)
  }

  const handleCanvasDragOver = (event) => {
    const types = Array.from(event.dataTransfer.types)
    if (!types.includes(INPUT_BLOCK_DRAG_MIME)) {
      return
    }
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const handleCanvasDragEnter = (event) => {
    const types = Array.from(event.dataTransfer.types)
    if (!types.includes(INPUT_BLOCK_DRAG_MIME)) {
      return
    }
    event.preventDefault()
  }

  const handleCanvasDrop = (event) => {
    const blockType = event.dataTransfer.getData(INPUT_BLOCK_DRAG_MIME)
    if (!isPlacedBlockType(blockType)) {
      return
    }

    event.preventDefault()
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const created = createPlacedBlock(blockType, x, y)
    if (!created) {
      return
    }

    setPlacedBlocks((prev) => [...prev, created])
    bumpLayout()
  }

  const graphContextValue = useMemo(
    () => ({
      registerAnchor,
      onPortPointerDown,
      wireDrag,
    }),
    [registerAnchor, onPortPointerDown, wireDrag],
  )

  return (
    <>
      <div
        ref={canvasRef}
        className={`grid-canvas ${isDragging ? 'is-dragging' : ''}`}
        style={canvasStyle}
        aria-label="Notebook style square grid"
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onDragEnter={handleCanvasDragEnter}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
      >
        <CanvasGraphContext.Provider value={graphContextValue}>
          <CanvasWires
            edges={edges}
            anchorsRef={anchorsRef}
            canvasRef={canvasRef}
            rubberBand={wireDrag}
            layoutEpoch={layoutEpoch}
          />
          {placedBlocks.map((block) => (
            <CanvasPlacedBlock
              key={block.id}
              block={block}
              onMove={movePlacedBlock}
              onPatch={patchBlock}
              evaluation={evaluation}
            />
          ))}
        </CanvasGraphContext.Provider>
      </div>
      <MiniMap
        canvasSize={CANVAS_SIZE}
        minimapSize={MINIMAP_SIZE}
        viewport={viewport}
        onNavigate={navigateFromMinimap}
      />
      <SidePanel open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
        <SidePanelExpandablePanels />
      </SidePanel>
    </>
  )
}

export default App
