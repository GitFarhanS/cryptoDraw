import { INPUT_BLOCK_DRAG_MIME, isPlacedBlockType } from './drag-constants'

export function attachPaletteDragData(event, blockType) {
  const { target } = event
  if (
    target instanceof Element &&
    target.closest('input, textarea, select, button, [contenteditable="true"]')
  ) {
    event.preventDefault()
    return
  }
  if (!isPlacedBlockType(blockType)) {
    event.preventDefault()
    return
  }
  event.dataTransfer.setData(INPUT_BLOCK_DRAG_MIME, blockType)
  event.dataTransfer.effectAllowed = 'copy'
}
