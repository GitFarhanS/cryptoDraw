import { deflateSync, inflateSync } from 'fflate'
import { isPlacedBlockType } from '../input-blocks/drag-constants'
import { isChaChaQuarterPreset } from '../stream-block/chacha20-ietf'
import { isEdgeValidForBlocks, upsertEdgeForInputPort, type GraphEdge } from './edge-types'
import type { PlacedBlockRecord } from '../types/graph'

const FLOWCHART_FILE_VERSION = 1
const OP_DISPLAY_MODES = ['auto', 'manual'] as const
const OP_DISPLAY_FORMATS = ['binary', 'ascii', 'hex', 'decimal'] as const
const OP_SHIFT_MODES = ['logical', 'circular'] as const
const FORMAT_VALUES = ['binary', 'ascii', 'hex', 'decimal'] as const
const PERMUTE_MODES = ['bytes', 'bits'] as const
const PERMUTE_PRESETS = ['custom', 'identity', 'reverse', 'desIp', 'desFp'] as const

export function serializeFlowchart(placedBlocks: PlacedBlockRecord[], edges: GraphEdge[]) {
    return JSON.stringify(
        {
            version: FLOWCHART_FILE_VERSION,
            placedBlocks,
            edges,
        },
        null,
        2,
    )
}

export function serializeFlowchartToBase64(placedBlocks: PlacedBlockRecord[], edges: GraphEdge[]) {
    const jsonText = serializeFlowchart(placedBlocks, edges)
    const compressed = deflateSync(new TextEncoder().encode(jsonText), { level: 9 })
    return bytesToBase64(compressed)
}

export function parseFlowchartFromBase64(base64Text: string) {
    const trimmed = base64Text.trim()
    if (!isValidBase64Text(trimmed)) {
        throw new Error('Could not decode Base64 flowchart text.')
    }

    let data: Uint8Array
    try {
        data = base64ToBytes(trimmed)
    } catch {
        throw new Error('Could not decode Base64 flowchart text.')
    }

    try {
        return parseFlowchartFromText(new TextDecoder().decode(inflateSync(data)))
    } catch {
        return parseFlowchartFromText(bytesToUtf8(data))
    }
}

export function parseFlowchartFromText(jsonText: string) {
    let parsed: unknown
    try {
        parsed = JSON.parse(jsonText)
    } catch {
        throw new Error('Could not read JSON from file.')
    }

    if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid flowchart file format.')
    }

    const candidate = parsed as { placedBlocks?: unknown; edges?: unknown }
    const blocks = Array.isArray(candidate.placedBlocks) ? candidate.placedBlocks : null
    const edges = Array.isArray(candidate.edges) ? candidate.edges : null
    if (!blocks || !edges) {
        throw new Error('Invalid flowchart file format.')
    }

    const sanitizedBlocks = sanitizeBlocks(blocks)
    const byId = new Map(sanitizedBlocks.map((block) => [block.id, block]))
    const sanitizedEdges = sanitizeEdges(edges, byId)

    return {
        placedBlocks: sanitizedBlocks,
        edges: sanitizedEdges,
    }
}

function sanitizeBlocks(blocks: unknown[]) {
    const seen = new Set<string>()
    return blocks.map((block, index) => {
        if (!block || typeof block !== 'object') {
            throw new Error(`Block #${index + 1} is invalid.`)
        }
        const candidate = block as Partial<PlacedBlockRecord>
        if (!isPlacedBlockType(candidate.type ?? '')) {
            throw new Error(`Block #${index + 1} has an unknown type.`)
        }
        if (!isNonEmptyString(candidate.id)) {
            throw new Error(`Block #${index + 1} is missing an id.`)
        }
        if (seen.has(candidate.id)) {
            throw new Error(`Block id "${candidate.id}" is duplicated.`)
        }
        seen.add(candidate.id)

        const x = Number(candidate.x)
        const y = Number(candidate.y)
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
            throw new TypeError(`Block #${index + 1} has an invalid position.`)
        }

        const next: PlacedBlockRecord = {
            id: candidate.id,
            type: candidate.type ?? 'binary',
            x,
            y,
        }

        if (typeof candidate.text === 'string') {
            next.text = candidate.text
        }
        if (typeof candidate.fcText === 'string') {
            next.fcText = candidate.fcText
        }
        if (FORMAT_VALUES.includes(candidate.fcInputFormat as (typeof FORMAT_VALUES)[number])) {
            next.fcInputFormat = candidate.fcInputFormat
        }
        if (FORMAT_VALUES.includes(candidate.fcOutputFormat as (typeof FORMAT_VALUES)[number])) {
            next.fcOutputFormat = candidate.fcOutputFormat
        }
        if (PERMUTE_MODES.includes(candidate.permuteMode as (typeof PERMUTE_MODES)[number])) {
            next.permuteMode = candidate.permuteMode
        }
        if (PERMUTE_PRESETS.includes(candidate.permutePreset as (typeof PERMUTE_PRESETS)[number])) {
            next.permutePreset = candidate.permutePreset
        }
        if (typeof candidate.permuteOrder === 'string') {
            next.permuteOrder = candidate.permuteOrder
        }
        if (OP_DISPLAY_MODES.includes(candidate.opDisplayMode ?? 'auto')) {
            next.opDisplayMode = candidate.opDisplayMode
        }
        if (OP_DISPLAY_FORMATS.includes(candidate.opDisplayFormat as (typeof OP_DISPLAY_FORMATS)[number])) {
            next.opDisplayFormat = candidate.opDisplayFormat
        }
        if (OP_SHIFT_MODES.includes(candidate.opShiftMode ?? 'logical')) {
            next.opShiftMode = candidate.opShiftMode
        }
        if (Number.isFinite(Number(candidate.blockCount))) {
            next.blockCount = clampInt(candidate.blockCount, 1, 24)
        }
        if (Number.isFinite(Number(candidate.joinCount))) {
            next.joinCount = clampInt(candidate.joinCount, 1, 24)
        }
        if (Number.isFinite(Number(candidate.chachaBlockCounter))) {
            next.chachaBlockCounter = Number(candidate.chachaBlockCounter) >>> 0
        }
        if (Number.isFinite(Number(candidate.chachaOutputByteLength))) {
            next.chachaOutputByteLength = clampInt(candidate.chachaOutputByteLength, 1, 64)
        }
        if (typeof candidate.chachaQuarterPreset === 'string' && isChaChaQuarterPreset(candidate.chachaQuarterPreset)) {
            next.chachaQuarterPreset = candidate.chachaQuarterPreset
        }

        return next
    })
}

function sanitizeEdges(edges: unknown[], byId: Map<string, PlacedBlockRecord>) {
    const seen = new Set<string>()
    let normalized: GraphEdge[] = []

    for (let index = 0; index < edges.length; index += 1) {
        const edge = edges[index]
        if (!edge || typeof edge !== 'object') {
            throw new Error(`Edge #${index + 1} is invalid.`)
        }
        const candidate = edge as Partial<GraphEdge>
        if (!isNonEmptyString(candidate.id)) {
            throw new Error(`Edge #${index + 1} is missing an id.`)
        }
        if (seen.has(candidate.id)) {
            throw new Error(`Edge id "${candidate.id}" is duplicated.`)
        }
        seen.add(candidate.id)

        if (
            !candidate.from ||
            typeof candidate.from !== 'object' ||
            !isNonEmptyString(candidate.from.blockId) ||
            !isNonEmptyString(candidate.from.portKey)
        ) {
            throw new Error(`Edge #${index + 1} has an invalid source.`)
        }
        if (
            !candidate.to ||
            typeof candidate.to !== 'object' ||
            !isNonEmptyString(candidate.to.blockId) ||
            !isNonEmptyString(candidate.to.portKey)
        ) {
            throw new Error(`Edge #${index + 1} has an invalid destination.`)
        }
        if (!byId.has(candidate.from.blockId) || !byId.has(candidate.to.blockId)) {
            throw new Error(`Edge #${index + 1} references missing blocks.`)
        }

        const sanitized: GraphEdge = {
            id: candidate.id,
            from: {
                blockId: candidate.from.blockId,
                portKey: candidate.from.portKey,
            },
            to: {
                blockId: candidate.to.blockId,
                portKey: candidate.to.portKey,
            },
        }

        if (!isEdgeValidForBlocks(byId, sanitized)) {
            throw new Error(`Edge #${index + 1} has invalid ports.`)
        }

        normalized = upsertEdgeForInputPort(normalized, sanitized)
    }

    return normalized
}

function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0
}

function clampInt(value: unknown, min: number, max: number) {
    const n = Number(value)
    if (!Number.isFinite(n)) {
        return min
    }
    return Math.min(max, Math.max(min, Math.floor(n)))
}

function bytesToBase64(bytes: Uint8Array) {
    const BufferCtor = (globalThis as typeof globalThis & {
        Buffer?: { from(data: Uint8Array): { toString(encoding: 'base64'): string } }
    }).Buffer
    if (BufferCtor) {
        return BufferCtor.from(bytes).toString('base64')
    }

    const chars = []
    for (const byte of bytes) {
        chars.push(String.fromCodePoint(byte))
    }
    return btoa(chars.join(''))
}

function base64ToBytes(base64Text: string) {
    const BufferCtor = (globalThis as typeof globalThis & {
        Buffer?: { from(data: string, encoding: 'base64'): Uint8Array }
    }).Buffer
    if (BufferCtor) {
        return BufferCtor.from(base64Text, 'base64')
    }
    const binary = atob(base64Text)
    return Uint8Array.from(binary, (char) => char.codePointAt(0) ?? 0)
}

function bytesToUtf8(bytes: Uint8Array) {
    const BufferCtor = (globalThis as typeof globalThis & {
        Buffer?: { from(data: Uint8Array): { toString(encoding: 'utf8'): string } }
    }).Buffer
    if (BufferCtor) {
        return BufferCtor.from(bytes).toString('utf8')
    }
    return new TextDecoder().decode(bytes)
}

function isValidBase64Text(value: string) {
    if (value.length > 0 && value.length % 4 !== 0) {
        return false
    }
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
        return false
    }
    const firstPad = value.indexOf('=')
    if (firstPad === -1) {
        return true
    }
    return firstPad >= value.length - 2 && /^=+$/.test(value.slice(firstPad))
}
