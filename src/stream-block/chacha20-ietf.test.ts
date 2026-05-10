import { describe, expect, it } from 'vitest'
import { serializeBytesToFormat } from '../converter-block/format-bytes'
import {
    CHACHA_QUARTER_PRESETS,
    applyQuarterRoundPreset,
    buildChachaIetfInitialState,
    chacha20IetfBlock,
    chacha20IetfBlockViaQuarterRounds,
    finalizeChachaKeystream,
} from './chacha20-ietf'

/** RFC 8439 §2.3.2 first ChaCha20 block test vector (full 64-byte output). */
const RFC8439_BLOCK_VECTOR_HEX =
    '10f1e7e4d13b5915500fdd1fa32071c4' +
    'c7d1f4c733c068030422aa9ac3d46c4e' +
    'd2826446079faa0914c2d705d98b02a2' +
    'b5129cd1de164eb9cbd083e8a2503c4e'

describe('Init + 80 quarter-round presets + finalize', () => {
    it('matches RFC 8439 §2.3.2 block (explicit preset cycle)', () => {
        const key = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
            key[i] = i
        }
        const nonce = new Uint8Array([0, 0, 0, 0x09, 0, 0, 0, 0x4a, 0, 0, 0, 0])
        let state = buildChachaIetfInitialState(key, nonce, 1)
        const initial = new Uint8Array(state)
        for (let round = 0; round < 10; round++) {
            for (let j = 0; j < 8; j++) {
                state = applyQuarterRoundPreset(state, CHACHA_QUARTER_PRESETS[j]!)
            }
        }
        const ks = finalizeChachaKeystream(state, initial)
        expect(serializeBytesToFormat('hex', ks)).toBe(RFC8439_BLOCK_VECTOR_HEX)
    })
})

describe('chacha20IetfBlockViaQuarterRounds', () => {
    it('matches composed inner-round ChaCha20 block output', () => {
        const key = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
            key[i] = i
        }
        const nonce = new Uint8Array([0, 0, 0, 0x09, 0, 0, 0, 0x4a, 0, 0, 0, 0])
        const a = chacha20IetfBlock(key, nonce, 1)
        const b = chacha20IetfBlockViaQuarterRounds(key, nonce, 1)
        expect(serializeBytesToFormat('hex', a)).toBe(serializeBytesToFormat('hex', b))
    })
})

describe('chacha20IetfBlock', () => {
    it('matches RFC 8439 §2.3.2 serialized block (key counting bytes, nonce, counter 1)', () => {
        const key = new Uint8Array(32)
        for (let i = 0; i < 32; i++) {
            key[i] = i
        }
        const nonce = new Uint8Array([0, 0, 0, 0x09, 0, 0, 0, 0x4a, 0, 0, 0, 0])
        const ks = chacha20IetfBlock(key, nonce, 1)
        expect(serializeBytesToFormat('hex', ks)).toBe(RFC8439_BLOCK_VECTOR_HEX)
    })

    it('Poly1305 key derivation vector uses counter 0 (RFC 8439 Appendix A.4 #1)', () => {
        const key = new Uint8Array(32)
        const nonce = new Uint8Array(12)
        const ks = chacha20IetfBlock(key, nonce, 0)
        const polyFirstHalfHex = serializeBytesToFormat('hex', ks.slice(0, 16))
        expect(polyFirstHalfHex).toBe('76b8e0ada0f13d90405d6ae55386bd28')
    })

    it('Poly1305 key derivation Appendix A.4 #2', () => {
        const key = new Uint8Array(32)
        key[31] = 1
        const nonce = new Uint8Array(12)
        nonce[11] = 2
        const ks = chacha20IetfBlock(key, nonce, 0)
        const polyFirstHalfHex = serializeBytesToFormat('hex', ks.slice(0, 16))
        expect(polyFirstHalfHex).toBe('ecfa254f845f647473d3cb140da9e876')
    })
})
