import { useId, useState } from 'react'
import { attachPaletteDragData } from './palette-drag'

function AsciiBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-ascii-title`
  const [value, setValue] = useState('')

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'ascii') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        ASCII
      </h3>
      <p className="input-block-hint">Printable text in the ASCII range.</p>
      <textarea
        className="input-block-field input-block-field--mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. Hello"
        rows={3}
        aria-label="ASCII text input"
      />
    </section>
  )
}

export default AsciiBlock
