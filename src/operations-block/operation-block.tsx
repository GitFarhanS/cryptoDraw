import { attachPaletteDragData } from '../input-blocks/palette-drag';
import { portRegistryKey } from '../graph/edge-types';
import { BYTE_FORMATS, serializeBytesToFormat } from '../converter-block/format-bytes';
import PortHandle from '../port-handle';
import { useId } from 'react';

interface Props {
    blockType: string;
    title: string;
    hint?: string;
    draggableToCanvas?: boolean;
    block?: any;
    onBlockPatch?: (patch: any) => void;
    evaluation?: any;
}

function OperationBlock({
    blockType,
    title,
    hint,
    draggableToCanvas = false,
    block,
    onBlockPatch,
    evaluation,
}: Readonly<Props>) {
    const id = useId();
    const titleId = `${id}-op-title`;
    const isCanvas = Boolean(block);

    const outKey = isCanvas ? portRegistryKey(block.id, 'out') : '';
    const inAKey = isCanvas ? portRegistryKey(block.id, 'in:a') : '';
    const inBKey = isCanvas ? portRegistryKey(block.id, 'in:b') : '';
    const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined;
    const outBits = isCanvas ? evaluation?.portBitLengths?.get(outKey) : undefined;
    const inFmtA = isCanvas ? evaluation?.portFormats?.get(inAKey) : undefined;
    const inFmtB = isCanvas ? evaluation?.portFormats?.get(inBKey) : undefined;
    const displayMode = isCanvas ? (block.opDisplayMode ?? 'auto') : 'auto';
    const manualFormat = isCanvas ? (block.opDisplayFormat ?? 'hex') : 'hex';
    const shiftMode = isCanvas ? (block.opShiftMode ?? 'logical') : 'logical';
    const supportsShiftMode = blockType === 'opLeftShift' || blockType === 'opRightShift';
    const supportsBigIntPad =
        blockType === 'opAddBig' ||
        blockType === 'opMulBig' ||
        blockType === 'opModBig' ||
        blockType === 'opPowBig';
    let autoFormat = inFmtA ?? inFmtB ?? 'hex';
    if (inFmtA && inFmtB && inFmtA !== inFmtB) {
        autoFormat = 'hex';
    }
    const effectiveFormat = displayMode === 'manual' ? manualFormat : autoFormat;
    const interactivePortProps = isCanvas ? { interactive: true } : undefined;

    let resultText = '';
    if (outBytes !== undefined) {
        if (effectiveFormat === 'binary') {
            const bits = serializeBytesToFormat('binary', outBytes);
            resultText = bits.slice(0, outBits ?? bits.length);
        } else {
            resultText = serializeBytesToFormat(effectiveFormat, outBytes);
        }
    }

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
                draggableToCanvas ? (event) => attachPaletteDragData(event, blockType) : undefined
            }
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {isCanvas || draggableToCanvas ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive notch-ports-row--spread">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="in:a"
                        kind="input"
                        {...interactivePortProps}
                    />
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="in:b"
                        kind="input"
                        {...interactivePortProps}
                    />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                {title}
            </h3>
            <p className="input-block-hint">{hint}</p>
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-result`}>
                        Result ({effectiveFormat})
                    </label>
                    <div className="converter-block-row">
                        {supportsBigIntPad ? (
                            <div>
                                <label
                                    className="converter-block-label"
                                    htmlFor={`${id}-big-pad`}
                                >
                                    Pad output (bytes)
                                </label>
                                <input
                                    id={`${id}-big-pad`}
                                    type="number"
                                    min={0}
                                    max={64}
                                    className="input-block-field"
                                    value={block.opBigPadBytes ?? 0}
                                    onChange={(e) => {
                                        const v = Number.parseInt(e.target.value, 10);
                                        onBlockPatch?.({
                                            opBigPadBytes: Number.isFinite(v)
                                                ? Math.min(64, Math.max(0, v))
                                                : 0,
                                        });
                                    }}
                                    aria-label="Big-int output padding in bytes (0 = minimal width)"
                                />
                                <p className="input-block-hint">
                                    0 = minimal big-endian width; otherwise zero-pad to this many bytes
                                    (hex/decimal/ascii only).
                                </p>
                            </div>
                        ) : null}
                        {supportsShiftMode ? (
                            <div>
                                <label
                                    className="converter-block-label"
                                    htmlFor={`${id}-shift-mode`}
                                >
                                    Shift mode
                                </label>
                                <select
                                    id={`${id}-shift-mode`}
                                    className="input-block-field"
                                    value={shiftMode}
                                    onChange={(e) =>
                                        onBlockPatch?.({ opShiftMode: e.target.value })
                                    }
                                    aria-label="Shift mode"
                                >
                                    <option value="logical">Logical</option>
                                    <option value="circular">Circular</option>
                                </select>
                            </div>
                        ) : null}
                        <div>
                            <label className="converter-block-label" htmlFor={`${id}-mode`}>
                                Display mode
                            </label>
                            <select
                                id={`${id}-mode`}
                                className="input-block-field"
                                value={displayMode}
                                onChange={(e) => onBlockPatch?.({ opDisplayMode: e.target.value })}
                                aria-label="Operation display mode"
                            >
                                <option value="auto">Auto</option>
                                <option value="manual">Manual</option>
                            </select>
                        </div>
                        <div>
                            <label className="converter-block-label" htmlFor={`${id}-format`}>
                                Display format
                            </label>
                            <select
                                id={`${id}-format`}
                                className="input-block-field"
                                value={manualFormat}
                                disabled={displayMode !== 'manual'}
                                onChange={(e) =>
                                    onBlockPatch?.({ opDisplayFormat: e.target.value })
                                }
                                aria-label="Operation display format"
                            >
                                {BYTE_FORMATS.map((fmt) => (
                                    <option key={fmt} value={fmt}>
                                        {fmt}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <textarea
                        id={`${id}-result`}
                        className="input-block-field input-block-field--mono"
                        value={resultText}
                        readOnly
                        rows={2}
                        spellCheck={false}
                        aria-label="Operation result"
                    />
                </>
            ) : null}
            {isCanvas || draggableToCanvas ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle
                        blockId={isCanvas ? block.id : ''}
                        portKey="out"
                        kind="output"
                        {...interactivePortProps}
                    />
                </div>
            ) : null}
        </section>
    );
}

export default OperationBlock;
