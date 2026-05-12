import FormatConvertBlock from './format-convert-block';
import HmacSha256Block from '../hash-block/hmac-sha256-block';
import JoinLotsBlock from './join-lots-block';
import Sha256Block from '../hash-block/sha256-block';
import SplitIntoLotsBlock from './split-into-lots-block';

function ConverterBlocks() {
    return (
        <div className="input-blocks input-blocks--sidebar">
            <SplitIntoLotsBlock draggableToCanvas />
            <JoinLotsBlock draggableToCanvas />
            <FormatConvertBlock draggableToCanvas />
            <Sha256Block draggableToCanvas />
            <HmacSha256Block draggableToCanvas />
        </div>
    );
}

export default ConverterBlocks;
