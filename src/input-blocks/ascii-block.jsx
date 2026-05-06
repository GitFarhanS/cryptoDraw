import { useId, useState } from 'react'
import PortHandle from '../port-handle'
import { attachPaletteDragData } from './palette-drag'

function AsciiBlock({ draggableToCanvas = false, block, onBlockPatch }) {
  const id = useId()
  const titleId = `${id}-ascii-title`
  const isCanvas = Boolean(block)
  const [paletteValue, setPaletteValue] = useState('')
  const value = isCanvas ? (block.text ?? '') : paletteValue

  const setValue = (next) => {
    if (isCanvas) {
      onBlockPatch?.({ text: next })
    } else {
      setPaletteValue(next)
    }
  }

  const sectionClass = [
    'input-block',
    isCanvas ? 'input-block--canvas-ports' : 'input-block--with-bottom-notch',
    draggableToCanvas ? 'input-block--palette-draggable' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <section
      className={sectionClass}
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
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
          <PortHandle blockId={block.id} portKey="out" kind="output" interactive />
        </div>
      ) : null}
    </section>
  )
}

export default AsciiBlock
