import FormatConvertBlock from './converter-block/format-convert-block'
import JoinLotsBlock from './converter-block/join-lots-block'
import SplitIntoLotsBlock from './converter-block/split-into-lots-block'
import AsciiBlock from './input-blocks/ascii-block'
import BinaryBlock from './input-blocks/binary-block'
import DecimalBlock from './input-blocks/decimal-block'
import HexBlock from './input-blocks/hex-block'
import OperationBlock from './operations-block/operation-block'
import { OPERATION_DEFINITIONS } from './operations-block/operation-definitions'

const OPERATION_BLOCKS_BY_TYPE = Object.fromEntries(
  OPERATION_DEFINITIONS.map(({ blockType, title, hint }) => [
    blockType,
    function PlacedOperationBlock() {
      return <OperationBlock blockType={blockType} title={title} hint={hint} />
    },
  ]),
)

const BLOCK_BY_TYPE = {
  binary: BinaryBlock,
  hex: HexBlock,
  decimal: DecimalBlock,
  ascii: AsciiBlock,
  splitIntoLots: SplitIntoLotsBlock,
  joinLots: JoinLotsBlock,
  formatConvert: FormatConvertBlock,
  ...OPERATION_BLOCKS_BY_TYPE,
}

function CanvasPlacedBlock({ type, left, top }) {
  const Block = BLOCK_BY_TYPE[type]
  if (!Block) {
    return null
  }

  return (
    <div
      className="canvas-placed-block"
      style={{ left, top }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <Block />
    </div>
  )
}

export default CanvasPlacedBlock
