import { memo, useEffect, useMemo } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
  useReactFlow,
  type NodeProps,
  type Node,
} from '@xyflow/react';

type Join32Data = { result: string | null };

const HANDLES = ['w0', 'w1', 'w2', 'w3'] as const;
const HANDLE_LEFT = ['14%', '38%', '62%', '86%'] as const;

function bitsFromUpstreamData(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as { binary?: string; result?: string | null };
  if (typeof d.binary === 'string') return d.binary;
  if (typeof d.result === 'string') return d.result;
  return '';
}

function Join32Node({ id }: NodeProps<Node<Join32Data>>) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target' });

  const orderedSources = useMemo(
    () =>
      HANDLES.map(
        (hid) => connections.find((c) => c.targetHandle === hid)?.source,
      ),
    [connections],
  );

  const allWired = orderedSources.every((s): s is string => typeof s === 'string');
  const sourceIds = allWired ? (orderedSources as string[]) : [];
  const nodesData = useNodesData<Node>(sourceIds);

  const result = useMemo(() => {
    if (!allWired || nodesData.length !== 4) return null;
    const chunks = HANDLES.map((_, i) => bitsFromUpstreamData(nodesData[i]?.data));
    const ok = chunks.every((b) => /^[01]+$/.test(b) && b.length === 32);
    return ok ? chunks.join('') : null;
  }, [allWired, nodesData]);

  useEffect(() => {
    updateNodeData(id, { result });
  }, [result]);

  const status = useMemo(() => {
    if (!allWired) {
      const n = orderedSources.filter(Boolean).length;
      return { kind: 'partial' as const, text: `${n}/4 inputs` };
    }
    const chunks = HANDLES.map((_, i) => bitsFromUpstreamData(nodesData[i]?.data));
    const bad = chunks.find((b) => !/^[01]+$/.test(b) || b.length !== 32);
    if (bad !== undefined) {
      const idx = chunks.indexOf(bad);
      return {
        kind: 'bad' as const,
        text: `Word ${idx + 1} must be exactly 32 bits (0/1)`,
      };
    }
    return { kind: 'ok' as const, text: '128 bits' };
  }, [allWired, orderedSources, nodesData]);

  return (
    <div style={{ minWidth: 180, textAlign: 'center' }}>
      {HANDLES.map((hid, i) => (
        <Handle
          key={hid}
          type="target"
          position={Position.Top}
          id={hid}
          style={{ left: HANDLE_LEFT[i] }}
        />
      ))}

      <div style={{ marginTop: 2, marginBottom: 4 }}>
        Join 4×32
        <div style={{ fontSize: 10, color: '#666', fontWeight: 'normal' }}>
          w0→w1→w2→w3 → 128 bits
        </div>
      </div>

      <div style={{ fontSize: 10, color: status.kind === 'bad' ? '#c00' : '#666' }}>
        {status.text}
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

export default memo(Join32Node);
