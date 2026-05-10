/**
 * ChaCha20-IETF (RFC 8439 §2.3): LE state layout, quarter-rounds, keystream block.
 */

function rotl32(x: number, n: number) {
    return ((x << n) | (x >>> (32 - n))) >>> 0
}

export function quarterRoundOnWords(s: Uint32Array, a: number, b: number, c: number, d: number) {
    s[a] = (s[a]! + s[b]!) >>> 0
    s[d] ^= s[a]!
    s[d] = rotl32(s[d]!, 16)
    s[c] = (s[c]! + s[d]!) >>> 0
    s[b] ^= s[c]!
    s[b] = rotl32(s[b]!, 12)
    s[a] = (s[a]! + s[b]!) >>> 0
    s[d] ^= s[a]!
    s[d] = rotl32(s[d]!, 8)
    s[c] = (s[c]! + s[d]!) >>> 0
    s[b] ^= s[c]!
    s[b] = rotl32(s[b]!, 7)
}

export function innerBlockOnWords(state: Uint32Array) {
    quarterRoundOnWords(state, 0, 4, 8, 12)
    quarterRoundOnWords(state, 1, 5, 9, 13)
    quarterRoundOnWords(state, 2, 6, 10, 14)
    quarterRoundOnWords(state, 3, 7, 11, 15)
    quarterRoundOnWords(state, 0, 5, 10, 15)
    quarterRoundOnWords(state, 1, 6, 11, 12)
    quarterRoundOnWords(state, 2, 7, 8, 13)
    quarterRoundOnWords(state, 3, 4, 9, 14)
}

const CONSTANTS = new Uint32Array([0x6170_7865, 0x3320_646e, 0x7962_2d32, 0x6b20_6574])

export function readUint32LE(bytes: Uint8Array, offset: number) {
    const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, 4)
    return dv.getUint32(0, true)
}

export function bytesToState16(bytes64: Uint8Array): Uint32Array {
    if (bytes64.length !== 64) {
        throw new Error(`ChaCha state must be 64 bytes, got ${bytes64.length}.`)
    }
    const state = new Uint32Array(16)
    for (let i = 0; i < 16; i++) {
        state[i] = readUint32LE(bytes64, i * 4)
    }
    return state
}

export function state16ToBytes(state: Uint32Array): Uint8Array {
    const out = new Uint8Array(64)
    const dv = new DataView(out.buffer)
    for (let i = 0; i < 16; i++) {
        dv.setUint32(i * 4, state[i]!, true)
    }
    return out
}

export const CHACHA_QUARTER_PRESETS = [
    'col0',
    'col1',
    'col2',
    'col3',
    'diag0',
    'diag1',
    'diag2',
    'diag3',
] as const

export type ChaChaQuarterPreset = (typeof CHACHA_QUARTER_PRESETS)[number]

const PRESET_INDICES: Record<ChaChaQuarterPreset, readonly [number, number, number, number]> = {
    col0: [0, 4, 8, 12],
    col1: [1, 5, 9, 13],
    col2: [2, 6, 10, 14],
    col3: [3, 7, 11, 15],
    diag0: [0, 5, 10, 15],
    diag1: [1, 6, 11, 12],
    diag2: [2, 7, 8, 13],
    diag3: [3, 4, 9, 14],
}

export function isChaChaQuarterPreset(value: string): value is ChaChaQuarterPreset {
    return (CHACHA_QUARTER_PRESETS as readonly string[]).includes(value)
}

/** Apply one quarter-round to a 64-byte LE state (immutable copy). */
export function applyQuarterRoundPreset(state64: Uint8Array, preset: ChaChaQuarterPreset): Uint8Array {
    const words = bytesToState16(state64)
    const idx = PRESET_INDICES[preset]
    quarterRoundOnWords(words, idx[0], idx[1], idx[2], idx[3])
    return state16ToBytes(words)
}

export function applyColumnRound(state64: Uint8Array): Uint8Array {
    let cur = state64
    for (let i = 0; i < 4; i++) {
        cur = applyQuarterRoundPreset(cur, CHACHA_QUARTER_PRESETS[i]!)
    }
    return cur
}

export function applyDiagonalRound(state64: Uint8Array): Uint8Array {
    let cur = state64
    for (let i = 4; i < 8; i++) {
        cur = applyQuarterRoundPreset(cur, CHACHA_QUARTER_PRESETS[i]!)
    }
    return cur
}

/** Full keystream block after rounds + add original state (RFC ChaCha20 block output). */
export function finalizeChachaKeystream(workState64: Uint8Array, initialState64: Uint8Array): Uint8Array {
    const work = bytesToState16(workState64)
    const initial = bytesToState16(initialState64)
    for (let i = 0; i < 16; i++) {
        work[i] = (work[i]! + initial[i]!) >>> 0
    }
    return state16ToBytes(work)
}

/** RFC 8439 initial state before rounds (64 bytes LE). */
export function buildChachaIetfInitialState(
    key32: Uint8Array,
    nonce12: Uint8Array,
    blockCounter: number,
): Uint8Array {
    if (key32.length !== 32) {
        throw new Error(`ChaCha20-IETF key must be 32 bytes, got ${key32.length}.`)
    }
    if (nonce12.length !== 12) {
        throw new Error(`ChaCha20-IETF nonce must be 12 bytes, got ${nonce12.length}.`)
    }

    const working = new Uint32Array(16)
    working.set(CONSTANTS, 0)
    for (let i = 0; i < 8; i++) {
        working[4 + i] = readUint32LE(key32, i * 4)
    }
    working[12] = blockCounter >>> 0
    working[13] = readUint32LE(nonce12, 0)
    working[14] = readUint32LE(nonce12, 4)
    working[15] = readUint32LE(nonce12, 8)
    return state16ToBytes(working)
}

/** One ChaCha20 keystream block (composition helper + tests). */
export function chacha20IetfBlock(key32: Uint8Array, nonce12: Uint8Array, blockCounter: number): Uint8Array {
    let state = buildChachaIetfInitialState(key32, nonce12, blockCounter)
    const initial = new Uint8Array(state)
    for (let i = 0; i < 10; i++) {
        state = applyColumnRound(state)
        state = applyDiagonalRound(state)
    }
    return finalizeChachaKeystream(state, initial)
}

/** Expand keystream block via explicit quarter-round sequence (for tests). */
export function chacha20IetfBlockViaQuarterRounds(
    key32: Uint8Array,
    nonce12: Uint8Array,
    blockCounter: number,
): Uint8Array {
    let state = buildChachaIetfInitialState(key32, nonce12, blockCounter)
    const initial = new Uint8Array(state)
    const cycle = CHACHA_QUARTER_PRESETS
    for (let round = 0; round < 10; round++) {
        for (let j = 0; j < 8; j++) {
            state = applyQuarterRoundPreset(state, cycle[j]!)
        }
    }
    return finalizeChachaKeystream(state, initial)
}

/** One quarter-round on four isolated uint32 values (indices 0–3). For ARX demo golden checks. */
export function quarterRoundIsolatedFour(a: number, b: number, c: number, d: number): [number, number, number, number] {
    const s = new Uint32Array([a >>> 0, b >>> 0, c >>> 0, d >>> 0])
    quarterRoundOnWords(s, 0, 1, 2, 3)
    return [s[0]!, s[1]!, s[2]!, s[3]!]
}
