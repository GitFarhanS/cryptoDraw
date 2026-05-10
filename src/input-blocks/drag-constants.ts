export const INPUT_BLOCK_DRAG_MIME = 'application/x-crypto-drawer-block-type';
export const CUSTOM_FUNCTION_DRAG_MIME = 'application/x-crypto-drawer-custom-function';

export const INPUT_BLOCK_TYPES = ['binary', 'hex', 'decimal', 'ascii'] as const;

export const CONVERTER_BLOCK_TYPES = ['splitIntoLots', 'joinLots', 'formatConvert', 'permuteReorder'] as const;

export const SBOX_BLOCK_TYPES = ['subBytes'] as const;

export const STREAM_BLOCK_TYPES = [
    'chachaIetfInit',
    'chachaIetfQuarterRound',
    'chachaIetfColumnRound',
    'chachaIetfDiagonalRound',
    'chachaIetfFinalize',
] as const;

export const OPERATION_BLOCK_TYPES = [
    'opXor',
    'opLeftShift',
    'opRightShift',
    'opBitwiseAnd',
    'opMod',
    'opPow',
    'opAdd',
    'opMul',
] as const;

export const OUTPUT_BLOCK_TYPES = ['output'] as const;

export const PLACED_BLOCK_TYPES = [
    ...INPUT_BLOCK_TYPES,
    ...CONVERTER_BLOCK_TYPES,
    ...SBOX_BLOCK_TYPES,
    ...STREAM_BLOCK_TYPES,
    ...OPERATION_BLOCK_TYPES,
    ...OUTPUT_BLOCK_TYPES,
] as const;

export function isInputBlockType(value: string) {
    return (INPUT_BLOCK_TYPES as readonly string[]).includes(value);
}

export function isPlacedBlockType(value: string) {
    return (PLACED_BLOCK_TYPES as readonly string[]).includes(value);
}
