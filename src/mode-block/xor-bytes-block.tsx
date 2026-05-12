import { useId } from 'react';
import { serializeBytesToFormat } from '../converter-block/format-bytes';
import { portRegistryKey } from '../graph/edge-types';
import { attachPaletteDragData } from '../input-blocks/palette-drag';
import PortHandle from '../port-handle';

interface Props {
    draggableToCanvas?: boolean;
    block?: any;
    evaluation?: any;
}

function XorBytesBlock({ draggableToCanvas = false, block, evaluation }: Readonly<Props>) {
    const id = useId();
    const titleId = `${id}-xorbytes-title`;
    const isCanvas = Boolean(block);

    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : '';
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined;
    const resultText = outBytes ? serializeBytesToFormat('hex', outBytes) : '';

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
                draggableToCanvas ? (event) => attachPaletteDragData(event, 'xorBytes') : undefined
            }
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {isCanvas || draggableToCanvas ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive notch-ports-row--spread">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="in:a"
                        kind="input"
                        {...(isCanvas ? { interactive: true } : {})}
                    />
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="in:b"
                        kind="input"
                        {...(isCanvas ? { interactive: true } : {})}
                    />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                XOR bytes
            </h3>
            <p className="input-block-hint">
                Pairwise XOR of two equal-length byte strings (for CBC/MAC-style demos).
            </p>
            {isCanvas ? (
                <>
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
                        aria-label="XOR result"
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

export default XorBytesBlock;
