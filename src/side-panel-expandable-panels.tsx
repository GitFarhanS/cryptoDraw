import React, { useId, useState } from 'react';
import CipherTemplatesPanel from './cipher-templates-panel';
import ConverterBlocks from './converter-block/converter-blocks';
import FlowchartIoPanel from './flowchart-settings-panel';
import InputBlocks from './input-blocks/input-blocks';
import OperationsBlocks from './operations-block/operations-blocks';
import OutputBlock from './output-block/output-block';
import SboxBlocks from './sbox-block/sbox-blocks';
import StreamBlocks from './stream-block/stream-blocks';

const PANELS = [
    'Input',
    'Converter',
    'Operations',
    'S-Boxes',
    'Stream',
    'Output',
    'Settings',
    'Templates',
] as const;

const PANEL_FLOW_DENOM = Math.max(1, PANELS.length - 1);

interface Props {
    onExportFlowchart: () => string;
    onImportFlowchart: (base64: string, options?: { anchorToViewport?: boolean }) => void;
    onClearFlowchart: () => void;
    snapToGrid: boolean;
    onSnapToGridChange: (value: boolean) => void;
    onResetLocalStorage: () => void;
    defaultExpandedPanel?: string | null;
    customFunctions: Array<{ id: string; name: string; payload: string }>;
    onPackageSelectionAsCustomFunction: (name: string) => boolean;
    onDeleteCustomFunction: (id: string) => void;
    onCopyCustomFunctionShare: (id: string) => Promise<boolean>;
    onImportCustomFunctionShare: (text: string) => string;
    onToast: (message: string, kind: 'success' | 'error') => void;
}

function SidePanelExpandablePanels({
    onExportFlowchart,
    onImportFlowchart,
    onClearFlowchart,
    snapToGrid,
    onSnapToGridChange,
    onResetLocalStorage,
    defaultExpandedPanel = null,
    customFunctions,
    onPackageSelectionAsCustomFunction,
    onDeleteCustomFunction,
    onCopyCustomFunctionShare,
    onImportCustomFunctionShare,
    onToast,
}: Readonly<Props>) {
    const baseId = useId();
    const [expandedIndex, setExpandedIndex] = useState<number | null>(() => {
        if (!defaultExpandedPanel) {
            return null;
        }
        const normalized = defaultExpandedPanel.trim().toLowerCase();
        const index = PANELS.findIndex((panel) => panel.toLowerCase() === normalized);
        return index >= 0 ? index : null;
    });

    const renderPanelContent = (title: string) => {
        switch (title) {
            case 'Input':
                return <InputBlocks />;
            case 'Converter':
                return <ConverterBlocks />;
            case 'Operations':
                return <OperationsBlocks />;
            case 'S-Boxes':
                return <SboxBlocks />;
            case 'Stream':
                return <StreamBlocks />;
            case 'Settings':
                return (
                    <FlowchartIoPanel
                        onExportFlowchart={onExportFlowchart}
                        onImportFlowchart={onImportFlowchart}
                        onClearFlowchart={onClearFlowchart}
                        snapToGrid={snapToGrid}
                        onSnapToGridChange={onSnapToGridChange}
                        onResetLocalStorage={onResetLocalStorage}
                        customFunctions={customFunctions}
                        onPackageSelectionAsCustomFunction={onPackageSelectionAsCustomFunction}
                        onDeleteCustomFunction={onDeleteCustomFunction}
                        onCopyCustomFunctionShare={onCopyCustomFunctionShare}
                        onImportCustomFunctionShare={onImportCustomFunctionShare}
                        onToast={onToast}
                    />
                );
            case 'Templates':
                return (
                    <CipherTemplatesPanel onImportFlowchart={onImportFlowchart} onToast={onToast} />
                );
            case 'Output':
                return <OutputBlock draggableToCanvas />;
            default:
                return <p className="sp-panel-expanded-placeholder">Content for {title}.</p>;
        }
    };

    if (expandedIndex !== null) {
        const title = PANELS[expandedIndex];
        const titleId = `${baseId}-title-${expandedIndex}`;
        const toneFlow = expandedIndex / PANEL_FLOW_DENOM;
        const toneBand = toneFlow >= 0.55 ? 'deep' : 'mid';

        return (
            <div className="sp-panels sp-panels--expanded">
                <section
                    id={`${baseId}-region-${expandedIndex}`}
                    className="sp-panel-expanded"
                    style={{ '--sp-tone-flow': toneFlow } as React.CSSProperties}
                    data-tone-band={toneBand}
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
                    <div className="sp-panel-expanded-body">{renderPanelContent(title)}</div>
                </section>
            </div>
        );
    }

    return (
        <div className="sp-panels">
            {PANELS.map((label, index) => (
                <button
                    key={label}
                    type="button"
                    className="sp-panel-row"
                    style={{ '--sp-tone-flow': index / PANEL_FLOW_DENOM } as React.CSSProperties}
                    data-tone-band={index / PANEL_FLOW_DENOM >= 0.55 ? 'deep' : 'mid'}
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
    );
}

export default SidePanelExpandablePanels;
