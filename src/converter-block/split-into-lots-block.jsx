import { useId, useState } from 'react'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

function SplitIntoLotsBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-split-title`
  const [blockSizeRaw, setBlockSizeRaw] = useState('4')

  const blockSize = Number.parseInt(blockSizeRaw, 10)
  const sizeInvalid = !Number.isFinite(blockSize) || blockSize < 1

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'splitIntoLots') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <h3 className="input-block-title" id={titleId}>
        Split into lots
      </h3>
      <p className="input-block-hint">
        Configure chunk size for each lot. Input and output ports will connect here later.
      </p>
      <label className="converter-block-label" htmlFor={`${id}-block-size`}>
        Block size (characters per lot)
      </label>
      <input
        id={`${id}-block-size`}
        type="number"
        min={1}
        className="input-block-field"
        value={blockSizeRaw}
        onChange={(e) => setBlockSizeRaw(e.target.value)}
        aria-label="Block size — characters per lot"
      />
      {sizeInvalid ? (
        <p className="input-block-hint">Use a positive integer for block size.</p>
      ) : null}
    </section>
  )
}

export default SplitIntoLotsBlock
