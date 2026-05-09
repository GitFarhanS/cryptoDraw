import type { GraphEdge, PlacedBlockRecord } from '../types/graph'

interface DuplicatePlacedBlockOptions {
    dx?: number
    dy?: number
    idFactory?: () => string
}

export function duplicatePlacedBlock(
    block: PlacedBlockRecord,
    options: DuplicatePlacedBlockOptions = {},
) {
    const { dx = 24, dy = 24, idFactory = () => crypto.randomUUID() } = options
    return {
        ...block,
        id: idFactory(),
        x: block.x + dx,
        y: block.y + dy,
    }
}

export function removePlacedBlockAndEdges(
    placedBlocks: PlacedBlockRecord[],
    edges: GraphEdge[],
    blockId: string,
) {
    return {
        placedBlocks: placedBlocks.filter((block) => block.id !== blockId),
        edges: edges.filter(
            (edge) => edge.from.blockId !== blockId && edge.to.blockId !== blockId,
        ),
    }
}
