import { useRef, useCallback, useEffect, useState } from 'react';
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
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import Sidebar from './sidebar';
import { DnDProvider, useDnD, REACTFLOW_DRAG_TYPE } from './DnDContext';
import FunctionalCookieBanner from './FunctionalCookieBanner';
import {
  type FunctionalConsent,
  readFunctionalConsent,
  setFunctionalConsentCookie,
  loadPersistedBoard,
  savePersistedBoard,
  clearPersistedBoard,
} from './functionalStorage';

import BinaryNode from './inputs/binary';
import MNode from './inputs/m';
import { lookupM } from './constants/m';
import XorNode from './operations/xor';
import AndNode from './operations/and';
import RotateLeftNode from './operations/rotate-left';
import BitsToBytesNode from './operations/bits-to-bytes';
import Join32Node from './operations/join-32';
import { S1Node, S2Node } from './operations/s-box';
import ResultNode from './result/result';
import {
  Bits8Node,
  Bits16Node,
  Bits64Node,
  Bits128Node,
} from './variable/variable-node';
import { VariableStoreProvider } from './variable/VariableStore';


const nodeTypes = {
  binaryNode: BinaryNode,
  mNode: MNode,
  xorNode: XorNode,
  andNode: AndNode,
  rotateLeftNode: RotateLeftNode,
  bitsToBytesNode: BitsToBytesNode,
  join32Node: Join32Node,
  s1Node: S1Node,
  s2Node: S2Node,
  resultNode: ResultNode,
  bits16Node: Bits16Node,
  bits8Node: Bits8Node,
  bits64Node: Bits64Node,
  bits128Node: Bits128Node,
};

// default data per node type when dropped
const defaultData: Record<string, object> = {
  binaryNode:     { binary: '0' },
  mNode:          lookupM(0),
  xorNode:        { result: null },
  andNode:        { result: null },
  rotateLeftNode: { result: null },
  bitsToBytesNode: { result: null },
  join32Node:     { result: null },
  s1Node:         { result: null },
  s2Node:         { result: null },
  resultNode:     {},
  bits16Node:     { name: 'v1', result: null },
  bits8Node:      { name: 'v1', result: null },
  bits64Node:     { name: 'v1', result: null },
  bits128Node:    { name: 'v1', result: null },
};

function nextNumericIds(
  prefix: 'node' | 'edge',
  items: { id: string }[],
  count: number,
): string[] {
  let max = -1;
  const re = new RegExp(`^${prefix}_(\\d+)$`);
  for (const item of items) {
    const m = re.exec(item.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return Array.from({ length: count }, (_, i) => `${prefix}_${max + 1 + i}`);
}

function nextNodeId(nodes: Node[]): string {
  return nextNumericIds('node', nodes, 1)[0]!;
}

type Clipboard = { nodes: Node[]; edges: Edge[] };

function isTextLikeFocus(): boolean {
  const el = document.activeElement;
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

function DnDFlow({ consent }: { consent: FunctionalConsent }) {
  const reactFlowWrapper = useRef(null);
  const clipboardRef = useRef<Clipboard | null>(null);
  const [initialBoard] = useState(() => {
    if (consent !== 'granted') return null;
    return loadPersistedBoard();
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialBoard?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialBoard?.edges ?? []);
  const { screenToFlowPosition, getNodes, getEdges, toObject } = useReactFlow();
  const { type, setType, isDraggingFromSidebar } = useDnD();

  useEffect(() => {
    if (consent !== 'granted') return;
    const t = window.setTimeout(() => {
      savePersistedBoard(toObject());
    }, 400);
    return () => window.clearTimeout(t);
  }, [nodes, edges, consent, toObject]);

  const hasRestoredBoard = Boolean(initialBoard?.nodes.length);
  const defaultViewport = hasRestoredBoard ? initialBoard!.viewport : undefined;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTextLikeFocus()) return;

      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'c') {
        const selected = getNodes().filter((n) => n.selected);
        if (selected.length === 0) return;
        e.preventDefault();
        const ids = new Set(selected.map((n) => n.id));
        const internal = getEdges().filter(
          (ed) => ids.has(ed.source) && ids.has(ed.target),
        );
        clipboardRef.current = {
          nodes: selected.map((n) => ({
            ...n,
            position: { ...n.position },
            data:
              typeof n.data === 'object' && n.data !== null
                ? { ...(n.data as object) }
                : n.data,
          })),
          edges: internal.map((ed) => ({ ...ed })),
        };
        return;
      }

      if (mod && e.key === 'v') {
        const clip = clipboardRef.current;
        if (!clip || clip.nodes.length === 0) return;
        e.preventDefault();

        const offset = 24;
        const nds = getNodes();
        const eds = getEdges();
        const nodeIds = nextNumericIds('node', nds, clip.nodes.length);
        const idMap = Object.fromEntries(
          clip.nodes.map((n, i) => [n.id, nodeIds[i]!]),
        );

        const newNodes: Node[] = clip.nodes.map((n) => ({
          ...n,
          id: idMap[n.id]!,
          selected: false,
          position: {
            x: n.position.x + offset,
            y: n.position.y + offset,
          },
          data:
            typeof n.data === 'object' && n.data !== null
              ? { ...(n.data as object) }
              : n.data,
        }));

        const edgeIds = nextNumericIds('edge', eds, clip.edges.length);
        const newEdges: Edge[] = clip.edges.map((ed, i) => ({
          ...ed,
          id: edgeIds[i]!,
          source: idMap[ed.source]!,
          target: idMap[ed.target]!,
          selected: false,
        }));

        setNodes(nds.concat(newNodes));
        setEdges(eds.concat(newEdges));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [getNodes, getEdges, setNodes, setEdges]);

  const onConnect: OnConnect = useCallback(
    (params) =>
      setEdges((eds) => {
        const targetNode = nodes.find((n) => n.id === params.target);
        const singleInputTypes = [
          'resultNode',
          'xorNode',
          'andNode',
          'rotateLeftNode',
          'bitsToBytesNode',
          'join32Node',
          's1Node',
          's2Node',
          'bits16Node',
          'bits8Node',
          'bits64Node',
          'bits128Node',
        ];
  
        const isSingleInput = singleInputTypes.includes(targetNode?.type ?? '');
  
        // for nodes with named handles (a/b), only boot the edge on the same handle
        const hasNamedHandles = [
          'xorNode',
          'andNode',
          'rotateLeftNode',
          'join32Node',
          'mNode',
        ].includes(targetNode?.type ?? '');
  
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

      const droppedType =
        event.dataTransfer.getData(REACTFLOW_DRAG_TYPE) || type;
      if (!droppedType || !defaultData[droppedType]) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      setNodes((nds) =>
        nds.concat({
          id: nextNodeId(nds),
          type: droppedType,
          position,
          data: (defaultData[droppedType] ?? {}) as Record<string, unknown>,
        }),
      );
      setType(null);
    },
    [screenToFlowPosition, type, setType, setNodes],
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
          selectionOnDrag={!isDraggingFromSidebar}
          panOnDrag={[1, 2]}
          deleteKeyCode={['Backspace', 'Delete']}
          defaultViewport={defaultViewport}
          fitView={!hasRestoredBoard}
        >
          <Controls />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
}

export default function App() {
  const [consent, setConsent] = useState<FunctionalConsent>(() => readFunctionalConsent());

  return (
    <ReactFlowProvider>
      <DnDProvider>
        <VariableStoreProvider>
          <DnDFlow consent={consent} />
        </VariableStoreProvider>
        {consent === 'unknown' ? (
          <FunctionalCookieBanner
            onAccept={() => {
              setFunctionalConsentCookie(true);
              setConsent('granted');
            }}
            onDecline={() => {
              setFunctionalConsentCookie(false);
              clearPersistedBoard();
              setConsent('denied');
            }}
          />
        ) : null}
      </DnDProvider>
    </ReactFlowProvider>
  );
}
