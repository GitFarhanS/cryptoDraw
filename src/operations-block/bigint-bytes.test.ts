import { describe, expect, it } from 'vitest';
import {
    bigIntToBytesBE,
    bigPowLimited,
    bytesToBigIntBE,
} from './bigint-bytes';

describe('bigint-bytes', () => {
    it('round-trips wide unsigned values', () => {
        const n = (1n << 40n) + 255n;
        const bytes = bigIntToBytesBE(n);
        expect(bytesToBigIntBE(bytes)).toBe(n);
    });

    it('pads big-endian output', () => {
        const bytes = bigIntToBytesBE(1n, 8);
        expect(bytes.length).toBe(8);
        expect(bytes[7]).toBe(1);
    });

    it('raises with overflow when padded width is too small', () => {
        expect(() => bigIntToBytesBE(0x100n, 1)).toThrow(/fit/);
    });

    it('computes limited exponentiation', () => {
        expect(bigPowLimited(3n, 4n, 512n)).toBe(81n);
        expect(() => bigPowLimited(2n, 600n, 512n)).toThrow(/Exponent/);
    });
});
