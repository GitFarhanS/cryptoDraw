import {
    CONVERTER_BLOCK_TYPES,
    INPUT_BLOCK_TYPES,
    OPERATION_BLOCK_TYPES,
    SBOX_BLOCK_TYPES,
    STREAM_BLOCK_TYPES,
    OUTPUT_BLOCK_TYPES,
} from '../input-blocks/drag-constants'
import type { GraphEdge, PlacedBlockRecord } from '../types/graph'

export function portRegistryKey(blockId: string, portKey: string) {
    return `${blockId}\0${portKey}`
}

export function parseEdgeEndpointRef(ref: string) {
    const i = ref.indexOf('\0')
    if (i === -1) {
        return null
    }
    return { blockId: ref.slice(0, i), portKey: ref.slice(i + 1) }
}

export function outputPortKeysForBlock(
    blockType: string,
    params: { blockCount?: number; joinCount?: number } = {},
) {
    if (INPUT_BLOCK_TYPES.includes(blockType as (typeof INPUT_BLOCK_TYPES)[number])) {
        return ['out']
    }
    if (blockType === 'splitIntoLots') {
        const n = clampInt(params.blockCount, 1, 24, 4)
        return Array.from({ length: n }, (_, i) => `out:${i}`)
    }
    if (
        CONVERTER_BLOCK_TYPES.includes(blockType as (typeof CONVERTER_BLOCK_TYPES)[number]) ||
        SBOX_BLOCK_TYPES.includes(blockType as (typeof SBOX_BLOCK_TYPES)[number]) ||
        STREAM_BLOCK_TYPES.includes(blockType as (typeof STREAM_BLOCK_TYPES)[number]) ||
        OPERATION_BLOCK_TYPES.includes(blockType as (typeof OPERATION_BLOCK_TYPES)[number]) ||
        OUTPUT_BLOCK_TYPES.includes(blockType as (typeof OUTPUT_BLOCK_TYPES)[number])
    ) {
        if (blockType === 'output') {
            return []
        }
        return ['out']
    }
    return ['out']
}

export function inputPortKeysForBlock(
    blockType: string,
    params: { blockCount?: number; joinCount?: number } = {},
) {
    if (INPUT_BLOCK_TYPES.includes(blockType as (typeof INPUT_BLOCK_TYPES)[number])) {
        return []
    }
    if (
        blockType === 'splitIntoLots'
        || blockType === 'formatConvert'
        || blockType === 'permuteReorder'
        || blockType === 'output'
    ) {
        return ['in']
    }
    if (SBOX_BLOCK_TYPES.includes(blockType as (typeof SBOX_BLOCK_TYPES)[number])) {
        return ['in']
    }
    if (blockType === 'chachaIetfInit') {
        return ['in:key', 'in:nonce']
    }
    if (blockType === 'chachaIetfFinalize') {
        return ['in:state', 'in:initial']
    }
    if (
        STREAM_BLOCK_TYPES.includes(blockType as (typeof STREAM_BLOCK_TYPES)[number])
        && blockType !== 'chachaIetfInit'
        && blockType !== 'chachaIetfFinalize'
    ) {
        return ['in']
    }
    if (blockType === 'joinLots') {
        const k = clampInt(params.joinCount, 1, 24, 2)
        return Array.from({ length: k }, (_, i) => `in:${i}`)
    }
    if (OPERATION_BLOCK_TYPES.includes(blockType as (typeof OPERATION_BLOCK_TYPES)[number])) {
        return ['in:a', 'in:b']
    }
    return []
}

function clampInt(value: unknown, min: number, max: number, fallback: number) {
    const n = typeof value === 'number' ? value : Number(value)
    if (!Number.isFinite(n)) {
        return fallback
    }
    return Math.min(max, Math.max(min, Math.floor(n)))
}

export function wouldCreateCycle(edges: GraphEdge[], proposed: { from: { blockId: string }; to: { blockId: string } }) {
    const { from, to } = proposed
    if (from.blockId === to.blockId) {
        return true
    }

    const adj = new Map<string, string[]>()
    for (const e of edges) {
        const a = e.from.blockId
        const b = e.to.blockId
        if (!adj.has(a)) {
            adj.set(a, [])
        }
        adj.get(a)!.push(b)
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
        const next = adj.get(u ?? '')
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

export function upsertEdgeForInputPort(edges: GraphEdge[], newEdge: GraphEdge) {
    const filtered = edges.filter(
        (e) => !(e.to.blockId === newEdge.to.blockId && e.to.portKey === newEdge.to.portKey),
    )
    return [...filtered, newEdge]
}

export function isEdgeValidForBlocks(
    byId: Map<string, Pick<PlacedBlockRecord, 'type' | 'blockCount' | 'joinCount'>>,
    edge: GraphEdge,
) {
    const fromBlock = byId.get(edge.from.blockId)
    const toBlock = byId.get(edge.to.blockId)
    if (!fromBlock || !toBlock) {
        return false
    }
    const paramsFor = (b: Pick<PlacedBlockRecord, 'blockCount' | 'joinCount'>) => ({
        blockCount: b.blockCount,
        joinCount: b.joinCount,
    })
    const outPorts = outputPortKeysForBlock(fromBlock.type, paramsFor(fromBlock))
    const inPorts = inputPortKeysForBlock(toBlock.type, paramsFor(toBlock))
    return outPorts.includes(edge.from.portKey) && inPorts.includes(edge.to.portKey)
}

export { type GraphEdge } from '../types/graph'
