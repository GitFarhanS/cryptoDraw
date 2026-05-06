/** Custom payload type for palette → canvas (HTML5 DnD); MIME name is historical. */
export const INPUT_BLOCK_DRAG_MIME = 'application/x-crypto-drawer-block-type'

export const INPUT_BLOCK_TYPES = ['binary', 'hex', 'decimal', 'ascii']

export const CONVERTER_BLOCK_TYPES = ['splitIntoLots', 'joinLots', 'formatConvert']

export const OPERATION_BLOCK_TYPES = [
  'opXor',
  'opLeftShift',
  'opRightShift',
  'opBitwiseAnd',
  'opMod',
  'opPow',
  'opAdd',
  'opMul',
]

export const OUTPUT_BLOCK_TYPES = ['output']

export const PLACED_BLOCK_TYPES = [
  ...INPUT_BLOCK_TYPES,
  ...CONVERTER_BLOCK_TYPES,
  ...OPERATION_BLOCK_TYPES,
  ...OUTPUT_BLOCK_TYPES,
]

export function isInputBlockType(value) {
  return INPUT_BLOCK_TYPES.includes(value)
}

export function isPlacedBlockType(value) {
  return PLACED_BLOCK_TYPES.includes(value)
}
