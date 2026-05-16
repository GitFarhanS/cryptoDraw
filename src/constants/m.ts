/** Round constants M (8 × 32-bit words), same as Java `private static final int[] M`. */
export const M_VALUES: readonly number[] = [
  0xbdba3bed,
  0xf36e6b11,
  0xcefb0d59,
  0x111ef1f1,
  0x72fc76bb,
  0xacb44526,
  0x9a26714f,
  0x37d81f7b,
] as const;

export const M_LENGTH = M_VALUES.length;

export function uint32ToBinary32(n: number): string {
  return (n >>> 0).toString(2).padStart(32, '0');
}

export function uint32ToHex(n: number): string {
  return '0x' + (n >>> 0).toString(16).padStart(8, '0');
}

/** Parse a binary index (0–7). Accepts 1–3 bits or longer if value fits. */
export function parseIndexBits(bits: string): number | null {
  const c = bits.replace(/\s/g, '');
  if (!/^[01]+$/.test(c)) return null;
  const i = parseInt(c, 2);
  if (i < 0 || i >= M_LENGTH) return null;
  return i;
}

export function lookupM(index: number): {
  index: number;
  value: number;
  hex: string;
  result: string;
} {
  const value = M_VALUES[index]!;
  return {
    index,
    value,
    hex: uint32ToHex(value),
    result: uint32ToBinary32(value),
  };
}
