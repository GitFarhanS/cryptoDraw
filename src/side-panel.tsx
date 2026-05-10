import React from 'react';

interface Props {
    children?: React.ReactNode;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function SidePanel({ children, open, onOpenChange }: Props) {
    return (
        <aside
            className={`side-panel ${open ? 'is-open' : ''}`}
            aria-label={open ? 'Side panel' : undefined}
        >
            <button
                type="button"
                className="side-panel-toggle"
                onClick={() => onOpenChange(!open)}
                aria-expanded={open}
                aria-controls="side-panel-drawer"
                title={open ? 'Close panel' : 'Open panel'}
            >
                <span className="side-panel-toggle-icon" aria-hidden>
                    {open ? '›' : '‹'}
                </span>
            </button>
            <div id="side-panel-drawer" className="side-panel-drawer">
                <div className="side-panel-inner" aria-hidden={!open}>
                    {children}
                </div>
            </div>
        </aside>
    );
}

export default SidePanel;
