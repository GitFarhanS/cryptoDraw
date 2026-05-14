import PermuteReorderBlock from '../converter-block/permute-reorder-block';

function PermutationBlocks() {
    return (
        <div className="input-blocks input-blocks--sidebar">
            <PermuteReorderBlock draggableToCanvas />
        </div>
    );
}

export default PermutationBlocks;
