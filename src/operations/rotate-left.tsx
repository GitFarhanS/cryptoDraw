import { memo, useEffect } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
  useReactFlow,
  type NodeProps,
  type Node,
} from '@xyflow/react';

type BinaryNode = Node<{ binary: string }, 'binaryNode'>;

type RotateLeftNodeData = { result: string | null };

const rotateLeftBinary = (x: string, n: string): string => {
  const bits = x.length;
  const nVal = parseInt(n, 2) % bits;

  return x.slice(nVal) + x.slice(0, nVal);
};

function RotateLeftNode({ id }: NodeProps<Node<RotateLeftNodeData>>) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData<BinaryNode>(
    connections.map((c) => c.source),
  );

  const [x, n] = nodesData.map((node) => String(node.data.binary ?? ''));

  const result =
    nodesData.length === 2 &&
    /^[01]+$/.test(x) &&
    /^[01]+$/.test(n) &&
    x.length > 0
      ? rotateLeftBinary(x, n)
      : null;

  useEffect(() => {
    updateNodeData(id, { result });
  }, [result]);

  return (
    <div>
      <Handle type="target" position={Position.Top} id="x" style={{ left: '30%' }} />
      <Handle type="target" position={Position.Top} id="n" style={{ left: '70%' }} />

      <div>&lt;&lt;&lt;</div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(RotateLeftNode);