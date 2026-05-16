import { memo, useEffect, useMemo } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
  useReactFlow,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { M_LENGTH, M_VALUES, lookupM, parseIndexBits, uint32ToHex } from '../constants/m';
import { bitsFromUpstreamData } from '../variable/bits';

type MNodeData = {
  index: number;
  value: number;
  hex: string;
  result: string;
};

type BinarySource = Node<{ binary: string }, 'binaryNode'>;

function MNode({ id, data }: NodeProps<Node<MNodeData>>) {
  const { updateNodeData } = useReactFlow();
  const connections = useNodeConnections({ handleType: 'target', id: 'index' });
  const nodesData = useNodesData<BinarySource>(
    connections.map((c) => c.source),
  );

  const wiredIndex = useMemo(() => {
    if (connections.length === 0) return null;
    return parseIndexBits(bitsFromUpstreamData(nodesData[0]?.data));
  }, [connections.length, nodesData]);

  const index =
    wiredIndex ??
    Math.min(M_LENGTH - 1, Math.max(0, data.index ?? 0));

  useEffect(() => {
    const next = lookupM(index);
    if (
      data.index !== next.index ||
      data.value !== next.value ||
      data.hex !== next.hex ||
      data.result !== next.result
    ) {
      updateNodeData(id, next);
    }
  }, [index, id, updateNodeData, data.index, data.value, data.hex, data.result]);

  const onIndexChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateNodeData(id, lookupM(Number(e.target.value)));
  };

  return (
    <>
      <Handle type="target" position={Position.Top} id="index" />

      <div style={{ minWidth: 168, textAlign: 'left', padding: 8 }}>
        <div style={{ textAlign: 'center', marginBottom: 6, fontWeight: 600 }}>M</div>

        <label style={{ display: 'block', fontSize: 11, marginBottom: 4 }}>
          Index
          <select
            className="xy-theme__select"
            value={index}
            onChange={onIndexChange}
            disabled={wiredIndex !== null}
            style={{ display: 'block', width: '100%', marginTop: 2 }}
          >
            {M_VALUES.map((word, i) => (
              <option key={i} value={i}>
                {i}: {uint32ToHex(word)}
              </option>
            ))}
          </select>
        </label>

        <div style={{ fontSize: 11, marginTop: 6 }}>
          <div>{data.hex}</div>
          <div
            style={{
              fontFamily: 'monospace',
              fontSize: 9,
              wordBreak: 'break-all',
              marginTop: 4,
              opacity: 0.85,
            }}
          >
            {data.result}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </>
  );
}

export default memo(MNode);
