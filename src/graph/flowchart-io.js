import { deflateSync, inflateSync } from 'fflate'
import { isPlacedBlockType } from '../input-blocks/drag-constants'
import { isEdgeValidForBlocks, upsertEdgeForInputPort } from './edge-types'

const FLOWCHART_FILE_VERSION = 1
const OP_DISPLAY_MODES = ['auto', 'manual']
const OP_DISPLAY_FORMATS = ['binary', 'ascii', 'hex', 'decimal']
const OP_SHIFT_MODES = ['logical', 'circular']
const FORMAT_VALUES = ['binary', 'ascii', 'hex', 'decimal']

export function serializeFlowchart(placedBlocks, edges) {
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

export function serializeFlowchartToBase64(placedBlocks, edges) {
  const jsonText = serializeFlowchart(placedBlocks, edges)
  const compressed = deflateSync(new TextEncoder().encode(jsonText), { level: 9 })
  return bytesToBase64(compressed)
}

export function parseFlowchartFromBase64(base64Text) {
  const trimmed = base64Text.trim()
  if (!isValidBase64Text(trimmed)) {
    throw new Error('Could not decode Base64 flowchart text.')
  }

  let data
  try {
    data = base64ToBytes(trimmed)
  } catch {
    throw new Error('Could not decode Base64 flowchart text.')
  }

  let jsonText
  try {
    jsonText = new TextDecoder().decode(inflateSync(data))
  } catch {
    jsonText = bytesToUtf8(data)
  }

  return parseFlowchartFromText(jsonText)
}

export function parseFlowchartFromText(jsonText) {
  let parsed
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error('Could not read JSON from file.')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid flowchart file format.')
  }

  const blocks = Array.isArray(parsed.placedBlocks) ? parsed.placedBlocks : null
  const edges = Array.isArray(parsed.edges) ? parsed.edges : null
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

function sanitizeBlocks(blocks) {
  const seen = new Set()
  return blocks.map((block, index) => {
    if (!block || typeof block !== 'object') {
      throw new Error(`Block #${index + 1} is invalid.`)
    }
    if (!isPlacedBlockType(block.type)) {
      throw new Error(`Block #${index + 1} has an unknown type.`)
    }
    if (!isNonEmptyString(block.id)) {
      throw new Error(`Block #${index + 1} is missing an id.`)
    }
    if (seen.has(block.id)) {
      throw new Error(`Block id "${block.id}" is duplicated.`)
    }
    seen.add(block.id)

    const x = Number(block.x)
    const y = Number(block.y)
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new Error(`Block #${index + 1} has an invalid position.`)
    }

    const next = {
      id: block.id,
      type: block.type,
      x,
      y,
    }

    if (typeof block.text === 'string') {
      next.text = block.text
    }
    if (typeof block.fcText === 'string') {
      next.fcText = block.fcText
    }
    if (FORMAT_VALUES.includes(block.fcInputFormat)) {
      next.fcInputFormat = block.fcInputFormat
    }
    if (FORMAT_VALUES.includes(block.fcOutputFormat)) {
      next.fcOutputFormat = block.fcOutputFormat
    }
    if (OP_DISPLAY_MODES.includes(block.opDisplayMode)) {
      next.opDisplayMode = block.opDisplayMode
    }
    if (OP_DISPLAY_FORMATS.includes(block.opDisplayFormat)) {
      next.opDisplayFormat = block.opDisplayFormat
    }
    if (OP_SHIFT_MODES.includes(block.opShiftMode)) {
      next.opShiftMode = block.opShiftMode
    }
    if (Number.isFinite(Number(block.blockCount))) {
      next.blockCount = clampInt(block.blockCount, 1, 24)
    }
    if (Number.isFinite(Number(block.joinCount))) {
      next.joinCount = clampInt(block.joinCount, 1, 24)
    }

    return next
  })
}

function sanitizeEdges(edges, byId) {
  const seen = new Set()
  let normalized = []

  for (let index = 0; index < edges.length; index += 1) {
    const edge = edges[index]
    if (!edge || typeof edge !== 'object') {
      throw new Error(`Edge #${index + 1} is invalid.`)
    }
    if (!isNonEmptyString(edge.id)) {
      throw new Error(`Edge #${index + 1} is missing an id.`)
    }
    if (seen.has(edge.id)) {
      throw new Error(`Edge id "${edge.id}" is duplicated.`)
    }
    seen.add(edge.id)

    if (
      !edge.from ||
      typeof edge.from !== 'object' ||
      !isNonEmptyString(edge.from.blockId) ||
      !isNonEmptyString(edge.from.portKey)
    ) {
      throw new Error(`Edge #${index + 1} has an invalid source.`)
    }
    if (
      !edge.to ||
      typeof edge.to !== 'object' ||
      !isNonEmptyString(edge.to.blockId) ||
      !isNonEmptyString(edge.to.portKey)
    ) {
      throw new Error(`Edge #${index + 1} has an invalid destination.`)
    }
    if (!byId.has(edge.from.blockId) || !byId.has(edge.to.blockId)) {
      throw new Error(`Edge #${index + 1} references missing blocks.`)
    }

    const sanitized = {
      id: edge.id,
      from: {
        blockId: edge.from.blockId,
        portKey: edge.from.portKey,
      },
      to: {
        blockId: edge.to.blockId,
        portKey: edge.to.portKey,
      },
    }

    if (!isEdgeValidForBlocks(byId, sanitized)) {
      throw new Error(`Edge #${index + 1} has invalid ports.`)
    }

    normalized = upsertEdgeForInputPort(normalized, sanitized)
  }

  return normalized
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.length > 0
}

function clampInt(value, min, max) {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return min
  }
  return Math.min(max, Math.max(min, Math.floor(n)))
}

function bytesToBase64(bytes) {
  const BufferCtor = globalThis.Buffer
  if (BufferCtor) {
    return BufferCtor.from(bytes).toString('base64')
  }

  const chars = []
  for (const byte of bytes) {
    chars.push(String.fromCharCode(byte))
  }
  return btoa(chars.join(''))
}

function base64ToBytes(base64Text) {
  const BufferCtor = globalThis.Buffer
  if (BufferCtor) {
    return BufferCtor.from(base64Text, 'base64')
  }
  const binary = atob(base64Text)
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function bytesToUtf8(bytes) {
  const BufferCtor = globalThis.Buffer
  if (BufferCtor) {
    return BufferCtor.from(bytes).toString('utf8')
  }
  return new TextDecoder().decode(bytes)
}

function isValidBase64Text(value) {
  if ((value === null || value === undefined) || (value.length > 0 && value.length % 4 !== 0)) {
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
