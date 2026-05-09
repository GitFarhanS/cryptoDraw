/** @typedef {{ id: string, from: { blockId: string, portKey: string }, to: { blockId: string, portKey: string } }} GraphEdge */

import {
  CONVERTER_BLOCK_TYPES,
  INPUT_BLOCK_TYPES,
  OPERATION_BLOCK_TYPES,
  OUTPUT_BLOCK_TYPES,
} from '../input-blocks/drag-constants'

export function portRegistryKey(blockId, portKey) {
  return `${blockId}\0${portKey}`
}

export function parseEdgeEndpointRef(ref) {
  const i = ref.indexOf('\0')
  if (i === -1) {
    return null
  }
  return { blockId: ref.slice(0, i), portKey: ref.slice(i + 1) }
}

/**
 * @param {string} blockType
 * @param {{ blockCount?: number, joinCount?: number }} [params]
 */
export function outputPortKeysForBlock(blockType, params = {}) {
  if (INPUT_BLOCK_TYPES.includes(blockType)) {
    return ['out']
  }
  if (blockType === 'splitIntoLots') {
    const n = clampInt(params.blockCount, 1, 24, 4)
    return Array.from({ length: n }, (_, i) => `out:${i}`)
  }
  if (
    CONVERTER_BLOCK_TYPES.includes(blockType) ||
    OPERATION_BLOCK_TYPES.includes(blockType) ||
    OUTPUT_BLOCK_TYPES.includes(blockType)
  ) {
    if (blockType === 'output') {
      return []
    }
    return ['out']
  }
  return ['out']
}

/**
 * @param {string} blockType
 * @param {{ blockCount?: number, joinCount?: number }} [params]
 */
export function inputPortKeysForBlock(blockType, params = {}) {
  if (INPUT_BLOCK_TYPES.includes(blockType)) {
    return []
  }
  if (blockType === 'splitIntoLots' || blockType === 'formatConvert' || blockType === 'output') {
    return ['in']
  }
  if (blockType === 'joinLots') {
    const k = clampInt(params.joinCount, 1, 24, 2)
    return Array.from({ length: k }, (_, i) => `in:${i}`)
  }
  if (OPERATION_BLOCK_TYPES.includes(blockType)) {
    return ['in:a', 'in:b']
  }
  return []
}

function clampInt(value, min, max, fallback) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) {
    return fallback
  }
  return Math.min(max, Math.max(min, Math.floor(n)))
}

/**
 * Directed edges: fromBlock -> toBlock (data flows along this direction).
 * @param {GraphEdge[]} edges
 * @param {{ from: { blockId: string }, to: { blockId: string } }} proposed
 */
export function wouldCreateCycle(edges, proposed) {
  const { from, to } = proposed
  if (from.blockId === to.blockId) {
    return true
  }

  const adj = new Map()
  for (const e of edges) {
    const a = e.from.blockId
    const b = e.to.blockId
    if (!adj.has(a)) {
      adj.set(a, [])
    }
    adj.get(a).push(b)
  }

  const start = to.blockId
  const target = from.blockId

  const stack = [start]
  const seen = new Set(stack)
  while (stack.length) {
    const u = stack.pop()
    if (u === target) {
      return true
    }
    const next = adj.get(u)
    if (!next) {
      continue
    }
    for (const v of next) {
      if (!seen.has(v)) {
        seen.add(v)
        stack.push(v)
      }
    }
  }

  return false
}

/**
 * Replace any existing edge that lands on the same input port.
 * @param {GraphEdge[]} edges
 * @param {GraphEdge} newEdge
 */
export function upsertEdgeForInputPort(edges, newEdge) {
  const filtered = edges.filter(
    (e) =>
      !(
        e.to.blockId === newEdge.to.blockId &&
        e.to.portKey === newEdge.to.portKey
      ),
  )
  return [...filtered, newEdge]
}

/**
 * Validate an edge against current block records and dynamic port shapes.
 * @param {Map<string, { type: string, blockCount?: number, joinCount?: number }>} byId
 * @param {GraphEdge} edge
 */
export function isEdgeValidForBlocks(byId, edge) {
  const fromBlock = byId.get(edge.from.blockId)
  const toBlock = byId.get(edge.to.blockId)
  if (!fromBlock || !toBlock) {
    return false
  }
  const paramsFor = (b) => ({
    blockCount: b.blockCount,
    joinCount: b.joinCount,
  })
  const outPorts = outputPortKeysForBlock(fromBlock.type, paramsFor(fromBlock))
  const inPorts = inputPortKeysForBlock(toBlock.type, paramsFor(toBlock))
  return outPorts.includes(edge.from.portKey) && inPorts.includes(edge.to.portKey)
}
