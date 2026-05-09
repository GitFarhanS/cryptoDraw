import { useId, useState } from 'react'
import PortHandle from '../port-handle'
import { attachPaletteDragData } from './palette-drag'

interface Props {
    draggableToCanvas?: boolean
    block?: any
    onBlockPatch?: (patch: any) => void
}

function HexBlock({ draggableToCanvas = false, block, onBlockPatch }: Readonly<Props>) {
    const id = useId()
    const titleId = `${id}-hex-title`
    const isCanvas = Boolean(block)
    const [paletteValue, setPaletteValue] = useState('')
    const value = isCanvas ? (block.text ?? '') : paletteValue

    const setValue = (next: string) => {
        if (isCanvas) {
            onBlockPatch?.({ text: next })
        } else {
            setPaletteValue(next)
        }
    }

    const sectionClass = [
        'input-block',
        isCanvas ? 'input-block--canvas-ports' : 'input-block--with-bottom-notch',
        draggableToCanvas ? 'input-block--palette-draggable' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <section
            className={sectionClass}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={
                draggableToCanvas ? (event) => attachPaletteDragData(event, 'hex') : undefined
            }
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            <h3 className="input-block-title" id={titleId}>
                Hex
            </h3>
            <p className="input-block-hint">Hex encoded bytes (pairs of hex digits).</p>
            <textarea
                className="input-block-field input-block-field--mono"
                value={value}
                onChange={(e) => {
                    const filtered = e.target.value.replaceAll(/[^0-9a-fA-F\s]/g, "");
                    setValue(filtered);
                }}
                placeholder="e.g. 48656c6c6f"
                rows={3}
                aria-label="Hex text input"
            />
            {isCanvas ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle blockId={block.id} portKey="out" kind="output" interactive />
                </div>
            ) : null}
        </section>
    )
}

export default HexBlock
