import { memo, useMemo } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
  type NodeProps,
  type Node,
} from '@xyflow/react';
import { useSyncNodeResult } from '../flow/hooks';
import { bitsFromUpstreamData } from '../variable/bits';
import { lookupSBox, parseByteBits, S1_VALUES, S2_VALUES } from '../constants/s-box';

type SBoxNodeData = { result: string | null };

function makeSBoxNode(table: readonly number[], label: string) {
  function SBoxNode({ id }: NodeProps<Node<SBoxNodeData>>) {
    const connections = useNodeConnections({ handleType: 'target' });
    const nodesData = useNodesData<Node>(connections.map((c) => c.source));

    const { parsed, status } = useMemo(() => {
      if (connections.length !== 1) {
        return { parsed: null, status: 'need_wire' as const };
      }
      const raw = bitsFromUpstreamData(nodesData[0]?.data);
      const c = raw.replace(/\s/g, '');
      if (c.length === 0) {
        return { parsed: null, status: 'empty' as const };
      }
      if (!/^[01]+$/.test(c)) {
        return { parsed: null, status: 'bad_chars' as const };
      }
      const index = parseByteBits(c);
      if (index === null) {
        return { parsed: null, status: 'invalid' as const };
      }
      return { parsed: lookupSBox(table, index), status: 'ok' as const };
    }, [connections.length, nodesData, table]);

    const result = parsed?.result ?? null;
    useSyncNodeResult(id, result);

    const body = useMemo(() => {
      if (status === 'need_wire') {
        return <span style={{ fontSize: 11, color: '#666' }}>Connect 8 bits</span>;
      }
      if (status === 'empty') {
        return <span style={{ fontSize: 11, color: '#666' }}>Need 8 bits (0/1)</span>;
      }
      if (status === 'bad_chars') {
        return <span style={{ fontSize: 11, color: '#c00' }}>Only 0 and 1 allowed</span>;
      }
      if (status !== 'ok' || !parsed) {
        return <span style={{ fontSize: 11, color: '#c00' }}>Invalid input</span>;
      }
      return (
        <div style={{ fontFamily: 'monospace', fontSize: 10, lineHeight: 1.35 }}>
          <div>
            <strong>in:</strong> 0x{parsed.index.toString(16).padStart(2, '0')}
          </div>
          <div style={{ marginTop: 4 }}>
            <strong>out:</strong> {parsed.hex} ({parsed.value})
          </div>
        </div>
      );
    }, [status, parsed]);

    return (
      <div style={{ minWidth: 120, textAlign: 'left' }}>
        <Handle type="target" position={Position.Top} />

        <div style={{ textAlign: 'center', marginBottom: 6 }}>{label}</div>

        {body}

        <Handle type="source" position={Position.Bottom} />
      </div>
    );
  }

  return memo(SBoxNode);
}

export const S1Node = makeSBoxNode(S1_VALUES, 'S1');
export const S2Node = makeSBoxNode(S2_VALUES, 'S2');
