import { describe, expect, it } from 'vitest'
import {
    duplicatePlacedBlock,
    positionBlocksAtAnchor,
    removePlacedBlockAndEdges,
} from './placed-block-actions'

describe('placed block actions', () => {
    it('duplicates a block with a new id and offset', () => {
        const source = { id: 'src', type: 'ascii', x: 100, y: 120, text: 'hello' }
        const duplicate = duplicatePlacedBlock(source, {
            dx: 30,
            dy: 12,
            idFactory: () => 'dup',
        })

        expect(duplicate).toEqual({
            id: 'dup',
            type: 'ascii',
            x: 130,
            y: 132,
            text: 'hello',
        })
    })

    it('removes a block and all of its connected edges', () => {
        const blocks = [
            { id: 'a', type: 'ascii', x: 0, y: 0 },
            { id: 'b', type: 'output', x: 1, y: 1 },
            { id: 'c', type: 'hex', x: 2, y: 2 },
        ]
        const edges = [
            { id: 'e1', from: { blockId: 'a', portKey: 'out' }, to: { blockId: 'b', portKey: 'in' } },
            { id: 'e2', from: { blockId: 'c', portKey: 'out' }, to: { blockId: 'a', portKey: 'in' } },
            { id: 'e3', from: { blockId: 'c', portKey: 'out' }, to: { blockId: 'b', portKey: 'in' } },
        ]

        const next = removePlacedBlockAndEdges(blocks, edges, 'a')
        expect(next.placedBlocks.map((block) => block.id)).toEqual(['b', 'c'])
        expect(next.edges.map((edge) => edge.id)).toEqual(['e3'])
    })

    it('positions copied blocks so top-left aligns with paste anchor', () => {
        const blocks = [
            { id: 'a', type: 'ascii', x: 90, y: 110 },
            { id: 'b', type: 'output', x: 140, y: 180 },
        ]

        const anchored = positionBlocksAtAnchor(blocks, 300, 400)
        expect(anchored).toEqual([
            { id: 'a', type: 'ascii', x: 300, y: 400 },
            { id: 'b', type: 'output', x: 350, y: 470 },
        ])
    })
})
