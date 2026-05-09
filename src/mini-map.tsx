import { useRef, useState } from 'react';

interface Props {
    canvasSize: number;
    minimapSize: number;
    viewport: { left: number; top: number; width: number; height: number };
    placedBlocks?: Array<{ id: string; x: number; y: number }>;
    onNavigate: (left: number, top: number) => void;
}

function MiniMap({
    canvasSize,
    minimapSize,
    viewport,
    placedBlocks = [],
    onNavigate,
}: Readonly<Props>) {
    const [isPanning, setIsPanning] = useState(false);
    const mapRef = useRef<HTMLDivElement | null>(null);
    const activePointerIdRef = useRef<number | null>(null);

    const scale = minimapSize / canvasSize;
    const mapLeft = viewport.left * scale;
    const mapTop = viewport.top * scale;
    const mapWidth = Math.max(8, viewport.width * scale);
    const mapHeight = Math.max(8, viewport.height * scale);

    const viewportStyle = {
        left: `${mapLeft}px`,
        top: `${mapTop}px`,
        width: `${mapWidth}px`,
        height: `${mapHeight}px`,
    };

    // Calculate miniature block dimensions (approximate 288px block width in canvas to minimap)
    const blockWidth = 288 * scale;
    const blockHeight = 60 * scale; // approximate height

    const navigateToPointer = (event: any) => {
        const bounds = mapRef.current?.getBoundingClientRect();
        if (!bounds) {
            return;
        }

        const relativeX = event.clientX - bounds.left;
        const relativeY = event.clientY - bounds.top;
        const clampedX = Math.min(Math.max(0, relativeX), bounds.width);
        const clampedY = Math.min(Math.max(0, relativeY), bounds.height);
        const targetLeft = clampedX / scale - viewport.width / 2;
        const targetTop = clampedY / scale - viewport.height / 2;

        onNavigate(targetLeft, targetTop);
    };

    const startPan = (event: any) => {
        if (event.button !== 0) {
            return;
        }

        event.currentTarget.setPointerCapture(event.pointerId);
        activePointerIdRef.current = event.pointerId;
        setIsPanning(true);
        navigateToPointer(event);
    };

    const movePan = (event: any) => {
        if (!isPanning || activePointerIdRef.current !== event.pointerId) {
            return;
        }

        navigateToPointer(event);
    };

    const endPan = (event: any) => {
        if (activePointerIdRef.current !== event.pointerId) {
            return;
        }

        event.currentTarget.releasePointerCapture(event.pointerId);
        activePointerIdRef.current = null;
        setIsPanning(false);
    };

    return (
        <div
            ref={mapRef}
            className={`minimap ${isPanning ? 'is-panning' : ''}`}
            aria-label="Viewport minimap"
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={endPan}
            onPointerCancel={endPan}
        >
            <div className="minimap-grid" />
            {placedBlocks.map((block) => (
                <div
                    key={block.id}
                    className="minimap-block"
                    style={{
                        left: `${block.x * scale}px`,
                        top: `${block.y * scale}px`,
                        width: `${blockWidth}px`,
                        height: `${blockHeight}px`,
                    }}
                />
            ))}
            <div className="minimap-viewport" style={viewportStyle} />
        </div>
    );
}

export default MiniMap;
