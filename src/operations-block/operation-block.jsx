import { useId } from 'react'
import PortHandle from '../port-handle'
import { portRegistryKey } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'
import { serializeBytesToFormat } from '../converter-block/format-bytes'

function OperationBlock({
  title,
  hint,
  blockType,
  draggableToCanvas = false,
  block,
  evaluation,
}) {
  const id = useId()
  const titleId = `${id}-op-title`
  const isCanvas = Boolean(block)

  const outKey = isCanvas ? portRegistryKey(block.id, 'out') : ''
  const outBytes = isCanvas ? evaluation?.portBytes?.get(outKey) : undefined
  const resultText =
    outBytes !== undefined ? serializeBytesToFormat('hex', outBytes) : ''

  const sectionClass = [
    'input-block',
    isCanvas ? 'input-block--canvas-op' : '',
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
        draggableToCanvas ? (event) => attachPaletteDragData(event, blockType) : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive notch-ports-row--spread">
          <PortHandle blockId={block.id} portKey="in:a" kind="input" interactive />
          <PortHandle blockId={block.id} portKey="in:b" kind="input" interactive />
        </div>
      ) : null}
      <h3 className="input-block-title" id={titleId}>
        {title}
      </h3>
      <p className="input-block-hint">{hint}</p>
      {isCanvas ? (
        <>
          <label className="converter-block-label" htmlFor={`${id}-result`}>
            Result (hex)
          </label>
          <textarea
            id={`${id}-result`}
            className="input-block-field input-block-field--mono"
            value={resultText}
            readOnly
            rows={2}
            spellCheck={false}
            aria-label="Operation result"
          />
          <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
            <PortHandle blockId={block.id} portKey="out" kind="output" interactive />
          </div>
        </>
      ) : null}
    </section>
  )
}

export default OperationBlock
