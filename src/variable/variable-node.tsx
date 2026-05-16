import { memo, useEffect } from 'react';
import {
  Handle,
  Position,
  useNodeConnections,
  useNodesData,
  useReactFlow,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import {
  bits128ToHex,
  bits16ToHex,
  bits64ToHex,
  bits8ToHex,
  bitsFromUpstreamData,
  normalizeTo128Bits,
  normalizeTo16Bits,
  normalizeTo64Bits,
  normalizeTo8Bits,
  normalizeVarName,
} from './bits';
import { useVariableStore } from './VariableStore';

export type VariableNodeData = {
  name: string;
  result: string | null;
};

type VariableWidth = 8 | 16 | 64 | 128;

const VARIABLE_CONFIG: Record<
  VariableWidth,
  {
    label: string;
    minWidth: number;
    normalize: (bits: string) => string | null;
    toHex: (bits: string) => string;
    bitsPreviewMaxHeight?: number;
  }
> = {
  8: {
    label: '8 bit variable',
    minWidth: 140,
    normalize: normalizeTo8Bits,
    toHex: bits8ToHex,
  },
  16: {
    label: '16 bit variable',
    minWidth: 140,
    normalize: normalizeTo16Bits,
    toHex: bits16ToHex,
  },
  64: {
    label: '64 bit variable',
    minWidth: 160,
    normalize: normalizeTo64Bits,
    toHex: bits64ToHex,
  },
  128: {
    label: '128 bit variable',
    minWidth: 180,
    normalize: normalizeTo128Bits,
    toHex: bits128ToHex,
    bitsPreviewMaxHeight: 48,
  },
};

function makeVariableNode(width: VariableWidth) {
  const config = VARIABLE_CONFIG[width];

  function VariableNode({ id, data }: NodeProps<Node<VariableNodeData>>) {
    const { updateNodeData } = useReactFlow();
    const { variables, setVariable } = useVariableStore();
    const varKey = normalizeVarName(data.name ?? '');
    const stored = variables[varKey] ?? null;

    const connections = useNodeConnections({ handleType: 'target' });
    const nodesData = useNodesData<Node>(connections.map((c) => c.source));
    const upstream =
      connections.length > 0 ? bitsFromUpstreamData(nodesData[0]?.data) : '';

    useEffect(() => {
      if (connections.length === 0) return;
      const normalized = config.normalize(upstream);
      if (normalized) setVariable(varKey, normalized);
    }, [upstream, connections.length, varKey, setVariable]);

    useEffect(() => {
      if (data.result !== stored) {
        updateNodeData(id, { result: stored });
      }
    }, [stored, id, updateNodeData, data.result]);

    const onNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      updateNodeData(id, { name: e.target.value });
    };

    return (
      <>
        <Handle type="target" position={Position.Top} />

        <div
          style={{
            minWidth: config.minWidth,
            padding: 8,
            textAlign: 'left',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: 6, fontWeight: 600 }}>
            {config.label}
          </div>

          <label style={{ display: 'block', fontSize: 11, marginBottom: 6 }}>
            Variable
            <input
              type="text"
              className="xy-theme__input nodrag"
              value={data.name ?? ''}
              onChange={onNameChange}
              placeholder="v1"
              style={{
                display: 'block',
                width: '100%',
                marginTop: 2,
                boxSizing: 'border-box',
              }}
            />
          </label>

          <div style={{ fontSize: 11, fontFamily: 'monospace' }}>
            {stored ? (
              <>
                <div style={{ wordBreak: 'break-all' }}>{config.toHex(stored)}</div>
                <div
                  style={{
                    fontSize: 9,
                    opacity: 0.85,
                    marginTop: 4,
                    wordBreak: 'break-all',
                    ...(config.bitsPreviewMaxHeight != null
                      ? {
                          maxHeight: config.bitsPreviewMaxHeight,
                          overflowY: 'auto' as const,
                        }
                      : {}),
                  }}
                >
                  {stored}
                </div>
              </>
            ) : (
              <div style={{ opacity: 0.6 }}>—</div>
            )}
          </div>
        </div>

        <Handle type="source" position={Position.Bottom} />
      </>
    );
  }

  return memo(VariableNode);
}

export const Bits8Node = makeVariableNode(8);
export const Bits16Node = makeVariableNode(16);
export const Bits64Node = makeVariableNode(64);
export const Bits128Node = makeVariableNode(128);

export type Bits8NodeData = VariableNodeData;
export type Bits16NodeData = VariableNodeData;
export type Bits64NodeData = VariableNodeData;
export type Bits128NodeData = VariableNodeData;
