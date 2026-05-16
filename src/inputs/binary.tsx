import { memo } from 'react';
import { Position, Handle, useReactFlow, NodeResizeControl, type NodeProps, type Node } from '@xyflow/react';

const controlStyle = { background: 'transparent', border: 'none' };

function ResizeIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20" height="20" viewBox="0 0 24 24"
      strokeWidth="2" stroke="#ff0071" fill="none"
      strokeLinecap="round" strokeLinejoin="round"
      style={{ position: 'absolute', right: 5, bottom: 5 }}
    >
      <path stroke="none" d="M0 0h24v24H0z" fill="none" />
      <polyline points="16 20 20 20 20 16" />
      <line x1="14" y1="14" x2="20" y2="20" />
      <polyline points="8 4 4 4 4 8" />
      <line x1="4" y1="4" x2="10" y2="10" />
    </svg>
  );
}

function BinaryNode({ id, data }: NodeProps<Node<{ binary: string }>>) {
    const { updateNodeData } = useReactFlow();
  
    const forceBinary = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const binaryOnly = e.target.value.replace(/[^01]/g, '');
        updateNodeData(id, { binary: binaryOnly });
      };
  
    return (
      <>
        <NodeResizeControl style={controlStyle} minWidth={100} minHeight={50}>
          <ResizeIcon />
        </NodeResizeControl>
  
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '8px',
          cursor: 'grab',
          boxSizing: 'border-box',
        }}>
          <div style={{ textAlign: 'center', marginBottom: 6, fontWeight: 600 }}>Binary</div>
          <textarea
            onChange={forceBinary}
            value={data.binary}
            className="xy-theme__input nodrag"
            style={{
                flex: 1,
                minHeight: 0,
                width: '100%',
                boxSizing: 'border-box',
                resize: 'none',
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                cursor: 'text',
            }}
            />
        </div>
  
        <Handle type="source" position={Position.Bottom} />
      </>
    );
  }

export default memo(BinaryNode);