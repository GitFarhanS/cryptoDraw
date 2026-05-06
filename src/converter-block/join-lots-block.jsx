import { useId, useState } from 'react'
import PortHandle from '../port-handle'
import { inputPortKeysForBlock } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

function JoinLotsBlock({
  draggableToCanvas = false,
  block,
  onBlockPatch,
}) {
  const id = useId()
  const titleId = `${id}-join-title`
  const isCanvas = Boolean(block)

  const [paletteCount, setPaletteCount] = useState('2')
  const joinCountRaw = isCanvas ? String(block.joinCount ?? 2) : paletteCount

  const setJoinCountRaw = (raw) => {
    if (isCanvas) {
      const n = Number.parseInt(raw, 10)
      if (Number.isFinite(n) && n >= 1) {
        onBlockPatch?.({ joinCount: Math.min(24, Math.floor(n)) })
      }
    } else {
      setPaletteCount(raw)
    }
  }

  const joinCount = Number.parseInt(joinCountRaw, 10)
  const countInvalid = !Number.isFinite(joinCount) || joinCount < 1

  const params = {
    joinCount: isCanvas ? (block.joinCount ?? 2) : joinCount,
  }

  const sectionClass = [
    'input-block',
    isCanvas ? 'input-block--canvas-join' : '',
    draggableToCanvas ? 'input-block--palette-draggable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const inKeys = isCanvas ? inputPortKeysForBlock('joinLots', params) : []

  return (
    <section
      className={sectionClass}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'joinLots') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
          {inKeys.map((pk) => (
            <PortHandle key={pk} blockId={block.id} portKey={pk} kind="input" interactive />
          ))}
        </div>
      ) : null}
      <h3 className="input-block-title" id={titleId}>
        Join lots
      </h3>
      <p className="input-block-hint">
        Concatenate multiple upstream byte streams in port order (left to right).
      </p>
      <label className="converter-block-label" htmlFor={`${id}-block-count`}>
        Number of blocks in
      </label>
      <input
        id={`${id}-block-count`}
        type="number"
        min={1}
        max={24}
        className="input-block-field"
        value={joinCountRaw}
        onChange={(e) => setJoinCountRaw(e.target.value)}
        aria-label="How many blocks this join takes in"
      />
      {countInvalid ? (
        <p className="input-block-hint">Use a positive integer for the number of blocks.</p>
      ) : null}
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
          <PortHandle blockId={block.id} portKey="out" kind="output" interactive />
        </div>
      ) : null}
    </section>
  )
}

export default JoinLotsBlock
