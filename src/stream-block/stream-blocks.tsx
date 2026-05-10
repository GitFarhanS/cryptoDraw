import {
    ChaChaIetfColumnRoundBlock,
    ChaChaIetfDiagonalRoundBlock,
    ChaChaIetfFinalizeBlock,
    ChaChaIetfInitBlock,
    ChaChaIetfQuarterRoundBlock,
} from './chacha-ietf-blocks'

function StreamBlocks() {
    return (
        <div className="input-blocks input-blocks--sidebar">
            <ChaChaIetfInitBlock draggableToCanvas />
            <ChaChaIetfQuarterRoundBlock draggableToCanvas />
            <ChaChaIetfColumnRoundBlock draggableToCanvas />
            <ChaChaIetfDiagonalRoundBlock draggableToCanvas />
            <ChaChaIetfFinalizeBlock draggableToCanvas />
        </div>
    )
}

export default StreamBlocks
