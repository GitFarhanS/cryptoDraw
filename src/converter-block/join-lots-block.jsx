import { useId, useState } from 'react'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

function JoinLotsBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-join-title`
  const [blockCountRaw, setBlockCountRaw] = useState('2')

  const blockCount = Number.parseInt(blockCountRaw, 10)
  const countInvalid = !Number.isFinite(blockCount) || blockCount < 1

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'joinLots') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        Join lots
      </h3>
      <p className="input-block-hint">
        How many upstream blocks this join expects. Wiring for inputs and output comes later.
      </p>
      <label className="converter-block-label" htmlFor={`${id}-block-count`}>
        Number of blocks in
      </label>
      <input
        id={`${id}-block-count`}
        type="number"
        min={1}
        className="input-block-field"
        value={blockCountRaw}
        onChange={(e) => setBlockCountRaw(e.target.value)}
        aria-label="How many blocks this join takes in"
      />
      {countInvalid ? (
        <p className="input-block-hint">Use a positive integer for the number of blocks.</p>
      ) : null}
    </section>
  )
}

export default JoinLotsBlock
