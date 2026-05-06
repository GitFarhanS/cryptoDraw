import {
  INPUT_BLOCK_TYPES,
  OPERATION_BLOCK_TYPES,
} from '../input-blocks/drag-constants'
import { parseBytesFromFormat, serializeBytesToFormat } from '../converter-block/format-bytes'
import { inputPortKeysForBlock, outputPortKeysForBlock } from './edge-types'

/** @typedef {import('./edge-types.js').GraphEdge} GraphEdge */

/**
 * @typedef {object} PlacedBlockRecord
 * @property {string} id
 * @property {string} type
 * @property {number} x
 * @property {number} y
 * @property {number} [blockCount]
 * @property {number} [joinCount]
 * @property {string} [text]
 * @property {string} [fcText]
 * @property {string} [fcInputFormat]
 * @property {string} [fcOutputFormat]
 */

const EMPTY = new Uint8Array(0)

/**
 * @param {Uint8Array} bytes
 * @returns {number}
 */
export function bytesToUintBE(bytes) {
  if (!bytes.length) {
    return 0
  }
  let n = 0
  for (let i = 0; i < bytes.length; i++) {
    n = (n << 8) | bytes[i]
  }
  return n >>> 0
}

/**
 * @param {number} n
 * @returns {Uint8Array}
 */
export function uintToBytesBE(n) {
  const x = n >>> 0
  const buf = new Uint8Array(4)
  new DataView(buf.buffer).setUint32(0, x, false)
  let start = 0
  while (start < 3 && buf[start] === 0) {
    start += 1
  }
  return buf.slice(start)
}

/**
 * @param {PlacedBlockRecord[]} placedBlocks
 * @param {GraphEdge[]} edges
 */
export function evaluateGraph(placedBlocks, edges) {
  /** @type {Map<string, PlacedBlockRecord>} */
  const byId = new Map(placedBlocks.map((b) => [b.id, b]))

  /** @type {Map<string, number>} */
  const indeg = new Map()
  for (const b of placedBlocks) {
    indeg.set(b.id, 0)
  }

  for (const e of edges) {
    if (!byId.has(e.from.blockId) || !byId.has(e.to.blockId)) {
      continue
    }
    const v = e.to.blockId
    indeg.set(v, (indeg.get(v) ?? 0) + 1)
  }

  /** @type {string[]} */
  const order = []
  const queue = placedBlocks.filter((b) => (indeg.get(b.id) ?? 0) === 0).map((b) => b.id)

  while (queue.length) {
    const u = queue.shift()
    if (u === undefined) {
      break
    }
    order.push(u)

    for (const e of edges) {
      if (e.from.blockId !== u) {
        continue
      }
      const v = e.to.blockId
      if (!byId.has(v)) {
        continue
      }
      const next = (indeg.get(v) ?? 0) - 1
      indeg.set(v, next)
      if (next === 0) {
        queue.push(v)
      }
    }
  }

  if (order.length !== placedBlocks.length) {
    return { portBytes: new Map(), cycle: true }
  }

  /** @type {Map<string, Uint8Array>} */
  const portBytes = new Map()

  function setPort(blockId, portKey, bytes) {
    portBytes.set(`${blockId}\0${portKey}`, bytes)
  }

  function getPort(blockId, portKey) {
    return portBytes.get(`${blockId}\0${portKey}`) ?? EMPTY
  }

  for (const blockId of order) {
    for (const e of edges) {
      if (e.to.blockId !== blockId) {
        continue
      }
      const payload =
        portBytes.get(`${e.from.blockId}\0${e.from.portKey}`) ?? EMPTY
      setPort(e.to.blockId, e.to.portKey, payload)
    }

    const block = byId.get(blockId)
    if (!block) {
      continue
    }
    const { type } = block
    const params = {
      blockCount: block.blockCount,
      joinCount: block.joinCount,
    }

    if (INPUT_BLOCK_TYPES.includes(type)) {
      const raw = block.text ?? ''
      try {
        const fmt =
          type === 'binary'
            ? 'binary'
            : type === 'hex'
              ? 'hex'
              : type === 'decimal'
                ? 'decimal'
                : 'ascii'
        const bytes = raw.trim() === '' ? EMPTY : parseBytesFromFormat(fmt, raw)
        setPort(blockId, 'out', bytes)
      } catch {
        setPort(blockId, 'out', EMPTY)
      }
      continue
    }

    if (type === 'formatConvert') {
      const inFmt = block.fcInputFormat ?? 'hex'
      const wiredIn = getPort(blockId, 'in')
      let bytes = wiredIn
      if (bytes === EMPTY || bytes.length === 0) {
        const manual = block.fcText ?? ''
        if (manual.trim() !== '') {
          try {
            bytes = parseBytesFromFormat(inFmt, manual)
          } catch {
            bytes = EMPTY
          }
        }
      }
      try {
        setPort(blockId, 'out', bytes)
      } catch {
        setPort(blockId, 'out', EMPTY)
      }
      continue
    }

    if (type === 'splitIntoLots') {
      const nOut = outputPortKeysForBlock(type, params).length
      const inputBytes = getPort(blockId, 'in')
      if (nOut <= 0) {
        continue
      }
      const chunkSize = Math.ceil(inputBytes.length / nOut)
      for (let i = 0; i < nOut; i++) {
        const start = i * chunkSize
        const slice = inputBytes.slice(start, start + chunkSize)
        setPort(blockId, `out:${i}`, slice)
      }
      continue
    }

    if (type === 'joinLots') {
      const keys = inputPortKeysForBlock(type, params)
      const pieces = keys.map((k) => getPort(blockId, k))
      let total = 0
      for (const p of pieces) {
        total += p.length
      }
      const merged = new Uint8Array(total)
      let off = 0
      for (const p of pieces) {
        merged.set(p, off)
        off += p.length
      }
      setPort(blockId, 'out', merged)
      continue
    }

    if (type === 'output') {
      continue
    }

    if (OPERATION_BLOCK_TYPES.includes(type)) {
      const a = bytesToUintBE(getPort(blockId, 'in:a'))
      const b = bytesToUintBE(getPort(blockId, 'in:b'))
      let out
      switch (type) {
        case 'opXor':
          out = (a ^ b) >>> 0
          break
        case 'opBitwiseAnd':
          out = (a & b) >>> 0
          break
        case 'opLeftShift':
          out = (a << (b % 32)) >>> 0
          break
        case 'opRightShift':
          out = (a >>> (b % 32)) >>> 0
          break
        case 'opMod':
          out = b === 0 ? 0 : (a % b) >>> 0
          break
        case 'opPow':
          out = Math.min(Number.MAX_SAFE_INTEGER, a ** Math.min(b, 64)) >>> 0
          break
        case 'opAdd':
          out = (a + b) >>> 0
          break
        case 'opMul':
          out = (a * b) >>> 0
          break
        default:
          out = 0
      }
      setPort(blockId, 'out', uintToBytesBE(out ?? 0))
    }
  }

  return { portBytes, cycle: false }
}

/**
 * Bytes on wire for format-convert manual preview (UTF-8 of serialized string).
 * @param {Uint8Array} bytes
 * @param {string} format
 */
export function formatBytesForDisplay(bytes, format) {
  try {
    return serializeBytesToFormat(format, bytes)
  } catch {
    return ''
  }
}
