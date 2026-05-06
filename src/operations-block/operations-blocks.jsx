import OperationBlock from './operation-block'
import { OPERATION_DEFINITIONS } from './operation-definitions'

function OperationsBlocks() {
  return (
    <div className="input-blocks">
      {OPERATION_DEFINITIONS.map(({ blockType, title, hint }) => (
        <OperationBlock
          key={blockType}
          blockType={blockType}
          title={title}
          hint={hint}
          draggableToCanvas
        />
      ))}
    </div>
  )
}

export default OperationsBlocks
