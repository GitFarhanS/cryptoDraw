import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
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
import { duplicatePlacedBlock, removePlacedBlockAndEdges } from './graph/placed-block-actions'
import MiniMap from './mini-map'
import SidePanel from './side-panel'
import SidePanelExpandablePanels from './side-panel-expandable-panels'

const CANVAS_SIZE = 8000
const MINIMAP_SIZE = 180
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_WHEEL_SENSITIVITY = 0.0018

function App() {
  const [placedBlocks, setPlacedBlocks] = useState([])
  /** @type {import('./graph/edge-types.js').GraphEdge[]} */
  const [edges, setEdges] = useState([])
  const [sidePanelOpen, setSidePanelOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [viewport, setViewport] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const [layoutEpoch, setLayoutEpoch] = useState(0)
  const [blockContextMenu, setBlockContextMenu] = useState(
    /** @type {null | { blockId: string, clientX: number, clientY: number }} */ (null),
  )
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
  const edgesRef = useRef(edges)
  const blockContextMenuRef = useRef(/** @type {HTMLDivElement | null} */ (null))

  const canvasRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const outerExtentRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const zoomRef = useRef(1)
  const didInitialScrollRef = useRef(false)
  const anchorsRef = useRef(new Map())

  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

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

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }
    if (!evaluation?.diagnostics?.length) {
      return
    }
    // Surface graph transfer problems without impacting production UX.
    console.debug('[graph:dataflow]', evaluation.diagnostics)
  }, [evaluation])

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

  const openBlockContextMenu = useCallback((blockId, clientX, clientY) => {
    setBlockContextMenu({ blockId, clientX, clientY })
  }, [])

  const closeBlockContextMenu = useCallback(() => {
    setBlockContextMenu(null)
  }, [])

  const deletePlacedBlock = useCallback(
    (blockId) => {
      const next = removePlacedBlockAndEdges(
        placedBlocksRef.current,
        edgesRef.current,
        blockId,
      )
      setPlacedBlocks(next.placedBlocks)
      setEdges(next.edges)
      closeBlockContextMenu()
      bumpLayout()
    },
    [bumpLayout, closeBlockContextMenu],
  )

  const duplicateBlock = useCallback(
    (blockId) => {
      setPlacedBlocks((prevBlocks) => {
        const source = prevBlocks.find((block) => block.id === blockId)
        if (!source) {
          return prevBlocks
        }
        return [...prevBlocks, duplicatePlacedBlock(source)]
      })
      closeBlockContextMenu()
      bumpLayout()
    },
    [bumpLayout, closeBlockContextMenu],
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
    edgesRef.current = edges
  }, [edges])

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
      const z = zoomRef.current
      setViewport({
        left: window.scrollX / z,
        top: window.scrollY / z,
        width: window.innerWidth / z,
        height: window.innerHeight / z,
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
  }, [bumpLayout, zoom])

  useEffect(() => {
    if (didInitialScrollRef.current) {
      return
    }
    didInitialScrollRef.current = true
    const z = zoomRef.current
    const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth)
    const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight)
    const left = Math.min(
      Math.max(0, (CANVAS_SIZE * z - window.innerWidth) / 2),
      maxScrollLeft,
    )
    const top = Math.min(
      Math.max(0, (CANVAS_SIZE * z - window.innerHeight) / 2),
      maxScrollTop,
    )
    window.scrollTo({ left, top })
  }, [])

  useEffect(() => {
    if (!blockContextMenu) {
      return undefined
    }

    blockContextMenuRef.current
      ?.querySelector('.block-context-menu__action')
      ?.focus()

    const onPointerDown = (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('.block-context-menu')
      ) {
        return
      }
      closeBlockContextMenu()
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeBlockContextMenu()
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)

    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [blockContextMenu, closeBlockContextMenu])

  const handleBlockContextMenuKeyDown = (event) => {
    if (
      event.key !== 'ArrowDown' &&
      event.key !== 'ArrowUp' &&
      event.key !== 'Home' &&
      event.key !== 'End'
    ) {
      return
    }

    const actions = Array.from(
      event.currentTarget.querySelectorAll('.block-context-menu__action'),
    )
    if (!actions.length) {
      return
    }

    event.preventDefault()
    const activeIndex = actions.indexOf(
      /** @type {HTMLButtonElement} */ (document.activeElement),
    )

    if (event.key === 'Home') {
      actions[0].focus()
      return
    }
    if (event.key === 'End') {
      actions[actions.length - 1].focus()
      return
    }

    const offset = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = activeIndex === -1
      ? 0
      : (activeIndex + offset + actions.length) % actions.length
    actions[nextIndex].focus()
  }

  useEffect(() => {
    const onWheel = (event) => {
      const hit = document.elementFromPoint(event.clientX, event.clientY)
      if (hit?.closest('.minimap') || hit?.closest('.side-panel')) {
        return
      }

      const outer = outerExtentRef.current
      if (!outer) {
        return
      }

      const bounds = outer.getBoundingClientRect()
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      ) {
        return
      }

      event.preventDefault()

      const z0 = zoomRef.current
      const nextZoom = Math.min(
        MAX_ZOOM,
        Math.max(MIN_ZOOM, z0 * Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY)),
      )

      if (Math.abs(nextZoom - z0) < 1e-8) {
        return
      }

      const canvasX = (window.scrollX + event.clientX) / z0
      const canvasY = (window.scrollY + event.clientY) / z0

      flushSync(() => {
        setZoom(nextZoom)
      })

      requestAnimationFrame(() => {
        const maxScrollLeft = Math.max(0, CANVAS_SIZE * nextZoom - window.innerWidth)
        const maxScrollTop = Math.max(0, CANVAS_SIZE * nextZoom - window.innerHeight)
        const left = Math.min(
          Math.max(0, canvasX * nextZoom - event.clientX),
          maxScrollLeft,
        )
        const top = Math.min(
          Math.max(0, canvasY * nextZoom - event.clientY),
          maxScrollTop,
        )
        window.scrollTo({ left, top })
      })
    }

    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [])

  const navigateFromMinimap = useCallback((targetLeft, targetTop) => {
    const z = zoomRef.current
    const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth)
    const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight)

    window.scrollTo({
      left: Math.min(Math.max(0, targetLeft * z), maxScrollLeft),
      top: Math.min(Math.max(0, targetTop * z), maxScrollTop),
    })
  }, [])

  const outerExtentStyle = useMemo(
    () => ({
      position: 'relative',
      width: CANVAS_SIZE * zoom,
      height: CANVAS_SIZE * zoom,
    }),
    [zoom],
  )

  const innerCanvasStyle = useMemo(
    () => ({
      position: 'absolute',
      left: 0,
      top: 0,
      width: CANVAS_SIZE,
      height: CANVAS_SIZE,
      transform: `scale(${zoom})`,
      transformOrigin: '0 0',
    }),
    [zoom],
  )

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
    const z = zoomRef.current
    const x = (event.clientX - rect.left) / z
    const y = (event.clientY - rect.top) / z

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
      zoom,
    }),
    [registerAnchor, onPortPointerDown, wireDrag, zoom],
  )

  return (
    <>
      <div ref={outerExtentRef} className="canvas-scroll-extent" style={outerExtentStyle}>
        <div
          ref={canvasRef}
          className={`grid-canvas ${isDragging ? 'is-dragging' : ''}`}
          style={innerCanvasStyle}
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
              zoom={zoom}
            />
            {placedBlocks.map((block) => (
              <CanvasPlacedBlock
                key={block.id}
                block={block}
                onMove={movePlacedBlock}
                onPatch={patchBlock}
                onOpenContextMenu={openBlockContextMenu}
                evaluation={evaluation}
              />
            ))}
          </CanvasGraphContext.Provider>
        </div>
      </div>
      {blockContextMenu ? (
        <div
          ref={blockContextMenuRef}
          className="block-context-menu"
          aria-label="Block actions"
          style={{ left: blockContextMenu.clientX, top: blockContextMenu.clientY }}
          onKeyDown={handleBlockContextMenuKeyDown}
        >
          <button
            type="button"
            className="block-context-menu__action"
            onClick={() => duplicateBlock(blockContextMenu.blockId)}
          >
            Duplicate
          </button>
          <button
            type="button"
            className="block-context-menu__action"
            onClick={() => deletePlacedBlock(blockContextMenu.blockId)}
          >
            Delete
          </button>
        </div>
      ) : null}
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
