import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { flushSync } from 'react-dom'
import './App.scss'
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
import {
    parseFlowchartFromBase64,
    serializeFlowchartToBase64,
} from './graph/flowchart-io'
import { createPlacedBlock } from './graph/placed-block-defaults'
import MiniMap from './mini-map'
import SidePanel from './side-panel'
import SidePanelExpandablePanels from './side-panel-expandable-panels'

const CANVAS_SIZE = 8000
const MINIMAP_SIZE = 180
const MIN_ZOOM = 0.25
const MAX_ZOOM = 3
const ZOOM_WHEEL_SENSITIVITY = 0.0018
const THEME_STORAGE_KEY = 'cryptoDraw.theme'
const THEMES = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'sepia', label: 'Sepia' },
    { value: 'solarized-dark', label: 'Solarized dark' },
    { value: 'high-contrast', label: 'High contrast' },
]

function readStoredTheme() {
    if (typeof window === 'undefined') {
        return 'system'
    }

    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
        if (stored !== null && THEMES.some((theme) => theme.value === stored)) {
            return stored
        }
    } catch {
        // Ignore storage failures and fall back to the default theme.
    }

    return 'system'
}

function resolveTheme(theme: string) {
    if (theme !== 'system') {
        return theme
    }

    if (typeof window === 'undefined') {
        return 'light'
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveColorScheme(theme: string) {
    const resolvedTheme = resolveTheme(theme)
    if (
        resolvedTheme === 'dark' ||
        resolvedTheme === 'solarized-dark' ||
        resolvedTheme === 'high-contrast'
    ) {
        return 'dark'
    }

    return 'light'
}

function App() {
    const [placedBlocks, setPlacedBlocks] = useState<any[]>([])
    const [edges, setEdges] = useState<any[]>([])
    const [sidePanelOpen, setSidePanelOpen] = useState(false)
    const [theme, setTheme] = useState<string>(readStoredTheme)
    const [zoom, setZoom] = useState<number>(1)
    const [viewport, setViewport] = useState({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    })
    const [isDragging, setIsDragging] = useState(false)
    const [layoutEpoch, setLayoutEpoch] = useState(0)
    const [wireDrag, setWireDrag] = useState<null | any>(null)

    const dragStateRef = useRef<any>({
        pointerId: null,
        startX: 0,
        startY: 0,
        startScrollX: 0,
        startScrollY: 0,
    })

    const wireDragRef = useRef(wireDrag)
    const placedBlocksRef = useRef(placedBlocks)

    const canvasRef = useRef<HTMLDivElement | null>(null)
    const outerExtentRef = useRef<HTMLDivElement | null>(null)
    const zoomRef = useRef<number>(1)
    const didInitialScrollRef = useRef(false)
    const anchorsRef = useRef(new Map())

    useEffect(() => {
        const resolvedTheme = resolveTheme(theme)
        const colorScheme = resolveColorScheme(theme)
        document.body.dataset.theme = resolvedTheme
        document.body.style.colorScheme = colorScheme

        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, theme)
        } catch {
            // Ignore storage failures; the selected theme still applies for this session.
        }

        let mediaQueryList: MediaQueryList | undefined

        if (theme === 'system' && typeof window !== 'undefined') {
            mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => {
                const nextResolvedTheme = resolveTheme('system')
                const nextColorScheme = resolveColorScheme('system')
                document.body.dataset.theme = nextResolvedTheme
                document.body.style.colorScheme = nextColorScheme
            }

            if (typeof mediaQueryList.addEventListener === 'function') {
                mediaQueryList.addEventListener('change', handleChange)
            } else {
                mediaQueryList.addListener(handleChange)
            }

            return () => {
                if (typeof mediaQueryList?.removeEventListener === 'function') {
                    mediaQueryList.removeEventListener('change', handleChange)
                } else {
                    mediaQueryList?.removeListener(handleChange)
                }
                delete document.body.dataset.theme
                document.body.style.colorScheme = ''
            }
        }

        return () => {
            delete document.body.dataset.theme
            document.body.style.colorScheme = ''
        }
    }, [theme])

    useEffect(() => {
        zoomRef.current = zoom
    }, [zoom])

    const bumpLayout = useCallback(() => {
        setLayoutEpoch((n) => n + 1)
    }, [])

    const registerAnchor = useCallback(
        (blockId: string, portKey: string, el: Element | null) => {
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

    const evaluation = useMemo(() => evaluateGraph(placedBlocks, edges), [placedBlocks, edges])

    useEffect(() => {
        if (!import.meta.env.DEV) {
            return
        }
        if (!evaluation?.diagnostics?.length) {
            return
        }
        console.debug('[graph:dataflow]', evaluation.diagnostics)
    }, [evaluation])

    const patchBlock = useCallback((id: string, patch: any) => {
        setPlacedBlocks((prev) =>
            prev.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        )
    }, [])

    const movePlacedBlock = useCallback(
        (blockId: string, nextX: number, nextY: number) => {
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

    const onPortPointerDown = useCallback((event: PointerEvent & any, fromKind: 'input' | 'output', fromBlockId: string, fromPortKey: string) => {
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

        const onMove = (e: PointerEvent & any) => {
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

        const finish = (e: PointerEvent & any) => {
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
                const targetBlock = blocks.find((b: any) => b.id === toBlockId)
                const sourceBlock = blocks.find((b: any) => b.id === fromBlockId)
                if (!targetBlock || !sourceBlock) {
                    return prevEdges
                }

                const paramsFor = (b: any) => ({
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

        window.addEventListener('pointermove', onMove as any)
        window.addEventListener('pointerup', finish as any)
        window.addEventListener('pointercancel', finish as any)

        return () => {
            window.removeEventListener('pointermove', onMove as any)
            window.removeEventListener('pointerup', finish as any)
            window.removeEventListener('pointercancel', finish as any)
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
        const onWheel = (event: WheelEvent & any) => {
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

        window.addEventListener('wheel', onWheel as any, { passive: false })
        return () => window.removeEventListener('wheel', onWheel as any)
    }, [])

    const navigateFromMinimap = useCallback((targetLeft: number, targetTop: number) => {
        const z = zoomRef.current
        const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth)
        const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight)

        window.scrollTo({
            left: Math.min(Math.max(0, targetLeft * z), maxScrollLeft),
            top: Math.min(Math.max(0, targetTop * z), maxScrollTop),
        })
    }, [])

    const outerExtentStyle = useMemo<CSSProperties>(
        () => ({
            position: 'relative',
            width: CANVAS_SIZE * zoom,
            height: CANVAS_SIZE * zoom,
        }),
        [zoom],
    )

    const innerCanvasStyle = useMemo<CSSProperties>(
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

    const startDrag = (event: PointerEvent & any) => {
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

    const moveDrag = (event: PointerEvent & any) => {
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

    const endDrag = (event: PointerEvent & any) => {
        if (dragStateRef.current.pointerId !== event.pointerId) {
            return
        }

        event.currentTarget.releasePointerCapture(event.pointerId)
        dragStateRef.current.pointerId = null
        setIsDragging(false)
    }

    const handleCanvasDragOver = (event: DragEvent & any) => {
        const types = Array.from(event.dataTransfer.types)
        if (!types.includes(INPUT_BLOCK_DRAG_MIME)) {
            return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
    }

    const handleCanvasDragEnter = (event: DragEvent & any) => {
        const types = Array.from(event.dataTransfer.types)
        if (!types.includes(INPUT_BLOCK_DRAG_MIME)) {
            return
        }
        event.preventDefault()
    }

    const handleCanvasDrop = (event: DragEvent & any) => {
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

    const handleExportFlowchart = useCallback(() => serializeFlowchartToBase64(placedBlocks, edges), [placedBlocks, edges])

    const handleImportFlowchart = useCallback((base64Text: string) => {
        const parsed = parseFlowchartFromBase64(base64Text)
        setPlacedBlocks(parsed.placedBlocks)
        setEdges(parsed.edges)
        bumpLayout()
    }, [bumpLayout])

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
                                evaluation={evaluation}
                            />
                        ))}
                    </CanvasGraphContext.Provider>
                </div>
            </div>
            <MiniMap
                canvasSize={CANVAS_SIZE}
                minimapSize={MINIMAP_SIZE}
                viewport={viewport}
                onNavigate={navigateFromMinimap}
            />
            <SidePanel open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
                <section className="theme-panel" aria-label="Theme selector">
                    <div className="theme-panel__header">
                        <h2 className="theme-panel__title">Theme</h2>
                        <p className="theme-panel__hint">Pick a preset for the board, panels, and wiring.</p>
                    </div>
                    <label className="theme-select-label" htmlFor="theme-select">
                        Active theme
                    </label>
                    <select
                        id="theme-select"
                        className="theme-select"
                        value={theme}
                        onChange={(event) => setTheme((event.target as HTMLSelectElement).value)}
                    >
                        {THEMES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </section>
                <SidePanelExpandablePanels
                    onExportFlowchart={handleExportFlowchart}
                    onImportFlowchart={handleImportFlowchart}
                />
            </SidePanel>
        </>
    )
}

export default App
