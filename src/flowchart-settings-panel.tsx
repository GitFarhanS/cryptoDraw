import { useEffect, useId, useState } from 'react';
import { CUSTOM_FUNCTION_DRAG_MIME } from './input-blocks/drag-constants';

interface Props {
    onExportFlowchart: () => string;
    onImportFlowchart: (base64: string, options?: { anchorToViewport?: boolean }) => void;
    onClearFlowchart: () => void;
    activeCanvasId: string;
    snapToGrid: boolean;
    onSnapToGridChange: (value: boolean) => void;
    onResetLocalStorage: () => void;
    customFunctions: Array<{ id: string; name: string; payload: string }>;
    onPackageSelectionAsCustomFunction: (name: string) => boolean;
    onDeleteCustomFunction: (id: string) => void;
    onCopyCustomFunctionShare: (id: string) => Promise<boolean>;
    onImportCustomFunctionShare: (text: string) => string;
    onToast: (message: string, kind: 'success' | 'error') => void;
}

function FlowchartIoPanel({
    onExportFlowchart,
    onImportFlowchart,
    onClearFlowchart,
    activeCanvasId,
    snapToGrid,
    onSnapToGridChange,
    onResetLocalStorage,
    customFunctions,
    onPackageSelectionAsCustomFunction,
    onDeleteCustomFunction,
    onCopyCustomFunctionShare,
    onImportCustomFunctionShare,
    onToast,
}: Readonly<Props>) {
    const dialogTitleId = useId();
    const [dialog, setDialog] = useState<{
        mode: 'export' | 'import';
        value: string;
    } | null>(null);
    const [copyConfirmed, setCopyConfirmed] = useState(false);
    const [customFunctionName, setCustomFunctionName] = useState('');
    const [customFunctionShareText, setCustomFunctionShareText] = useState('');

    useEffect(() => {
        setDialog(null);
        setCopyConfirmed(false);
    }, [activeCanvasId]);

    const exportFlowchart = () => {
        try {
            const base64 = onExportFlowchart();
            setDialog({ mode: 'export', value: base64 });
            setCopyConfirmed(false);
            onToast('Base64 flowchart text generated.', 'success');
        } catch {
            onToast('Could not generate Base64 flowchart text.', 'error');
        }
    };

    const openImportDialog = () => {
        setDialog({ mode: 'import', value: '' });
        setCopyConfirmed(false);
    };

    const copyBase64 = async () => {
        if (!dialog?.value) {
            return;
        }
        try {
            await navigator.clipboard.writeText(dialog.value);
            setCopyConfirmed(true);
            onToast('Base64 flowchart text copied.', 'success');
        } catch {
            setCopyConfirmed(false);
            onToast('Copy failed. Please copy manually from the text box.', 'error');
        }
    };

    const closeDialog = () => {
        setDialog(null);
        setCopyConfirmed(false);
    };

    const importFlowchart = () => {
        const base64 = dialog?.value?.trim() ?? '';
        if (!base64) {
            return;
        }
        try {
            onImportFlowchart(base64);
            onToast('Flowchart imported from Base64 text.', 'success');
            setDialog(null);
        } catch (error) {
            onToast(
                error instanceof Error ? error.message : 'Could not import flowchart.',
                'error'
            );
        }
    };

    const packageSelection = () => {
        const name = customFunctionName.trim();
        if (!name) {
            onToast('Give your custom function a name.', 'error');
            return;
        }
        const created = onPackageSelectionAsCustomFunction(name);
        if (!created) {
            onToast('Select one or more blocks to package first.', 'error');
            return;
        }
        setCustomFunctionName('');
        onToast(`Custom function "${name}" created.`, 'success');
    };

    const importCustomFunctionShare = () => {
        const raw = customFunctionShareText.trim();
        if (!raw) {
            return;
        }
        try {
            const name = onImportCustomFunctionShare(raw);
            setCustomFunctionShareText('');
            onToast(`Imported custom function "${name}".`, 'success');
        } catch (error) {
            onToast(
                error instanceof Error ? error.message : 'Could not import custom function.',
                'error'
            );
        }
    };

    return (
        <div className="flowchart-io">
            <section className="flowchart-io-card" aria-label="Board behavior settings">
                <h3 className="flowchart-io-card-title">Board behavior</h3>
                <label className="flowchart-io-toggle" htmlFor="snap-to-grid-toggle">
                    <input
                        id="snap-to-grid-toggle"
                        type="checkbox"
                        checked={snapToGrid}
                        onChange={(event) => onSnapToGridChange(event.target.checked)}
                    />
                    <span>Snap to grid</span>
                </label>
                <button
                    type="button"
                    className="flowchart-io-button flowchart-io-button--danger"
                    onClick={() => {
                        onResetLocalStorage();
                        onToast('Local storage cleared.', 'success');
                    }}
                >
                    Reset (clear Cache)
                </button>
            </section>

            <section className="flowchart-io-card" aria-label="Custom function blocks">
                <h3 className="flowchart-io-card-title">Custom functions</h3>
                <p className="flowchart-io-text">
                    Package selected blocks into reusable functions. Drag them from Settings onto
                    the canvas.
                </p>
                <div className="flowchart-io-actions">
                    <input
                        className="input-block-field"
                        value={customFunctionName}
                        onChange={(event) => setCustomFunctionName(event.target.value)}
                        placeholder="Function name"
                        aria-label="Custom function name"
                    />
                    <button
                        type="button"
                        className="flowchart-io-button"
                        onClick={packageSelection}
                    >
                        Package selection
                    </button>
                </div>
                {customFunctions.length ? (
                    <div className="flowchart-io-custom-functions">
                        <h4 className="flowchart-io-custom-functions-title">My Custom Functions</h4>
                        {customFunctions.map((fn) => (
                            <div key={fn.id} className="flowchart-io-custom-function-row">
                                <span
                                    className="flowchart-io-custom-function-drag"
                                    draggable
                                    onDragStart={(event) => {
                                        event.dataTransfer.setData(
                                            CUSTOM_FUNCTION_DRAG_MIME,
                                            fn.id
                                        );
                                        event.dataTransfer.effectAllowed = 'copy';
                                    }}
                                    title="Drag onto canvas"
                                >
                                    {fn.name}
                                </span>
                                <div className="flowchart-io-actions">
                                    <button
                                        type="button"
                                        className="flowchart-io-button"
                                        onClick={async () => {
                                            const ok = await onCopyCustomFunctionShare(fn.id);
                                            onToast(
                                                ok
                                                    ? `Copied share text for "${fn.name}".`
                                                    : 'Could not copy share text.',
                                                ok ? 'success' : 'error'
                                            );
                                        }}
                                    >
                                        Copy/Share
                                    </button>
                                    <button
                                        type="button"
                                        className="flowchart-io-button flowchart-io-button--danger"
                                        onClick={() => onDeleteCustomFunction(fn.id)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
                <textarea
                    className="input-block-field input-block-field--mono"
                    rows={4}
                    placeholder="Paste custom function share text"
                    value={customFunctionShareText}
                    onChange={(event) => setCustomFunctionShareText(event.target.value)}
                    aria-label="Paste custom function share text"
                />
                <button
                    type="button"
                    className="flowchart-io-button"
                    onClick={importCustomFunctionShare}
                >
                    Import custom function
                </button>
            </section>

            <section
                className="flowchart-io-card"
                aria-label="Flowchart import and export settings"
            >
                <h3 className="flowchart-io-card-title">Canvas data</h3>
                <p className="flowchart-io-text">
                    Export the current canvas or import a new one.
                </p>
                <div className="flowchart-io-actions">
                    <button type="button" className="flowchart-io-button" onClick={exportFlowchart}>
                        Export
                    </button>
                    <button
                        type="button"
                        className="flowchart-io-button"
                        onClick={openImportDialog}
                    >
                        Import
                    </button>
                    <button
                        type="button"
                        className="flowchart-io-button"
                        onClick={() => {
                            onClearFlowchart();
                            onToast('Flowchart cleared.', 'success');
                        }}
                    >
                        Clear Canvas
                    </button>
                </div>
            </section>

            {dialog ? (
                <div className="flowchart-io-dialog-wrapper">
                    <button
                        type="button"
                        className="flowchart-io-dialog-backdrop"
                        aria-label="Close dialog"
                        onClick={closeDialog}
                    />
                    <dialog
                        className="flowchart-io-dialog"
                        aria-modal="true"
                        aria-labelledby={dialogTitleId}
                    >
                        <h3 id={dialogTitleId} className="flowchart-io-dialog-title">
                            {dialog.mode === 'export'
                                ? 'Copy Base64 flowchart text'
                                : 'Paste Base64 flowchart text'}
                        </h3>
                        <textarea
                            className="input-block-field input-block-field--mono"
                            rows={8}
                            value={dialog.value}
                            readOnly={dialog.mode === 'export'}
                            onChange={(event) =>
                                setDialog((prev) =>
                                    prev ? { ...prev, value: event.target.value } : prev
                                )
                            }
                        />
                        <div className="flowchart-io-dialog-actions">
                            {dialog.mode === 'export' ? (
                                <button
                                    type="button"
                                    className="flowchart-io-button"
                                    onClick={copyBase64}
                                >
                                    {copyConfirmed ? 'Copied' : 'Copy'}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className="flowchart-io-button"
                                    onClick={importFlowchart}
                                >
                                    Import
                                </button>
                            )}
                            <button
                                type="button"
                                className="flowchart-io-button"
                                onClick={closeDialog}
                            >
                                Close
                            </button>
                        </div>
                    </dialog>
                </div>
            ) : null}
        </div>
    );
}

export default FlowchartIoPanel;
