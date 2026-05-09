import { useRef, useState } from 'react'
import { useCanvasGraph } from './graph/canvas-graph-context'
import FormatConvertBlock from './converter-block/format-convert-block'
import JoinLotsBlock from './converter-block/join-lots-block'
import SplitIntoLotsBlock from './converter-block/split-into-lots-block'
import AsciiBlock from './input-blocks/ascii-block'
import BinaryBlock from './input-blocks/binary-block'
import DecimalBlock from './input-blocks/decimal-block'
import HexBlock from './input-blocks/hex-block'
import OperationBlock from './operations-block/operation-block'
import { OPERATION_DEFINITIONS } from './operations-block/operation-definitions'
import OutputBlock from './output-block/output-block'

const OPERATION_BLOCKS_BY_TYPE = Object.fromEntries(
    OPERATION_DEFINITIONS.map(({ blockType, title, hint }) => [
        blockType,
        function WrappedOperation(props: any) {
            return <OperationBlock blockType={blockType} title={title} hint={hint} {...props} />
        },
    ]),
)

const BLOCK_BY_TYPE: Record<string, any> = {
    binary: BinaryBlock,
    hex: HexBlock,
    decimal: DecimalBlock,
    ascii: AsciiBlock,
    splitIntoLots: SplitIntoLotsBlock,
    joinLots: JoinLotsBlock,
    formatConvert: FormatConvertBlock,
    output: OutputBlock,
    ...OPERATION_BLOCKS_BY_TYPE,
}

interface Props {
    block: any
    onMove: (id: string, x: number, y: number) => void
    onPatch: (id: string, patch: object) => void
    evaluation: any
}

function CanvasPlacedBlock({ block, onMove, onPatch, evaluation }: Readonly<Props>) {
    const graph = useCanvasGraph()
    const zoom = graph?.zoom ?? 1
    const Block = BLOCK_BY_TYPE[block.type]
    const [isDragging, setIsDragging] = useState(false)
    const dragStateRef = useRef({
        pointerId: null as number | null,
        offsetX: 0,
        offsetY: 0,
    })

    if (!Block) {
        return null
    }

    const startDrag = (event: any) => {
        if (event.button !== 0) {
            return
        }

        const blockRect = event.currentTarget.getBoundingClientRect()
        dragStateRef.current = {
            pointerId: event.pointerId,
            offsetX: event.clientX - blockRect.left,
            offsetY: event.clientY - blockRect.top,
        }
        event.currentTarget.setPointerCapture(event.pointerId)
        event.stopPropagation()
        setIsDragging(true)
    }

    const moveDrag = (event: any) => {
        if (!isDragging || dragStateRef.current.pointerId !== event.pointerId) {
            return
        }

        const nextX = (window.scrollX + event.clientX - dragStateRef.current.offsetX) / zoom
        const nextY = (window.scrollY + event.clientY - dragStateRef.current.offsetY) / zoom
        onMove(block.id, nextX, nextY)
        event.stopPropagation()
    }

    const endDrag = (event: any) => {
        if (dragStateRef.current.pointerId !== event.pointerId) {
            return
        }

        event.currentTarget.releasePointerCapture(event.pointerId)
        dragStateRef.current.pointerId = null
        setIsDragging(false)
        event.stopPropagation()
    }

    const sharedProps = {
        draggableToCanvas: false,
        block,
        onBlockPatch: (patch: any) => onPatch(block.id, patch),
        evaluation,
    }

    return (
        <div
            className={`canvas-placed-block ${isDragging ? 'is-dragging' : ''}`}
            style={{ left: block.x, top: block.y }}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
        >
            <Block {...sharedProps} />
        </div>
    )
}

export default CanvasPlacedBlock
