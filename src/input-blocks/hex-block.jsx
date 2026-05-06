import { useId, useState } from 'react'
import { attachPaletteDragData } from './palette-drag'

function HexBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-hex-title`
  const [value, setValue] = useState('')

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={draggableToCanvas ? (event) => attachPaletteDragData(event, 'hex') : undefined}
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        Hex
      </h3>
      <p className="input-block-hint">0–9 and A–F; pairs often written as byte values.</p>
      <textarea
        className="input-block-field input-block-field--mono"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="e.g. 48656c6c6f"
        rows={3}
        spellCheck={false}
        aria-label="Hexadecimal input"
      />
    </section>
  )
}

export default HexBlock
