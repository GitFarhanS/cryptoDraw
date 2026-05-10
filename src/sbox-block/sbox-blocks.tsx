import SubBytesBlock from './sub-bytes-block';

function SboxBlocks() {
    return (
        <div className="input-blocks input-blocks--sidebar">
            <SubBytesBlock draggableToCanvas />
        </div>
    );
}

export default SboxBlocks;
