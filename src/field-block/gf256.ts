/**
 * GF(2⁸) for AES-style arithmetic: modulus polynomial x⁸ + x⁴ + x³ + x + 1 (0x11B).
 */

export function gfMul(a: number, b: number): number {
    let aa = a & 0xff;
    let bb = b & 0xff;
    let p = 0;
    for (let i = 0; i < 8; i++) {
        if (bb & 1) {
            p ^= aa;
        }
        const hi = aa & 0x80;
        aa = (aa << 1) & 0xff;
        if (hi) {
            aa ^= 0x1b;
        }
        bb >>= 1;
    }
    return p & 0xff;
}

/** One AES MixColumns column: four bytes in, four bytes out. */
export function mixColumnBytes(col: Uint8Array): Uint8Array {
    if (col.length !== 4) {
        throw new Error('MixColumns expects exactly 4 bytes');
    }
    const c0 = col[0]!;
    const c1 = col[1]!;
    const c2 = col[2]!;
    const c3 = col[3]!;
    const out = new Uint8Array(4);
    out[0] = gfMul(2, c0) ^ gfMul(3, c1) ^ c2 ^ c3;
    out[1] = c0 ^ gfMul(2, c1) ^ gfMul(3, c2) ^ c3;
    out[2] = c0 ^ c1 ^ gfMul(2, c2) ^ gfMul(3, c3);
    out[3] = gfMul(3, c0) ^ c1 ^ c2 ^ gfMul(2, c3);
    return out;
}
