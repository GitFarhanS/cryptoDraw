import { useId, useState } from 'react'
import ConverterBlocks from './converter-block/converter-blocks'
import FlowchartIoPanel from './flowchart-io-panel'
import InputBlocks from './input-blocks/input-blocks'
import OperationsBlocks from './operations-block/operations-blocks'
import OutputBlock from './output-block/output-block'

const PANELS = [
  'Input',
  'Converter',
  'Operations',
  'Flowchart',
  'Output',
]

function SidePanelExpandablePanels({ onExportFlowchart, onImportFlowchart }) {
  const baseId = useId()
  const [expandedIndex, setExpandedIndex] = useState(null)

  if (expandedIndex !== null) {
    const title = PANELS[expandedIndex]
    const titleId = `${baseId}-title-${expandedIndex}`

    return (
      <div className="sp-panels sp-panels--expanded">
        <section
          id={`${baseId}-region-${expandedIndex}`}
          className="sp-panel-expanded"
          data-tone={expandedIndex}
          role="region"
          aria-labelledby={titleId}
        >
          <div className="sp-panel-expanded-header">
            <button
              type="button"
              className="sp-panel-expanded-close"
              onClick={() => setExpandedIndex(null)}
              aria-label="Close panel"
            >
              Back
            </button>
            <h2 className="sp-panel-expanded-title" id={titleId}>
              {title}
            </h2>
          </div>
          <div className="sp-panel-expanded-body">
            {title === 'Input' ? (
              <InputBlocks />
            ) : title === 'Converter' ? (
              <ConverterBlocks />
            ) : title === 'Operations' ? (
              <OperationsBlocks />
            ) : title === 'Flowchart' ? (
              <FlowchartIoPanel
                onExportFlowchart={onExportFlowchart}
                onImportFlowchart={onImportFlowchart}
              />
            ) : title === 'Output' ? (
              <OutputBlock draggableToCanvas />
            ) : (
              <p className="sp-panel-expanded-placeholder">Content for {title}.</p>
            )}
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="sp-panels">
      {PANELS.map((label, index) => (
        <button
          key={label}
          type="button"
          className="sp-panel-row"
          data-tone={index}
          onClick={() => setExpandedIndex(index)}
          aria-expanded={false}
        >
          <span className="sp-panel-row-label">{label}</span>
          <span className="sp-panel-row-chevron" aria-hidden>
            ›
          </span>
        </button>
      ))}
    </div>
  )
}

export default SidePanelExpandablePanels
