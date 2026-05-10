import { describe, expect, it } from 'vitest';
import { serializeBytesToFormat } from '../converter-block/format-bytes';
import { CHACHA_QUARTER_PRESETS } from '../stream-block/chacha20-ietf';
import { evaluateGraph } from './evaluate-graph';
import { upsertEdgeForInputPort } from './edge-types';

function edge(
    id: string,
    fromBlockId: string,
    fromPortKey: string,
    toBlockId: string,
    toPortKey: string
) {
    return {
        id,
        from: { blockId: fromBlockId, portKey: fromPortKey },
        to: { blockId: toBlockId, portKey: toPortKey },
    };
}

describe('evaluateGraph data transfer', () => {
    it('input -> formatConvert -> output transfers bytes end-to-end', () => {
        const blocks = [
            { id: 'src', type: 'ascii', x: 0, y: 0, text: 'AB' },
            { id: 'fmt', type: 'formatConvert', x: 0, y: 0, fcOutputFormat: 'hex' },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ];
        const edges = [
            edge('e1', 'src', 'out', 'fmt', 'in'),
            edge('e2', 'fmt', 'out', 'out', 'in'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('out\0in');
        expect(bytes).toBeDefined();
        expect(serializeBytesToFormat('hex', bytes!)).toBe('4142');
    });

    it('split into lots and join lots reconstructs payload in order', () => {
        const blocks = [
            { id: 'src', type: 'ascii', x: 0, y: 0, text: 'ABCD' },
            { id: 'split', type: 'splitIntoLots', x: 0, y: 0, blockCount: 2 },
            { id: 'join', type: 'joinLots', x: 0, y: 0, joinCount: 2 },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ];
        const edges = [
            edge('e1', 'src', 'out', 'split', 'in'),
            edge('e2', 'split', 'out:0', 'join', 'in:0'),
            edge('e3', 'split', 'out:1', 'join', 'in:1'),
            edge('e4', 'join', 'out', 'out', 'in'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('out\0in');
        expect(bytes).toBeDefined();
        expect(serializeBytesToFormat('ascii', bytes!)).toBe('ABCD');
    });

    it('split binary input across 4 outputs keeps data on all notches', () => {
        const blocks = [
            { id: 'src', type: 'binary', x: 0, y: 0, text: '10101010' },
            { id: 'split', type: 'splitIntoLots', x: 0, y: 0, blockCount: 4 },
        ];
        const edges = [edge('e1', 'src', 'out', 'split', 'in')];
        const result = evaluateGraph(blocks as any, edges as any);

        for (let i = 0; i < 4; i++) {
            const key = `split\0out:${i}`;
            const bytes = result.portBytes.get(key);
            const fmt = result.portFormats.get(key);
            const bitLength = result.portBitLengths.get(key);
            expect(bytes).toBeDefined();
            expect(fmt).toBe('binary');
            expect(bitLength).toBe(2);
            const bits = serializeBytesToFormat('binary', bytes!).slice(0, bitLength);
            expect(bits).toBe('10');
        }
    });

    it('preserves short binary input (< 8 bits) through split to output', () => {
        const blocks = [
            { id: 'src', type: 'binary', x: 0, y: 0, text: '1011' },
            { id: 'split', type: 'splitIntoLots', x: 0, y: 0, blockCount: 2 },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ];
        const edges = [
            edge('e1', 'src', 'out', 'split', 'in'),
            edge('e2', 'split', 'out:0', 'out', 'in'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const outBytes = result.portBytes.get('out\0in');
        const outBits = result.portBitLengths.get('out\0in');
        const outFmt = result.portFormats.get('out\0in');

        expect(outBytes).toBeDefined();
        expect(outFmt).toBe('binary');
        expect(outBits).toBe(2);
        expect(serializeBytesToFormat('binary', outBytes!).slice(0, outBits)).toBe('10');
    });

    it('permute block reverses bytes with reverse preset', () => {
        const blocks = [
            { id: 'src', type: 'ascii', x: 0, y: 0, text: 'ABCD' },
            {
                id: 'permute',
                type: 'permuteReorder',
                x: 0,
                y: 0,
                permuteMode: 'bytes',
                permutePreset: 'reverse',
            },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ]
        const edges = [
            edge('e1', 'src', 'out', 'permute', 'in'),
            edge('e2', 'permute', 'out', 'out', 'in'),
        ]
        const result = evaluateGraph(blocks as any, edges as any)
        const bytes = result.portBytes.get('out\0in')
        expect(bytes).toBeDefined()
        expect(serializeBytesToFormat('ascii', bytes!)).toBe('DCBA')
    })

    it('permute block reorders bits from custom index list', () => {
        const blocks = [
            { id: 'src', type: 'binary', x: 0, y: 0, text: '10110000' },
            {
                id: 'permute',
                type: 'permuteReorder',
                x: 0,
                y: 0,
                permuteMode: 'bits',
                permutePreset: 'custom',
                permuteOrder: '3,2,1,0',
            },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ]
        const edges = [
            edge('e1', 'src', 'out', 'permute', 'in'),
            edge('e2', 'permute', 'out', 'out', 'in'),
        ]
        const result = evaluateGraph(blocks as any, edges as any)
        const bytes = result.portBytes.get('out\0in')
        const bitLength = result.portBitLengths.get('out\0in')
        expect(bytes).toBeDefined()
        expect(result.portFormats.get('out\0in')).toBe('binary')
        expect(bitLength).toBe(4)
        expect(serializeBytesToFormat('binary', bytes!).slice(0, bitLength)).toBe('1101')
    })

    it('DES IP maps standard DES input bit 58 (1-based) to output MSB', () => {
        const blocks = [
            {
                id: 'src',
                type: 'hex',
                x: 0,
                y: 0,
                text: '0000000000000040',
            },
            {
                id: 'permute',
                type: 'permuteReorder',
                x: 0,
                y: 0,
                permuteMode: 'bits',
                permutePreset: 'desIp',
            },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ]
        const edges = [
            edge('e1', 'src', 'out', 'permute', 'in'),
            edge('e2', 'permute', 'out', 'out', 'in'),
        ]
        const result = evaluateGraph(blocks as any, edges as any)
        const bytes = result.portBytes.get('out\0in')
        const bitLength = result.portBitLengths.get('out\0in')
        expect(bytes).toBeDefined()
        expect(bitLength).toBe(64)
        const bits = serializeBytesToFormat('binary', bytes!).slice(0, bitLength!)
        expect(bits[0]).toBe('1')
        expect(bits.slice(1)).toBe('0'.repeat(63))
    })

    it('DES IP followed by DES FP round-trips a 64-bit block', () => {
        const blocks = [
            { id: 'src', type: 'hex', x: 0, y: 0, text: '0123456789abcdef' },
            {
                id: 'ip',
                type: 'permuteReorder',
                x: 0,
                y: 0,
                permuteMode: 'bits',
                permutePreset: 'desIp',
            },
            {
                id: 'fp',
                type: 'permuteReorder',
                x: 0,
                y: 0,
                permuteMode: 'bits',
                permutePreset: 'desFp',
            },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ]
        const edges = [
            edge('e1', 'src', 'out', 'ip', 'in'),
            edge('e2', 'ip', 'out', 'fp', 'in'),
            edge('e3', 'fp', 'out', 'out', 'in'),
        ]
        const result = evaluateGraph(blocks as any, edges as any)
        const bytes = result.portBytes.get('out\0in')
        expect(bytes).toBeDefined()
        expect(serializeBytesToFormat('hex', bytes!).toLowerCase()).toBe('0123456789abcdef')
    })

    it('operation block produces deterministic output from two wired inputs', () => {
        const blocks = [
            { id: 'a', type: 'hex', x: 0, y: 0, text: '0f' },
            { id: 'b', type: 'hex', x: 0, y: 0, text: 'f0' },
            { id: 'xor', type: 'opXor', x: 0, y: 0 },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'xor', 'in:a'),
            edge('e2', 'b', 'out', 'xor', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('xor\0out');
        expect(bytes).toBeDefined();
        expect(serializeBytesToFormat('hex', bytes!)).toBe('ff');
    });

    it('subbytes maps each input byte through the AES s-box', () => {
        const blocks = [
            { id: 'src', type: 'hex', x: 0, y: 0, text: '53' },
            { id: 'sub', type: 'subBytes', x: 0, y: 0 },
        ];
        const edges = [edge('e1', 'src', 'out', 'sub', 'in')];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('sub\0out');
        expect(bytes).toBeDefined();
        expect(serializeBytesToFormat('hex', bytes!)).toBe('ed');
        expect(result.portFormats.get('sub\0out')).toBe('hex');
    });

    it('ChaCha20-IETF emits RFC 8439 §2.3.2 keystream prefix with counting key and test nonce', () => {
        const keyHex =
            '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
        const nonceHex = '000000090000004a00000000'
        const blocks: any[] = [
            { id: 'key', type: 'hex', x: 0, y: 0, text: keyHex },
            { id: 'nonce', type: 'hex', x: 0, y: 0, text: nonceHex },
            {
                id: 'init',
                type: 'chachaIetfInit',
                x: 0,
                y: 0,
                chachaBlockCounter: 1,
            },
            {
                id: 'fin',
                type: 'chachaIetfFinalize',
                x: 0,
                y: 0,
                chachaOutputByteLength: 16,
            },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ]
        const edges: any[] = [
            edge('ek', 'key', 'out', 'init', 'in:key'),
            edge('en', 'nonce', 'out', 'init', 'in:nonce'),
            edge('ei', 'init', 'out', 'fin', 'in:initial'),
        ]
        let prevId = 'init'
        for (let i = 0; i < 10; i++) {
            const colId = `col${i}`
            const diagId = `diag${i}`
            blocks.push(
                { id: colId, type: 'chachaIetfColumnRound', x: 0, y: 0 },
                { id: diagId, type: 'chachaIetfDiagonalRound', x: 0, y: 0 },
            )
            edges.push(edge(`ec${i}`, prevId, 'out', colId, 'in'))
            edges.push(edge(`ed${i}`, colId, 'out', diagId, 'in'))
            prevId = diagId
        }
        edges.push(edge('el', prevId, 'out', 'fin', 'in:state'))
        edges.push(edge('eo', 'fin', 'out', 'out', 'in'))
        const result = evaluateGraph(blocks as any, edges as any)
        const bytes = result.portBytes.get('out\0in')
        expect(bytes).toBeDefined()
        expect(serializeBytesToFormat('hex', bytes!)).toBe('10f1e7e4d13b5915500fdd1fa32071c4')
        expect(result.portFormats.get('out\0in')).toBe('hex')
    })

    it('ChaCha20-IETF Init + eighty QuarterRound blocks + Finalize matches RFC §2.3.2 prefix', () => {
        const keyHex =
            '000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f'
        const nonceHex = '000000090000004a00000000'
        const qrIds = Array.from({ length: 80 }, (_, i) => `qr${i}`)
        const blocks: any[] = [
            { id: 'key', type: 'hex', x: 0, y: 0, text: keyHex },
            { id: 'nonce', type: 'hex', x: 0, y: 0, text: nonceHex },
            {
                id: 'init',
                type: 'chachaIetfInit',
                x: 0,
                y: 0,
                chachaBlockCounter: 1,
            },
            ...qrIds.map((id, i) => ({
                id,
                type: 'chachaIetfQuarterRound',
                x: 0,
                y: 0,
                chachaQuarterPreset: CHACHA_QUARTER_PRESETS[i % 8],
            })),
            {
                id: 'fin',
                type: 'chachaIetfFinalize',
                x: 0,
                y: 0,
                chachaOutputByteLength: 16,
            },
            { id: 'out', type: 'output', x: 0, y: 0 },
        ]
        const edges: any[] = [
            edge('ek', 'key', 'out', 'init', 'in:key'),
            edge('en', 'nonce', 'out', 'init', 'in:nonce'),
            edge('ei0', 'init', 'out', qrIds[0]!, 'in'),
            edge('ei1', 'init', 'out', 'fin', 'in:initial'),
            ...Array.from({ length: 79 }, (_, i) =>
                edge(`eq${i}`, qrIds[i]!, 'out', qrIds[i + 1]!, 'in')),
            edge('eq79', qrIds[79]!, 'out', 'fin', 'in:state'),
            edge('eo', 'fin', 'out', 'out', 'in'),
        ]
        const result = evaluateGraph(blocks as any, edges as any)
        expect(result.cycle).toBe(false)
        const bytes = result.portBytes.get('out\0in')
        expect(bytes).toBeDefined()
        expect(serializeBytesToFormat('hex', bytes!)).toBe('10f1e7e4d13b5915500fdd1fa32071c4')
    })

    it('operation output format auto-detects same input formats', () => {
        const blocks = [
            { id: 'a', type: 'binary', x: 0, y: 0, text: '00001111' },
            { id: 'b', type: 'binary', x: 0, y: 0, text: '11110000' },
            { id: 'xor', type: 'opXor', x: 0, y: 0, opDisplayMode: 'auto' },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'xor', 'in:a'),
            edge('e2', 'b', 'out', 'xor', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        expect(result.portFormats.get('xor\0out')).toBe('binary');
        expect(result.portBitLengths.get('xor\0out')).toBe(8);
    });

    it('binary operation keeps compact width for sub-byte inputs', () => {
        const blocks = [
            { id: 'a', type: 'binary', x: 0, y: 0, text: '10' },
            { id: 'b', type: 'binary', x: 0, y: 0, text: '01' },
            { id: 'xor', type: 'opXor', x: 0, y: 0, opDisplayMode: 'auto' },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'xor', 'in:a'),
            edge('e2', 'b', 'out', 'xor', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('xor\0out');
        const bits = result.portBitLengths.get('xor\0out');
        expect(result.portFormats.get('xor\0out')).toBe('binary');
        expect(bits).toBe(2);
        expect(serializeBytesToFormat('binary', bytes!).slice(0, bits)).toBe('11');
    });

    it('operation output format falls back to hex for mixed inputs in auto mode', () => {
        const blocks = [
            { id: 'a', type: 'binary', x: 0, y: 0, text: '00001111' },
            { id: 'b', type: 'hex', x: 0, y: 0, text: 'f0' },
            { id: 'xor', type: 'opXor', x: 0, y: 0, opDisplayMode: 'auto' },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'xor', 'in:a'),
            edge('e2', 'b', 'out', 'xor', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        expect(result.portFormats.get('xor\0out')).toBe('hex');
    });

    it('operation manual override forces output format', () => {
        const blocks = [
            { id: 'a', type: 'hex', x: 0, y: 0, text: '0f' },
            { id: 'b', type: 'hex', x: 0, y: 0, text: 'f0' },
            {
                id: 'xor',
                type: 'opXor',
                x: 0,
                y: 0,
                opDisplayMode: 'manual',
                opDisplayFormat: 'decimal',
            },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'xor', 'in:a'),
            edge('e2', 'b', 'out', 'xor', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        expect(result.portFormats.get('xor\0out')).toBe('decimal');
    });

    it('left shift supports circular mode', () => {
        const blocks = [
            { id: 'a', type: 'binary', x: 0, y: 0, text: '1001' },
            { id: 'b', type: 'decimal', x: 0, y: 0, text: '1' },
            {
                id: 'shift',
                type: 'opLeftShift',
                x: 0,
                y: 0,
                opDisplayMode: 'manual',
                opDisplayFormat: 'binary',
                opShiftMode: 'circular',
            },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'shift', 'in:a'),
            edge('e2', 'b', 'out', 'shift', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('shift\0out');
        const bits = result.portBitLengths.get('shift\0out');
        expect(result.portFormats.get('shift\0out')).toBe('binary');
        expect(bits).toBe(8);
        expect(serializeBytesToFormat('binary', bytes!).slice(0, bits)).toBe('00000011');
    });

    it('right shift supports circular mode', () => {
        const blocks = [
            { id: 'a', type: 'binary', x: 0, y: 0, text: '1001' },
            { id: 'b', type: 'decimal', x: 0, y: 0, text: '1' },
            {
                id: 'shift',
                type: 'opRightShift',
                x: 0,
                y: 0,
                opDisplayMode: 'manual',
                opDisplayFormat: 'binary',
                opShiftMode: 'circular',
            },
        ];
        const edges = [
            edge('e1', 'a', 'out', 'shift', 'in:a'),
            edge('e2', 'b', 'out', 'shift', 'in:b'),
        ];
        const result = evaluateGraph(blocks as any, edges as any);
        const bytes = result.portBytes.get('shift\0out');
        const bits = result.portBitLengths.get('shift\0out');
        expect(result.portFormats.get('shift\0out')).toBe('binary');
        expect(bits).toBe(8);
        expect(serializeBytesToFormat('binary', bytes!).slice(0, bits)).toBe('00001100');
    });

    it('rewire replaces previous writer for the same input port', () => {
        const blocks = [
            { id: 'a', type: 'ascii', x: 0, y: 0, text: 'A' },
            { id: 'b', type: 'ascii', x: 0, y: 0, text: 'B' },
            { id: 'fmt', type: 'formatConvert', x: 0, y: 0, fcOutputFormat: 'ascii' },
        ];

        const first = edge('e1', 'a', 'out', 'fmt', 'in');
        const second = edge('e2', 'b', 'out', 'fmt', 'in');
        const rewired = upsertEdgeForInputPort([first as any], second as any);

        const result = evaluateGraph(blocks as any, rewired as any);
        const bytes = result.portBytes.get('fmt\0in');
        expect(bytes).toBeDefined();
        expect(serializeBytesToFormat('ascii', bytes!)).toBe('B');
    });

    it('cycle is detected and returns safe empty result', () => {
        const blocks = [
            { id: 'a', type: 'formatConvert', x: 0, y: 0 },
            { id: 'b', type: 'formatConvert', x: 0, y: 0 },
        ];
        const edges = [edge('e1', 'a', 'out', 'b', 'in'), edge('e2', 'b', 'out', 'a', 'in')];
        const result = evaluateGraph(blocks as any, edges as any);
        expect(result.cycle).toBe(true);
        expect(result.portBytes.size).toBe(0);
        expect(result.portFormats.size).toBe(0);
        expect(result.portBitLengths.size).toBe(0);
    });
});
