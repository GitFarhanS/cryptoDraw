import {
  INPUT_BLOCK_TYPES,
  OPERATION_BLOCK_TYPES,
} from '../input-blocks/drag-constants'
import { parseBytesFromFormat, serializeBytesToFormat } from '../converter-block/format-bytes'
import {
  inputPortKeysForBlock,
  outputPortKeysForBlock,
  isEdgeValidForBlocks,
} from './edge-types'

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
 * @property {'auto' | 'manual'} [opDisplayMode]
 * @property {'binary' | 'ascii' | 'hex' | 'decimal'} [opDisplayFormat]
 * @property {'logical' | 'circular'} [opShiftMode]
 */

const EMPTY = new Uint8Array(0)
const BINARY_STRIP = /[\s_]/g

function normalizeInputFormat(type) {
  if (type === 'binary') {
    return 'binary'
  }
  if (type === 'hex') {
    return 'hex'
  }
  if (type === 'decimal') {
    return 'decimal'
  }
  return 'ascii'
}

function bytesToBitString(bytes, bitLength = bytes.length * 8) {
  const allBits = Array.from(bytes, (b) => b.toString(2).padStart(8, '0')).join('')
  return allBits.slice(0, Math.max(0, bitLength))
}

function bitStringToBytes(bits) {
  if (!bits.length) {
    return new Uint8Array(0)
  }
  const padded = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0')
  const out = new Uint8Array(padded.length / 8)
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(padded.slice(i * 8, i * 8 + 8), 2)
  }
  return out
}

function resolveOperationFormat(formatA, formatB, mode = 'auto', manualFormat = 'hex') {
  if (mode === 'manual') {
    return manualFormat
  }
  if (formatA && formatB) {
    return formatA === formatB ? formatA : 'hex'
  }
  return formatA ?? formatB ?? 'hex'
}

function bitLengthOfUnsigned(n) {
  const x = n >>> 0
  if (x === 0) {
    return 1
  }
  return Math.floor(Math.log2(x)) + 1
}

function bitMask(width) {
  if (width >= 32) {
    return 0xffffffff
  }
  return ((1 << width) - 1) >>> 0
}

function rotateLeftUnsigned(value, shift, width) {
  const masked = (value & bitMask(width)) >>> 0
  const amount = width === 0 ? 0 : shift % width
  if (amount === 0) {
    return masked
  }
  const left = (masked << amount) >>> 0
  const right = masked >>> (width - amount)
  return ((left | right) & bitMask(width)) >>> 0
}

function rotateRightUnsigned(value, shift, width) {
  const masked = (value & bitMask(width)) >>> 0
  const amount = width === 0 ? 0 : shift % width
  if (amount === 0) {
    return masked
  }
  const right = masked >>> amount
  const left = (masked << (width - amount)) >>> 0
  return ((left | right) & bitMask(width)) >>> 0
}

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
  const edgeByInputPort = new Map()

  /** @type {string[]} */
  const diagnostics = []
  const note = (msg) => {
    diagnostics.push(msg)
  }
  const blockParams = (b) => ({
    blockCount: b.blockCount,
    joinCount: b.joinCount,
  })

  /** @type {Map<string, number>} */
  const indeg = new Map()
  for (const b of placedBlocks) {
    indeg.set(b.id, 0)
  }

  for (const e of edges) {
    const fromBlock = byId.get(e.from.blockId)
    const toBlock = byId.get(e.to.blockId)
    if (!fromBlock || !toBlock) {
      note(`Ignoring orphan edge ${e.id}`)
      continue
    }
    if (!isEdgeValidForBlocks(byId, e)) {
      note(`Ignoring invalid edge ${e.id}`)
      continue
    }
    const targetRef = `${e.to.blockId}\0${e.to.portKey}`
    if (edgeByInputPort.has(targetRef)) {
      note(`Multiple writers for ${targetRef}; latest edge wins`)
    }
    edgeByInputPort.set(targetRef, e)
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

    for (const e of edgeByInputPort.values()) {
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
    note('Cycle detected; evaluation aborted')
    return {
      portBytes: new Map(),
      portFormats: new Map(),
      portBitLengths: new Map(),
      cycle: true,
      diagnostics,
    }
  }

  /** @type {Map<string, Uint8Array>} */
  const portBytes = new Map()
  /** @type {Map<string, string>} */
  const portFormats = new Map()
  /** @type {Map<string, number>} */
  const portBitLengths = new Map()

  function setPort(blockId, portKey, bytes, options = {}) {
    const ref = `${blockId}\0${portKey}`
    portBytes.set(ref, bytes)
    if (typeof options.format === 'string') {
      portFormats.set(ref, options.format)
    }
    if (typeof options.bitLength === 'number') {
      portBitLengths.set(ref, options.bitLength)
    }
  }

  function getPort(blockId, portKey) {
    return portBytes.get(`${blockId}\0${portKey}`) ?? EMPTY
  }

  function getPortFormat(blockId, portKey) {
    return portFormats.get(`${blockId}\0${portKey}`)
  }

  function getPortBitLength(blockId, portKey) {
    return portBitLengths.get(`${blockId}\0${portKey}`)
  }

  function getPortAsUint(blockId, portKey) {
    const bytes = getPort(blockId, portKey)
    const format = getPortFormat(blockId, portKey)
    if (format === 'binary') {
      const bitLength = getPortBitLength(blockId, portKey) ?? bytes.length * 8
      const bits = bytesToBitString(bytes, bitLength)
      if (!bits) {
        return 0
      }
      return Number.parseInt(bits, 2) >>> 0
    }
    return bytesToUintBE(bytes)
  }

  for (const blockId of order) {
    for (const e of edgeByInputPort.values()) {
      if (e.to.blockId !== blockId) {
        continue
      }
      const payload =
        portBytes.get(`${e.from.blockId}\0${e.from.portKey}`) ?? EMPTY
      const payloadFormat = getPortFormat(e.from.blockId, e.from.portKey)
      const payloadBitLength = getPortBitLength(e.from.blockId, e.from.portKey)
      if (payload === EMPTY || payload.length === 0) {
        note(`Empty payload propagated ${e.from.blockId}:${e.from.portKey} -> ${e.to.blockId}:${e.to.portKey}`)
      }
      setPort(e.to.blockId, e.to.portKey, payload, {
        format: payloadFormat,
        bitLength: payloadBitLength,
      })
    }

    const block = byId.get(blockId)
    if (!block) {
      continue
    }
    const { type } = block
    const params = blockParams(block)

    if (INPUT_BLOCK_TYPES.includes(type)) {
      const raw = block.text ?? ''
      try {
        const fmt = normalizeInputFormat(type)
        const bytes = raw.trim() === '' ? EMPTY : parseBytesFromFormat(fmt, raw)
        const bitLength =
          fmt === 'binary'
            ? raw.replace(BINARY_STRIP, '').length
            : bytes.length * 8
        setPort(blockId, 'out', bytes, {
          format: fmt,
          bitLength,
        })
      } catch {
        setPort(blockId, 'out', EMPTY, {
          format: normalizeInputFormat(type),
          bitLength: 0,
        })
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
        setPort(blockId, 'out', bytes, {
          format: block.fcOutputFormat ?? getPortFormat(blockId, 'in') ?? 'hex',
          bitLength: getPortBitLength(blockId, 'in') ?? bytes.length * 8,
        })
      } catch {
        setPort(blockId, 'out', EMPTY, {
          format: block.fcOutputFormat ?? 'hex',
          bitLength: 0,
        })
      }
      continue
    }

    if (type === 'splitIntoLots') {
      const nOut = outputPortKeysForBlock(type, params).length
      const inputBytes = getPort(blockId, 'in')
      const inputBitsLen = getPortBitLength(blockId, 'in') ?? inputBytes.length * 8
      if (nOut <= 0) {
        continue
      }
      const bitString = bytesToBitString(inputBytes, inputBitsLen)
      const chunkBits = Math.ceil(bitString.length / nOut)
      for (let i = 0; i < nOut; i++) {
        const startBit = i * chunkBits
        const pieceBits = bitString.slice(startBit, startBit + chunkBits)
        setPort(blockId, `out:${i}`, bitStringToBytes(pieceBits), {
          format: getPortFormat(blockId, 'in'),
          bitLength: pieceBits.length,
        })
      }
      continue
    }

    if (type === 'joinLots') {
      const keys = inputPortKeysForBlock(type, params)
      const pieces = keys.map((k) => getPort(blockId, k))
      const mergedBits = keys
        .map((k, i) => {
          const bits = getPortBitLength(blockId, k) ?? pieces[i].length * 8
          return bytesToBitString(pieces[i], bits)
        })
        .join('')
      setPort(blockId, 'out', bitStringToBytes(mergedBits), {
        format: getPortFormat(blockId, keys[0]) ?? 'hex',
        bitLength: mergedBits.length,
      })
      continue
    }

    if (type === 'output') {
      continue
    }

    if (OPERATION_BLOCK_TYPES.includes(type)) {
      const a = getPortAsUint(blockId, 'in:a')
      const b = getPortAsUint(blockId, 'in:b')
      const inFmtA = getPortFormat(blockId, 'in:a')
      const inFmtB = getPortFormat(blockId, 'in:b')
      const inBitsA = getPortBitLength(blockId, 'in:a') ?? 0
      const inBitsB = getPortBitLength(blockId, 'in:b') ?? 0
      const shiftMode = block.opShiftMode ?? 'logical'
      const outFmt = resolveOperationFormat(
        inFmtA,
        inFmtB,
        block.opDisplayMode ?? 'auto',
        block.opDisplayFormat ?? 'hex',
      )
      let out
      switch (type) {
        case 'opXor':
          out = (a ^ b) >>> 0
          break
        case 'opBitwiseAnd':
          out = (a & b) >>> 0
          break
        case 'opLeftShift': {
          if (shiftMode === 'circular') {
            const width = Math.max(1, Math.min(32, Math.max(inBitsA, bitLengthOfUnsigned(a), 1)))
            out = rotateLeftUnsigned(a, b, width)
          } else {
            out = (a << (b % 32)) >>> 0
          }
          break
        }
        case 'opRightShift': {
          if (shiftMode === 'circular') {
            const width = Math.max(1, Math.min(32, Math.max(inBitsA, bitLengthOfUnsigned(a), 1)))
            out = rotateRightUnsigned(a, b, width)
          } else {
            out = (a >>> (b % 32)) >>> 0
          }
          break
        }
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
      const outValue = out ?? 0
      const outBitLength =
        outFmt === 'binary'
          ? Math.max(bitLengthOfUnsigned(outValue), inBitsA, inBitsB, 1)
          : bitLengthOfUnsigned(outValue)
      const outBits = (outValue >>> 0).toString(2).padStart(outBitLength, '0')
      const outBytes = outFmt === 'binary' ? bitStringToBytes(outBits) : uintToBytesBE(outValue)
      setPort(blockId, 'out', outBytes, {
        format: outFmt,
        bitLength: outFmt === 'binary' ? outBitLength : outBytes.length * 8,
      })
    }
  }

  return { portBytes, portFormats, portBitLengths, cycle: false, diagnostics }
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
