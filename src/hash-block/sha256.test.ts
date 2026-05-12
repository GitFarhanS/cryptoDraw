import { describe, expect, it } from 'vitest';
import { hmacSha256, sha256 } from './sha256';

function hex(bytes: Uint8Array): string {
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

describe('sha256', () => {
    it('digests empty string', () => {
        expect(hex(sha256(new Uint8Array(0)))).toBe(
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
        );
    });

    it('digests abc', () => {
        expect(hex(sha256(new TextEncoder().encode('abc')))).toBe(
            'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'
        );
    });
});

describe('hmacSha256', () => {
    it('RFC 4231 test case 1', () => {
        const key = new Uint8Array(20).fill(0x0b);
        const data = new TextEncoder().encode('Hi There');
        expect(hex(hmacSha256(key, data))).toBe(
            'b0344c61d8db38535ca8afceaf0bf12b881dc200c9833da726e9376c2e32cff7'
        );
    });
});
