import {
    INPUT_BLOCK_TYPES,
    OPERATION_BLOCK_TYPES,
    SBOX_BLOCK_TYPES,
    STREAM_BLOCK_TYPES,
} from '../input-blocks/drag-constants';
import { parseBytesFromFormat, serializeBytesToFormat } from '../converter-block/format-bytes';
import { applySubBytes } from '../sbox-block/aes-sbox';
import {
    applyColumnRound,
    applyDiagonalRound,
    applyQuarterRoundPreset,
    buildChachaIetfInitialState,
    finalizeChachaKeystream,
    isChaChaQuarterPreset,
} from '../stream-block/chacha20-ietf'
import {
    inputPortKeysForBlock,
    isEdgeValidForBlocks,
    outputPortKeysForBlock,
    type GraphEdge,
} from './edge-types';
import type { PlacedBlockRecord } from '../types/graph';

const EMPTY = new Uint8Array(0);
const BINARY_STRIP = /[\s_]/g;

function normalizeInputFormat(type: string) {
    if (type === 'binary') {
        return 'binary';
    }
    if (type === 'hex') {
        return 'hex';
    }
    if (type === 'decimal') {
        return 'decimal';
    }
    return 'ascii';
}

function bytesToBitString(bytes: Uint8Array, bitLength = bytes.length * 8) {
    const allBits = Array.from(bytes, (b) => b.toString(2).padStart(8, '0')).join('');
    return allBits.slice(0, Math.max(0, bitLength));
}

function bitStringToBytes(bits: string) {
    if (!bits.length) {
        return new Uint8Array(0);
    }
    const padded = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0');
    const out = new Uint8Array(padded.length / 8);
    for (let i = 0; i < out.length; i++) {
        out[i] = Number.parseInt(padded.slice(i * 8, i * 8 + 8), 2);
    }
    return out;
}

function parsePermutationOrder(orderText: string, size: number) {
    if (size <= 0) {
        return []
    }
    return orderText
        .split(',')
        .map((part) => Number.parseInt(part.trim(), 10))
        .filter((index) => Number.isInteger(index) && index >= 0 && index < size)
}

function buildPermutationPresetOrder(preset: string, size: number) {
    if (size <= 0) {
        return []
    }
    if (preset === 'identity') {
        return Array.from({ length: size }, (_, index) => index)
    }
    if (preset === 'reverse') {
        return Array.from({ length: size }, (_, index) => size - index - 1)
    }
    if (preset === 'desIp' && size === 64) {
        return [
            57, 49, 41, 33, 25, 17, 9, 1,
            59, 51, 43, 35, 27, 19, 11, 3,
            61, 53, 45, 37, 29, 21, 13, 5,
            63, 55, 47, 39, 31, 23, 15, 7,
            56, 48, 40, 32, 24, 16, 8, 0,
            58, 50, 42, 34, 26, 18, 10, 2,
            60, 52, 44, 36, 28, 20, 12, 4,
            62, 54, 46, 38, 30, 22, 14, 6,
        ]
    }
    if (preset === 'desFp' && size === 64) {
        return [
            39, 7, 47, 15, 55, 23, 63, 31,
            38, 6, 46, 14, 54, 22, 62, 30,
            37, 5, 45, 13, 53, 21, 61, 29,
            36, 4, 44, 12, 52, 20, 60, 28,
            35, 3, 43, 11, 51, 19, 59, 27,
            34, 2, 42, 10, 50, 18, 58, 26,
            33, 1, 41, 9, 49, 17, 57, 25,
            32, 0, 40, 8, 48, 16, 56, 24,
        ]
    }
    return []
}

function resolveOperationFormat(
    formatA: string | undefined,
    formatB: string | undefined,
    mode = 'auto',
    manualFormat = 'hex'
) {
    if (mode === 'manual') {
        return manualFormat;
    }
    if (formatA && formatB) {
        return formatA === formatB ? formatA : 'hex';
    }
    return formatA ?? formatB ?? 'hex';
}

function bitLengthOfUnsigned(n: number) {
    const x = n >>> 0;
    if (x === 0) {
        return 1;
    }
    return Math.floor(Math.log2(x)) + 1;
}

function bitMask(width: number) {
    if (width >= 32) {
        return 0xffffffff;
    }
    return ((1 << width) - 1) >>> 0;
}

function rotateLeftUnsigned(value: number, shift: number, width: number) {
    const masked = (value & bitMask(width)) >>> 0;
    const amount = width === 0 ? 0 : shift % width;
    if (amount === 0) {
        return masked;
    }
    const left = (masked << amount) >>> 0;
    const right = masked >>> (width - amount);
    return ((left | right) & bitMask(width)) >>> 0;
}

function rotateRightUnsigned(value: number, shift: number, width: number) {
    const masked = (value & bitMask(width)) >>> 0;
    const amount = width === 0 ? 0 : shift % width;
    if (amount === 0) {
        return masked;
    }
    const right = masked >>> amount;
    const left = (masked << (width - amount)) >>> 0;
    return ((left | right) & bitMask(width)) >>> 0;
}

export function bytesToUintBE(bytes: Uint8Array) {
    if (!bytes.length) {
        return 0;
    }
    let n = 0;
    for (const element of bytes) {
        n = (n << 8) | element;
    }
    return n >>> 0;
}

export function uintToBytesBE(n: number) {
    const x = n >>> 0;
    const buf = new Uint8Array(4);
    new DataView(buf.buffer).setUint32(0, x, false);
    let start = 0;
    while (start < 3 && buf[start] === 0) {
        start += 1;
    }
    return buf.slice(start);
}

export interface GraphEvaluation {
    portBytes: Map<string, Uint8Array>;
    portFormats: Map<string, string>;
    portBitLengths: Map<string, number>;
    cycle: boolean;
    diagnostics: string[];
}

export function evaluateGraph(
    placedBlocks: PlacedBlockRecord[],
    edges: GraphEdge[]
): GraphEvaluation {
    const byId = new Map(placedBlocks.map((b) => [b.id, b]));
    const edgeByInputPort = new Map<string, GraphEdge>();

    const diagnostics: string[] = [];
    const note = (msg: string) => {
        diagnostics.push(msg);
    };
    const blockParams = (b: PlacedBlockRecord) => ({
        blockCount: b.blockCount,
        joinCount: b.joinCount,
    });

    const indeg = new Map<string, number>();
    for (const b of placedBlocks) {
        indeg.set(b.id, 0);
    }

    for (const e of edges) {
        const fromBlock = byId.get(e.from.blockId);
        const toBlock = byId.get(e.to.blockId);
        if (!fromBlock || !toBlock) {
            note(`Ignoring orphan edge ${e.id}`);
            continue;
        }
        if (!isEdgeValidForBlocks(byId, e)) {
            note(`Ignoring invalid edge ${e.id}`);
            continue;
        }
        const targetRef = `${e.to.blockId}\0${e.to.portKey}`;
        if (edgeByInputPort.has(targetRef)) {
            note(`Multiple writers for ${targetRef}; latest edge wins`);
        }
        edgeByInputPort.set(targetRef, e);
        const v = e.to.blockId;
        indeg.set(v, (indeg.get(v) ?? 0) + 1);
    }

    const order: string[] = [];
    const queue = placedBlocks.filter((b) => (indeg.get(b.id) ?? 0) === 0).map((b) => b.id);

    while (queue.length) {
        const u = queue.shift();
        if (u === undefined) {
            break;
        }
        order.push(u);

        for (const e of edgeByInputPort.values()) {
            if (e.from.blockId !== u) {
                continue;
            }
            const v = e.to.blockId;
            if (!byId.has(v)) {
                continue;
            }
            const next = (indeg.get(v) ?? 0) - 1;
            indeg.set(v, next);
            if (next === 0) {
                queue.push(v);
            }
        }
    }

    if (order.length !== placedBlocks.length) {
        note('Cycle detected; evaluation aborted');
        return {
            portBytes: new Map(),
            portFormats: new Map(),
            portBitLengths: new Map(),
            cycle: true,
            diagnostics,
        };
    }

    const portBytes = new Map<string, Uint8Array>();
    const portFormats = new Map<string, string>();
    const portBitLengths = new Map<string, number>();

    function setPort(
        blockId: string,
        portKey: string,
        bytes: Uint8Array,
        options: { format?: string; bitLength?: number } = {}
    ) {
        const ref = `${blockId}\0${portKey}`;
        portBytes.set(ref, bytes);
        if (typeof options.format === 'string') {
            portFormats.set(ref, options.format);
        }
        if (typeof options.bitLength === 'number') {
            portBitLengths.set(ref, options.bitLength);
        }
    }

    function getPort(blockId: string, portKey: string) {
        return portBytes.get(`${blockId}\0${portKey}`) ?? EMPTY;
    }

    function getPortFormat(blockId: string, portKey: string) {
        return portFormats.get(`${blockId}\0${portKey}`);
    }

    function getPortBitLength(blockId: string, portKey: string) {
        return portBitLengths.get(`${blockId}\0${portKey}`);
    }

    function getPortAsUint(blockId: string, portKey: string) {
        const bytes = getPort(blockId, portKey);
        const format = getPortFormat(blockId, portKey);
        if (format === 'binary') {
            const bitLength = getPortBitLength(blockId, portKey) ?? bytes.length * 8;
            const bits = bytesToBitString(bytes, bitLength);
            if (!bits) {
                return 0;
            }
            return Number.parseInt(bits, 2) >>> 0;
        }
        return bytesToUintBE(bytes);
    }

    for (const blockId of order) {
        for (const e of edgeByInputPort.values()) {
            if (e.to.blockId !== blockId) {
                continue;
            }
            const payload = portBytes.get(`${e.from.blockId}\0${e.from.portKey}`) ?? EMPTY;
            const payloadFormat = getPortFormat(e.from.blockId, e.from.portKey);
            const payloadBitLength = getPortBitLength(e.from.blockId, e.from.portKey);
            if (payload === EMPTY || payload.length === 0) {
                note(
                    `Empty payload propagated ${e.from.blockId}:${e.from.portKey} -> ${e.to.blockId}:${e.to.portKey}`
                );
            }
            setPort(e.to.blockId, e.to.portKey, payload, {
                format: payloadFormat,
                bitLength: payloadBitLength,
            });
        }

        const block = byId.get(blockId);
        if (!block) {
            continue;
        }
        const { type } = block;
        const params = blockParams(block);

        if (INPUT_BLOCK_TYPES.includes(type as (typeof INPUT_BLOCK_TYPES)[number])) {
            const raw = block.text ?? '';
            try {
                const fmt = normalizeInputFormat(type);
                const bytes = raw.trim() === '' ? EMPTY : parseBytesFromFormat(fmt, raw);
                const bitLength =
                    fmt === 'binary' ? raw.replaceAll(BINARY_STRIP, '').length : bytes.length * 8;
                setPort(blockId, 'out', bytes, {
                    format: fmt,
                    bitLength,
                });
            } catch {
                setPort(blockId, 'out', EMPTY, {
                    format: normalizeInputFormat(type),
                    bitLength: 0,
                });
            }
            continue;
        }

        if (type === 'formatConvert') {
            const inFmt = block.fcInputFormat ?? 'hex';
            const wiredIn = getPort(blockId, 'in');
            let bytes = wiredIn;
            if (bytes === EMPTY || bytes.length === 0) {
                const manual = block.fcText ?? '';
                if (manual.trim() !== '') {
                    try {
                        bytes = parseBytesFromFormat(inFmt, manual);
                    } catch {
                        bytes = EMPTY;
                    }
                }
            }
            try {
                setPort(blockId, 'out', bytes, {
                    format: block.fcOutputFormat ?? getPortFormat(blockId, 'in') ?? 'hex',
                    bitLength: getPortBitLength(blockId, 'in') ?? bytes.length * 8,
                });
            } catch {
                setPort(blockId, 'out', EMPTY, {
                    format: block.fcOutputFormat ?? 'hex',
                    bitLength: 0,
                });
            }
            continue;
        }

        if (type === 'permuteReorder') {
            const inputBytes = getPort(blockId, 'in')
            const inputFormat = getPortFormat(blockId, 'in') ?? 'hex'
            const inputBitLength = getPortBitLength(blockId, 'in') ?? inputBytes.length * 8
            const mode = block.permuteMode ?? 'bytes'
            const preset = block.permutePreset ?? 'custom'
            const size = mode === 'bits' ? inputBitLength : inputBytes.length
            const customOrder = parsePermutationOrder(block.permuteOrder ?? '', size)
            const presetOrder = buildPermutationPresetOrder(preset, size)
            const order = preset === 'custom' ? customOrder : presetOrder
            const fallbackOrder = Array.from({ length: size }, (_, index) => index)
            const effectiveOrder = order.length > 0 ? order : fallbackOrder

            if (mode === 'bits') {
                const sourceBits = bytesToBitString(inputBytes, inputBitLength)
                const outputBits = effectiveOrder.map((index) => sourceBits[index] ?? '0').join('')
                setPort(blockId, 'out', bitStringToBytes(outputBits), {
                    format: inputFormat,
                    bitLength: outputBits.length,
                })
            } else {
                const outputBytes = Uint8Array.from(effectiveOrder.map((index) => inputBytes[index] ?? 0))
                setPort(blockId, 'out', outputBytes, {
                    format: inputFormat,
                    bitLength: outputBytes.length * 8,
                })
            }
            continue
        }

        if (type === 'splitIntoLots') {
            const nOut = outputPortKeysForBlock(type, params).length;
            const inputBytes = getPort(blockId, 'in');
            const inputBitsLen = getPortBitLength(blockId, 'in') ?? inputBytes.length * 8;
            if (nOut <= 0) {
                continue;
            }
            const bitString = bytesToBitString(inputBytes, inputBitsLen);
            const chunkBits = Math.ceil(bitString.length / nOut);
            for (let i = 0; i < nOut; i++) {
                const startBit = i * chunkBits;
                const pieceBits = bitString.slice(startBit, startBit + chunkBits);
                setPort(blockId, `out:${i}`, bitStringToBytes(pieceBits), {
                    format: getPortFormat(blockId, 'in'),
                    bitLength: pieceBits.length,
                });
            }
            continue;
        }

        if (type === 'joinLots') {
            const keys = inputPortKeysForBlock(type, params);
            const pieces = keys.map((k) => getPort(blockId, k));
            const mergedBits = keys
                .map((k, i) => {
                    const bits = getPortBitLength(blockId, k) ?? pieces[i].length * 8;
                    return bytesToBitString(pieces[i], bits);
                })
                .join('');
            setPort(blockId, 'out', bitStringToBytes(mergedBits), {
                format: getPortFormat(blockId, keys[0]) ?? 'hex',
                bitLength: mergedBits.length,
            });
            continue;
        }

        if (type === 'output') {
            continue;
        }

        if (STREAM_BLOCK_TYPES.includes(type as (typeof STREAM_BLOCK_TYPES)[number])) {
            if (type === 'chachaIetfInit') {
                const keyBytes = getPort(blockId, 'in:key')
                const nonceBytes = getPort(blockId, 'in:nonce')
                const ctr = (block.chachaBlockCounter ?? 1) >>> 0

                if (
                    keyBytes === EMPTY
                    || keyBytes.length !== 32
                    || nonceBytes === EMPTY
                    || nonceBytes.length !== 12
                ) {
                    if (keyBytes !== EMPTY && keyBytes.length !== 32) {
                        note(`ChaCha Init ${blockId}: key must be exactly 32 bytes (got ${keyBytes.length}).`)
                    }
                    if (nonceBytes !== EMPTY && nonceBytes.length !== 12) {
                        note(`ChaCha Init ${blockId}: nonce must be exactly 12 bytes (got ${nonceBytes.length}).`)
                    }
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                    continue
                }

                try {
                    const outBytes = buildChachaIetfInitialState(keyBytes, nonceBytes, ctr)
                    setPort(blockId, 'out', outBytes, {
                        format: 'hex',
                        bitLength: 512,
                    })
                } catch (err) {
                    note(`ChaCha Init ${blockId}: ${err instanceof Error ? err.message : 'failed.'}`)
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                }
                continue
            }

            if (type === 'chachaIetfQuarterRound') {
                const state64 = getPort(blockId, 'in')
                const rawPreset = block.chachaQuarterPreset ?? 'col0'
                const preset = isChaChaQuarterPreset(rawPreset) ? rawPreset : 'col0'
                if (state64 === EMPTY || state64.length !== 64) {
                    if (state64 !== EMPTY && state64.length !== 64) {
                        note(`ChaCha QuarterRound ${blockId}: state must be 64 bytes (got ${state64.length}).`)
                    }
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                    continue
                }
                try {
                    const outBytes = applyQuarterRoundPreset(state64, preset)
                    setPort(blockId, 'out', outBytes, {
                        format: 'hex',
                        bitLength: 512,
                    })
                } catch (err) {
                    note(`ChaCha QuarterRound ${blockId}: ${err instanceof Error ? err.message : 'failed.'}`)
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                }
                continue
            }

            if (type === 'chachaIetfColumnRound') {
                const state64 = getPort(blockId, 'in')
                if (state64 === EMPTY || state64.length !== 64) {
                    if (state64 !== EMPTY && state64.length !== 64) {
                        note(`ChaCha ColumnRound ${blockId}: state must be 64 bytes (got ${state64.length}).`)
                    }
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                    continue
                }
                try {
                    const outBytes = applyColumnRound(state64)
                    setPort(blockId, 'out', outBytes, {
                        format: 'hex',
                        bitLength: 512,
                    })
                } catch (err) {
                    note(`ChaCha ColumnRound ${blockId}: ${err instanceof Error ? err.message : 'failed.'}`)
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                }
                continue
            }

            if (type === 'chachaIetfDiagonalRound') {
                const state64 = getPort(blockId, 'in')
                if (state64 === EMPTY || state64.length !== 64) {
                    if (state64 !== EMPTY && state64.length !== 64) {
                        note(`ChaCha DiagonalRound ${blockId}: state must be 64 bytes (got ${state64.length}).`)
                    }
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                    continue
                }
                try {
                    const outBytes = applyDiagonalRound(state64)
                    setPort(blockId, 'out', outBytes, {
                        format: 'hex',
                        bitLength: 512,
                    })
                } catch (err) {
                    note(`ChaCha DiagonalRound ${blockId}: ${err instanceof Error ? err.message : 'failed.'}`)
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                }
                continue
            }

            if (type === 'chachaIetfFinalize') {
                const workBytes = getPort(blockId, 'in:state')
                const initialBytes = getPort(blockId, 'in:initial')
                const prefixLenRaw = block.chachaOutputByteLength ?? 64
                const prefixLen = Math.min(64, Math.max(1, Math.floor(Number(prefixLenRaw)) || 64))

                if (
                    workBytes === EMPTY
                    || workBytes.length !== 64
                    || initialBytes === EMPTY
                    || initialBytes.length !== 64
                ) {
                    if (workBytes !== EMPTY && workBytes.length !== 64) {
                        note(`ChaCha Finalize ${blockId}: state must be 64 bytes (got ${workBytes.length}).`)
                    }
                    if (initialBytes !== EMPTY && initialBytes.length !== 64) {
                        note(`ChaCha Finalize ${blockId}: initial must be 64 bytes (got ${initialBytes.length}).`)
                    }
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                    continue
                }

                try {
                    const blockKs = finalizeChachaKeystream(workBytes, initialBytes)
                    const outBytes = blockKs.slice(0, prefixLen)
                    setPort(blockId, 'out', outBytes, {
                        format: 'hex',
                        bitLength: outBytes.length * 8,
                    })
                } catch (err) {
                    note(`ChaCha Finalize ${blockId}: ${err instanceof Error ? err.message : 'failed.'}`)
                    setPort(blockId, 'out', EMPTY, { format: 'hex', bitLength: 0 })
                }
                continue
            }
        }

        if (SBOX_BLOCK_TYPES.includes(type as (typeof SBOX_BLOCK_TYPES)[number])) {
            const input = getPort(blockId, 'in');
            const outBytes = applySubBytes(input);
            setPort(blockId, 'out', outBytes, {
                format: 'hex',
                bitLength: outBytes.length * 8,
            });
            continue;
        }

        if (OPERATION_BLOCK_TYPES.includes(type as (typeof OPERATION_BLOCK_TYPES)[number])) {
            const a = getPortAsUint(blockId, 'in:a');
            const b = getPortAsUint(blockId, 'in:b');
            const inFmtA = getPortFormat(blockId, 'in:a');
            const inFmtB = getPortFormat(blockId, 'in:b');
            const inBitsA = getPortBitLength(blockId, 'in:a') ?? 0;
            const inBitsB = getPortBitLength(blockId, 'in:b') ?? 0;
            const shiftMode = block.opShiftMode ?? 'logical';
            const outFmt = resolveOperationFormat(
                inFmtA,
                inFmtB,
                block.opDisplayMode ?? 'auto',
                block.opDisplayFormat ?? 'hex'
            );
            let out: number;
            switch (type) {
                case 'opXor':
                    out = (a ^ b) >>> 0;
                    break;
                case 'opBitwiseAnd':
                    out = (a & b) >>> 0;
                    break;
                case 'opLeftShift': {
                    if (shiftMode === 'circular') {
                        const width = Math.max(
                            1,
                            Math.min(32, Math.max(inBitsA, bitLengthOfUnsigned(a), 1))
                        );
                        out = rotateLeftUnsigned(a, b, width);
                    } else {
                        out = (a << (b % 32)) >>> 0;
                    }
                    break;
                }
                case 'opRightShift': {
                    if (shiftMode === 'circular') {
                        const width = Math.max(
                            1,
                            Math.min(32, Math.max(inBitsA, bitLengthOfUnsigned(a), 1))
                        );
                        out = rotateRightUnsigned(a, b, width);
                    } else {
                        out = (a >>> (b % 32)) >>> 0;
                    }
                    break;
                }
                case 'opMod':
                    out = b === 0 ? 0 : (a % b) >>> 0;
                    break;
                case 'opPow':
                    out = Math.min(Number.MAX_SAFE_INTEGER, a ** Math.min(b, 64)) >>> 0;
                    break;
                case 'opAdd':
                    out = (a + b) >>> 0;
                    break;
                case 'opMul':
                    out = (a * b) >>> 0;
                    break;
                default:
                    out = 0;
            }
            const outBitLength =
                outFmt === 'binary'
                    ? Math.max(bitLengthOfUnsigned(out), inBitsA, inBitsB, 1)
                    : bitLengthOfUnsigned(out);
            const outBits = (out >>> 0).toString(2).padStart(outBitLength, '0');
            const outBytes = outFmt === 'binary' ? bitStringToBytes(outBits) : uintToBytesBE(out);
            setPort(blockId, 'out', outBytes, {
                format: outFmt,
                bitLength: outFmt === 'binary' ? outBitLength : outBytes.length * 8,
            });
        }
    }

    return { portBytes, portFormats, portBitLengths, cycle: false, diagnostics };
}

export function formatBytesForDisplay(bytes: Uint8Array, format: string) {
    try {
        return serializeBytesToFormat(format as any, bytes);
    } catch {
        return '';
    }
}
