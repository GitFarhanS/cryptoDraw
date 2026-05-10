import React, { useId, useState } from 'react'
import CipherTemplatesPanel from './cipher-templates-panel'
import ConverterBlocks from './converter-block/converter-blocks'
import FlowchartIoPanel from './flowchart-io-panel'
import InputBlocks from './input-blocks/input-blocks'
import OperationsBlocks from './operations-block/operations-blocks'
import OutputBlock from './output-block/output-block'
import SboxBlocks from './sbox-block/sbox-blocks'

const PANELS = ['Input', 'Converter', 'Operations', 'S-Boxes', 'Output', 'Flowchart', 'Templates']
const VISUAL_TONE_COUNT = 5

interface Props {
    onExportFlowchart: () => string
    onImportFlowchart: (base64: string) => void
    defaultExpandedPanel?: string | null
}

function SidePanelExpandablePanels({
    onExportFlowchart,
    onImportFlowchart,
    defaultExpandedPanel = null,
}: Readonly<Props>) {
    const baseId = useId()
    const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
        if (!defaultExpandedPanel) {
            return null
        }
        const normalized = defaultExpandedPanel.trim().toLowerCase()
        const index = PANELS.findIndex((panel) => panel.toLowerCase() === normalized)
        return index >= 0 ? index : null
    })

    const renderPanelContent = (title: string) => {
        switch (title) {
            case 'Input':
                return <InputBlocks />
            case 'Converter':
                return <ConverterBlocks />
            case 'Operations':
                return <OperationsBlocks />
            case 'S-Boxes':
                return <SboxBlocks />
            case 'Flowchart':
                return (
                    <FlowchartIoPanel
                        onExportFlowchart={onExportFlowchart}
                        onImportFlowchart={onImportFlowchart}
                    />
                )
            case 'Templates':
                return <CipherTemplatesPanel onImportFlowchart={onImportFlowchart} />
            case 'Output':
                return <OutputBlock draggableToCanvas />
            default:
                return <p className="sp-panel-expanded-placeholder">Content for {title}.</p>
        }
    }

    if (expandedIndex !== null) {
        const title = PANELS[expandedIndex]
        const titleId = `${baseId}-title-${expandedIndex}`
        const toneIndex = expandedIndex % VISUAL_TONE_COUNT

        return (
            <div className="sp-panels sp-panels--expanded">
                <section
                    id={`${baseId}-region-${expandedIndex}`}
                    className="sp-panel-expanded"
                    data-tone={toneIndex}
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
                    data-tone={index % VISUAL_TONE_COUNT}
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
