import { useState } from 'react'

function FlowchartIoPanel({ onExportFlowchart, onImportFlowchart }) {
  const [status, setStatus] = useState('')
  const [statusKind, setStatusKind] = useState('neutral')
  const [dialog, setDialog] = useState(null)

  const exportFlowchart = () => {
    try {
      const base64 = onExportFlowchart()
      setDialog({ mode: 'export', value: base64 })
      setStatus('Base64 flowchart text generated.')
      setStatusKind('success')
    } catch {
      setStatus('Could not generate Base64 flowchart text.')
      setStatusKind('error')
    }
  }

  const openImportDialog = () => {
    setDialog({ mode: 'import', value: '' })
  }

  const copyBase64 = async () => {
    if (!dialog?.value) {
      return
    }
    try {
      await navigator.clipboard.writeText(dialog.value)
      setStatus('Base64 flowchart text copied.')
      setStatusKind('success')
    } catch {
      setStatus('Copy failed. Please copy manually from the text box.')
      setStatusKind('error')
    }
  }

  const importFlowchart = () => {
    const base64 = dialog?.value?.trim() ?? ''
    if (!base64) {
      return
    }
    try {
      onImportFlowchart(base64)
      setStatus('Flowchart imported from Base64 text.')
      setStatusKind('success')
      setDialog(null)
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
        <button type="button" className="flowchart-io-button" onClick={openImportDialog}>
          Import from Base64
        </button>
      </div>
      {status ? (
        <p className={`flowchart-io-status flowchart-io-status--${statusKind}`}>{status}</p>
      ) : null}
      {dialog ? (
        <div
          className="flowchart-io-dialog-backdrop"
          role="presentation"
          onClick={() => setDialog(null)}
        >
          <div
            className="flowchart-io-dialog"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <h3 className="flowchart-io-dialog-title">
              {dialog.mode === 'export' ? 'Copy Base64 flowchart text' : 'Paste Base64 flowchart text'}
            </h3>
            <textarea
              className="input-block-field input-block-field--mono"
              rows={8}
              value={dialog.value}
              readOnly={dialog.mode === 'export'}
              onChange={(event) =>
                setDialog((prev) => (prev ? { ...prev, value: event.target.value } : prev))
              }
            />
            <div className="flowchart-io-dialog-actions">
              {dialog.mode === 'export' ? (
                <button type="button" className="flowchart-io-button" onClick={copyBase64}>
                  Copy
                </button>
              ) : (
                <button type="button" className="flowchart-io-button" onClick={importFlowchart}>
                  Import
                </button>
              )}
              <button type="button" className="flowchart-io-button" onClick={() => setDialog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default FlowchartIoPanel
