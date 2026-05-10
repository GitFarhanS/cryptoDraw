import { useId, useState } from 'react';
import PortHandle from '../port-handle';
import { attachPaletteDragData } from '../input-blocks/palette-drag';

interface Props {
    draggableToCanvas?: boolean;
    block?: any;
    onBlockPatch?: (patch: any) => void;
}

function JoinLotsBlock({ draggableToCanvas = false, block, onBlockPatch }: Readonly<Props>) {
    const id = useId();
    const titleId = `${id}-join-title`;
    const isCanvas = Boolean(block);
    const [paletteState, setPaletteState] = useState({ joinCount: 2 });

    const joinCount = isCanvas ? (block.joinCount ?? 2) : paletteState.joinCount;

    const setJoinCount = (next: number) => {
        if (isCanvas) {
            onBlockPatch?.({ joinCount: next });
        } else {
            setPaletteState((s) => ({ ...s, joinCount: next }));
        }
    };

    const sectionClass = [
        'input-block',
        isCanvas ? 'input-block--canvas-ports' : '',
        draggableToCanvas ? 'input-block--palette-draggable' : '',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <section
            className={sectionClass}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={
                draggableToCanvas ? (e) => attachPaletteDragData(e, 'joinLots') : undefined
            }
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            <h3 className="input-block-title" id={titleId}>
                Join lots
            </h3>
            <p className="input-block-hint">Join multiple inputs into one stream.</p>
            <label className="converter-block-label" htmlFor={`${id}-count`}>
                Join count
            </label>
            <input
                id={`${id}-count`}
                className="input-block-field"
                type="number"
                min={1}
                value={joinCount}
                onChange={(e) => setJoinCount(Number(e.target.value))}
            />
            {isCanvas || draggableToCanvas ? (
                <div
                    className={`notch-ports-row notch-ports-row--top notch-ports-row--interactive ${
                        joinCount > 1 ? 'notch-ports-row--spread' : ''
                    }`.trim()}
                >
                    {Array.from({ length: joinCount }).map((_, i) => (
                        <PortHandle
                            key={i}
                            blockId={isCanvas ? block.id : ''}
                            portKey={`in:${i}`}
                            kind="input"
                            {...(isCanvas ? { interactive: true } : {})}
                        />
                    ))}
                </div>
            ) : null}
            {isCanvas || draggableToCanvas ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="out"
                        kind="output"
                        {...(isCanvas ? { interactive: true } : {})}
                    />
                </div>
            ) : null}
        </section>
    );
}

export default JoinLotsBlock;
