import { memo } from 'react';
import { Position, Handle, useReactFlow, type NodeProps, type Node } from '@xyflow/react';
 
function BinaryNode({ id, data }: NodeProps<Node<{ binary: number }>>) {
  const { updateNodeData } = useReactFlow();
  
  const forceBinary = (e: React.ChangeEvent<HTMLInputElement>) => {
    // keeps only 0 and 1
    const binaryOnly = e.target.value.replace(/[^01]/g, "");
    updateNodeData(id, { binary: binaryOnly });
  };
 
  return (
    <div>       
      <div>Binary</div>
      <div>
        <input
          onChange={forceBinary}
          value={data.binary}
          className="xy-theme__input"
        />
      </div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
 
export default memo(BinaryNode);