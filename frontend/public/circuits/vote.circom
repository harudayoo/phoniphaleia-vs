pragma circom 2.0.0;

// Import poseidon hash function and comparators
include "../scripts/node_modules/circomlib/circuits/poseidon.circom";
include "../scripts/node_modules/circomlib/circuits/comparators.circom";

// A circuit for vote verification
// Ensures a vote is valid without revealing the vote itself

template VoteVerifier() {
    // Private inputs (not revealed in the proof)
    signal input voterId;       // ID of the voter
    signal input candidateId;   // ID of the candidate chosen
    signal input positionId;    // Position being voted for
    signal input nonce;         // Random nonce for uniqueness

    // Public outputs (revealed in the proof)
    signal output voteCommitment; // Hash of vote data
    signal output positionOutput; // Position ID (public)
      // Constraints to ensure voterId, candidateId and positionId are valid
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

    // Hash the vote data using Poseidon (efficient ZKP-friendly hash function)
    component hasher = Poseidon(4);    hasher.inputs[0] <== voterId;
    hasher.inputs[1] <== candidateId;
    hasher.inputs[2] <== positionId;
    hasher.inputs[3] <== nonce;
    
    // Output the commitment hash (this proves the vote's integrity without revealing its contents)
    voteCommitment <== hasher.out;
    
    // Output the position (this allows on-chain verification that the vote is for the right position)
    positionOutput <== positionId;
}

// The main component with public output specified
component main {public [positionOutput]} = VoteVerifier();
