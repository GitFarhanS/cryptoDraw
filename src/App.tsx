import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
    DragEvent as ReactDragEvent,
    MouseEvent as ReactMouseEvent,
    PointerEvent as ReactPointerEvent,
} from 'react';
import { flushSync } from 'react-dom';
import './App.scss';
import CanvasPlacedBlock from './canvas-placed-block';
import CanvasWires from './canvas-wires';
import {
    CUSTOM_FUNCTION_DRAG_MIME,
    INPUT_BLOCK_DRAG_MIME,
    isPlacedBlockType,
} from './input-blocks/drag-constants';
import { CanvasGraphContext } from './graph/canvas-graph-context';
import {
    inputPortKeysForBlock,
    outputPortKeysForBlock,
    portRegistryKey,
    upsertEdgeForInputPort,
    wouldCreateCycle,
} from './graph/edge-types';
import { evaluateGraph } from './graph/evaluate-graph';
import {
    parseFlowchartFromBase64,
    serializeFlowchartToBase64,
    parseFlowchartFromText,
} from './graph/flowchart-io';
import { duplicatePlacedBlock, removePlacedBlockAndEdges } from './graph/placed-block-actions';
import { createPlacedBlock } from './graph/placed-block-defaults';
import MiniMap from './mini-map';
import SidePanel from './side-panel';
import SidePanelExpandablePanels from './side-panel-expandable-panels';

const CANVAS_SIZE = 8000;
const MINIMAP_SIZE = 180;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_WHEEL_SENSITIVITY = 0.0018;
const THEME_STORAGE_KEY = 'cryptoDraw.theme';
const CANVAS_STATE_STORAGE_KEY = 'cryptoDraw.canvasState';
const SNAP_TO_GRID_STORAGE_KEY = 'cryptoDraw.snapToGrid';
const CONSENT_KEY = 'cryptoDraw.cookie-consent';
const CUSTOM_FUNCTIONS_STORAGE_KEY = 'cryptoDraw.customFunctions';
const MIN_MARQUEE_SIZE = 4;
const PASTE_STEP = 48;
const PASTE_WRAP = 6;
const SNAP_GRID_SIZE = 16;
const VIEWPORT_IMPORT_PADDING = 24;
const MAX_BLOCKS = 2048;
type PasteAnchor = { x: number; y: number };
const THEMES = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'sepia', label: 'Sepia' },
    { value: 'solarized-dark', label: 'Solarized dark' },
    { value: 'high-contrast', label: 'High contrast' },
];

function loadCanvasState() {
    if (globalThis.window === undefined) {
        return { placedBlocks: [], edges: [] };
    }

    try {
        const stored = globalThis.window.localStorage.getItem(CANVAS_STATE_STORAGE_KEY);
        if (!stored) {
            return { placedBlocks: [], edges: [] };
        }

        // New format: deflate-compressed + base64 payload.
        // Fallback keeps compatibility with older plain JSON saves.
        let parsed;
        try {
            parsed = parseFlowchartFromBase64(stored);
        } catch {
            parsed = parseFlowchartFromText(stored);
        }

        return {
            placedBlocks: parsed.placedBlocks,
            edges: parsed.edges,
        };
    } catch (error) {
        console.warn('Failed to load canvas state from localStorage:', error);
        return { placedBlocks: [], edges: [] };
    }
}

function saveCanvasState(placedBlocks: any[], edges: any[]) {
    if (globalThis.window === undefined) {
        return;
    }

    try {
        const serialized = serializeFlowchartToBase64(placedBlocks, edges);
        globalThis.window.localStorage.setItem(CANVAS_STATE_STORAGE_KEY, serialized);
    } catch (error) {
        console.warn('Failed to save canvas state to localStorage:', error);
    }
}

function readStoredTheme() {
    if (globalThis.window === undefined) {
        return 'system';
    }

    try {
        const stored = globalThis.window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored && THEMES.some((theme) => theme.value === stored)) {
            return stored;
        }
    } catch {
        // Ignore storage failures and fall back to the default theme.
    }

    return 'system';
}

function resolveTheme(theme: string) {
    if (theme !== 'system') {
        return theme;
    }

    if (globalThis.window === undefined) {
        return 'light';
    }

    return globalThis.window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveColorScheme(theme: string) {
    const resolvedTheme = resolveTheme(theme);
    if (
        resolvedTheme === 'dark' ||
        resolvedTheme === 'solarized-dark' ||
        resolvedTheme === 'high-contrast'
    ) {
        return 'dark';
    }

    return 'light';
}

function readStoredSnapToGrid() {
    if (globalThis.window === undefined) {
        return false;
    }

    try {
        return globalThis.window.sessionStorage.getItem(SNAP_TO_GRID_STORAGE_KEY) === 'true';
    } catch {
        return false;
    }
}

function readStoredCustomFunctions() {
    if (globalThis.window === undefined) {
        return [] as Array<{ id: string; name: string; payload: string }>;
    }
    try {
        const raw = globalThis.window.localStorage.getItem(CUSTOM_FUNCTIONS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (item) =>
                item &&
                typeof item.id === 'string' &&
                typeof item.name === 'string' &&
                typeof item.payload === 'string'
        );
    } catch {
        return [];
    }
}

function snapValue(value: number) {
    return Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
}

function readPanelFromQuery() {
    if (globalThis.window === undefined) {
        return null;
    }

    try {
        const params = new URLSearchParams(globalThis.window.location.search);
        const panel = params.get('panel');
        return panel && panel.trim() ? panel : null;
    } catch {
        return null;
    }
}

function resolveCustomFunctionName(baseName: string, existing: Array<{ name: string }>) {
    const trimmed = baseName.trim() || 'Custom function';
    const existingNames = new Set(existing.map((item) => item.name));
    if (!existingNames.has(trimmed)) {
        return trimmed;
    }
    let index = 2;
    while (existingNames.has(`${trimmed} ${index}`)) {
        index += 1;
    }
    return `${trimmed} ${index}`;
}

function App() {
    const [initialPanel] = useState(() => readPanelFromQuery());
    const initialCanvasState = loadCanvasState();
    const [showConsent, setShowConsent] = useState(() => {
        const localConsent = globalThis.localStorage.getItem(CONSENT_KEY);
        const sessionConsent = globalThis.sessionStorage.getItem(CONSENT_KEY);

        return localConsent !== 'accepted' && sessionConsent !== 'accepted';
    });

    const [placedBlocks, setPlacedBlocks] = useState<any[]>(initialCanvasState.placedBlocks);
    const [edges, setEdges] = useState<any[]>(initialCanvasState.edges);
    const [sidePanelOpen, setSidePanelOpen] = useState(() => Boolean(initialPanel));
    const [theme, setTheme] = useState<string>(readStoredTheme);
    const [snapToGrid, setSnapToGrid] = useState<boolean>(readStoredSnapToGrid);
    const [zoom, setZoom] = useState<number>(1);
    const [viewport, setViewport] = useState({
        left: 0,
        top: 0,
        width: 0,
        height: 0,
    });
    const [isDragging, setIsDragging] = useState(false);
    const [isSelecting, setIsSelecting] = useState(false);
    const [layoutEpoch, setLayoutEpoch] = useState(0);
    const [cursorMode, setCursorMode] = useState<'pan' | 'select'>('pan');
    const [selectedBlockIds, setSelectedBlockIds] = useState<string[]>([]);
    const [selectionBox, setSelectionBox] = useState<null | {
        left: number;
        top: number;
        width: number;
        height: number;
    }>(null);
    const [blockContextMenu, setBlockContextMenu] = useState<null | {
        blockId: string;
        clientX: number;
        clientY: number;
    }>(null);
    const [boardContextMenu, setBoardContextMenu] = useState<null | {
        clientX: number;
        clientY: number;
        canvasX: number;
        canvasY: number;
    }>(null);
    const [wireDrag, setWireDrag] = useState<any>(null);
    const [customFunctions, setCustomFunctions] =
        useState<Array<{ id: string; name: string; payload: string }>>(readStoredCustomFunctions);
    const [toast, setToast] = useState<null | { message: string; kind: 'success' | 'error' }>(null);

    const dragStateRef = useRef<any>({
        pointerId: null,
        startX: 0,
        startY: 0,
        startScrollX: 0,
        startScrollY: 0,
    });
    const selectionStateRef = useRef({
        pointerId: null as number | null,
        startClientX: 0,
        startClientY: 0,
        currentClientX: 0,
        currentClientY: 0,
        additive: false,
    });

    const wireDragRef = useRef(wireDrag);
    const placedBlocksRef = useRef(placedBlocks);
    const selectedBlockIdsRef = useRef(selectedBlockIds);
    const edgesRef = useRef(edges);
    const blockContextMenuRef = useRef<HTMLDivElement | null>(null);
    const boardContextMenuRef = useRef<HTMLDivElement | null>(null);
    const blockElementsRef = useRef(new Map<string, HTMLDivElement>());

    const canvasRef = useRef<HTMLDivElement | null>(null);
    const outerExtentRef = useRef<HTMLDivElement | null>(null);
    const zoomRef = useRef<number>(1);
    const didInitialScrollRef = useRef(false);
    const anchorsRef = useRef(new Map());
    const pasteOffsetCounterRef = useRef(0);
    const lastClipboardRef = useRef<string | null>(null);
    const anchorPhaseRef = useRef<'center' | 'top-left' | 'left-middle'>('center');

    // Disable browser's automatic scroll restoration to allow manual control
    useEffect(() => {
        if (globalThis.window) {
            globalThis.window.history.scrollRestoration = 'manual';
        }
    }, []);

    const handleAccept = () => {
        // Persist in both stores to support existing checks and session-based inspection.
        globalThis.localStorage.setItem(CONSENT_KEY, 'accepted');
        globalThis.sessionStorage.setItem(CONSENT_KEY, 'accepted');
        setShowConsent(false);
    };

    const handleReject = () => {
        // Try going back if possible
        if (globalThis.history.length > 1) {
            globalThis.history.back();
            return;
        }

        // Fallback redirect
        globalThis.location.href = 'https://google.com';
    };

    useEffect(() => {
        const resolvedTheme = resolveTheme(theme);
        const colorScheme = resolveColorScheme(theme);
        document.body.dataset.theme = resolvedTheme;
        document.body.style.colorScheme = colorScheme;

        try {
            globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme);
        } catch {
            // Ignore storage failures; the selected theme still applies for this session.
        }

        let mediaQueryList: MediaQueryList | undefined;

        if (theme === 'system' && globalThis.window !== undefined) {
            mediaQueryList = globalThis.window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = () => {
                const nextResolvedTheme = resolveTheme('system');
                const nextColorScheme = resolveColorScheme('system');
                document.body.dataset.theme = nextResolvedTheme;
                document.body.style.colorScheme = nextColorScheme;
            };

            if (typeof mediaQueryList.addEventListener === 'function') {
                mediaQueryList.addEventListener('change', handleChange);
            } else {
                mediaQueryList.onchange = handleChange;
            }

            return () => {
                if (typeof mediaQueryList?.removeEventListener === 'function') {
                    mediaQueryList.removeEventListener('change', handleChange);
                } else if (mediaQueryList) {
                    mediaQueryList.onchange = null;
                }
                delete document.body.dataset.theme;
                document.body.style.colorScheme = '';
            };
        }

        return () => {
            delete document.body.dataset.theme;
            document.body.style.colorScheme = '';
        };
    }, [theme]);

    useEffect(() => {
        zoomRef.current = zoom;
    }, [zoom]);

    useEffect(() => {
        try {
            globalThis.sessionStorage.setItem(SNAP_TO_GRID_STORAGE_KEY, String(snapToGrid));
        } catch {
            // Ignore storage failures and keep in-memory setting.
        }
    }, [snapToGrid]);

    useEffect(() => {
        saveCanvasState(placedBlocks, edges);
    }, [placedBlocks, edges]);

    useEffect(() => {
        if (!toast) {
            return;
        }
        const timeoutId = globalThis.setTimeout(() => setToast(null), 5000);
        return () => globalThis.clearTimeout(timeoutId);
    }, [toast]);

    const showToast = useCallback((message: string, kind: 'success' | 'error') => {
        setToast({ message, kind });
    }, []);

    const canAddBlocks = useCallback(
        (incomingCount: number) => {
            if (placedBlocksRef.current.length + incomingCount > MAX_BLOCKS) {
                showToast(`No more blocks can be pasted or dragged (max ${MAX_BLOCKS}).`, 'error');
                return false;
            }
            return true;
        },
        [showToast]
    );

    useEffect(() => {
        try {
            globalThis.localStorage.setItem(
                CUSTOM_FUNCTIONS_STORAGE_KEY,
                JSON.stringify(customFunctions)
            );
        } catch {
            // Ignore storage failures.
        }
    }, [customFunctions]);

    const bumpLayout = useCallback(() => {
        setLayoutEpoch((n) => n + 1);
    }, []);

    const registerAnchor = useCallback(
        (blockId: string, portKey: string, el: Element | null) => {
            const key = portRegistryKey(blockId, portKey);
            if (el) {
                anchorsRef.current.set(key, el);
            } else {
                anchorsRef.current.delete(key);
            }
            bumpLayout();
        },
        [bumpLayout]
    );

    const evaluation = useMemo(() => evaluateGraph(placedBlocks, edges), [placedBlocks, edges]);
    const selectedPlacedBlockIds = useMemo(() => {
        const existingIds = new Set(placedBlocks.map((block) => block.id));
        return selectedBlockIds.filter((id) => existingIds.has(id));
    }, [placedBlocks, selectedBlockIds]);
    const activeBlockContextMenu = useMemo(() => {
        if (!blockContextMenu) {
            return null;
        }
        return placedBlocks.some((block) => block.id === blockContextMenu.blockId)
            ? blockContextMenu
            : null;
    }, [blockContextMenu, placedBlocks]);

    useEffect(() => {
        if (!import.meta.env.DEV) {
            return;
        }
        if (!evaluation?.diagnostics?.length) {
            return;
        }
        console.debug('[graph:dataflow]', evaluation.diagnostics);
    }, [evaluation]);

    const patchBlock = useCallback((id: string, patch: any) => {
        setPlacedBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...patch } : b)));
    }, []);

    const movePlacedBlock = useCallback(
        (blockId: string, nextX: number, nextY: number) => {
            const targetX = snapToGrid ? snapValue(nextX) : nextX;
            const targetY = snapToGrid ? snapValue(nextY) : nextY;
            setPlacedBlocks((prev) => {
                const dragged = prev.find((block) => block.id === blockId);
                if (!dragged) {
                    return prev;
                }

                const selectedSet = new Set(selectedBlockIdsRef.current);
                const moveSelection = selectedSet.has(blockId) && selectedSet.size > 1;

                if (!moveSelection) {
                    return prev.map((block) =>
                        block.id === blockId
                            ? {
                                ...block,
                                x: targetX,
                                y: targetY,
                            }
                            : block
                    );
                }

                const dx = targetX - dragged.x;
                const dy = targetY - dragged.y;

                return prev.map((block) =>
                    selectedSet.has(block.id)
                        ? {
                            ...block,
                            x: block.x + dx,
                            y: block.y + dy,
                        }
                        : block
                );
            });
            bumpLayout();
        },
        [bumpLayout, snapToGrid]
    );

    const closeBlockContextMenu = useCallback(() => {
        setBlockContextMenu(null);
    }, []);

    const closeBoardContextMenu = useCallback(() => {
        setBoardContextMenu(null);
    }, []);

    const closeContextMenus = useCallback(() => {
        // Do not reset paste offset here; keep offsets across menu closes so
        // repeated pastes increment as expected. The counter is reset when
        // clipboard content changes via `lastClipboardRef`.
        setBlockContextMenu(null);
        setBoardContextMenu(null);
    }, []);

    const handleSelectBlock = useCallback(
        (blockId: string, additive: boolean) => {
            setSelectedBlockIds((prev) => {
                if (additive) {
                    if (prev.includes(blockId)) {
                        return prev.filter((id) => id !== blockId);
                    }
                    return [...prev, blockId];
                }
                if (prev.length === 1 && prev[0] === blockId) {
                    return prev;
                }
                return [blockId];
            });
            closeContextMenus();
        },
        [closeContextMenus]
    );

    const registerBlockElement = useCallback((blockId: string, el: HTMLDivElement | null) => {
        if (el) {
            blockElementsRef.current.set(blockId, el);
            return;
        }
        blockElementsRef.current.delete(blockId);
    }, []);

    const openBlockContextMenu = useCallback(
        (blockId: string, clientX: number, clientY: number) => {
            setSelectedBlockIds((prev) => (prev.includes(blockId) ? prev : [blockId]));
            closeContextMenus();
            setBlockContextMenu({ blockId, clientX, clientY });
        },
        [closeContextMenus]
    );

    const openBoardContextMenu = useCallback(
        (clientX: number, clientY: number, canvasX: number, canvasY: number) => {
            closeContextMenus();
            setBoardContextMenu({ clientX, clientY, canvasX, canvasY });
        },
        [closeContextMenus]
    );

    const deleteSelectedBlocks = useCallback(
        (menuBlockId: string) => {
            const targetIds = selectedBlockIdsRef.current.includes(menuBlockId)
                ? selectedBlockIdsRef.current
                : [menuBlockId];
            const targetSet = new Set(targetIds);

            let nextPlacedBlocks = placedBlocksRef.current;
            let nextEdges = edgesRef.current;
            for (const blockId of targetSet) {
                const next = removePlacedBlockAndEdges(
                    nextPlacedBlocks as any,
                    nextEdges as any,
                    blockId
                );
                nextPlacedBlocks = next.placedBlocks;
                nextEdges = next.edges;
            }

            setPlacedBlocks(nextPlacedBlocks);
            setEdges(nextEdges);
            setSelectedBlockIds([]);
            closeContextMenus();
            bumpLayout();
        },
        [bumpLayout, closeContextMenus]
    );

    const duplicateSelectedBlocks = useCallback(
        (menuBlockId: string) => {
            const targetIds = selectedBlockIdsRef.current.includes(menuBlockId)
                ? selectedBlockIdsRef.current
                : [menuBlockId];
            const targets = placedBlocksRef.current.filter((block) => targetIds.includes(block.id));
            if (!targets.length) {
                return;
            }
            const idMap = new Map<string, string>();
            const duplicated = targets.map((block, index) => {
                const newId = crypto.randomUUID();
                idMap.set(block.id, newId);
                return duplicatePlacedBlock(block, {
                    dx: PASTE_STEP * (index + 1),
                    dy: PASTE_STEP * (index + 1),
                    idFactory: () => newId,
                });
            });

            // Duplicate internal edges between selected blocks, remap endpoints to new ids
            const existingEdges = edgesRef.current;
            const internalNewEdges = [] as any[];
            for (const e of existingEdges) {
                if (idMap.has(e.from.blockId) && idMap.has(e.to.blockId)) {
                    internalNewEdges.push({
                        ...e,
                        id: crypto.randomUUID(),
                        from: { ...e.from, blockId: idMap.get(e.from.blockId) as string },
                        to: { ...e.to, blockId: idMap.get(e.to.blockId) as string },
                    });
                }
            }

            setPlacedBlocks((prev) => [...prev, ...duplicated]);
            setSelectedBlockIds(duplicated.map((block) => block.id));
            if (internalNewEdges.length) {
                setEdges((prev) => [...prev, ...internalNewEdges]);
            }
            closeContextMenus();
            bumpLayout();
        },
        [bumpLayout, closeContextMenus]
    );

    const scrollToBlocks = useCallback((blocks: any[]) => {
        if (!blocks.length) return;

        const z = zoomRef.current;
        const minX = Math.min(...blocks.map((b) => b.x));
        const maxX = Math.max(...blocks.map((b) => b.x));
        const minY = Math.min(...blocks.map((b) => b.y));
        const maxY = Math.max(...blocks.map((b) => b.y));

        // Center the view on the bounding box of the blocks
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const targetScrollX = centerX * z - window.innerWidth / 2;
        const targetScrollY = centerY * z - window.innerHeight / 2;

        const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth);
        const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight);

        window.scrollTo({
            left: Math.min(Math.max(0, targetScrollX), maxScrollLeft),
            top: Math.min(Math.max(0, targetScrollY), maxScrollTop),
        });
    }, []);

    const copySelectedBlocks = useCallback(async (menuBlockId?: string) => {
        const selected = selectedBlockIdsRef.current;
        const idsToCopy = menuBlockId
            ? selected.includes(menuBlockId)
                ? selected
                : [menuBlockId]
            : selected;
        if (!idsToCopy.length) {
            return false;
        }

        const blocks = placedBlocksRef.current.filter((b) => idsToCopy.includes(b.id));
        const edgesList = edgesRef.current.filter(
            (e) => idsToCopy.includes(e.from.blockId) && idsToCopy.includes(e.to.blockId)
        );
        try {
            const text = serializeFlowchartToBase64(blocks, edgesList);
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // ignore clipboard failures
            return false;
        }
    }, []);

    const pasteFromClipboard = useCallback(
        async (target?: { x: number; y: number }) => {
            try {
                const rawText = await navigator.clipboard.readText();
                if (!rawText) {
                    return false;
                }

                let text = rawText;
                try {
                    const parsedShare = JSON.parse(rawText);
                    if (
                        parsedShare &&
                        parsedShare.type === 'custom-function' &&
                        typeof parsedShare.payload === 'string'
                    ) {
                        text = parsedShare.payload;
                    }
                } catch {
                    // Not JSON share text; continue with regular base64 flowchart paste.
                }

                // Reset offset counter when clipboard content changes so
                // the first paste of new content has zero offset.
                if (lastClipboardRef.current !== text) {
                    pasteOffsetCounterRef.current = 0;
                    lastClipboardRef.current = text;
                }
                const parsed = parseFlowchartFromBase64(text);
                if (!parsed.placedBlocks.length) {
                    return false;
                }
                if (!canAddBlocks(parsed.placedBlocks.length)) {
                    return false;
                }

                const sourceLeft = Math.min(...parsed.placedBlocks.map((block: any) => block.x));
                const sourceTop = Math.min(...parsed.placedBlocks.map((block: any) => block.y));

                // Compute source bounds
                const sourceRight = Math.max(...parsed.placedBlocks.map((block: any) => block.x));
                const sourceBottom = Math.max(...parsed.placedBlocks.map((block: any) => block.y));
                const sourceWidth = sourceRight - sourceLeft;
                const sourceHeight = sourceBottom - sourceTop;

                // Decide anchor based on phase and overflow. If `target` is provided use it.
                const z = zoomRef.current;
                let phase = anchorPhaseRef.current;
                let anchor: PasteAnchor = target
                    ? { x: target.x, y: target.y }
                    : phase === 'center'
                        ? {
                            x: (window.scrollX + window.innerWidth / 2) / z,
                            y: (window.scrollY + window.innerHeight / 2) / z,
                        }
                        : phase === 'top-left'
                            ? { x: viewport.left, y: viewport.top }
                            : { x: viewport.left, y: viewport.top + viewport.height / 2 };

                // Compute grid position
                let n = pasteOffsetCounterRef.current;
                let col = Math.floor(n / PASTE_WRAP);
                let row = n % PASTE_WRAP;
                let pasteOffsetX = col * PASTE_STEP;
                let pasteOffsetY = row * PASTE_STEP;

                // Check if the computed placement would overflow the viewport to the right
                const viewportRight = viewport.left + viewport.width;
                const viewportBottom = viewport.top + viewport.height;
                const projectedMaxX = anchor.x + sourceWidth + pasteOffsetX;
                const projectedMaxY = anchor.y + sourceHeight + pasteOffsetY;

                if (!target && phase === 'center' && projectedMaxX > viewportRight) {
                    // switch to top-left and restart grid
                    phase = 'top-left';
                    anchorPhaseRef.current = phase;
                    anchor = { x: viewport.left, y: viewport.top };
                    n = 0;
                    col = 0;
                    row = 0;
                    pasteOffsetX = 0;
                    pasteOffsetY = 0;
                } else if (!target && phase === 'top-left' && projectedMaxY > viewportBottom) {
                    // switch to left-middle and restart grid
                    phase = 'left-middle';
                    anchorPhaseRef.current = phase;
                    anchor = { x: viewport.left, y: viewport.top + viewport.height / 2 };
                    n = 0;
                    col = 0;
                    row = 0;
                    pasteOffsetX = 0;
                    pasteOffsetY = 0;
                }

                // Finally bump counter for this paste
                pasteOffsetCounterRef.current = n + 1;

                const idMap = new Map<string, string>();
                const duplicated = parsed.placedBlocks.map((block: any) => {
                    const newId = crypto.randomUUID();
                    idMap.set(block.id, newId);

                    const placedX = anchor.x + (block.x - sourceLeft) + pasteOffsetX;
                    const placedY = anchor.y + (block.y - sourceTop) + pasteOffsetY;

                    return {
                        ...block,
                        id: newId,
                        x: snapToGrid ? snapValue(placedX) : placedX,
                        y: snapToGrid ? snapValue(placedY) : placedY,
                    };
                });

                const newEdges = parsed.edges
                    .filter((e: any) => idMap.has(e.from.blockId) && idMap.has(e.to.blockId))
                    .map((e: any) => ({
                        ...e,
                        id: crypto.randomUUID(),
                        from: { ...e.from, blockId: idMap.get(e.from.blockId) as string },
                        to: { ...e.to, blockId: idMap.get(e.to.blockId) as string },
                    }));

                setPlacedBlocks((prev) => [...prev, ...duplicated]);
                if (newEdges.length) {
                    setEdges((prev) => [...prev, ...newEdges]);
                }
                setSelectedBlockIds(duplicated.map((b) => b.id));
                closeContextMenus();
                bumpLayout();
                return true;
            } catch {
                // ignore parse/clipboard errors
                return false;
            }
        },
        [bumpLayout, canAddBlocks, closeContextMenus, snapToGrid, viewport]
    );

    const packageSelectionAsCustomFunction = useCallback(
        (name: string) => {
            const ids = selectedBlockIdsRef.current;
            if (!ids.length) {
                return false;
            }
            const blocks = placedBlocksRef.current.filter((b) => ids.includes(b.id));
            if (!blocks.length) {
                return false;
            }
            const edgesList = edgesRef.current.filter(
                (e) => ids.includes(e.from.blockId) && ids.includes(e.to.blockId)
            );
            const payload = serializeFlowchartToBase64(blocks, edgesList);
            setCustomFunctions((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    name: resolveCustomFunctionName(name, prev),
                    payload,
                },
            ]);
            return true;
        },
        [setCustomFunctions]
    );

    const copyCustomFunctionShare = useCallback(
        async (id: string) => {
            const fn = customFunctions.find((item) => item.id === id);
            if (!fn) {
                return false;
            }
            const share = JSON.stringify({
                version: 1,
                type: 'custom-function',
                name: fn.name,
                payload: fn.payload,
            });
            try {
                await navigator.clipboard.writeText(share);
                return true;
            } catch {
                return false;
            }
        },
        [customFunctions]
    );

    const importCustomFunctionShare = useCallback(
        (text: string) => {
            let parsed: any;
            try {
                parsed = JSON.parse(text);
            } catch {
                throw new Error('Invalid custom function share text.');
            }
            if (
                parsed?.type !== 'custom-function' ||
                typeof parsed.name !== 'string' ||
                typeof parsed.payload !== 'string'
            ) {
                throw new Error('Invalid custom function share format.');
            }
            if (customFunctions.some((item) => item.payload === parsed.payload)) {
                throw new Error('This custom function is already imported.');
            }
            // Validate payload
            parseFlowchartFromBase64(parsed.payload);
            const id = crypto.randomUUID();
            let finalName = parsed.name as string;
            setCustomFunctions((prev) => {
                finalName = resolveCustomFunctionName(parsed.name, prev);
                return [...prev, { id, name: finalName, payload: parsed.payload }];
            });
            return finalName;
        },
        [customFunctions]
    );

    const placeCustomFunctionAt = useCallback(
        (customFunctionId: string, x: number, y: number) => {
            const fn = customFunctions.find((item) => item.id === customFunctionId);
            if (!fn) {
                return false;
            }
            const parsed = parseFlowchartFromBase64(fn.payload);
            if (!parsed.placedBlocks.length) {
                return false;
            }
            if (!canAddBlocks(parsed.placedBlocks.length)) {
                return false;
            }
            const sourceLeft = Math.min(...parsed.placedBlocks.map((block: any) => block.x));
            const sourceTop = Math.min(...parsed.placedBlocks.map((block: any) => block.y));
            const idMap = new Map<string, string>();
            const duplicated = parsed.placedBlocks.map((block: any) => {
                const newId = crypto.randomUUID();
                idMap.set(block.id, newId);
                return {
                    ...block,
                    id: newId,
                    x: snapToGrid
                        ? snapValue(x + (block.x - sourceLeft))
                        : x + (block.x - sourceLeft),
                    y: snapToGrid
                        ? snapValue(y + (block.y - sourceTop))
                        : y + (block.y - sourceTop),
                };
            });

            const newEdges = parsed.edges
                .filter((e: any) => idMap.has(e.from.blockId) && idMap.has(e.to.blockId))
                .map((e: any) => ({
                    ...e,
                    id: crypto.randomUUID(),
                    from: { ...e.from, blockId: idMap.get(e.from.blockId) as string },
                    to: { ...e.to, blockId: idMap.get(e.to.blockId) as string },
                }));

            setPlacedBlocks((prev) => [...prev, ...duplicated]);
            if (newEdges.length) {
                setEdges((prev) => [...prev, ...newEdges]);
            }
            setSelectedBlockIds(duplicated.map((b) => b.id));
            bumpLayout();
            return true;
        },
        [bumpLayout, canAddBlocks, customFunctions, snapToGrid]
    );

    useEffect(() => {
        const isInteractive = (el: Element | null) =>
            el ? !!el.closest?.('input, textarea, select, [contenteditable="true"]') : false;

        const onKeyDown = (event: KeyboardEvent) => {
            const active = document.activeElement;
            if (isInteractive(active)) return;

            const cmd = event.ctrlKey || event.metaKey;

            if ((event.key === 'Delete' || event.key === 'Backspace') && !cmd) {
                // delete selected
                const sel = selectedBlockIdsRef.current;
                if (!sel.length) return;
                // use existing deleteSelectedBlocks by passing first id
                deleteSelectedBlocks(sel[0]);
                event.preventDefault();
                return;
            }

            if (cmd && (event.key === 'c' || event.key === 'C')) {
                copySelectedBlocks();
                event.preventDefault();
                return;
            }

            if (cmd && (event.key === 'v' || event.key === 'V')) {
                pasteFromClipboard();
                event.preventDefault();
            }
        };

        globalThis.addEventListener('keydown', onKeyDown);
        return () => globalThis.removeEventListener('keydown', onKeyDown);
    }, [copySelectedBlocks, pasteFromClipboard, deleteSelectedBlocks]);

    const applySelectionFromMarquee = useCallback(() => {
        const state = selectionStateRef.current;
        const z = zoomRef.current;
        const x1 = (window.scrollX + state.startClientX) / z;
        const y1 = (window.scrollY + state.startClientY) / z;
        const x2 = (window.scrollX + state.currentClientX) / z;
        const y2 = (window.scrollY + state.currentClientY) / z;
        const left = Math.min(x1, x2);
        const right = Math.max(x1, x2);
        const top = Math.min(y1, y2);
        const bottom = Math.max(y1, y2);

        if (right - left < MIN_MARQUEE_SIZE && bottom - top < MIN_MARQUEE_SIZE) {
            if (!state.additive) {
                setSelectedBlockIds([]);
            }
            return;
        }

        const hitIds: string[] = [];
        blockElementsRef.current.forEach((el, blockId) => {
            const rect = el.getBoundingClientRect();
            const blockLeft = (window.scrollX + rect.left) / z;
            const blockRight = blockLeft + rect.width / z;
            const blockTop = (window.scrollY + rect.top) / z;
            const blockBottom = blockTop + rect.height / z;
            const intersects =
                blockRight >= left &&
                blockLeft <= right &&
                blockBottom >= top &&
                blockTop <= bottom;
            if (intersects) {
                hitIds.push(blockId);
            }
        });

        setSelectedBlockIds((prev) => {
            if (!state.additive) {
                return hitIds;
            }
            const merged = new Set([...prev, ...hitIds]);
            return Array.from(merged);
        });
    }, []);

    const onPortPointerDown = useCallback(
        (
            event: ReactPointerEvent,
            fromKind: 'input' | 'output',
            fromBlockId: string,
            fromPortKey: string
        ) => {
            event.preventDefault();
            setWireDrag({
                pointerId: event.pointerId,
                fromKind,
                fromBlockId,
                fromPortKey,
                clientX: event.clientX,
                clientY: event.clientY,
            });
        },
        []
    );

    useEffect(() => {
        wireDragRef.current = wireDrag;
    }, [wireDrag]);

    useEffect(() => {
        placedBlocksRef.current = placedBlocks;
    }, [placedBlocks]);

    useEffect(() => {
        selectedBlockIdsRef.current = selectedPlacedBlockIds;
    }, [selectedPlacedBlockIds]);

    useEffect(() => {
        edgesRef.current = edges;
    }, [edges]);

    useEffect(() => {
        if (!activeBlockContextMenu && !boardContextMenu) {
            return undefined;
        }

        if (activeBlockContextMenu) {
            blockContextMenuRef.current
                ?.querySelector<HTMLButtonElement>('.context-menu__action')
                ?.focus();
        } else {
            boardContextMenuRef.current
                ?.querySelector<HTMLButtonElement>('.context-menu__action')
                ?.focus();
        }

        const onPointerDown = (event: PointerEvent) => {
            if (event.target instanceof Element && event.target.closest('.context-menu')) {
                return;
            }
            closeContextMenus();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeContextMenus();
            }
        };

        globalThis.window.addEventListener('pointerdown', onPointerDown);
        globalThis.window.addEventListener('keydown', onKeyDown);
        return () => {
            globalThis.window.removeEventListener('pointerdown', onPointerDown);
            globalThis.window.removeEventListener('keydown', onKeyDown);
        };
    }, [activeBlockContextMenu, boardContextMenu, closeContextMenus]);

    useEffect(() => {
        if (!boardContextMenu) {
            return undefined;
        }

        boardContextMenuRef.current
            ?.querySelector<HTMLButtonElement>('.context-menu__action')
            ?.focus();

        const onPointerDown = (event: PointerEvent) => {
            if (event.target instanceof Element && event.target.closest('.context-menu')) {
                return;
            }
            closeBoardContextMenu();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeBoardContextMenu();
            }
        };

        globalThis.window.addEventListener('pointerdown', onPointerDown);
        globalThis.window.addEventListener('keydown', onKeyDown);
        return () => {
            globalThis.window.removeEventListener('pointerdown', onPointerDown);
            globalThis.window.removeEventListener('keydown', onKeyDown);
        };
    }, [boardContextMenu, closeBoardContextMenu]);

    const handleBlockContextMenuKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (
                event.key !== 'ArrowDown' &&
                event.key !== 'ArrowUp' &&
                event.key !== 'Home' &&
                event.key !== 'End'
            ) {
                return;
            }

            const actions = Array.from(
                event.currentTarget.querySelectorAll<HTMLButtonElement>('.context-menu__action')
            );
            if (!actions.length) {
                return;
            }

            event.preventDefault();

            if (event.key === 'Home') {
                actions[0].focus();
                return;
            }
            if (event.key === 'End') {
                actions.at(-1)?.focus();
                return;
            }

            const activeIndex = actions.indexOf(document.activeElement as HTMLButtonElement);
            const offset = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex =
                activeIndex === -1 ? 0 : (activeIndex + offset + actions.length) % actions.length;
            actions[nextIndex].focus();
        },
        []
    );

    useEffect(() => {
        if (!wireDrag) {
            return undefined;
        }

        const onMove = (e: PointerEvent) => {
            const cur = wireDragRef.current;
            if (e.pointerId !== cur?.pointerId) {
                return;
            }
            setWireDrag({
                ...cur,
                clientX: e.clientX,
                clientY: e.clientY,
            });
        };

        const finish = (e: PointerEvent) => {
            const cur = wireDragRef.current;
            if (e.pointerId !== cur?.pointerId) {
                return;
            }

            const el = document.elementFromPoint(e.clientX, e.clientY);
            const portEl = el?.closest?.('[data-port-kind]');
            setWireDrag(null);

            if (!(portEl instanceof HTMLElement)) {
                return;
            }

            const targetKind = portEl.dataset.portKind;
            const targetBlockId = portEl.dataset.blockId;
            const targetPortKey = portEl.dataset.portKey;
            if (
                !targetKind ||
                (targetKind !== 'input' && targetKind !== 'output') ||
                !targetBlockId ||
                !targetPortKey
            ) {
                return;
            }

            if (targetKind === cur.fromKind) {
                return;
            }

            const fromBlockId = cur.fromKind === 'output' ? cur.fromBlockId : targetBlockId;
            const fromPortKey = cur.fromKind === 'output' ? cur.fromPortKey : targetPortKey;
            const toBlockId = cur.fromKind === 'output' ? targetBlockId : cur.fromBlockId;
            const toPortKey = cur.fromKind === 'output' ? targetPortKey : cur.fromPortKey;

            const blocks = placedBlocksRef.current;
            const targetBlock = blocks.find((b: any) => b.id === toBlockId);
            const sourceBlock = blocks.find((b: any) => b.id === fromBlockId);
            if (!targetBlock || !sourceBlock) {
                return;
            }

            const paramsFor = (b: any) => ({
                blockCount: b.blockCount,
                joinCount: b.joinCount,
            });

            const validOut = outputPortKeysForBlock(sourceBlock.type, paramsFor(sourceBlock));
            const validIn = inputPortKeysForBlock(targetBlock.type, paramsFor(targetBlock));

            if (!validOut.includes(fromPortKey) || !validIn.includes(toPortKey)) {
                return;
            }

            setEdges((prevEdges) => {
                if (
                    wouldCreateCycle(prevEdges, {
                        from: { blockId: fromBlockId },
                        to: { blockId: toBlockId },
                    })
                ) {
                    return prevEdges;
                }

                return upsertEdgeForInputPort(prevEdges, {
                    id: crypto.randomUUID(),
                    from: { blockId: fromBlockId, portKey: fromPortKey },
                    to: { blockId: toBlockId, portKey: toPortKey },
                });
            });
        };

        globalThis.window.addEventListener('pointermove', onMove);
        globalThis.window.addEventListener('pointerup', finish);
        globalThis.window.addEventListener('pointercancel', finish);

        return () => {
            globalThis.window.removeEventListener('pointermove', onMove);
            globalThis.window.removeEventListener('pointerup', finish);
            globalThis.window.removeEventListener('pointercancel', finish);
        };
    }, [wireDrag]);

    useEffect(() => {
        const updateViewport = () => {
            const z = zoomRef.current;
            const togglePx = 32;
            const drawerPx = sidePanelOpen ? Math.min(288, window.innerWidth * 0.92) : 0;
            const rightChromePx = togglePx + drawerPx;
            const usableInnerWidthPx = Math.max(0, window.innerWidth - rightChromePx);
            setViewport({
                left: window.scrollX / z,
                top: window.scrollY / z,
                width: usableInnerWidthPx / z,
                height: window.innerHeight / z,
            });
            bumpLayout();
        };

        updateViewport();
        window.addEventListener('scroll', updateViewport, { passive: true });
        window.addEventListener('resize', updateViewport);

        return () => {
            window.removeEventListener('scroll', updateViewport);
            window.removeEventListener('resize', updateViewport);
        };
    }, [bumpLayout, zoom, sidePanelOpen]);

    // Reset paste offset counter when the viewport changes so pastes from a
    // new view start at zero offset.
    useEffect(() => {
        pasteOffsetCounterRef.current = 0;
        anchorPhaseRef.current = 'center';
    }, [viewport.left, viewport.top]);

    useEffect(() => {
        if (didInitialScrollRef.current) {
            return;
        }
        didInitialScrollRef.current = true;

        // Reset scroll position to override browser's auto-restore
        window.scrollTo(0, 0);

        // If there are placed blocks (loaded from state), scroll to them
        if (placedBlocks.length > 0) {
            requestAnimationFrame(() => {
                scrollToBlocks(placedBlocks);
            });
            return;
        }

        // Otherwise, center the canvas
        requestAnimationFrame(() => {
            const z = zoomRef.current;
            const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth);
            const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight);
            const left = Math.min(
                Math.max(0, (CANVAS_SIZE * z - window.innerWidth) / 2),
                maxScrollLeft
            );
            const top = Math.min(
                Math.max(0, (CANVAS_SIZE * z - window.innerHeight) / 2),
                maxScrollTop
            );
            window.scrollTo({ left, top });
        });
    }, [placedBlocks, scrollToBlocks]);

    useEffect(() => {
        const onWheel = (event: WheelEvent) => {
            const hit = document.elementFromPoint(event.clientX, event.clientY);
            if (hit?.closest('.minimap') || hit?.closest('.side-panel')) {
                return;
            }

            const outer = outerExtentRef.current;
            if (!outer) {
                return;
            }

            const bounds = outer.getBoundingClientRect();
            if (
                event.clientX < bounds.left ||
                event.clientX > bounds.right ||
                event.clientY < bounds.top ||
                event.clientY > bounds.bottom
            ) {
                return;
            }

            event.preventDefault();

            const z0 = zoomRef.current;
            const nextZoom = Math.min(
                MAX_ZOOM,
                Math.max(MIN_ZOOM, z0 * Math.exp(-event.deltaY * ZOOM_WHEEL_SENSITIVITY))
            );

            if (Math.abs(nextZoom - z0) < 1e-8) {
                return;
            }

            const canvasX = (window.scrollX + event.clientX) / z0;
            const canvasY = (window.scrollY + event.clientY) / z0;

            flushSync(() => {
                setZoom(nextZoom);
            });

            requestAnimationFrame(() => {
                const maxScrollLeft = Math.max(0, CANVAS_SIZE * nextZoom - window.innerWidth);
                const maxScrollTop = Math.max(0, CANVAS_SIZE * nextZoom - window.innerHeight);
                const left = Math.min(
                    Math.max(0, canvasX * nextZoom - event.clientX),
                    maxScrollLeft
                );
                const top = Math.min(Math.max(0, canvasY * nextZoom - event.clientY), maxScrollTop);
                window.scrollTo({ left, top });
            });
        };

        window.addEventListener('wheel', onWheel, { passive: false });
        return () => window.removeEventListener('wheel', onWheel);
    }, []);

    const navigateFromMinimap = useCallback((targetLeft: number, targetTop: number) => {
        const z = zoomRef.current;
        const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth);
        const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight);

        window.scrollTo({
            left: Math.min(Math.max(0, targetLeft * z), maxScrollLeft),
            top: Math.min(Math.max(0, targetTop * z), maxScrollTop),
        });
    }, []);

    const outerExtentStyle = useMemo(
        () => ({
            position: 'relative' as const,
            width: CANVAS_SIZE * zoom,
            height: CANVAS_SIZE * zoom,
        }),
        [zoom]
    );

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
        [zoom]
    );

    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return;
        }

        if (event.target !== event.currentTarget) {
            return;
        }

        closeContextMenus();

        if (cursorMode === 'select') {
            const additive = event.ctrlKey || event.metaKey;
            event.currentTarget.setPointerCapture(event.pointerId);
            selectionStateRef.current = {
                pointerId: event.pointerId,
                startClientX: event.clientX,
                startClientY: event.clientY,
                currentClientX: event.clientX,
                currentClientY: event.clientY,
                additive,
            };
            setIsSelecting(true);

            const z = zoomRef.current;
            const startX = (window.scrollX + event.clientX) / z;
            const startY = (window.scrollY + event.clientY) / z;
            setSelectionBox({
                left: startX,
                top: startY,
                width: 0,
                height: 0,
            });
            return;
        }

        if (!(event.ctrlKey || event.metaKey)) {
            setSelectedBlockIds([]);
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        dragStateRef.current = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            startScrollX: window.scrollX,
            startScrollY: window.scrollY,
        };
        setIsDragging(true);
    };

    const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (isSelecting && selectionStateRef.current.pointerId === event.pointerId) {
            const next = {
                ...selectionStateRef.current,
                currentClientX: event.clientX,
                currentClientY: event.clientY,
            };
            selectionStateRef.current = next;

            const z = zoomRef.current;
            const x1 = (window.scrollX + next.startClientX) / z;
            const y1 = (window.scrollY + next.startClientY) / z;
            const x2 = (window.scrollX + next.currentClientX) / z;
            const y2 = (window.scrollY + next.currentClientY) / z;
            setSelectionBox({
                left: Math.min(x1, x2),
                top: Math.min(y1, y2),
                width: Math.abs(x2 - x1),
                height: Math.abs(y2 - y1),
            });
            return;
        }

        if (!isDragging || dragStateRef.current.pointerId !== event.pointerId) {
            return;
        }

        const dx = event.clientX - dragStateRef.current.startX;
        const dy = event.clientY - dragStateRef.current.startY;

        window.scrollTo({
            left: dragStateRef.current.startScrollX - dx,
            top: dragStateRef.current.startScrollY - dy,
        });
    };

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (isSelecting && selectionStateRef.current.pointerId === event.pointerId) {
            event.currentTarget.releasePointerCapture(event.pointerId);
            selectionStateRef.current.pointerId = null;
            setIsSelecting(false);
            setSelectionBox(null);
            applySelectionFromMarquee();
            return;
        }

        if (dragStateRef.current.pointerId !== event.pointerId) {
            return;
        }

        event.currentTarget.releasePointerCapture(event.pointerId);
        dragStateRef.current.pointerId = null;
        setIsDragging(false);
    };

    const handleCanvasContextMenu = (event: ReactMouseEvent<HTMLDivElement>) => {
        if (event.target instanceof Element && event.target.closest('.canvas-placed-block')) {
            return;
        }

        event.preventDefault();
        const z = zoomRef.current;
        openBoardContextMenu(
            event.clientX,
            event.clientY,
            (window.scrollX + event.clientX) / z,
            (window.scrollY + event.clientY) / z
        );
    };

    const handleCanvasDragOver = (event: ReactDragEvent<HTMLDivElement>) => {
        const types = new Set(Array.from(event.dataTransfer.types));
        if (!types.has(INPUT_BLOCK_DRAG_MIME) && !types.has(CUSTOM_FUNCTION_DRAG_MIME)) {
            return;
        }
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    };

    const handleCanvasDragEnter = (event: ReactDragEvent<HTMLDivElement>) => {
        const types = new Set(Array.from(event.dataTransfer.types));
        if (!types.has(INPUT_BLOCK_DRAG_MIME) && !types.has(CUSTOM_FUNCTION_DRAG_MIME)) {
            return;
        }
        event.preventDefault();
    };

    const handleCanvasDrop = (event: ReactDragEvent<HTMLDivElement>) => {
        const customFunctionId = event.dataTransfer.getData(CUSTOM_FUNCTION_DRAG_MIME);
        if (customFunctionId) {
            event.preventDefault();
            closeBoardContextMenu();
            const rect = event.currentTarget.getBoundingClientRect();
            const z = zoomRef.current;
            const x = (event.clientX - rect.left) / z;
            const y = (event.clientY - rect.top) / z;
            const dropX = snapToGrid ? snapValue(x) : x;
            const dropY = snapToGrid ? snapValue(y) : y;
            placeCustomFunctionAt(customFunctionId, dropX, dropY);
            return;
        }

        const blockType = event.dataTransfer.getData(INPUT_BLOCK_DRAG_MIME);
        if (!isPlacedBlockType(blockType)) {
            return;
        }

        event.preventDefault();
        closeBoardContextMenu();
        const rect = event.currentTarget.getBoundingClientRect();
        const z = zoomRef.current;
        const x = (event.clientX - rect.left) / z;
        const y = (event.clientY - rect.top) / z;
        const dropX = snapToGrid ? snapValue(x) : x;
        const dropY = snapToGrid ? snapValue(y) : y;

        const created = createPlacedBlock(blockType, dropX, dropY);
        if (!created) {
            return;
        }
        if (!canAddBlocks(1)) {
            return;
        }

        setPlacedBlocks((prev) => [...prev, created]);
        bumpLayout();
    };

    const handleResetLocalStorage = useCallback(() => {
        try {
            globalThis.localStorage.clear();
        } catch {
            // Ignore storage failures.
        }
    }, []);

    const graphContextValue = useMemo(
        () => ({
            registerAnchor,
            onPortPointerDown,
            wireDrag,
            zoom,
        }),
        [registerAnchor, onPortPointerDown, wireDrag, zoom]
    );

    const handleExportFlowchart = useCallback(
        () => serializeFlowchartToBase64(placedBlocks, edges),
        [placedBlocks, edges]
    );

    const handleImportFlowchart = useCallback(
        (base64Text: string, options?: { anchorToViewport?: boolean }) => {
            let parsed = parseFlowchartFromBase64(base64Text);
            if (
                options?.anchorToViewport &&
                parsed.placedBlocks.length > 0 &&
                viewport.width > 0 &&
                viewport.height > 0
            ) {
                const minX = Math.min(...parsed.placedBlocks.map((b: { x: number }) => b.x));
                const minY = Math.min(...parsed.placedBlocks.map((b: { y: number }) => b.y));
                const maxX = Math.max(...parsed.placedBlocks.map((b: { x: number }) => b.x));
                const maxY = Math.max(...parsed.placedBlocks.map((b: { y: number }) => b.y));
                const graphCx = (minX + maxX) / 2;
                const graphCy = (minY + maxY) / 2;
                const pad = VIEWPORT_IMPORT_PADDING;
                const usableW = Math.max(0, viewport.width - 2 * pad);
                const usableH = Math.max(0, viewport.height - 2 * pad);
                const targetCx = viewport.left + pad + usableW / 2;
                const targetCy = viewport.top + pad + usableH / 2;
                const dx = targetCx - graphCx;
                const dy = targetCy - graphCy;
                parsed = {
                    ...parsed,
                    placedBlocks: parsed.placedBlocks.map((block: { x: number; y: number }) => {
                        const nx = block.x + dx;
                        const ny = block.y + dy;
                        return {
                            ...block,
                            x: snapToGrid ? snapValue(nx) : nx,
                            y: snapToGrid ? snapValue(ny) : ny,
                        };
                    }),
                };
            }
            setPlacedBlocks(parsed.placedBlocks);
            setEdges(parsed.edges);
            bumpLayout();
            if (!options?.anchorToViewport) {
                scrollToBlocks(parsed.placedBlocks);
            }
        },
        [bumpLayout, scrollToBlocks, snapToGrid, viewport.height, viewport.left, viewport.top, viewport.width]
    );

    const handleClearFlowchart = useCallback(() => {
        setPlacedBlocks([]);
        setEdges([]);
        setSelectedBlockIds([]);
        bumpLayout();
        // center view on canvas
        const z = zoomRef.current;
        const maxScrollLeft = Math.max(0, CANVAS_SIZE * z - window.innerWidth);
        const maxScrollTop = Math.max(0, CANVAS_SIZE * z - window.innerHeight);
        const left = Math.min(
            Math.max(0, (CANVAS_SIZE * z - window.innerWidth) / 2),
            maxScrollLeft
        );
        const top = Math.min(Math.max(0, (CANVAS_SIZE * z - window.innerHeight) / 2), maxScrollTop);
        window.scrollTo({ left, top });
    }, [bumpLayout]);

    return (
        <>
            <section className="cursor-mode-menu" aria-label="Cursor mode">
                <p className="cursor-mode-menu__label">Cursor</p>
                <div className="cursor-mode-menu__buttons" role="tablist" aria-label="Cursor modes">
                    <button
                        type="button"
                        aria-pressed={cursorMode === 'pan'}
                        title="Pan: drag canvas"
                        className={`cursor-mode-menu__button ${cursorMode === 'pan' ? 'is-active' : ''}`}
                        onClick={() => setCursorMode('pan')}
                    >
                        🖱️
                    </button>
                    <button
                        type="button"
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
                    onContextMenu={handleCanvasContextMenu}
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
                    className="context-menu"
                    role="menu"
                    tabIndex={-1}
                    aria-label="Block actions"
                    style={{
                        left: activeBlockContextMenu.clientX,
                        top: activeBlockContextMenu.clientY,
                    }}
                    onKeyDown={handleBlockContextMenuKeyDown}
                >
                    <button
                        type="button"
                        className="context-menu__action"
                        onClick={() => {
                            copySelectedBlocks(activeBlockContextMenu.blockId);
                            closeBlockContextMenu();
                        }}
                    >
                        Copy
                    </button>
                    <button
                        type="button"
                        className="context-menu__action"
                        onClick={() => duplicateSelectedBlocks(activeBlockContextMenu.blockId)}
                    >
                        Duplicate
                    </button>
                    <button
                        type="button"
                        className="context-menu__action"
                        onClick={() => deleteSelectedBlocks(activeBlockContextMenu.blockId)}
                    >
                        Delete
                    </button>
                </div>
            ) : null}
            {boardContextMenu ? (
                <div
                    ref={boardContextMenuRef}
                    className="context-menu"
                    role="menu"
                    tabIndex={-1}
                    aria-label="Board actions"
                    style={{
                        left: boardContextMenu.clientX,
                        top: boardContextMenu.clientY,
                    }}
                    onKeyDown={handleBlockContextMenuKeyDown}
                >
                    <button
                        type="button"
                        className="context-menu__action"
                        onClick={() => {
                            pasteFromClipboard({
                                x: boardContextMenu.canvasX,
                                y: boardContextMenu.canvasY,
                            });
                            closeBoardContextMenu();
                        }}
                    >
                        Paste
                    </button>
                </div>
            ) : null}
            <MiniMap
                canvasSize={CANVAS_SIZE}
                minimapSize={MINIMAP_SIZE}
                viewport={viewport}
                placedBlocks={placedBlocks}
                onNavigate={navigateFromMinimap}
            />
            <SidePanel open={sidePanelOpen} onOpenChange={setSidePanelOpen}>
                <section className="theme-panel" aria-label="Theme selector">
                    <div className="theme-panel__header">
                        <h2 className="theme-panel__title">Theme</h2>
                        <p className="theme-panel__hint">
                            Pick a preset for the board, panels, and wiring.
                        </p>
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
                    onClearFlowchart={handleClearFlowchart}
                    snapToGrid={snapToGrid}
                    onSnapToGridChange={setSnapToGrid}
                    onResetLocalStorage={handleResetLocalStorage}
                    defaultExpandedPanel={initialPanel}
                    customFunctions={customFunctions}
                    onPackageSelectionAsCustomFunction={packageSelectionAsCustomFunction}
                    onDeleteCustomFunction={(id) =>
                        setCustomFunctions((prev) => prev.filter((item) => item.id !== id))
                    }
                    onCopyCustomFunctionShare={copyCustomFunctionShare}
                    onImportCustomFunctionShare={importCustomFunctionShare}
                    onToast={showToast}
                />
            </SidePanel>
            {toast ? (
                <div
                    className={`app-toast app-toast--${toast.kind}`}
                    role="status"
                    aria-live="polite"
                >
                    <span>{toast.message}</span>
                    <button
                        type="button"
                        className="app-toast__dismiss"
                        onClick={() => setToast(null)}
                        aria-label="Dismiss notification"
                    >
                        ×
                    </button>
                </div>
            ) : null}
            {showConsent && (
                <div className="cookie-modal-overlay">
                    <div className="cookie-modal">
                        <h2>Cookie Consent</h2>

                        <p>
                            This website only uses essential functional cookies required for the
                            site to work properly.
                        </p>

                        <div className="cookie-modal-actions">
                            <button onClick={handleAccept}>Fine</button>

                            <button onClick={handleReject}>Leave Site</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default App;
