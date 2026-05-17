import { useMemo } from 'react';
import { bitsToHex } from './bits';
import { useVariableStore } from './VariableStore';

export default function VariablePanel() {
  const { variables, clearVariable, resetVariables } = useVariableStore();

  const entries = useMemo(
    () =>
      Object.entries(variables)
        .filter(([, value]) => value != null)
        .sort(([a], [b]) => a.localeCompare(b)),
    [variables],
  );

  const hasVariables = entries.length > 0;

  return (
    <section
      style={{
        flexShrink: 0,
        borderTop: '1px solid var(--xy-border-color, #ddd)',
        padding: '10px 12px',
        background: 'var(--xy-background-color, #fafafa)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 8,
        }}
      >
        <h2 style={{ margin: 0, fontSize: 12, fontWeight: 600 }}>Variables</h2>
        <button
          type="button"
          className="xy-theme__button"
          onClick={resetVariables}
          disabled={!hasVariables}
          style={{ fontSize: 11, padding: '2px 8px' }}
        >
          Reset all
        </button>
      </div>

      {!hasVariables ? (
        <p style={{ margin: 0, fontSize: 11, opacity: 0.65 }}>No variables set</p>
      ) : (
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: 'none',
            maxHeight: 160,
            overflowY: 'auto',
          }}
        >
          {entries.map(([name, bits]) => (
            <li
              key={name}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 6,
                padding: '6px 0',
                borderBottom: '1px solid var(--xy-border-color, #eee)',
                fontSize: 11,
                fontFamily: 'monospace',
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontFamily: 'sans-serif' }}>{name}</div>
                <div>{bitsToHex(bits!)}</div>
                <div
                  style={{
                    fontSize: 9,
                    opacity: 0.8,
                    marginTop: 2,
                    wordBreak: 'break-all',
                  }}
                >
                  {bits}
                </div>
              </div>
              <button
                type="button"
                className="xy-theme__button"
                title={`Clear ${name}`}
                onClick={() => clearVariable(name)}
                style={{
                  flexShrink: 0,
                  fontSize: 14,
                  lineHeight: 1,
                  padding: '0 6px',
                  minWidth: 24,
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
