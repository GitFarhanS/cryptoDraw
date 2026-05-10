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

function SubBytesBlock({ draggableToCanvas = false, block, evaluation }: Readonly<Props>) {
    const id = useId();
    const titleId = `${id}-subbytes-title`;
    const isCanvas = Boolean(block);

    const inKey = isCanvas ? portRegistryKey(block.id, 'in') : '';
    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : '';
    const inBytes = isCanvas ? evaluation?.portBytes?.get(inKey) : undefined;
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined;
    const hasWiredInput = inBytes !== undefined;
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
                draggableToCanvas ? (event) => attachPaletteDragData(event, 'subBytes') : undefined
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
                SubBytes
            </h3>
            <p className="input-block-hint">
                Applies AES S-box substitution to each byte of the wired input.
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
                        aria-label="SubBytes result"
                    />
                    {hasWiredInput ? null : (
                        <p className="input-block-hint">
                            No wired input yet. Connect a source block to in.
                        </p>
                    )}
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

export default SubBytesBlock;
