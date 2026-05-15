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
import { DnDProvider, useDnD } from './DnDContext';
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
import XorNode from './operations/xor';
import AndNode from './operations/and';
import RotateLeftNode from './operations/rotate-left';
import BitsToBytesNode from './operations/bits-to-bytes';
import Join32Node from './operations/join-32';
import ResultNode from './result/result';


const nodeTypes = {
  binaryNode: BinaryNode,
  xorNode: XorNode,
  andNode: AndNode,
  rotateLeftNode: RotateLeftNode,
  bitsToBytesNode: BitsToBytesNode,
  join32Node: Join32Node,
  resultNode: ResultNode,
};

// default data per node type when dropped
const defaultData: Record<string, object> = {
  binaryNode:     { binary: '0' },
  xorNode:        { result: null },
  andNode:        { result: null },
  rotateLeftNode: { result: null },
  bitsToBytesNode: { result: null },
  join32Node:     { result: null },
  resultNode:     {},
};

let id = 0;
const getId = () => `node_${id++}`;

let edgeId = 0;
const getEdgeId = () => `edge_${edgeId++}`;

function syncIdCountersFromFlow(nodes: Node[], edges: Edge[]) {
  let nextNode = 0;
  for (const n of nodes) {
    const m = /^node_(\d+)$/.exec(n.id);
    if (m) nextNode = Math.max(nextNode, Number(m[1]) + 1);
  }
  id = Math.max(id, nextNode);
  let nextEdge = 0;
  for (const e of edges) {
    const m = /^edge_(\d+)$/.exec(e.id);
    if (m) nextEdge = Math.max(nextEdge, Number(m[1]) + 1);
  }
  edgeId = Math.max(edgeId, nextEdge);
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
    const data = loadPersistedBoard();
    if (data?.nodes.length) syncIdCountersFromFlow(data.nodes, data.edges);
    return data;
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialBoard?.nodes ?? []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialBoard?.edges ?? []);
  const { screenToFlowPosition, getNodes, getEdges, toObject } = useReactFlow();
  const [type] = useDnD();

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
        const idMap: Record<string, string> = {};
        for (const n of clip.nodes) {
          idMap[n.id] = getId();
        }

        const newNodes: Node[] = clip.nodes.map((n) => ({
          ...n,
          id: idMap[n.id],
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

        const newEdges: Edge[] = clip.edges.map((ed) => ({
          ...ed,
          id: getEdgeId(),
          source: idMap[ed.source]!,
          target: idMap[ed.target]!,
          selected: false,
        }));

        setNodes((nds) => nds.concat(newNodes));
        setEdges((eds) => eds.concat(newEdges));
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
        ];
  
        const isSingleInput = singleInputTypes.includes(targetNode?.type ?? '');
  
        // for nodes with named handles (a/b), only boot the edge on the same handle
        const hasNamedHandles = [
          'xorNode',
          'andNode',
          'rotateLeftNode',
          'join32Node',
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

      if (!type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getId(),
        type,
        position,
        data: (defaultData[type] ?? {}) as Record<string, unknown>,
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
          selectionOnDrag
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
        <DnDFlow consent={consent} />
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
