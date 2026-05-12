import { describe, expect, it } from 'vitest';
import { gfMul, mixColumnBytes } from './gf256';

describe('gf256', () => {
    it('doubles 0x87 to 0x15 in GF (FIPS shift + reduce)', () => {
        expect(gfMul(2, 0x87)).toBe(0x15);
    });

    it('multiplies 0x53 * 0xCA', () => {
        expect(gfMul(0x53, 0xca)).toBe(0x01);
    });

    it('mixes one column (vector from AES examples)', () => {
        const col = new Uint8Array([0xd4, 0xbf, 0x5d, 0x30]);
        const out = mixColumnBytes(col);
        expect(Array.from(out)).toEqual([0x04, 0x66, 0x81, 0xe5]);
    });
});
