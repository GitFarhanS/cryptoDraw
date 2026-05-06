import { useId } from 'react'
import PortHandle from '../port-handle'
import { portRegistryKey } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'
import { serializeBytesToFormat } from '../converter-block/format-bytes'

function OutputBlock({
  draggableToCanvas = false,
  block,
  evaluation,
}) {
  const id = useId()
  const titleId = `${id}-output-title`
  const isCanvas = Boolean(block)

  const inKey = isCanvas ? portRegistryKey(block.id, 'in') : ''
  const inBytes = isCanvas ? evaluation?.portBytes?.get(inKey) : undefined
  const displayHex =
    inBytes !== undefined ? serializeBytesToFormat('hex', inBytes) : ''

  const sectionClass = [
    'input-block',
    isCanvas ? 'input-block--canvas-output' : '',
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
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'output') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
          <PortHandle blockId={block.id} portKey="in" kind="input" interactive />
        </div>
      ) : null}
      <h3 className="input-block-title" id={titleId}>
        Output
      </h3>
      <p className="input-block-hint">Destination block for displaying final results.</p>
      {isCanvas ? (
        <>
          <label className="converter-block-label" htmlFor={`${id}-view`}>
            Wired value (hex)
          </label>
          <textarea
            id={`${id}-view`}
            className="input-block-field input-block-field--mono"
            value={displayHex}
            readOnly
            rows={4}
            spellCheck={false}
            aria-label="Output from wiring"
          />
        </>
      ) : null}
    </section>
  )
}

export default OutputBlock
