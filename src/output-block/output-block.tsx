import { useId } from 'react'
import { portRegistryKey } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'
import { serializeBytesToFormat } from '../converter-block/format-bytes'
import PortHandle from '../port-handle'

interface Props {
    draggableToCanvas?: boolean
    block?: any
    evaluation?: any
}

function OutputBlock({ draggableToCanvas = false, block, evaluation }: Readonly<Props>) {
    const id = useId()
    const titleId = `${id}-output-title`
    const isCanvas = Boolean(block)

    const inKey = isCanvas ? portRegistryKey(block.id, 'in') : ''
    const inBytes = isCanvas ? evaluation?.portBytes?.get(inKey) : undefined
    const inFormat = isCanvas ? evaluation?.portFormats?.get(inKey) ?? 'hex' : 'hex'
    const inBitLength = isCanvas ? evaluation?.portBitLengths?.get(inKey) : undefined
    const hasWiredInput = inBytes !== undefined
    let displayValue = ''
    if (hasWiredInput) {
        if (inFormat === 'binary') {
            const full = serializeBytesToFormat('binary', inBytes)
            displayValue = full.slice(0, inBitLength ?? full.length)
        } else {
            displayValue = serializeBytesToFormat(inFormat, inBytes)
        }
    }

    const sectionClass = [
        'input-block',
        isCanvas ? 'input-block--canvas-output' : '',
        draggableToCanvas ? 'input-block--palette-draggable' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <section
            className={sectionClass}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={draggableToCanvas ? (event) => attachPaletteDragData(event, 'output') : undefined}
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            {isCanvas ? (
                <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
                    <PortHandle blockId={block.id} portKey="in" kind="input" interactive />
                </div>
            ) : null}
            <h3 className="input-block-title" id={titleId}>
                Output
            </h3>
            <p className="input-block-hint">Destination block for displaying final results.</p>
            {isCanvas ? (
                <>
                    <label className="converter-block-label" htmlFor={`${id}-view`}>
                        Wired value ({inFormat})
                    </label>
                    <textarea
                        id={`${id}-view`}
                        className="input-block-field input-block-field--mono"
                        value={displayValue}
                        readOnly
                        rows={4}
                        spellCheck={false}
                        aria-label="Output from wiring"
                    />
                    {hasWiredInput ? null : (
                        <p className="input-block-hint">No wired input yet. Connect a source block to in.</p>
                    )}
                </>
            ) : null}
        </section>
    )
}

export default OutputBlock
