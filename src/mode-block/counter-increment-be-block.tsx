import { useId } from 'react';
import { serializeBytesToFormat } from '../converter-block/format-bytes';
import { portRegistryKey } from '../graph/edge-types';
import { attachPaletteDragData } from '../input-blocks/palette-drag';
import PortHandle from '../port-handle';

interface Props {
    draggableToCanvas?: boolean;
    block?: any;
    onBlockPatch?: (patch: object) => void;
    evaluation?: any;
}

function CounterIncrementBeBlock({
    draggableToCanvas = false,
    block,
    onBlockPatch,
    evaluation,
}: Readonly<Props>) {
    const id = useId();
    const titleId = `${id}-ctr-title`;
    const isCanvas = Boolean(block);

    const inKey = isCanvas ? portRegistryKey(block.id, 'in') : '';
    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : '';
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined;
    const resultText = outBytes ? serializeBytesToFormat('hex', outBytes) : '';
    const width = isCanvas ? Math.min(16, Math.max(1, Number(block.counterIncWidth) || 4)) : 4;

    const sectionClass = [
        'input-block',
        isCanvas ? 'input-block--canvas-op' : '',
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
                draggableToCanvas
                    ? (event) => attachPaletteDragData(event, 'counterIncrementBe')
                    : undefined
            }
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {isCanvas || draggableToCanvas ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="in"
                        kind="input"
                        {...(isCanvas ? { interactive: true } : {})}
                    />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                Counter +1 (BE)
            </h3>
            <p className="input-block-hint">
                Copies the wired buffer and increments the unsigned big-endian integer in the last
                N bytes (N configurable, 1–16). Other bytes unchanged.
            </p>
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-w`}>
                        Counter width (bytes)
                    </label>
                    <input
                        id={`${id}-w`}
                        type="number"
                        min={1}
                        max={16}
                        className="input-block-field"
                        value={width}
                        onChange={(e) => {
                            const v = Number.parseInt(e.target.value, 10);
                            onBlockPatch?.({
                                counterIncWidth: Number.isFinite(v)
                                    ? Math.min(16, Math.max(1, v))
                                    : 4,
                            });
                        }}
                        aria-label="Counter field width in bytes"
                    />
                    <label className="converter-block-label" htmlFor={`${id}-result`}>
                        Result (hex)
                    </label>
                    <textarea
                        id={`${id}-result`}
                        className="input-block-field input-block-field--mono"
                        value={resultText}
                        readOnly
                        rows={3}
                        spellCheck={false}
                        aria-label="Incremented buffer"
                    />
                </>
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

export default CounterIncrementBeBlock;
