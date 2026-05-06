const BINARY_STRIP = /[\s_]/g
const HEX_STRIP = /[\s:.-]/g

function parseBinaryToBytes(str) {
  const bits = str.replace(BINARY_STRIP, '')
  if (bits.length === 0) {
    return new Uint8Array(0)
  }
  if (bits.length % 8 !== 0) {
    throw new Error('Binary length must be a multiple of 8 bits.')
  }
  if (!/^[01]+$/.test(bits)) {
    throw new Error('Binary must contain only 0 and 1.')
  }
  const out = new Uint8Array(bits.length / 8)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2)
  }
  return out
}

function bytesToBinary(bytes) {
  return Array.from(bytes, (b) => b.toString(2).padStart(8, '0')).join('')
}

function parseHexToBytes(str) {
  const hex = str.replace(HEX_STRIP, '').toLowerCase()
  if (hex.length === 0) {
    return new Uint8Array(0)
  }
  if (hex.length % 2 !== 0) {
    throw new Error('Hex must have an even number of characters (full bytes).')
  }
  if (!/^[0-9a-f]+$/.test(hex)) {
    throw new Error('Hex must use digits 0–9 and letters a–f.')
  }
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return out
}

function bytesToHex(bytes) {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function parseAsciiToBytes(str) {
  return new TextEncoder().encode(str)
}

function bytesToAscii(bytes) {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

function parseDecimalBytes(str) {
  const tokens = str.trim().split(/[\s,]+/).filter(Boolean)
  if (tokens.length === 0) {
    return new Uint8Array(0)
  }
  const out = new Uint8Array(tokens.length)
  for (let i = 0; i < tokens.length; i++) {
    const n = Number(tokens[i])
    if (!Number.isInteger(n) || n < 0 || n > 255) {
      throw new Error(
        `Invalid byte at position ${i + 1}: each value must be an integer between 0 and 255.`,
      )
    }
    out[i] = n
  }
  return out
}

function bytesToDecimal(bytes) {
  return Array.from(bytes, (b) => String(b)).join(' ')
}

export const BYTE_FORMATS = ['binary', 'ascii', 'hex', 'decimal']

export function parseBytesFromFormat(format, string) {
  switch (format) {
    case 'binary':
      return parseBinaryToBytes(string)
    case 'hex':
      return parseHexToBytes(string)
    case 'ascii':
      return parseAsciiToBytes(string)
    case 'decimal':
      return parseDecimalBytes(string)
    default:
      throw new Error('Unknown input format.')
  }
}

export function serializeBytesToFormat(format, bytes) {
  switch (format) {
    case 'binary':
      return bytesToBinary(bytes)
    case 'hex':
      return bytesToHex(bytes)
    case 'ascii':
      return bytesToAscii(bytes)
    case 'decimal':
      return bytesToDecimal(bytes)
    default:
      throw new Error('Unknown output format.')
  }
}
