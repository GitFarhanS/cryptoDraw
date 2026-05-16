import { memo, useMemo } from 'react';
import {
  Handle,
  Position,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import { useSyncNodeResult, useUpstreamBits } from '../flow/hooks';

type BinaryGateNodeData = { result: string | null };

export function xorBinary(a: string, b: string): string {
  const len = Math.max(a.length, b.length);
  const paddedA = a.padStart(len, '0');
  const paddedB = b.padStart(len, '0');
  return paddedA
    .split('')
    .map((bit, i) => (parseInt(bit) ^ parseInt(paddedB[i])).toString())
    .join('');
}

export function andBinary(a: string, b: string): string {
  const len = Math.max(a.length, b.length);
  const paddedA = a.padStart(len, '0');
  const paddedB = b.padStart(len, '0');
  return paddedA
    .split('')
    .map((bit, i) => (parseInt(bit) & parseInt(paddedB[i])).toString())
    .join('');
}

function makeBinaryGateNode(
  label: string,
  combine: (a: string, b: string) => string,
) {
  function BinaryGateNode({ id }: NodeProps<Node<BinaryGateNodeData>>) {
    const { bits } = useUpstreamBits();
    const [a, b] = bits;

    const result = useMemo(() => {
      if (bits.length !== 2 || !/^[01]+$/.test(a) || !/^[01]+$/.test(b)) {
        return null;
      }
      return combine(a, b);
    }, [bits.length, a, b]);

    useSyncNodeResult(id, result);

    return (
      <div>
        <Handle type="target" position={Position.Top} id="a" style={{ left: '30%' }} />
        <Handle type="target" position={Position.Top} id="b" style={{ left: '70%' }} />
        <div>{label}</div>
        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  return memo(BinaryGateNode);
}

export const XorNode = makeBinaryGateNode('XOR', xorBinary);
export const AndNode = makeBinaryGateNode('AND', andBinary);
