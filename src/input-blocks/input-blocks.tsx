import AsciiBlock from './ascii-block';
import BinaryBlock from './binary-block';
import DecimalBlock from './decimal-block';
import HexBlock from './hex-block';

function InputBlocks() {
    return (
        <div className="input-blocks">
            <BinaryBlock draggableToCanvas />
            <HexBlock draggableToCanvas />
            <DecimalBlock draggableToCanvas />
            <AsciiBlock draggableToCanvas />
        </div>
    );
}

export default InputBlocks;
