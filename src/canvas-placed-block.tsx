import { useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent as ReactPointerEvent } from 'react'
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
    selected: boolean
    onSelect: (id: string, additive: boolean) => void
    onOpenContextMenu: (id: string, clientX: number, clientY: number) => void
    onRegisterElement: (id: string, el: HTMLDivElement | null) => void
    evaluation: any
}

function CanvasPlacedBlock({
    block,
    onMove,
    onPatch,
    selected,
    onSelect,
    onOpenContextMenu,
    onRegisterElement,
    evaluation,
}: Readonly<Props>) {
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

    const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (event.button !== 0) {
            return
        }

        const interactive = event.target instanceof Element && event.target.closest(
            'input, textarea, select, button, [data-port-kind], [contenteditable="true"]',
        )
        if (interactive) {
            return
        }

        const additive = event.ctrlKey || event.metaKey
        if (additive) {
            onSelect(block.id, additive)
            event.stopPropagation()
            return
        }

        // If block already selected, preserve selection so dragging moves whole group
        if (!selected) {
            onSelect(block.id, additive)
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

    const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
        if (!isDragging || dragStateRef.current.pointerId !== event.pointerId) {
            return
        }

        const nextX = (window.scrollX + event.clientX - dragStateRef.current.offsetX) / zoom
        const nextY = (window.scrollY + event.clientY - dragStateRef.current.offsetY) / zoom
        onMove(block.id, nextX, nextY)
        event.stopPropagation()
    }

    const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        onOpenContextMenu(block.id, event.clientX, event.clientY)
    }

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSelect(block.id, event.ctrlKey || event.metaKey)
            return
        }

        if (event.key !== 'ContextMenu' && !(event.shiftKey && event.key === 'F10')) {
            return
        }

        event.preventDefault()
        const rect = event.currentTarget.getBoundingClientRect()
        onOpenContextMenu(block.id, rect.left + rect.width / 2, rect.top + 12)
    }

    const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
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
            ref={(el) => onRegisterElement(block.id, el)}
            className={`canvas-placed-block ${isDragging ? 'is-dragging' : ''} ${selected ? 'is-selected' : ''}`}
            style={{ left: block.x, top: block.y }}
            role="application"
            aria-label="Canvas block"
            tabIndex={0}
            onPointerDown={startDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            onContextMenu={openContextMenu}
            onKeyDown={handleKeyDown}
        >
            <Block {...sharedProps} />
        </div>
    )
}

export default CanvasPlacedBlock
