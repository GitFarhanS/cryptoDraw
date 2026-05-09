import { useId, useState } from 'react'
import PortHandle from '../port-handle'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

interface Props {
    draggableToCanvas?: boolean
    block?: any
    onBlockPatch?: (patch: any) => void
}

function SplitIntoLotsBlock({ draggableToCanvas = false, block, onBlockPatch }: Props) {
    const id = useId()
    const titleId = `${id}-split-title`
    const isCanvas = Boolean(block)
    const [paletteState, setPaletteState] = useState({ blockCount: 2 })

    const blockCount = isCanvas ? (block.blockCount ?? 2) : paletteState.blockCount

    const setBlockCount = (next: number) => {
        if (isCanvas) {
            onBlockPatch?.({ blockCount: next })
        } else {
            setPaletteState((s) => ({ ...s, blockCount: next }))
        }
    }

    const sectionClass = [
        'input-block',
        isCanvas ? 'input-block--canvas-ports' : '',
        draggableToCanvas ? 'input-block--palette-draggable' : '',
    ]
        .filter(Boolean)
        .join(' ')

    return (
        <section
            className={sectionClass}
            aria-labelledby={titleId}
            draggable={draggableToCanvas}
            onDragStart={draggableToCanvas ? (e) => attachPaletteDragData(e, 'splitIntoLots') : undefined}
            title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
        >
            <h3 className="input-block-title" id={titleId}>
                Split into lots
            </h3>
            <p className="input-block-hint">Split a stream into multiple outputs.</p>
            <label className="converter-block-label" htmlFor={`${id}-count`}>
                Block count
            </label>
            <input
                id={`${id}-count`}
                className="input-block-field"
                type="number"
                min={1}
                value={blockCount}
                onChange={(e) => setBlockCount(Number(e.target.value))}
            />
            {isCanvas ? (
                <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
                    <PortHandle blockId={block.id} portKey="out" kind="output" interactive />
                </div>
            ) : null}
        </section>
    )
}

export default SplitIntoLotsBlock
