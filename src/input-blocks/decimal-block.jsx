import { useId, useState } from 'react'
import { attachPaletteDragData } from './palette-drag'

function DecimalBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-decimal-title`
  const [value, setValue] = useState('')

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'decimal') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        Decimal
      </h3>
      <p className="input-block-hint">Whole numbers; often one value per byte (0–255).</p>
      <textarea
        className="input-block-field"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 72 101 108 108 111"
        rows={3}
        spellCheck={false}
        aria-label="Decimal input"
      />
    </section>
  )
}

export default DecimalBlock
