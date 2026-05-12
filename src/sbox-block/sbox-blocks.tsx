import Gf256MixColumnBlock from '../field-block/gf256-mix-column-block';
import Gf256MulBlock from '../field-block/gf256-mul-block';
import SubBytesBlock from './sub-bytes-block';

function SboxBlocks() {
    return (
        <div className="input-blocks input-blocks--sidebar">
            <SubBytesBlock draggableToCanvas />
            <Gf256MulBlock draggableToCanvas />
            <Gf256MixColumnBlock draggableToCanvas />
        </div>
    );
}

export default SboxBlocks
