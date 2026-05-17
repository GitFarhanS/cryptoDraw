/** Read bit string from upstream node data (`binary` or `result`). */
export function bitsFromUpstreamData(data: unknown): string {
  if (!data || typeof data !== 'object') return '';
  const d = data as { binary?: string; result?: string | null };
  if (typeof d.binary === 'string') return d.binary;
  if (typeof d.result === 'string') return d.result;
  return '';
}

export function normalizeVarName(name: string): string {
  const trimmed = name.trim().replace(/[^\w]/g, '');
  return trimmed || 'v1';
}

/** Normalize to exactly `width` binary digits; null if no valid bits. */
export function normalizeToBits(bits: string, width: number): string | null {
  const cleaned = bits.replace(/[^01]/g, '');
  if (!cleaned) return null;
  return cleaned.slice(-width).padStart(width, '0');
}

/** Normalize to exactly 16 binary digits; null if no valid bits. */
export function normalizeTo16Bits(bits: string): string | null {
  return normalizeToBits(bits, 16);
}

export function bits16ToHex(bits: string): string {
  return '0x' + parseInt(bits, 2).toString(16).padStart(4, '0');
}

/** Normalize to exactly 8 binary digits; null if no valid bits. */
export function normalizeTo8Bits(bits: string): string | null {
  return normalizeToBits(bits, 8);
}

export function bits8ToHex(bits: string): string {
  return '0x' + parseInt(bits, 2).toString(16).padStart(2, '0');
}

/** Normalize to exactly 64 binary digits; null if no valid bits. */
export function normalizeTo64Bits(bits: string): string | null {
  return normalizeToBits(bits, 64);
}

export function bits64ToHex(bits: string): string {
  return '0x' + BigInt('0b' + bits).toString(16).padStart(16, '0');
}

/** Normalize to exactly 128 binary digits; null if no valid bits. */
export function normalizeTo128Bits(bits: string): string | null {
  return normalizeToBits(bits, 128);
}

export function bits128ToHex(bits: string): string {
  return '0x' + BigInt('0b' + bits).toString(16).padStart(32, '0');
}

export function bitsToHex(bits: string): string {
  if (bits.length === 8) return bits8ToHex(bits);
  if (bits.length === 16) return bits16ToHex(bits);
  if (bits.length === 64) return bits64ToHex(bits);
  if (bits.length === 128) return bits128ToHex(bits);
  if (bits.length > 53) return '0x' + BigInt('0b' + bits).toString(16);
  return '0x' + parseInt(bits, 2).toString(16);
}
