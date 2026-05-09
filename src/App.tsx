import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { DragEvent as ReactDragEvent, PointerEvent as ReactPointerEvent } from 'react'
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
import { duplicatePlacedBlock, removePlacedBlockAndEdges } from './graph/placed-block-actions'
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
const MIN_MARQUEE_SIZE = 4
const THEMES = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'sepia', label: 'Sepia' },
    { value: 'solarized-dark', label: 'Solarized dark' },
    { value: 'high-contrast', label: 'High contrast' },
]

function readStoredTheme() {
    if (globalThis.window === undefined) {
        return 'system'
    }

    try {
        const stored = globalThis.window.localStorage.getItem(THEME_STORAGE_KEY)
        if (stored && THEMES.some((theme) => theme.value === stored)) {
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

    if (globalThis.window === undefined) {
        return 'light'
    }

    return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
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
    const [isSelecting, setIsSelecting] = useState(false)
    const [layoutEpoch, setLayoutEpoch] = useState(0)
    const [cursorMode, setCursorMode] = useState<'pan' | 'select'>('pan')
    const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([])
    const [selectionBox, setSelectionBox] = useState<null | {
        left: number
        top: number
        width: number
        height: number
    }>(null)
    const [blockContextMenu, setBlockContextMenu] = useState<null | {
        blockId: string
        clientX: number
        clientY: number
    }>(null)
    const [wireDrag, setWireDrag] = useState<any>(null)

    const dragStateRef = useRef<any>({
        pointerId: null,
        startX: 0,
        startY: 0,
        startScrollX: 0,
        startScrollY: 0,
    })
    const selectionStateRef = useRef({
        pointerId: null as number | null,
        startClientX: 0,
        startClientY: 0,
        currentClientX: 0,
        currentClientY: 0,
        additive: false,
    })

    const wireDragRef = useRef(wireDrag)
    const placedBlocksRef = useRef(placedBlocks)
    const selectedBlockIdsRef = useRef(selectedBlockIds)
    const edgesRef = useRef(edges)
    const blockContextMenuRef = useRef<HTMLDivElement | null>(null)
    const blockElementsRef = useRef(new Map<string, HTMLDivElement>())

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
            globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme)
        } catch {
            // Ignore storage failures; the selected theme still applies for this session.
        }

        let mediaQueryList: MediaQueryList | undefined

        if (theme === 'system' && globalThis.window !== undefined) {
            mediaQueryList = globalThis.window.matchMedia('(prefers-color-scheme: dark)')
            const handleChange = () => {
                const nextResolvedTheme = resolveTheme('system')
                const nextColorScheme = resolveColorScheme('system')
                document.body.dataset.theme = nextResolvedTheme
                document.body.style.colorScheme = nextColorScheme
            }

            if (typeof mediaQueryList.addEventListener === 'function') {
                mediaQueryList.addEventListener('change', handleChange)
            } else {
                mediaQueryList.onchange = handleChange
            }

            return () => {
                if (typeof mediaQueryList?.removeEventListener === 'function') {
                    mediaQueryList.removeEventListener('change', handleChange)
                } else if (mediaQueryList) {
                    mediaQueryList.onchange = null
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
    const selectedPlacedBlockIds = useMemo(() => {
        const existingIds = new Set(placedBlocks.map((block) => block.id))
        return selectedBlockIds.filter((id) => existingIds.has(id))
    }, [placedBlocks, selectedBlockIds])
    const activeBlockContextMenu = useMemo(() => {
        if (!blockContextMenu) {
            return null
        }
        return placedBlocks.some((block) => block.id === blockContextMenu.blockId)
            ? blockContextMenu
            : null
    }, [blockContextMenu, placedBlocks])

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
            setPlacedBlocks((prev) => {
                const dragged = prev.find((block) => block.id === blockId)
                if (!dragged) {
                    return prev
                }

                const selectedSet = new Set(selectedBlockIdsRef.current)
                const moveSelection = selectedSet.has(blockId) && selectedSet.size > 1

                if (!moveSelection) {
                    return prev.map((block) =>
                        block.id === blockId
                            ? {
                                ...block,
                                x: nextX,
                                y: nextY,
                            }
                            : block,
                    )
                }

                const dx = nextX - dragged.x
                const dy = nextY - dragged.y

                return prev.map((block) =>
                    selectedSet.has(block.id)
                        ? {
                            ...block,
                            x: block.x + dx,
                            y: block.y + dy,
                        }
                        : block,
                )
            },
            )
            bumpLayout()
        },
        [bumpLayout],
    )

    const closeBlockContextMenu = useCallback(() => {
        setBlockContextMenu(null)
    }, [])

    const handleSelectBlock = useCallback((blockId: string, additive: boolean) => {
        setSelectedBlockIds((prev) => {
            if (additive) {
                if (prev.includes(blockId)) {
                    return prev.filter((id) => id !== blockId)
                }
                return [...prev, blockId]
            }
            if (prev.length === 1 && prev[0] === blockId) {
                return prev
            }
            return [blockId]
        })
        closeBlockContextMenu()
    }, [closeBlockContextMenu])

    const registerBlockElement = useCallback((blockId: string, el: HTMLDivElement | null) => {
        if (el) {
            blockElementsRef.current.set(blockId, el)
            return
        }
        blockElementsRef.current.delete(blockId)
    }, [])

    const openBlockContextMenu = useCallback((blockId: string, clientX: number, clientY: number) => {
        setSelectedBlockIds((prev) => (prev.includes(blockId) ? prev : [blockId]))
        setBlockContextMenu({ blockId, clientX, clientY })
    }, [])

    const deleteSelectedBlocks = useCallback((menuBlockId: string) => {
        const targetIds = selectedBlockIdsRef.current.includes(menuBlockId)
            ? selectedBlockIdsRef.current
            : [menuBlockId]
        const targetSet = new Set(targetIds)

        let nextPlacedBlocks = placedBlocksRef.current
        let nextEdges = edgesRef.current
        for (const blockId of targetSet) {
            const next = removePlacedBlockAndEdges(nextPlacedBlocks as any, nextEdges as any, blockId)
            nextPlacedBlocks = next.placedBlocks
            nextEdges = next.edges
        }

        setPlacedBlocks(nextPlacedBlocks)
        setEdges(nextEdges)
        setSelectedBlockIds([])
        closeBlockContextMenu()
        bumpLayout()
    }, [bumpLayout, closeBlockContextMenu])

    const duplicateSelectedBlocks = useCallback((menuBlockId: string) => {
        const targetIds = selectedBlockIdsRef.current.includes(menuBlockId)
            ? selectedBlockIdsRef.current
            : [menuBlockId]
        const targets = placedBlocksRef.current.filter((block) => targetIds.includes(block.id))
        if (!targets.length) {
            return
        }
        const idMap = new Map<string, string>()
        const duplicated = targets.map((block, index) => {
            const newId = crypto.randomUUID()
            idMap.set(block.id, newId)
            return duplicatePlacedBlock(block, {
                dx: 24 * (index + 1),
                dy: 24 * (index + 1),
                idFactory: () => newId,
            })
        })

        // Duplicate internal edges between selected blocks, remap endpoints to new ids
        const existingEdges = edgesRef.current
        const internalNewEdges = [] as any[]
        for (const e of existingEdges) {
            if (idMap.has(e.from.blockId) && idMap.has(e.to.blockId)) {
                internalNewEdges.push({
                    ...e,
                    id: crypto.randomUUID(),
                    from: { ...e.from, blockId: idMap.get(e.from.blockId) as string },
                    to: { ...e.to, blockId: idMap.get(e.to.blockId) as string },
                })
            }
        }

        setPlacedBlocks((prev) => [...prev, ...duplicated])
        setSelectedBlockIds(duplicated.map((block) => block.id))
        if (internalNewEdges.length) {
            setEdges((prev) => [...prev, ...internalNewEdges])
        }
        closeBlockContextMenu()
        bumpLayout()
    }, [bumpLayout, closeBlockContextMenu])

    const copySelectedBlocks = useCallback(async () => {
        const selected = selectedBlockIdsRef.current
        if (!selected.length) return

        const blocks = placedBlocksRef.current.filter((b) => selected.includes(b.id))
        const edgesList = edgesRef.current.filter(
            (e) => selected.includes(e.from.blockId) && selected.includes(e.to.blockId),
        )

        try {
            const text = serializeFlowchartToBase64(blocks, edgesList)
            await navigator.clipboard.writeText(text)
        } catch {
            // ignore clipboard failures
        }
    }, [])

    const pasteFromClipboard = useCallback(async () => {
        try {
            const text = await navigator.clipboard.readText()
            if (!text) return
            const parsed = parseFlowchartFromBase64(text)

            const idMap = new Map<string, string>()
            const duplicated = parsed.placedBlocks.map((block: any, index: number) => {
                const newId = crypto.randomUUID()
                idMap.set(block.id, newId)
                return {
                    ...block,
                    id: newId,
                    x: block.x + 24 * (index + 1),
                    y: block.y + 24 * (index + 1),
                }
            })

            const newEdges = parsed.edges
                .filter((e: any) => idMap.has(e.from.blockId) && idMap.has(e.to.blockId))
                .map((e: any) => ({
                    ...e,
                    id: crypto.randomUUID(),
                    from: { ...e.from, blockId: idMap.get(e.from.blockId) as string },
                    to: { ...e.to, blockId: idMap.get(e.to.blockId) as string },
                }))

            setPlacedBlocks((prev) => [...prev, ...duplicated])
            if (newEdges.length) {
                setEdges((prev) => [...prev, ...newEdges])
            }
            setSelectedBlockIds(duplicated.map((b) => b.id))
            bumpLayout()
        } catch {
            // ignore parse/clipboard errors
        }
    }, [bumpLayout])

    useEffect(() => {
        const isInteractive = (el: Element | null) =>
            !el ? false : !!el.closest?.('input, textarea, select, [contenteditable="true"]')

        const onKeyDown = (event: KeyboardEvent) => {
            const active = document.activeElement
            if (isInteractive(active)) return

            const cmd = event.ctrlKey || event.metaKey

            if ((event.key === 'Delete' || event.key === 'Backspace') && !cmd) {
                // delete selected
                const sel = selectedBlockIdsRef.current
                if (!sel.length) return
                // use existing deleteSelectedBlocks by passing first id
                deleteSelectedBlocks(sel[0])
                event.preventDefault()
                return
            }

            if (cmd && (event.key === 'c' || event.key === 'C')) {
                copySelectedBlocks()
                event.preventDefault()
                return
            }

            if (cmd && (event.key === 'v' || event.key === 'V')) {
                pasteFromClipboard()
                event.preventDefault()
                return
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [copySelectedBlocks, pasteFromClipboard, deleteSelectedBlocks])

    const applySelectionFromMarquee = useCallback(() => {
        const state = selectionStateRef.current
        const z = zoomRef.current
        const x1 = (window.scrollX + state.startClientX) / z
        const y1 = (window.scrollY + state.startClientY) / z
        const x2 = (window.scrollX + state.currentClientX) / z
        const y2 = (window.scrollY + state.currentClientY) / z
        const left = Math.min(x1, x2)
        const right = Math.max(x1, x2)
        const top = Math.min(y1, y2)
        const bottom = Math.max(y1, y2)

        if (right - left < MIN_MARQUEE_SIZE && bottom - top < MIN_MARQUEE_SIZE) {
            if (!state.additive) {
                setSelectedBlockIds([])
            }
            return
        }

        const hitIds: string[] = []
        blockElementsRef.current.forEach((el, blockId) => {
            const rect = el.getBoundingClientRect()
            const blockLeft = (window.scrollX + rect.left) / z
            const blockRight = blockLeft + rect.width / z
            const blockTop = (window.scrollY + rect.top) / z
            const blockBottom = blockTop + rect.height / z
            const intersects =
                blockRight >= left && blockLeft <= right && blockBottom >= top && blockTop <= bottom
            if (intersects) {
                hitIds.push(blockId)
            }
        })

        setSelectedBlockIds((prev) => {
            if (!state.additive) {
                return hitIds
            }
            const merged = new Set([...prev, ...hitIds])
            return Array.from(merged)
        })
    }, [])

    const onPortPointerDown = useCallback((event: ReactPointerEvent, fromKind: 'input' | 'output', fromBlockId: string, fromPortKey: string) => {
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
        selectedBlockIdsRef.current = selectedPlacedBlockIds
    }, [selectedPlacedBlockIds])

    useEffect(() => {
        edgesRef.current = edges
    }, [edges])

    useEffect(() => {
        if (!activeBlockContextMenu) {
            return undefined
        }

        blockContextMenuRef.current?.querySelector<HTMLButtonElement>('.block-context-menu__action')?.focus()

        const onPointerDown = (event: PointerEvent) => {
            if (
                event.target instanceof Element &&
                event.target.closest('.block-context-menu')
            ) {
                return
            }
            closeBlockContextMenu()
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeBlockContextMenu()
            }
        }

        globalThis.window.addEventListener('pointerdown', onPointerDown)
        globalThis.window.addEventListener('keydown', onKeyDown)
        return () => {
            globalThis.window.removeEventListener('pointerdown', onPointerDown)
            globalThis.window.removeEventListener('keydown', onKeyDown)
        }
    }, [activeBlockContextMenu, closeBlockContextMenu])

    const handleBlockContextMenuKeyDown = useCallback((event: React.KeyboardEvent<HTMLDivElement>) => {
        if (
            event.key !== 'ArrowDown' &&
            event.key !== 'ArrowUp' &&
            event.key !== 'Home' &&
            event.key !== 'End'
        ) {
            return
        }

        const actions = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>('.block-context-menu__action'),
        )
        if (!actions.length) {
            return
        }

        event.preventDefault()

        if (event.key === 'Home') {
            actions[0].focus()
            return
        }
        if (event.key === 'End') {
            actions.at(-1)?.focus()
            return
        }

        const activeIndex = actions.indexOf(document.activeElement as HTMLButtonElement)
        const offset = event.key === 'ArrowDown' ? 1 : -1
        const nextIndex = activeIndex === -1 ? 0 : (activeIndex + offset + actions.length) % actions.length
        actions[nextIndex].focus()
    }, [])

    useEffect(() => {
        if (!wireDrag) {
            return undefined
        }

        const onMove = (e: PointerEvent) => {
            const cur = wireDragRef.current
            if (e.pointerId !== cur?.pointerId) {
                return
            }
            setWireDrag({
                ...cur,
                clientX: e.clientX,
                clientY: e.clientY,
            })
        }

        const finish = (e: PointerEvent) => {
            const cur = wireDragRef.current
            if (e.pointerId !== cur?.pointerId) {
                return
            }

            const el = document.elementFromPoint(e.clientX, e.clientY)
            const portEl = el?.closest?.('[data-port-kind]')
            setWireDrag(null)

            if (!(portEl instanceof HTMLElement)) {
                return
            }

            const targetKind = portEl.dataset.portKind
            const targetBlockId = portEl.dataset.blockId
            const targetPortKey = portEl.dataset.portKey
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

            const blocks = placedBlocksRef.current
            const targetBlock = blocks.find((b: any) => b.id === toBlockId)
            const sourceBlock = blocks.find((b: any) => b.id === fromBlockId)
            if (!targetBlock || !sourceBlock) {
                return
            }

            const paramsFor = (b: any) => ({
                blockCount: b.blockCount,
                joinCount: b.joinCount,
            })

            const validOut = outputPortKeysForBlock(sourceBlock.type, paramsFor(sourceBlock))
            const validIn = inputPortKeysForBlock(targetBlock.type, paramsFor(targetBlock))

            if (!validOut.includes(fromPortKey) || !validIn.includes(toPortKey)) {
                return
            }

            setEdges((prevEdges) => {
                if (
                    wouldCreateCycle(prevEdges, {
                        from: { blockId: fromBlockId },
                        to: { blockId: toBlockId },
                    })
                ) {
                    return prevEdges
                }

                return upsertEdgeForInputPort(prevEdges, {
                    id: crypto.randomUUID(),
                    from: { blockId: fromBlockId, portKey: fromPortKey },
                    to: { blockId: toBlockId, portKey: toPortKey },
                })
            })
        }

        globalThis.window.addEventListener('pointermove', onMove)
        globalThis.window.addEventListener('pointerup', finish)
        globalThis.window.addEventListener('pointercancel', finish)

        return () => {
            globalThis.window.removeEventListener('pointermove', onMove)
            globalThis.window.removeEventListener('pointerup', finish)
            globalThis.window.removeEventListener('pointercancel', finish)
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
        const onWheel = (event: WheelEvent) => {
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

    const navigateFromMinimap = useCallback((targetLeft: number, targetTop: number) => {
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
            position: 'relative' as const,
            width: CANVAS_SIZE * zoom,
            height: CANVAS_SIZE * zoom,
        }),
        [zoom],
    )

    const innerCanvasStyle = useMemo(
        () => ({
            position: 'absolute' as const,
            left: 0,
            top: 0,
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0' as const,
        }),
        [zoom],
    )

    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return
        }

        if (event.target !== event.currentTarget) {
            return
        }

        closeBlockContextMenu()

        if (cursorMode === 'select') {
            const additive = event.ctrlKey || event.metaKey
            event.currentTarget.setPointerCapture(event.pointerId)
            selectionStateRef.current = {
                pointerId: event.pointerId,
                startClientX: event.clientX,
                startClientY: event.clientY,
                currentClientX: event.clientX,
                currentClientY: event.clientY,
                additive,
            }
            setIsSelecting(true)

            const z = zoomRef.current
            const startX = (window.scrollX + event.clientX) / z
            const startY = (window.scrollY + event.clientY) / z
            setSelectionBox({
                left: startX,
                top: startY,
                width: 0,
                height: 0,
            })
            return
        }

        if (!(event.ctrlKey || event.metaKey)) {
            setSelectedBlockIds([])
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

    const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (isSelecting && selectionStateRef.current.pointerId === event.pointerId) {
            const next = {
                ...selectionStateRef.current,
                currentClientX: event.clientX,
                currentClientY: event.clientY,
            }
            selectionStateRef.current = next

            const z = zoomRef.current
            const x1 = (window.scrollX + next.startClientX) / z
            const y1 = (window.scrollY + next.startClientY) / z
            const x2 = (window.scrollX + next.currentClientX) / z
            const y2 = (window.scrollY + next.currentClientY) / z
            setSelectionBox({
                left: Math.min(x1, x2),
                top: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
            })
            return
        }

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

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (isSelecting && selectionStateRef.current.pointerId === event.pointerId) {
            event.currentTarget.releasePointerCapture(event.pointerId)
            selectionStateRef.current.pointerId = null
            setIsSelecting(false)
            setSelectionBox(null)
            applySelectionFromMarquee()
            return
        }

        if (dragStateRef.current.pointerId !== event.pointerId) {
            return
        }

        event.currentTarget.releasePointerCapture(event.pointerId)
        dragStateRef.current.pointerId = null
        setIsDragging(false)
    }

    const handleCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
        const types = Array.from(event.dataTransfer.types)
        if (!types.includes(INPUT_BLOCK_DRAG_MIME)) {
            return
        }
        event.preventDefault()
        event.dataTransfer.dropEffect = 'copy'
    }

    const handleCanvasDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
        const types = Array.from(event.dataTransfer.types)
        if (!types.includes(INPUT_BLOCK_DRAG_MIME)) {
            return
        }
        event.preventDefault()
    }

    const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
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
            <section className="cursor-mode-menu" aria-label="Cursor mode">
                <label className="cursor-mode-menu__label">Cursor</label>
                <div className="cursor-mode-menu__buttons" role="tablist" aria-label="Cursor modes">
                    <button
                        type="button"
                        role="tab"
                        aria-pressed={cursorMode === 'pan'}
                        title="Pan: drag canvas"
                        className={`cursor-mode-menu__button ${cursorMode === 'pan' ? 'is-active' : ''}`}
                        onClick={() => setCursorMode('pan')}
                    >
                        🖱️
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-pressed={cursorMode === 'select'}
                        title="Multi-select: draw rectangle to select multiple blocks"
                        className={`cursor-mode-menu__button ${cursorMode === 'select' ? 'is-active' : ''}`}
                        onClick={() => setCursorMode('select')}
                    >
                        🔲
                    </button>
                </div>
            </section>
            <div ref={outerExtentRef} className="canvas-scroll-extent" style={outerExtentStyle}>
                <div
                    ref={canvasRef}
                    className={`grid-canvas ${isDragging ? 'is-dragging' : ''} ${cursorMode === 'select' ? 'is-select-mode' : ''}`}
                    style={innerCanvasStyle}
                    role="application"
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
                                selected={selectedPlacedBlockIds.includes(block.id)}
                                onSelect={handleSelectBlock}
                                onOpenContextMenu={openBlockContextMenu}
                                onRegisterElement={registerBlockElement}
                                evaluation={evaluation}
                            />
                        ))}
                        {selectionBox ? (
                            <div
                                className="canvas-selection-box"
                                style={{
                                    left: selectionBox.left,
                                    top: selectionBox.top,
                                    width: selectionBox.width,
                                    height: selectionBox.height,
                                }}
                            />
                        ) : null}
                    </CanvasGraphContext.Provider>
                </div>
            </div>
            {activeBlockContextMenu ? (
                <div
                    ref={blockContextMenuRef}
                    className="block-context-menu"
                    role="menu"
                    tabIndex={-1}
                    aria-label="Block actions"
                    style={{ left: activeBlockContextMenu.clientX, top: activeBlockContextMenu.clientY }}
                    onKeyDown={handleBlockContextMenuKeyDown}
                >
                    <button
                        type="button"
                        className="block-context-menu__action"
                        onClick={() => duplicateSelectedBlocks(activeBlockContextMenu.blockId)}
                    >
                        Duplicate
                    </button>
                    <button
                        type="button"
                        className="block-context-menu__action"
                        onClick={() => deleteSelectedBlocks(activeBlockContextMenu.blockId)}
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
