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

type XorNodeData = { result: string | null };

/** Binary inputs use `binary`; operation nodes (e.g. XOR) expose computed bits on `result`. */
function bitsFromUpstreamData(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as { binary?: string; result?: string | null };
  if (typeof d.binary === 'string') return d.binary;
  if (typeof d.result === 'string') return d.result;
  return '';
}

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
  const nodesData = useNodesData<Node>(
    connections.map((c) => c.source),
  );

  const [a, b] = nodesData.map((n) => bitsFromUpstreamData(n?.data));

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