import { useId, useState } from 'react'
import { attachPaletteDragData } from './palette-drag'

function BinaryBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-binary-title`
  const [value, setValue] = useState('')

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'binary') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        Binary
      </h3>
      <p className="input-block-hint">Digits 0–1; spaces optional between groups.</p>
      <textarea
        className="input-block-field input-block-field--mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 01001000"
        rows={3}
        spellCheck={false}
        aria-label="Binary input"
      />
    </section>
  )
}

export default BinaryBlock
