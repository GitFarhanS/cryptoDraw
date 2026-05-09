import { useState } from 'react'

function FlowchartIoPanel({ onExportFlowchart, onImportFlowchart }) {
  const [status, setStatus] = useState('')
  const [statusKind, setStatusKind] = useState('neutral')

  const exportFlowchart = () => {
    try {
      const base64 = onExportFlowchart()
      window.prompt('Copy this Base64 flowchart text:', base64)
      setStatus('Base64 flowchart text generated.')
      setStatusKind('success')
    } catch {
      setStatus('Could not generate Base64 flowchart text.')
      setStatusKind('error')
    }
  }

  const importFlowchart = () => {
    const base64 = window.prompt('Paste Base64 flowchart text to import:')
    if (base64 === null) {
      return
    }

    try {
      onImportFlowchart(base64)
      setStatus('Flowchart imported from Base64 text.')
      setStatusKind('success')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not import flowchart.')
      setStatusKind('error')
    }
  }

  return (
    <div className="flowchart-io">
      <p className="flowchart-io-text">
        Export the current flowchart as Base64 text or import by pasting Base64 text.
      </p>
      <div className="flowchart-io-actions">
        <button type="button" className="flowchart-io-button" onClick={exportFlowchart}>
          Export as Base64
        </button>
        <button type="button" className="flowchart-io-button" onClick={importFlowchart}>
          Import from Base64
        </button>
      </div>
      {status ? (
        <p className={`flowchart-io-status flowchart-io-status--${statusKind}`}>{status}</p>
      ) : null}
    </div>
  )
}

export default FlowchartIoPanel
