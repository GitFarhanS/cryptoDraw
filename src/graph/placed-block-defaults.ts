import {
    INPUT_BLOCK_TYPES,
    OPERATION_BLOCK_TYPES,
    PLACED_BLOCK_TYPES,
} from '../input-blocks/drag-constants';
import type { PlacedBlockRecord } from '../types/graph';

export function createPlacedBlock(type: string, x: number, y: number): PlacedBlockRecord | null {
    if (!PLACED_BLOCK_TYPES.includes(type as (typeof PLACED_BLOCK_TYPES)[number])) {
        return null;
    }

    const base: PlacedBlockRecord = {
        id: crypto.randomUUID(),
        type,
        x,
        y,
    };

    if (INPUT_BLOCK_TYPES.includes(type as (typeof INPUT_BLOCK_TYPES)[number])) {
        return { ...base, text: '' };
    }
    if (type === 'splitIntoLots') {
        return { ...base, blockCount: 4 };
    }
    if (type === 'joinLots') {
        return { ...base, joinCount: 2 };
    }
    if (type === 'formatConvert') {
        return {
            ...base,
            fcText: '',
            fcInputFormat: 'hex',
            fcOutputFormat: 'ascii',
        };
    }
    if (OPERATION_BLOCK_TYPES.includes(type as (typeof OPERATION_BLOCK_TYPES)[number])) {
        return {
            ...base,
            opDisplayMode: 'auto',
            opDisplayFormat: 'hex',
            opShiftMode: 'logical',
            opBigPadBytes: 0,
        };
    }

    return base;
}

export { type PlacedBlockRecord } from '../types/graph';
