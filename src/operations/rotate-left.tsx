import { memo, useMemo } from 'react';
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import { useSyncNodeResult, useUpstreamBits } from '../flow/hooks';

type RotateLeftNodeData = { result: string | null };

const rotateLeftBinary = (x: string, n: string): string => {
  const bits = x.length;
  const nVal = parseInt(n, 2) % bits;
  return x.slice(nVal) + x.slice(0, nVal);
};

function RotateLeftNode({ id }: NodeProps<Node<RotateLeftNodeData>>) {
  const { bits } = useUpstreamBits();
  const [x, n] = bits;

  const result = useMemo(() => {
    if (
      bits.length !== 2 ||
      !/^[01]+$/.test(x) ||
      !/^[01]+$/.test(n) ||
      x.length === 0
    ) {
      return null;
    }
    return rotateLeftBinary(x, n);
  }, [bits.length, x, n]);

  useSyncNodeResult(id, result);

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
