import { useRef, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  useReactFlow,
  Background,
  type OnConnect,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Sidebar from './sidebar';
import { DnDProvider, useDnD } from './DnDContext';

import BinaryNode from './inputs/binary';
import XorNode from './operations/xor';
import AndNode from './operations/and';
import RotateLeftNode from './operations/rotate-left';
import ResultNode from './result/result';


const nodeTypes = {
  binaryNode: BinaryNode,
  xorNode: XorNode,
  andNode: AndNode,
  rotateLeftNode: RotateLeftNode,
  resultNode: ResultNode,
};

// default data per node type when dropped
const defaultData: Record<string, object> = {
  binaryNode:     { binary: '0' },
  xorNode:        { result: null },
  andNode:        { result: null },
  rotateLeftNode: { result: null },
  resultNode:     {},
};

let id = 0;
const getId = () => `node_${id++}`;

function DnDFlow() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const { screenToFlowPosition } = useReactFlow();
  const [type] = useDnD();

  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        const targetNode = nodes.find((n) => n.id === params.target);
        const singleInputTypes = ['resultNode', 'xorNode', 'andNode', 'rotateLeftNode'];
  
        const isSingleInput = singleInputTypes.includes(targetNode?.type ?? '');
  
        // for nodes with named handles (a/b), only boot the edge on the same handle
        const hasNamedHandles = ['xorNode', 'andNode', 'rotateLeftNode'].includes(targetNode?.type ?? '');
  
        const filtered = isSingleInput
          ? eds.filter((e) => {
              if (e.target !== params.target) return true;
              if (hasNamedHandles) return e.targetHandle !== params.targetHandle;
              return false;
            })
          : eds;
  
        return addEdge(params, filtered);
      }),
    [nodes, setEdges],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode = {
        id: getId(),
        type,
        position,
        data: defaultData[type] ?? {},
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, type],
  );

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh' }}>
      <Sidebar />
      <div ref={reactFlowWrapper} style={{ flex: 1 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <DnDFlow />
      </DnDProvider>
    </ReactFlowProvider>
  );
}
