import { useRef, useState } from 'react'

function FlowchartIoPanel({ onExportFlowchart, onImportFlowchart }) {
  const inputRef = useRef(null)
  const [status, setStatus] = useState('')
  const [statusKind, setStatusKind] = useState('neutral')

  const triggerFilePicker = () => {
    inputRef.current?.click()
  }

  const exportFlowchart = () => {
    try {
      onExportFlowchart()
      setStatus('Flowchart exported.')
      setStatusKind('success')
    } catch {
      setStatus('Could not export flowchart.')
      setStatusKind('error')
    }
  }

  const importFlowchart = async (event) => {
    const [file] = event.target.files ?? []
    if (!file) {
      return
    }

    try {
      await onImportFlowchart(file)
      setStatus(`Imported ${file.name}.`)
      setStatusKind('success')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import flowchart.')
      setStatusKind('error')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <div className="flowchart-io">
      <p className="flowchart-io-text">
        Save your current flowchart to a JSON file or import one later.
      </p>
      <div className="flowchart-io-actions">
        <button type="button" className="flowchart-io-button" onClick={exportFlowchart}>
          Export flowchart
        </button>
        <button type="button" className="flowchart-io-button" onClick={triggerFilePicker}>
          Import flowchart
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="flowchart-io-file-input"
          onChange={importFlowchart}
        />
      </div>
      {status ? (
        <p className={`flowchart-io-status flowchart-io-status--${statusKind}`}>{status}</p>
      ) : null}
    </div>
  )
}

export default FlowchartIoPanel
