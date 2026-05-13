import { memo } from 'react';
import {Handle, Position, useNodeConnections, useNodesData, type Node} from '@xyflow/react';

type XorNode = Node<{ result: number | null }, 'xorNode'>;

function ResultNode() {
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData<XorNode>(
    connections.map((c) => c.source),
  );

  const result = nodesData[0]?.data.result ?? null;

  return (
    <div>
      <Handle type="target" position={Position.Top} />

      <div>Result</div>
      <div>{result !== null ? result : '—'}</div>
    </div>
  );
}

export default memo(ResultNode);