import React, { useId, useState } from 'react'
import ConverterBlocks from './converter-block/converter-blocks'
import FlowchartIoPanel from './flowchart-io-panel'
import InputBlocks from './input-blocks/input-blocks'
import OperationsBlocks from './operations-block/operations-blocks'
import OutputBlock from './output-block/output-block'

const PANELS = ['Input', 'Converter', 'Operations', 'Output', 'Flowchart']

interface Props {
    onExportFlowchart: () => string
    onImportFlowchart: (base64: string) => void
}

function SidePanelExpandablePanels({ onExportFlowchart, onImportFlowchart }: Readonly<Props>) {
    const baseId = useId()
    const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

    const renderPanelContent = (title: string) => {
        switch (title) {
            case 'Input':
                return <InputBlocks />
            case 'Converter':
                return <ConverterBlocks />
            case 'Operations':
                return <OperationsBlocks />
            case 'Flowchart':
                return (
                    <FlowchartIoPanel
                        onExportFlowchart={onExportFlowchart}
                        onImportFlowchart={onImportFlowchart}
                    />
                )
            case 'Output':
                return <OutputBlock draggableToCanvas />
            default:
                return <p className="sp-panel-expanded-placeholder">Content for {title}.</p>
        }
    }

    if (expandedIndex !== null) {
        const title = PANELS[expandedIndex]
        const titleId = `${baseId}-title-${expandedIndex}`

        return (
            <div className="sp-panels sp-panels--expanded">
                <section
                    id={`${baseId}-region-${expandedIndex}`}
                    className="sp-panel-expanded"
                    data-tone={expandedIndex}
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
                        {renderPanelContent(title)}
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
