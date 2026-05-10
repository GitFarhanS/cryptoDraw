import { describe, expect, it } from 'vitest'
import { serializeBytesToFormat } from './converter-block/format-bytes'
import {
    buildCipherTemplateGraph,
    templateUsesNewPrimitives,
    type CipherTemplateId,
} from './cipher-template-builders'
import { evaluateGraph } from './graph/evaluate-graph'
import { parseFlowchartFromBase64, serializeFlowchartToBase64 } from './graph/flowchart-io'

function outputHex(templateId: CipherTemplateId) {
    const { placedBlocks, edges } = buildCipherTemplateGraph(templateId)
    const out = placedBlocks.find((b) => b.type === 'output')
    expect(out).toBeDefined()
    const result = evaluateGraph(placedBlocks, edges)
    expect(result.cycle).toBe(false)
    const bytes = result.portBytes.get(`${out!.id}\0in`)
    expect(bytes).toBeDefined()
    return serializeBytesToFormat('hex', bytes!).toLowerCase()
}

describe('cipher templates with permute + SubBytes', () => {
    it('DES template includes permuteReorder blocks', () => {
        const { placedBlocks } = buildCipherTemplateGraph('des')
        const permutes = placedBlocks.filter((b) => b.type === 'permuteReorder')
        expect(permutes).toHaveLength(2)
        expect(permutes.some((b) => b.permutePreset === 'desIp')).toBe(true)
        expect(permutes.some((b) => b.permutePreset === 'desFp')).toBe(true)
        expect(templateUsesNewPrimitives('des')).toEqual({ permuteReorder: true, subBytes: false })
    })

    it('AES template includes subBytes after AddRoundKey', () => {
        const { placedBlocks } = buildCipherTemplateGraph('aes')
        expect(placedBlocks.some((b) => b.type === 'subBytes')).toBe(true)
        expect(templateUsesNewPrimitives('aes')).toEqual({ permuteReorder: false, subBytes: true })
    })

    it('every template round-trips Base64 import/export', () => {
        for (const id of ['rsa', 'chacha20', 'chachaQrArx', 'des', '3des', 'aes'] as const) {
            const { placedBlocks, edges } = buildCipherTemplateGraph(id)
            const b64 = serializeFlowchartToBase64(placedBlocks, edges)
            const parsed = parseFlowchartFromBase64(b64)
            expect(parsed.placedBlocks.length).toBe(placedBlocks.length)
            expect(parsed.edges.length).toBe(edges.length)
            const types = new Set(parsed.placedBlocks.map((b) => b.type))
            expect(types.has('output')).toBe(true)
        }
    })

    it('RSA toy graph yields 7^3 mod 33', () => {
        expect(outputHex('rsa')).toBe('0d')
    })

    it('ChaCha20-IETF template XOR yields RFC 8439 §2.3.2 keystream prefix XOR ChaC', () => {
        expect(outputHex('chacha20')).toBe('539986a7')
    })

    it('ChaCha QR ARX demo matches isolated quarter-round golden join', () => {
        expect(outputHex('chachaQrArx')).toBe('700010038b89b9bb0717037307100370')
    })

    it('DES IP + limb XOR + FP yields deterministic ciphertext', () => {
        expect(outputHex('des')).toBe('ceef79ce7698c245')
    })

    it('3DES triple XOR chain', () => {
        expect(outputHex('3des')).toBe('fecd98ab32015467')
    })

    it('AES AddRoundKey then SubBytes', () => {
        expect(outputHex('aes')).toBe('d42711aee0bf98f1b8b45de51e415230')
    })
})
