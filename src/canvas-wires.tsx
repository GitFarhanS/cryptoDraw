import { useLayoutEffect, useState } from 'react';
import { bezierPathD } from './graph/bezier-path';
import { portRegistryKey } from './graph/edge-types';
import type { WireDragState } from './graph/canvas-graph-context';
import type { GraphEdge } from './graph/edge-types';

interface Props {
    edges: GraphEdge[];
    anchorsRef: React.RefObject<Map<string, HTMLElement>>;
    canvasRef: React.RefObject<HTMLElement | null>;
    rubberBand: Pick<WireDragState, 'fromBlockId' | 'fromPortKey' | 'clientX' | 'clientY'> | null;
    layoutEpoch: number;
    zoom: number;
    selectedEdgeId: string | null;
    onSelectEdge: (edgeId: string, additive: boolean) => void;
    onOpenEdgeContextMenu: (edgeId: string, clientX: number, clientY: number) => void;
}

function CanvasWires({
    edges,
    anchorsRef,
    canvasRef,
    rubberBand,
    layoutEpoch,
    zoom,
    selectedEdgeId,
    onSelectEdge,
    onOpenEdgeContextMenu,
}: Readonly<Props>) {
    const [geometry, setGeometry] = useState<{
        paths: { edge: GraphEdge; d: string }[];
        rubberPath: string | null;
    }>({
        paths: [],
        rubberPath: null,
    });

    useLayoutEffect(() => {
        const canvasEl = canvasRef.current;
        if (!canvasEl) {
            setGeometry({ paths: [], rubberPath: null });
            return;
        }

        const canvasRect = canvasEl.getBoundingClientRect();
        const z = zoom || 1;

        function anchorPoint(registryKey: string) {
            const el = anchorsRef.current?.get(registryKey);
            if (!el) {
                return null;
            }
            const r = el.getBoundingClientRect();
            return {
                x: (r.left + r.width / 2 - canvasRect.left) / z,
                y: (r.top + r.height / 2 - canvasRect.top) / z,
            };
        }

        const paths: { edge: GraphEdge; d: string }[] = [];
        for (const edge of edges) {
            const fromKey = portRegistryKey(edge.from.blockId, edge.from.portKey);
            const toKey = portRegistryKey(edge.to.blockId, edge.to.portKey);
            const p1 = anchorPoint(fromKey);
            const p2 = anchorPoint(toKey);
            if (!p1 || !p2) {
                continue;
            }
            paths.push({ edge, d: bezierPathD(p1, p2) });
        }

        let rubberPath: string | null = null;
        if (rubberBand) {
            const fromKey = portRegistryKey(rubberBand.fromBlockId, rubberBand.fromPortKey);
            const p1 = anchorPoint(fromKey);
            if (p1) {
                const p2 = {
                    x: (rubberBand.clientX - canvasRect.left) / z,
                    y: (rubberBand.clientY - canvasRect.top) / z,
                };
                rubberPath = bezierPathD(p1, p2);
            }
        }

        setGeometry({ paths, rubberPath });
    }, [edges, anchorsRef, canvasRef, rubberBand, layoutEpoch, zoom]);

    return (
        <svg className="canvas-wires" aria-hidden>
            {geometry.paths.map(({ edge, d }) => (
                <path
                    key={edge.id}
                    className={`canvas-wires__edge ${selectedEdgeId === edge.id ? 'is-selected' : ''}`}
                    d={d}
                    fill="none"
                    data-edge-id={edge.id}
                    onPointerDown={(event) => {
                        if (event.button !== 0) {
                            return;
                        }
                        onSelectEdge(edge.id, event.ctrlKey || event.metaKey);
                        event.stopPropagation();
                    }}
                    onContextMenu={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        onOpenEdgeContextMenu(edge.id, event.clientX, event.clientY);
                    }}
                />
            ))}
            {geometry.rubberPath ? (
                <path className="canvas-wires__rubber" d={geometry.rubberPath} fill="none" />
            ) : null}
        </svg>
    );
}

export default CanvasWires;
