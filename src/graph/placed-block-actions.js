/**
 * @param {import('./placed-block-defaults.js').PlacedBlockRecord} block
 * @param {{ dx?: number, dy?: number, idFactory?: () => string }} [options]
 */
export function duplicatePlacedBlock(block, options = {}) {
  const { dx = 24, dy = 24, idFactory = () => crypto.randomUUID() } = options
  return {
    ...block,
    id: idFactory(),
    x: block.x + dx,
    y: block.y + dy,
  }
}

/**
 * @param {import('./placed-block-defaults.js').PlacedBlockRecord[]} placedBlocks
 * @param {import('./edge-types.js').GraphEdge[]} edges
 * @param {string} blockId
 */
export function removePlacedBlockAndEdges(placedBlocks, edges, blockId) {
  return {
    placedBlocks: placedBlocks.filter((block) => block.id !== blockId),
    edges: edges.filter(
      (edge) => edge.from.blockId !== blockId && edge.to.blockId !== blockId,
    ),
  }
}
