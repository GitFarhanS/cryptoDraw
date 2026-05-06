import { useId } from 'react'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

function OperationBlock({ title, hint, blockType, draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-op-title`

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, blockType) : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        {title}
      </h3>
      <p className="input-block-hint">{hint}</p>
    </section>
  )
}

export default OperationBlock
