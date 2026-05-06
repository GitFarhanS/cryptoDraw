import { INPUT_BLOCK_TYPES, PLACED_BLOCK_TYPES } from '../input-blocks/drag-constants'

/**
 * @typedef {object} PlacedBlockRecord
 * @property {string} id
 * @property {string} type
 * @property {number} x
 * @property {number} y
 * @property {number} [blockCount]
 * @property {number} [joinCount]
 * @property {string} [text]
 * @property {string} [fcText]
 * @property {string} [fcInputFormat]
 * @property {string} [fcOutputFormat]
 */

/**
 * @param {string} type
 * @param {number} x
 * @param {number} y
 * @returns {PlacedBlockRecord | null}
 */
export function createPlacedBlock(type, x, y) {
  if (!PLACED_BLOCK_TYPES.includes(type)) {
    return null
  }

  /** @type {PlacedBlockRecord} */
  const base = {
    id: crypto.randomUUID(),
    type,
    x,
    y,
  }

  if (INPUT_BLOCK_TYPES.includes(type)) {
    return { ...base, text: '' }
  }
  if (type === 'splitIntoLots') {
    return { ...base, blockCount: 4 }
  }
  if (type === 'joinLots') {
    return { ...base, joinCount: 2 }
  }
  if (type === 'formatConvert') {
    return {
      ...base,
      fcText: '',
      fcInputFormat: 'hex',
      fcOutputFormat: 'ascii',
    }
  }

  return base
}
