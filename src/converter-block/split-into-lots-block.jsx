import { useId, useState } from 'react'
import PortHandle from '../port-handle'
import { outputPortKeysForBlock } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'

function SplitIntoLotsBlock({
  draggableToCanvas = false,
  block,
  onBlockPatch,
}) {
  const id = useId()
  const titleId = `${id}-split-title`
  const isCanvas = Boolean(block)

  const [paletteCount, setPaletteCount] = useState('4')
  const blockCountRaw = isCanvas ? String(block.blockCount ?? 4) : paletteCount

  const setBlockCountRaw = (raw) => {
    if (isCanvas) {
      const n = Number.parseInt(raw, 10)
      if (Number.isFinite(n) && n >= 1) {
        onBlockPatch?.({ blockCount: Math.min(24, Math.floor(n)) })
      }
    } else {
      setPaletteCount(raw)
    }
  }

  const blockCount = Number.parseInt(blockCountRaw, 10)
  const countInvalid = !Number.isFinite(blockCount) || blockCount < 1
  const outputNotchCount = countInvalid ? 1 : Math.min(blockCount, 24)

  const params = {
    blockCount: isCanvas ? (block.blockCount ?? 4) : blockCount,
  }

  const sectionClass = [
    'input-block',
    'input-block--split-notched',
    draggableToCanvas ? 'input-block--palette-draggable' : '',
    isCanvas ? 'input-block--canvas-split' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const outKeys = isCanvas
    ? outputPortKeysForBlock('splitIntoLots', params)
    : []

  return (
    <section
      className={sectionClass}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'splitIntoLots') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      <div
        className={`notch-ports-row notch-ports-row--top ${isCanvas ? 'notch-ports-row--interactive' : ''}`}
        aria-hidden
      >
        {isCanvas ? (
          <PortHandle blockId={block.id} portKey="in" kind="input" interactive />
        ) : (
          <span className="notch-port notch-port--top" />
        )}
      </div>
      <h3 className="input-block-title" id={titleId}>
        Split into lots
      </h3>
      <p className="input-block-hint">
        Set how many output lots this split should produce.
      </p>
      <label className="converter-block-label" htmlFor={`${id}-block-count`}>
        Number of blocks
      </label>
      <input
        id={`${id}-block-count`}
        type="number"
        min={1}
        max={24}
        className="input-block-field"
        value={blockCountRaw}
        onChange={(e) => setBlockCountRaw(e.target.value)}
        aria-label="Number of output blocks"
      />
      {countInvalid ? (
        <p className="input-block-hint">Use a positive integer for number of blocks.</p>
      ) : null}
      <div
        className={`notch-ports-row notch-ports-row--bottom ${isCanvas ? 'notch-ports-row--interactive' : ''}`}
        aria-hidden
      >
        {isCanvas
          ? outKeys.map((pk) => (
              <PortHandle key={pk} blockId={block.id} portKey={pk} kind="output" interactive />
            ))
          : Array.from({ length: outputNotchCount }, (_, index) => (
              <span key={index} className="notch-port notch-port--bottom" />
            ))}
      </div>
    </section>
  )
}

export default SplitIntoLotsBlock
