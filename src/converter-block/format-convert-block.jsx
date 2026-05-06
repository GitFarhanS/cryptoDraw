import { useId, useState } from 'react'
import PortHandle from '../port-handle'
import { portRegistryKey } from '../graph/edge-types'
import { attachPaletteDragData } from '../input-blocks/palette-drag'
import { BYTE_FORMATS, parseBytesFromFormat, serializeBytesToFormat } from './format-bytes'

const FORMAT_LABELS = {
  binary: 'Binary',
  ascii: 'ASCII',
  hex: 'Hex',
  decimal: 'Decimal (bytes 0–255)',
}

function FormatConvertBlock({
  draggableToCanvas = false,
  block,
  onBlockPatch,
  evaluation,
}) {
  const id = useId()
  const titleId = `${id}-fmt-title`
  const isCanvas = Boolean(block)

  const [paletteState, setPaletteState] = useState({
    inputFormat: 'hex',
    outputFormat: 'ascii',
    text: '',
  })

  const inputFormat = isCanvas ? (block.fcInputFormat ?? 'hex') : paletteState.inputFormat
  const outputFormat = isCanvas ? (block.fcOutputFormat ?? 'ascii') : paletteState.outputFormat
  const text = isCanvas ? (block.fcText ?? '') : paletteState.text

  const setInputFormat = (next) => {
    if (isCanvas) {
      onBlockPatch?.({ fcInputFormat: next })
    } else {
      setPaletteState((s) => ({ ...s, inputFormat: next }))
    }
  }

  const setOutputFormat = (next) => {
    if (isCanvas) {
      onBlockPatch?.({ fcOutputFormat: next })
    } else {
      setPaletteState((s) => ({ ...s, outputFormat: next }))
    }
  }

  const setText = (next) => {
    if (isCanvas) {
      onBlockPatch?.({ fcText: next })
    } else {
      setPaletteState((s) => ({ ...s, text: next }))
    }
  }

  const wiredOutKey = isCanvas ? portRegistryKey(block.id, 'out') : ''
  const evalBytes = isCanvas ? evaluation?.portBytes?.get(wiredOutKey) : undefined

  let localOut = ''
  let err = ''
  if (text.trim() !== '') {
    try {
      const bytes = parseBytesFromFormat(inputFormat, text)
      localOut = serializeBytesToFormat(outputFormat, bytes)
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not convert.'
    }
  }

  const displayOut =
    evalBytes !== undefined
      ? serializeBytesToFormat(outputFormat, evalBytes)
      : localOut

  const sectionClass = [
    'input-block',
    isCanvas ? 'input-block--canvas-format' : '',
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
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'formatConvert') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--top notch-ports-row--interactive">
          <PortHandle blockId={block.id} portKey="in" kind="input" interactive />
        </div>
      ) : null}
      <h3 className="input-block-title" id={titleId}>
        Format convert
      </h3>
      <p className="input-block-hint">
        Decode as one representation, encode as another (via bytes). Decimal: space- or
        comma-separated values 0–255.
      </p>
      <div className="converter-block-row">
        <div>
          <label className="converter-block-label" htmlFor={`${id}-in-fmt`}>
            From
          </label>
          <select
            id={`${id}-in-fmt`}
            className="input-block-field"
            value={inputFormat}
            onChange={(e) => setInputFormat(e.target.value)}
            aria-label="Input format"
          >
            {BYTE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="converter-block-label" htmlFor={`${id}-out-fmt`}>
            To
          </label>
          <select
            id={`${id}-out-fmt`}
            className="input-block-field"
            value={outputFormat}
            onChange={(e) => setOutputFormat(e.target.value)}
            aria-label="Output format"
          >
            {BYTE_FORMATS.map((f) => (
              <option key={f} value={f}>
                {FORMAT_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <label className="converter-block-label" htmlFor={`${id}-in`}>
        Input
      </label>
      <textarea
        id={`${id}-in`}
        className="input-block-field input-block-field--mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        spellCheck={false}
        aria-label="Input to convert"
      />
      {err && evalBytes === undefined ? <p className="input-block-hint">{err}</p> : null}
      <label className="converter-block-label" htmlFor={`${id}-out`}>
        Output
      </label>
      <textarea
        id={`${id}-out`}
        className="input-block-field input-block-field--mono"
        value={displayOut}
        readOnly
        rows={3}
        spellCheck={false}
        aria-label="Converted output"
      />
      {isCanvas ? (
        <div className="notch-ports-row notch-ports-row--bottom notch-ports-row--interactive">
          <PortHandle blockId={block.id} portKey="out" kind="output" interactive />
        </div>
      ) : null}
    </section>
  )
}

export default FormatConvertBlock
