import FormatConvertBlock from './format-convert-block'
import JoinLotsBlock from './join-lots-block'
import SplitIntoLotsBlock from './split-into-lots-block'

function ConverterBlocks() {
    return (
        <div className="input-blocks">
            <SplitIntoLotsBlock draggableToCanvas />
            <JoinLotsBlock draggableToCanvas />
            <FormatConvertBlock draggableToCanvas />
        </div>
    )
}

export default ConverterBlocks
