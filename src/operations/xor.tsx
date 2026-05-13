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

type XorNodeData = { result: string | null };

const xorBinary = (a: string, b: string): string => {
  const len = Math.max(a.length, b.length);
  const paddedA = a.padStart(len, '0');
  const paddedB = b.padStart(len, '0');

  return paddedA
    .split('')
    .map((bit, i) => (parseInt(bit) ^ parseInt(paddedB[i])).toString())
    .join('');
};

function XorNode({ id }: NodeProps<Node<XorNodeData>>) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData<BinaryNode>(
    connections.map((c) => c.source),
  );

  const [a, b] = nodesData.map((n) => String(n.data.binary ?? ''));

  const result =
    nodesData.length === 2 && /^[01]+$/.test(a) && /^[01]+$/.test(b)
      ? xorBinary(a, b)
      : null;

  useEffect(() => {
    updateNodeData(id, { result });
  }, [result]);

  return (
    <div>
      <Handle type="target" position={Position.Top} id="a" style={{ left: '30%' }} />
      <Handle type="target" position={Position.Top} id="b" style={{ left: '70%' }} />

      <div>XOR</div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(XorNode);