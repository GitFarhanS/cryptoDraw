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

type BitsToBytesData = { result: string | null };

function tryParse128(cleaned: string): { bits: string; bytes: number[] } | null {
  if (cleaned.length !== 128 || !/^[01]+$/.test(cleaned)) return null;
  const bytes: number[] = [];
  for (let i = 0; i < 128; i += 8) {
    bytes.push(parseInt(cleaned.slice(i, i + 8), 2));
  }
  return { bits: cleaned, bytes };
}

function BitsToBytesNode({ id }: NodeProps<Node<BitsToBytesData>>) {
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData<Node>(connections.map((c) => c.source));

  const { cleaned, parsed, status } = useMemo(() => {
    if (connections.length !== 1) {
      return { cleaned: '', parsed: null, status: 'need_wire' as const };
    }
    const c = bitsFromUpstreamData(nodesData[0]?.data).replace(/\s/g, '');
    if (c.length === 0) {
      return { cleaned: c, parsed: null, status: 'empty' as const };
    }
    if (!/^[01]+$/.test(c)) {
      return { cleaned: c, parsed: null, status: 'bad_chars' as const };
    }
    if (c.length !== 128) {
      return { cleaned: c, parsed: null, status: 'bad_len' as const };
    }
    const p = tryParse128(c);
    return { cleaned: c, parsed: p, status: p ? ('ok' as const) : ('invalid' as const) };
  }, [connections.length, nodesData]);

  const result = parsed?.bits ?? null;
  useSyncNodeResult(id, result);

  const body = useMemo(() => {
    if (status === 'need_wire') {
      return <span style={{ fontSize: 11, color: '#666' }}>Connect 128 bits</span>;
    }
    if (status === 'empty') {
      return <span style={{ fontSize: 11, color: '#666' }}>Need 128 bits (0/1)</span>;
    }
    if (status === 'bad_chars') {
      return <span style={{ fontSize: 11, color: '#c00' }}>Only 0 and 1 allowed</span>;
    }
    if (status === 'bad_len') {
      return (
        <span style={{ fontSize: 11, color: '#c00' }}>
          Expected 128 bits, got {cleaned.length}
        </span>
      );
    }
    if (status !== 'ok' || !parsed) {
      return <span style={{ fontSize: 11, color: '#c00' }}>Invalid</span>;
    }
    const hex = parsed.bytes.map((b) => '0x' + b.toString(16).padStart(2, '0'));
    return (
      <div
        style={{
          fontFamily: 'monospace',
          fontSize: 10,
          lineHeight: 1.35,
          wordBreak: 'break-word',
        }}
      >
        <div>
          <strong>dec:</strong> {parsed.bytes.join(', ')}
        </div>
        <div style={{ marginTop: 4 }}>
          <strong>hex:</strong> {hex.join(', ')}
        </div>
      </div>
    );
  }, [status, cleaned.length, parsed]);

  return (
    <div style={{ minWidth: 200, textAlign: 'left' }}>
      <Handle type="target" position={Position.Top} />
      <div style={{ textAlign: 'center', marginBottom: 6 }}>Bits → Bytes</div>
      {body}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(BitsToBytesNode);
