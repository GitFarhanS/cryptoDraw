/** Maximum wired byte length accepted by arbitrary-precision op blocks. */
export const BIGINT_OP_MAX_INPUT_BYTES = 64;

/** Maximum bit length for binary-formatted operands on bigint ops. */
export const BIGINT_OP_MAX_BINARY_BITS = 8192;

export function bytesToBigIntBE(bytes: Uint8Array): bigint {
    let v = 0n;
    for (const b of bytes) {
        v = (v << 8n) | BigInt(b);
    }
    return v;
}

/**
 * Encode non-negative bigint as big-endian bytes.
 * When `paddedByteWidth` is set, left-pad with zeros to exactly that width (throws if value too large).
 */
export function bigIntToBytesBE(n: bigint, paddedByteWidth?: number): Uint8Array {
    if (n < 0n) {
        throw new Error('bigIntToBytesBE expects a non-negative integer');
    }
    if (n === 0n) {
        const w = paddedByteWidth !== undefined ? paddedByteWidth : 1;
        return new Uint8Array(w);
    }
    let hex = n.toString(16);
    if (hex.length % 2 === 1) {
        hex = `0${hex}`;
    }
    const minimal = new Uint8Array(hex.length / 2);
    for (let i = 0; i < minimal.length; i++) {
        minimal[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    if (paddedByteWidth === undefined || paddedByteWidth <= minimal.length) {
        if (paddedByteWidth !== undefined && minimal.length > paddedByteWidth) {
            throw new Error(`Value does not fit in ${paddedByteWidth} byte(s)`);
        }
        return minimal;
    }
    const out = new Uint8Array(paddedByteWidth);
    out.set(minimal, paddedByteWidth - minimal.length);
    return out;
}

export function bigIntBitLength(n: bigint): number {
    if (n <= 0n) {
        return 1;
    }
    return n.toString(2).length;
}

export function bigPowLimited(base: bigint, exp: bigint, maxExponent: bigint): bigint {
    if (exp < 0n) {
        return 0n;
    }
    if (exp > maxExponent) {
        throw new Error(`Exponent exceeds limit (${maxExponent.toString()})`);
    }
    let result = 1n;
    let b = base;
    let e = exp;
    while (e > 0n) {
        if (e & 1n) {
            result *= b;
        }
        b *= b;
        e >>= 1n;
    }
    return result;
}
