import { useEffect, useMemo } from 'react';
import {
  useNodeConnections,
  useNodesData,
  useReactFlow,
  type Node,
} from '@xyflow/react';
import { bitsFromUpstreamData } from '../variable/bits';

/** Sync computed `result` onto node data when it changes. */
export function useSyncNodeResult(id: string, result: string | null) {
  const { updateNodeData } = useReactFlow();
  useEffect(() => {
    updateNodeData(id, { result });
  }, [id, result, updateNodeData]);
}

/** Read bit strings from all target-handle connections (connection order). */
export function useUpstreamBits() {
  const connections = useNodeConnections({ handleType: 'target' });
  const nodesData = useNodesData<Node>(connections.map((c) => c.source));
  const bits = useMemo(
    () => nodesData.map((n) => bitsFromUpstreamData(n?.data)),
    [nodesData],
  );
  return { connections, nodesData, bits };
}
