const BINARY_STRIP = /[\s_]/g;
const HEX_STRIP = /[\s:.-]/g;

function parseBinaryToBytes(str: string) {
    const bits = str.replaceAll(BINARY_STRIP, '');
    if (bits.length === 0) {
        return new Uint8Array(0);
    }
    if (!/^[01]+$/.test(bits)) {
        throw new Error('Binary must contain only 0 and 1.');
    }
    const padded = bits.padEnd(Math.ceil(bits.length / 8) * 8, '0');
    const out = new Uint8Array(padded.length / 8);
    for (let i = 0; i < out.length; i++) {
        out[i] = Number.parseInt(padded.slice(i * 8, i * 8 + 8), 2);
    }
    return out;
}

function bytesToBinary(bytes: Uint8Array) {
    return Array.from(bytes, (b) => b.toString(2).padStart(8, '0')).join('');
}

function parseHexToBytes(str: string) {
    const hex = str.replaceAll(HEX_STRIP, '').toLowerCase();
    if (hex.length === 0) {
        return new Uint8Array(0);
    }
    if (hex.length % 2 !== 0) {
        throw new Error('Hex must have an even number of characters (full bytes).');
    }
    if (!/^[0-9a-f]+$/.test(hex)) {
        throw new Error('Hex must use digits 0–9 and letters a–f.');
    }
    const out = new Uint8Array(hex.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

function bytesToHex(bytes: Uint8Array) {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function parseAsciiToBytes(str: string) {
    return new TextEncoder().encode(str);
}

function bytesToAscii(bytes: Uint8Array) {
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

function parseDecimalBytes(str: string) {
    const tokens = str
        .trim()
        .split(/[\s,]+/)
        .filter(Boolean);
    if (tokens.length === 0) {
        return new Uint8Array(0);
    }
    const out = new Uint8Array(tokens.length);
    for (let i = 0; i < tokens.length; i++) {
        const n = Number(tokens[i]);
        if (!Number.isInteger(n) || n < 0 || n > 255) {
            throw new Error(
                `Invalid byte at position ${i + 1}: each value must be an integer between 0 and 255.`
            );
        }
        out[i] = n;
    }
    return out;
}

function bytesToDecimal(bytes: Uint8Array) {
    return Array.from(bytes, String).join(', ');
}

export const BYTE_FORMATS = ['binary', 'ascii', 'hex', 'decimal'] as const;
export type ByteFormat = (typeof BYTE_FORMATS)[number];

export function parseBytesFromFormat(format: ByteFormat, value: string) {
    switch (format) {
        case 'binary':
            return parseBinaryToBytes(value);
        case 'hex':
            return parseHexToBytes(value);
        case 'ascii':
            return parseAsciiToBytes(value);
        case 'decimal':
            return parseDecimalBytes(value);
        default:
            throw new Error('Unknown input format.');
    }
}

export function serializeBytesToFormat(format: ByteFormat, bytes: Uint8Array) {
    switch (format) {
        case 'binary':
            return bytesToBinary(bytes);
        case 'hex':
            return bytesToHex(bytes);
        case 'ascii':
            return bytesToAscii(bytes);
        case 'decimal':
            return bytesToDecimal(bytes);
        default:
            throw new Error('Unknown output format.');
    }
}
