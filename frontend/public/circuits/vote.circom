pragma circom 2.0.0;
include "poseidon.circom";
include "comparators.circom";

template VoteVerifier() {
    signal input voterId;
    signal input candidateId;
    signal input positionId;
    signal input nonce;
    signal output voteCommitment;
    signal output positionOutput;

    component validVoterId = GreaterEqThan(32);
    validVoterId.in[0] <== voterId;
    validVoterId.in[1] <== 1;
    validVoterId.out === 1;

    component validCandidateId = GreaterEqThan(32);
    validCandidateId.in[0] <== candidateId;
    validCandidateId.in[1] <== 1;
    validCandidateId.out === 1;

    component validPositionId = GreaterEqThan(32);
    validPositionId.in[0] <== positionId;
    validPositionId.in[1] <== 1;
    validPositionId.out === 1;

    component hasher = Poseidon(4);
    hasher.inputs[0] <== voterId;
    hasher.inputs[1] <== candidateId;
    hasher.inputs[2] <== positionId;
    hasher.inputs[3] <== nonce;

    voteCommitment <== hasher.out;
    positionOutput <== positionId;
}

component main = VoteVerifier();
