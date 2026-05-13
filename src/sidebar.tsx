import { useDnD } from './DnDContext';

const nodes = [
  { type: 'binaryNode',     label: 'Binary' },
  { type: 'xorNode',        label: 'XOR' },
  { type: 'andNode',        label: 'AND' },
  { type: 'rotateLeftNode', label: 'Rotate Left' },
  { type: 'resultNode',     label: 'Result' },
];

export default function Sidebar() {
  const [_, setType] = useDnD();

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    setType(nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <aside>
      <div>Drag nodes onto the canvas</div>
      {nodes.map(({ type, label }) => (
        <div
          key={type}
          draggable
          onDragStart={(e) => onDragStart(e, type)}
        >
          {label}
        </div>
      ))}
    </aside>
  );
}