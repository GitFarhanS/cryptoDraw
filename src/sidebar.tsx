import { useDnD, REACTFLOW_DRAG_TYPE } from './DnDContext';
import VariablePanel from './variable/VariablePanel';

const nodes = [
  { type: 'binaryNode',     label: 'Binary' },
  { type: 'mNode',          label: 'M' },
  { type: 'xorNode',        label: 'XOR' },
  { type: 'andNode',        label: 'AND' },
  { type: 'rotateLeftNode', label: 'Rotate Left' },
  { type: 'bitsToBytesNode', label: 'Bits → Bytes' },
  { type: 'join32Node',     label: 'Join 4×32' },
  { type: 's1Node',         label: 'S1' },
  { type: 's2Node',         label: 'S2' },
  { type: 'resultNode',     label: 'Result' },
  { type: 'bits16Node',     label: '16 bit variable' },
  { type: 'bits8Node',      label: '8 bit variable' },
  { type: 'bits64Node',     label: '64 bit variable' },
  { type: 'bits128Node',    label: '128 bit variable' },
];

export default function Sidebar() {
  const { setType, setIsDraggingFromSidebar } = useDnD();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    setIsDraggingFromSidebar(true);
    event.dataTransfer.setData(REACTFLOW_DRAG_TYPE, nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onDragEnd = () => {
    setType(null);
    setIsDraggingFromSidebar(false);
  };

  return (
    <aside
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: 200,
        flexShrink: 0,
        borderRight: '1px solid var(--xy-border-color, #ddd)',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        <div style={{ marginBottom: 10, fontSize: 12 }}>Drag nodes onto the canvas</div>
        {nodes.map(({ type, label }) => (
          <div
            key={type}
            draggable
            onDragStart={(e) => onDragStart(e, type)}
            onDragEnd={onDragEnd}
            style={{ padding: '6px 0', cursor: 'grab' }}
          >
            {label}
          </div>
        ))}
      </div>

      <VariablePanel />
    </aside>
  );
}
