type Props = {
  onAccept: () => void;
  onDecline: () => void;
};

export default function FunctionalCookieBanner({ onAccept, onDecline }: Props) {
  return (
    <div
      role="dialog"
      aria-labelledby="functional-cookie-title"
      aria-describedby="functional-cookie-desc"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10000,
        padding: '14px 18px',
        background: 'rgba(254, 254, 254, 0.97)',
        borderTop: '1px solid #ededed',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.08)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px 16px',
        justifyContent: 'space-between',
      }}
    >
      <p
        id="functional-cookie-desc"
        style={{ margin: 0, maxWidth: '52rem', fontSize: 14, lineHeight: 1.45, color: '#333' }}
      >
        <strong id="functional-cookie-title">Save your diagram</strong>
        {' — '}
        Allow a functional cookie so we can remember your choice, and use browser storage to keep
        your nodes, connections, and view. Nothing is sent to a server.
      </p>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button type="button" className="xy-theme__button active" onClick={onAccept}>
          Allow
        </button>
        <button type="button" className="xy-theme__button" onClick={onDecline}>
          Decline
        </button>
      </div>
    </div>
  );
}
