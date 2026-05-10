import type { GraphEdge, PlacedBlockRecord } from './types/graph'
import { CHACHA_QUARTER_PRESETS } from './stream-block/chacha20-ietf'

export type CipherTemplateId = 'rsa' | 'chacha20' | 'chachaQrArx' | 'des' | '3des' | 'aes'

export type CipherTemplateCategory = 'Asymmetric' | 'Stream' | 'Block'

export interface CipherTemplateMeta {
    id: CipherTemplateId
    category: CipherTemplateCategory
    title: string
    description: string
}

export const CIPHER_TEMPLATE_META: CipherTemplateMeta[] = [
    {
        id: 'rsa',
        category: 'Asymmetric',
        title: 'RSA',
        description:
            'Toy 32-bit RSA step: m^e mod n (hex). Example m=7, e=3, n=33 → 0x0d. Swap operands for your modulus.',
    },
    {
        id: 'chacha20',
        category: 'Stream',
        title: 'ChaCha20',
        description:
            'RFC 8439 ChaCha20-IETF composed from Stream blocks: Init + eighty chained QuarterRounds (col/diag presets cycling ten rounds) + Finalize → four keystream bytes; XOR with ASCII plaintext ChaC. Init packs constants/key/nonce/counter as LE words — unlike Join lots.',
    },
    {
        id: 'chachaQrArx',
        category: 'Stream',
        title: 'ChaCha quarter-round (ARX)',
        description:
            'Toy limbs (32-bit binary operands): mirrors one isolated ChaCha quarter-round via Add/XOR/circular left shift using rotations 16,12,8,7 — pedagogical only; encoding matches evaluate-graph BE/bit widths.',
    },
    {
        id: 'des',
        category: 'Block',
        title: 'DES',
        description:
            'DES-shaped XOR layer: initial permutation (IP), 32-bit limb XOR with key, final permutation (FP). Full DES still needs Feistel rounds and S-boxes.',
    },
    {
        id: '3des',
        category: 'Block',
        title: '3DES',
        description:
            'Three successive 64-bit XOR rounds with three keys (split/join). Illustrates layered mixing only; not standard EDE triple-DES.',
    },
    {
        id: 'aes',
        category: 'Block',
        title: 'AES',
        description:
            'AES-128 initial round: AddRoundKey (four 32-bit XOR limbs), then SubBytes on the state — matches one real AES step before ShiftRows.',
    },
]

/** Panel section order for grouped template listing. */
export const CIPHER_TEMPLATE_CATEGORY_ORDER: CipherTemplateCategory[] = ['Asymmetric', 'Stream', 'Block']

const opHex: Pick<PlacedBlockRecord, 'opDisplayMode' | 'opDisplayFormat' | 'opShiftMode'> = {
    opDisplayMode: 'manual',
    opDisplayFormat: 'hex',
    opShiftMode: 'logical',
}

function nid(): string {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID()
    }
    return `ct-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function edge(fromBlockId: string, fromPortKey: string, toBlockId: string, toPortKey: string): GraphEdge {
    return {
        id: nid(),
        from: { blockId: fromBlockId, portKey: fromPortKey },
        to: { blockId: toBlockId, portKey: toPortKey },
    }
}

function buildRsa(): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    const m = nid()
    const e = nid()
    const n = nid()
    const pow = nid()
    const mod = nid()
    const out = nid()

    const placedBlocks: PlacedBlockRecord[] = [
        { id: m, type: 'hex', x: 72, y: 120, text: '07' },
        { id: e, type: 'hex', x: 72, y: 268, text: '03' },
        { id: n, type: 'hex', x: 72, y: 416, text: '21' },
        { id: pow, type: 'opPow', x: 372, y: 188, ...opHex },
        { id: mod, type: 'opMod', x: 616, y: 228, ...opHex },
        { id: out, type: 'output', x: 868, y: 228 },
    ]

    const edges: GraphEdge[] = [
        edge(m, 'out', pow, 'in:a'),
        edge(e, 'out', pow, 'in:b'),
        edge(pow, 'out', mod, 'in:a'),
        edge(n, 'out', mod, 'in:b'),
        edge(mod, 'out', out, 'in'),
    ]

    return { placedBlocks, edges }
}

function buildChaCha20(): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    const pt = nid()
    const keyHex = nid()
    const nonceHex = nid()
    const init = nid()
    const qrIds = Array.from({ length: 80 }, () => nid())
    const fin = nid()
    const sPt = nid()
    const sKs = nid()
    const xors = [nid(), nid(), nid(), nid()]
    const join = nid()
    const out = nid()

    const cols = 8
    const qrBaseX = 420
    const qrBaseY = 44
    const cellW = 118
    const cellH = 54
    const gridRight = qrBaseX + cols * cellW
    const postGridPad = 108
    const finX = gridRight + postGridPad
    const splitX = gridRight + postGridPad + 368
    const xorColX = gridRight + postGridPad + 568
    const joinX = gridRight + postGridPad + 788
    const outX = gridRight + postGridPad + 1018

    const placedBlocks: PlacedBlockRecord[] = [
        { id: pt, type: 'ascii', x: 60, y: 160, text: 'ChaC' },
        {
            id: keyHex,
            type: 'hex',
            x: 60,
            y: 300,
            text: '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f',
        },
        {
            id: nonceHex,
            type: 'hex',
            x: 60,
            y: 460,
            text: '000000090000004a00000000',
        },
        {
            id: init,
            type: 'chachaIetfInit',
            x: 260,
            y: 360,
            chachaBlockCounter: 1,
        },
        ...qrIds.map((id, i) => ({
            id,
            type: 'chachaIetfQuarterRound' as const,
            x: qrBaseX + (i % cols) * cellW,
            y: qrBaseY + Math.floor(i / cols) * cellH,
            chachaQuarterPreset: CHACHA_QUARTER_PRESETS[i % 8]!,
        })),
        {
            id: fin,
            type: 'chachaIetfFinalize',
            x: finX,
            y: qrBaseY + 4 * cellH,
            chachaOutputByteLength: 4,
        },
        { id: sPt, type: 'splitIntoLots', x: splitX, y: 120, blockCount: 4 },
        { id: sKs, type: 'splitIntoLots', x: splitX, y: 296, blockCount: 4 },
        ...xors.map((id, i) => ({ id, type: 'opXor' as const, x: xorColX, y: 84 + i * 76, ...opHex })),
        { id: join, type: 'joinLots', x: joinX, y: 208, joinCount: 4 },
        { id: out, type: 'output', x: outX, y: 228 },
    ]

    const edges: GraphEdge[] = [
        edge(keyHex, 'out', init, 'in:key'),
        edge(nonceHex, 'out', init, 'in:nonce'),
        edge(init, 'out', qrIds[0]!, 'in'),
        edge(init, 'out', fin, 'in:initial'),
        ...Array.from({ length: 79 }, (_, i) => edge(qrIds[i]!, 'out', qrIds[i + 1]!, 'in')),
        edge(qrIds[79]!, 'out', fin, 'in:state'),
        edge(fin, 'out', sKs, 'in'),
        edge(pt, 'out', sPt, 'in'),
        ...[0, 1, 2, 3].map((i) => edge(sPt, `out:${i}`, xors[i]!, 'in:a')),
        ...[0, 1, 2, 3].map((i) => edge(sKs, `out:${i}`, xors[i]!, 'in:b')),
        ...[0, 1, 2, 3].map((i) => edge(xors[i]!, 'out', join, `in:${i}`)),
        edge(join, 'out', out, 'in'),
    ]

    return { placedBlocks, edges }
}

function bin32(n: number): string {
    return (n >>> 0).toString(2).padStart(32, '0')
}

/** One ChaCha quarter-round as explicit ARX (binary u32 limbs). */
function buildChaChaQrArxDemo(): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    const ha = nid()
    const hb = nid()
    const hc = nid()
    const hd = nid()
    const k16 = nid()
    const k12 = nid()
    const k8 = nid()
    const k7 = nid()
    const n1 = nid()
    const n2 = nid()
    const n3 = nid()
    const n4 = nid()
    const n5 = nid()
    const n6 = nid()
    const n7 = nid()
    const n8 = nid()
    const n9 = nid()
    const n10 = nid()
    const n11 = nid()
    const n12 = nid()
    const join = nid()
    const out = nid()

    const opBinLog: Pick<PlacedBlockRecord, 'opDisplayMode' | 'opDisplayFormat' | 'opShiftMode'> = {
        opDisplayMode: 'manual',
        opDisplayFormat: 'binary',
        opShiftMode: 'logical',
    }
    const opBinCirc: Pick<PlacedBlockRecord, 'opDisplayMode' | 'opDisplayFormat' | 'opShiftMode'> = {
        opDisplayMode: 'manual',
        opDisplayFormat: 'binary',
        opShiftMode: 'circular',
    }

    const arxX = 328
    const placedBlocks: PlacedBlockRecord[] = [
        { id: ha, type: 'binary', x: 40, y: 40, text: bin32(1) },
        { id: hb, type: 'binary', x: 40, y: 120, text: bin32(2) },
        { id: hc, type: 'binary', x: 40, y: 200, text: bin32(3) },
        { id: hd, type: 'binary', x: 40, y: 280, text: bin32(4) },
        { id: k16, type: 'decimal', x: 40, y: 380, text: '16' },
        { id: k12, type: 'decimal', x: 40, y: 440, text: '12' },
        { id: k8, type: 'decimal', x: 40, y: 500, text: '8' },
        { id: k7, type: 'decimal', x: 40, y: 560, text: '7' },
        { id: n1, type: 'opAdd', x: arxX, y: 60, ...opBinLog },
        { id: n2, type: 'opXor', x: arxX + 140, y: 60, ...opBinLog },
        { id: n3, type: 'opLeftShift', x: arxX + 280, y: 60, ...opBinCirc },
        { id: n4, type: 'opAdd', x: arxX, y: 160, ...opBinLog },
        { id: n5, type: 'opXor', x: arxX + 140, y: 160, ...opBinLog },
        { id: n6, type: 'opLeftShift', x: arxX + 280, y: 160, ...opBinCirc },
        { id: n7, type: 'opAdd', x: arxX, y: 260, ...opBinLog },
        { id: n8, type: 'opXor', x: arxX + 140, y: 260, ...opBinLog },
        { id: n9, type: 'opLeftShift', x: arxX + 280, y: 260, ...opBinCirc },
        { id: n10, type: 'opAdd', x: arxX, y: 360, ...opBinLog },
        { id: n11, type: 'opXor', x: arxX + 140, y: 360, ...opBinLog },
        { id: n12, type: 'opLeftShift', x: arxX + 280, y: 360, ...opBinCirc },
        { id: join, type: 'joinLots', x: arxX + 500, y: 220, joinCount: 4 },
        { id: out, type: 'output', x: arxX + 720, y: 240 },
    ]

    const edges: GraphEdge[] = [
        edge(ha, 'out', n1, 'in:a'),
        edge(hb, 'out', n1, 'in:b'),
        edge(hd, 'out', n2, 'in:a'),
        edge(n1, 'out', n2, 'in:b'),
        edge(n2, 'out', n3, 'in:a'),
        edge(k16, 'out', n3, 'in:b'),
        edge(hc, 'out', n4, 'in:a'),
        edge(n3, 'out', n4, 'in:b'),
        edge(hb, 'out', n5, 'in:a'),
        edge(n4, 'out', n5, 'in:b'),
        edge(n5, 'out', n6, 'in:a'),
        edge(k12, 'out', n6, 'in:b'),
        edge(n1, 'out', n7, 'in:a'),
        edge(n6, 'out', n7, 'in:b'),
        edge(n3, 'out', n8, 'in:a'),
        edge(n7, 'out', n8, 'in:b'),
        edge(n8, 'out', n9, 'in:a'),
        edge(k8, 'out', n9, 'in:b'),
        edge(n4, 'out', n10, 'in:a'),
        edge(n9, 'out', n10, 'in:b'),
        edge(n6, 'out', n11, 'in:a'),
        edge(n10, 'out', n11, 'in:b'),
        edge(n11, 'out', n12, 'in:a'),
        edge(k7, 'out', n12, 'in:b'),
        edge(n7, 'out', join, 'in:0'),
        edge(n12, 'out', join, 'in:1'),
        edge(n10, 'out', join, 'in:2'),
        edge(n9, 'out', join, 'in:3'),
        edge(join, 'out', out, 'in'),
    ]

    return { placedBlocks, edges }
}

/** DES IP → limb XOR → FP using permuteReorder presets. */
function buildDesIpXorFp(): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    const pt = nid()
    const key = nid()
    const ip = nid()
    const sPt = nid()
    const sK = nid()
    const x0 = nid()
    const x1 = nid()
    const j = nid()
    const fp = nid()
    const out = nid()

    const placedBlocks: PlacedBlockRecord[] = [
        { id: pt, type: 'hex', x: 36, y: 224, text: '0123456789abcdef' },
        { id: key, type: 'hex', x: 36, y: 388, text: '133457799bbcdff1' },
        {
            id: ip,
            type: 'permuteReorder',
            x: 268,
            y: 164,
            permuteMode: 'bits',
            permutePreset: 'desIp',
        },
        { id: sPt, type: 'splitIntoLots', x: 472, y: 144, blockCount: 2 },
        { id: sK, type: 'splitIntoLots', x: 472, y: 328, blockCount: 2 },
        { id: x0, type: 'opXor', x: 696, y: 144, ...opHex },
        { id: x1, type: 'opXor', x: 696, y: 268, ...opHex },
        { id: j, type: 'joinLots', x: 896, y: 204, joinCount: 2 },
        {
            id: fp,
            type: 'permuteReorder',
            x: 1080,
            y: 204,
            permuteMode: 'bits',
            permutePreset: 'desFp',
        },
        { id: out, type: 'output', x: 1284, y: 224 },
    ]

    const edges: GraphEdge[] = [
        edge(pt, 'out', ip, 'in'),
        edge(ip, 'out', sPt, 'in'),
        edge(key, 'out', sK, 'in'),
        edge(sPt, 'out:0', x0, 'in:a'),
        edge(sK, 'out:0', x0, 'in:b'),
        edge(sPt, 'out:1', x1, 'in:a'),
        edge(sK, 'out:1', x1, 'in:b'),
        edge(x0, 'out', j, 'in:0'),
        edge(x1, 'out', j, 'in:1'),
        edge(j, 'out', fp, 'in'),
        edge(fp, 'out', out, 'in'),
    ]

    return { placedBlocks, edges }
}

function buildTripleXor64(
    plainHex: string,
    k1: string,
    k2: string,
    k3: string,
): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    const p = nid()
    const key1 = nid()
    const key2 = nid()
    const key3 = nid()

    const sP1 = nid()
    const sK1 = nid()
    const x0 = nid()
    const x1 = nid()
    const j1 = nid()

    const sM2 = nid()
    const sK2 = nid()
    const x2 = nid()
    const x3 = nid()
    const j2 = nid()

    const sM3 = nid()
    const sK3 = nid()
    const x4 = nid()
    const x5 = nid()
    const j3 = nid()
    const out = nid()

    const placedBlocks: PlacedBlockRecord[] = [
        { id: p, type: 'hex', x: 40, y: 272, text: plainHex },
        { id: key1, type: 'hex', x: 40, y: 28, text: k1 },
        { id: key2, type: 'hex', x: 40, y: 148, text: k2 },
        { id: key3, type: 'hex', x: 40, y: 436, text: k3 },
        { id: sP1, type: 'splitIntoLots', x: 260, y: 252, blockCount: 2 },
        { id: sK1, type: 'splitIntoLots', x: 260, y: 12, blockCount: 2 },
        { id: x0, type: 'opXor', x: 480, y: 188, ...opHex },
        { id: x1, type: 'opXor', x: 480, y: 312, ...opHex },
        { id: j1, type: 'joinLots', x: 660, y: 252, joinCount: 2 },
        { id: sM2, type: 'splitIntoLots', x: 820, y: 252, blockCount: 2 },
        { id: sK2, type: 'splitIntoLots', x: 820, y: 124, blockCount: 2 },
        { id: x2, type: 'opXor', x: 1040, y: 188, ...opHex },
        { id: x3, type: 'opXor', x: 1040, y: 312, ...opHex },
        { id: j2, type: 'joinLots', x: 1220, y: 252, joinCount: 2 },
        { id: sM3, type: 'splitIntoLots', x: 1380, y: 252, blockCount: 2 },
        { id: sK3, type: 'splitIntoLots', x: 1380, y: 408, blockCount: 2 },
        { id: x4, type: 'opXor', x: 1600, y: 188, ...opHex },
        { id: x5, type: 'opXor', x: 1600, y: 312, ...opHex },
        { id: j3, type: 'joinLots', x: 1780, y: 252, joinCount: 2 },
        { id: out, type: 'output', x: 1980, y: 252 },
    ]

    const edges: GraphEdge[] = [
        edge(p, 'out', sP1, 'in'),
        edge(key1, 'out', sK1, 'in'),
        edge(sP1, 'out:0', x0, 'in:a'),
        edge(sK1, 'out:0', x0, 'in:b'),
        edge(sP1, 'out:1', x1, 'in:a'),
        edge(sK1, 'out:1', x1, 'in:b'),
        edge(x0, 'out', j1, 'in:0'),
        edge(x1, 'out', j1, 'in:1'),
        edge(j1, 'out', sM2, 'in'),
        edge(key2, 'out', sK2, 'in'),
        edge(sM2, 'out:0', x2, 'in:a'),
        edge(sK2, 'out:0', x2, 'in:b'),
        edge(sM2, 'out:1', x3, 'in:a'),
        edge(sK2, 'out:1', x3, 'in:b'),
        edge(x2, 'out', j2, 'in:0'),
        edge(x3, 'out', j2, 'in:1'),
        edge(j2, 'out', sM3, 'in'),
        edge(key3, 'out', sK3, 'in'),
        edge(sM3, 'out:0', x4, 'in:a'),
        edge(sK3, 'out:0', x4, 'in:b'),
        edge(sM3, 'out:1', x5, 'in:a'),
        edge(sK3, 'out:1', x5, 'in:b'),
        edge(x4, 'out', j3, 'in:0'),
        edge(x5, 'out', j3, 'in:1'),
        edge(j3, 'out', out, 'in'),
    ]

    return { placedBlocks, edges }
}

function build3Des(): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    return buildTripleXor64(
        '0123456789abcdef',
        '0123456789abcdef',
        'fedcba9876543210',
        '0011223344556677',
    )
}

/** AddRoundKey (split XOR join) then AES SubBytes. */
function buildAesAddRoundKeySubBytes(): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    const p = nid()
    const k = nid()
    const sP = nid()
    const sK = nid()
    const x = [nid(), nid(), nid(), nid()]
    const join = nid()
    const sub = nid()
    const out = nid()

    const placedBlocks: PlacedBlockRecord[] = [
        { id: p, type: 'hex', x: 52, y: 144, text: '3243f6a8885a308d313198a2e0370734' },
        { id: k, type: 'hex', x: 52, y: 328, text: '2b7e151628aed2a6abf7158809cf4f3c' },
        { id: sP, type: 'splitIntoLots', x: 296, y: 124, blockCount: 4 },
        { id: sK, type: 'splitIntoLots', x: 296, y: 288, blockCount: 4 },
        ...x.map((id, i) => ({ id, type: 'opXor' as const, x: 524, y: 56 + i * 76, ...opHex })),
        { id: join, type: 'joinLots', x: 744, y: 204, joinCount: 4 },
        { id: sub, type: 'subBytes', x: 948, y: 224 },
        { id: out, type: 'output', x: 1156, y: 224 },
    ]

    const edges: GraphEdge[] = [
        edge(p, 'out', sP, 'in'),
        edge(k, 'out', sK, 'in'),
        ...[0, 1, 2, 3].map((i) => edge(sP, `out:${i}`, x[i]!, 'in:a')),
        ...[0, 1, 2, 3].map((i) => edge(sK, `out:${i}`, x[i]!, 'in:b')),
        ...[0, 1, 2, 3].map((i) => edge(x[i]!, 'out', join, `in:${i}`)),
        edge(join, 'out', sub, 'in'),
        edge(sub, 'out', out, 'in'),
    ]

    return { placedBlocks, edges }
}

export function buildCipherTemplateGraph(
    templateId: CipherTemplateId,
): { placedBlocks: PlacedBlockRecord[]; edges: GraphEdge[] } {
    switch (templateId) {
        case 'rsa':
            return buildRsa()
        case 'chacha20':
            return buildChaCha20()
        case 'chachaQrArx':
            return buildChaChaQrArxDemo()
        case 'des':
            return buildDesIpXorFp()
        case '3des':
            return build3Des()
        case 'aes':
            return buildAesAddRoundKeySubBytes()
        default:
            throw new Error(`Unknown cipher template: ${String(templateId)}`)
    }
}

/** Template graphs include these block kinds (for regression tests). */
export function templateUsesNewPrimitives(templateId: CipherTemplateId): {
    permuteReorder: boolean
    subBytes: boolean
} {
    switch (templateId) {
        case 'des':
            return { permuteReorder: true, subBytes: false }
        case 'aes':
            return { permuteReorder: false, subBytes: true }
        default:
            return { permuteReorder: false, subBytes: false }
    }
}
