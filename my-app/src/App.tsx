import { useState, useCallback } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import BinaryNode from './inputs/binary';
import XorNode from './operations/xor';
import ResultNode from './result/result';

const nodeTypes = {
  binaryNode: BinaryNode,
  xorNode: XorNode,
  resultNode: ResultNode,
};

const initialNodes: Node[] = [
  {
    id: 'binary-1',
    type: 'binaryNode',
    position: { x: 100, y: 0 },
    data: { binary: 0 },
  },
  {
    id: 'binary-2',
    type: 'binaryNode',
    position: { x: 300, y: 0 },
    data: { binary: 1 },
  },
  {
    id: 'xor-1',
    type: 'xorNode',
    position: { x: 200, y: 150 },
    data: { result: null },
  },
  {
    id: 'result-1',
    type: 'resultNode',
    position: { x: 200, y: 300 },
    data: {},
  },
];

const initialEdges: Edge[] = [
  { id: 'e1', source: 'binary-1', target: 'xor-1', targetHandle: 'a' },
  { id: 'e2', source: 'binary-2', target: 'xor-1', targetHandle: 'b' },
  { id: 'e3', source: 'xor-1',    target: 'result-1' },
];

function Flow() {
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);

  const onNodesChange: OnNodesChange = useCallback(
    (changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect: OnConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [],
  );

  return (
    <div style={{ height: '100%' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default Flow;