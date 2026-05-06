import { useId, useState } from 'react'
import { attachPaletteDragData } from '../input-blocks/palette-drag'
import { BYTE_FORMATS, parseBytesFromFormat, serializeBytesToFormat } from './format-bytes'

const FORMAT_LABELS = {
  binary: 'Binary',
  ascii: 'ASCII',
  hex: 'Hex',
  decimal: 'Decimal (bytes 0–255)',
}

function FormatConvertBlock({ draggableToCanvas = false }) {
  const id = useId()
  const titleId = `${id}-fmt-title`
  const [inputFormat, setInputFormat] = useState('hex')
  const [outputFormat, setOutputFormat] = useState('ascii')
  const [text, setText] = useState('')

  let out = ''
  let err = ''
  if (text.trim() !== '') {
    try {
      const bytes = parseBytesFromFormat(inputFormat, text)
      out = serializeBytesToFormat(outputFormat, bytes)
    } catch (e) {
      err = e instanceof Error ? e.message : 'Could not convert.'
    }
  }

  return (
    <section
      className={`input-block${draggableToCanvas ? ' input-block--palette-draggable' : ''}`}
      aria-labelledby={titleId}
      draggable={draggableToCanvas}
      onDragStart={
        draggableToCanvas ? (event) => attachPaletteDragData(event, 'formatConvert') : undefined
      }
      title={draggableToCanvas ? 'Drag onto the grid to place a copy' : undefined}
    >
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
      {err ? <p className="input-block-hint">{err}</p> : null}
      <label className="converter-block-label" htmlFor={`${id}-out`}>
        Output
      </label>
      <textarea
        id={`${id}-out`}
        className="input-block-field input-block-field--mono"
        value={out}
        readOnly
        rows={3}
        spellCheck={false}
        aria-label="Converted output"
      />
    </section>
  )
}

export default FormatConvertBlock
