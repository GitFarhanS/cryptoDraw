import ConcatBytesBlock from '../mode-block/concat-bytes-block';
import CounterIncrementBeBlock from '../mode-block/counter-increment-be-block';
import FormatConvertBlock from './format-convert-block';
import JoinLotsBlock from './join-lots-block';
import SplitIntoLotsBlock from './split-into-lots-block';
import XorBytesBlock from '../mode-block/xor-bytes-block';

function ConverterBlocks() {
    return (
        <div className="input-blocks input-blocks--sidebar">
            <SplitIntoLotsBlock draggableToCanvas />
            <JoinLotsBlock draggableToCanvas />
            <FormatConvertBlock draggableToCanvas />
            <CounterIncrementBeBlock draggableToCanvas />
            <XorBytesBlock draggableToCanvas />
            <ConcatBytesBlock draggableToCanvas />
        </div>
    );
}

export default ConverterBlocks;
