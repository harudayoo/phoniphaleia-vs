# Zero-Knowledge Proof and Threshold Cryptography in Phoniphaleia

This document explains how the Zero-Knowledge Proof (ZKP) verification and threshold cryptography features work in the Phoniphaleia electronic voting system.

## Overview

Phoniphaleia implements three advanced cryptographic mechanisms to ensure the integrity and privacy of votes:

1. **Zero-Knowledge Proofs (ZKP)** - Allow voters to prove that they voted correctly without revealing their actual vote
2. **Threshold ElGamal Cryptography** - Allows encryption of votes that can only be decrypted when a threshold number of trusted authorities collaborate
3. **Challenge-Response Authentication** - Secures the decryption process by requiring trusted authorities to authenticate via cryptographic challenges

## Zero-Knowledge Proof Verification

### What are ZKPs?

Zero-Knowledge Proofs allow one party (the prover) to prove to another party (the verifier) that a statement is true, without revealing any information beyond the validity of the statement itself.

In the context of electronic voting, ZKPs allow:
- Voters to prove they voted for an eligible candidate without revealing which one
- The system to verify that each vote is valid without learning the voter's choice

### Implementation in Phoniphaleia

Phoniphaleia uses the **Groth16** proving system via **snarkjs** to implement ZKPs. The workflow is:

1. **Setup Phase** (before election starts):
   - Generate circuit parameters for the specific election
   - Create proving and verification keys
   - Store the verification key in the election's crypto configuration

2. **Voting Phase**:
   - When a voter casts a vote, the frontend generates a ZKP proving the vote is valid
   - The proof and public inputs are submitted with the encrypted vote

3. **Verification Phase**:
   - Anyone can verify that each vote follows the rules without seeing the actual vote
   - The `SnarkjsVerifier` service handles verification of proofs

### Key Components

- **snarkjs_verifier.py**: Backend service for verifying zero-knowledge proofs
- **snarkjsService.ts**: Frontend service for generating zero-knowledge proofs
- **ZKPVerificationPanel.tsx**: UI component for verifying proofs
- **verification_controller.py**: API controller for handling verification requests

## Threshold ElGamal Cryptography

### What is Threshold Cryptography?

Threshold cryptography distributes the power to decrypt information across multiple parties, requiring a minimum number (the threshold) to collaborate for decryption. This prevents any single party from having too much power.

In Phoniphaleia:
- A single encrypted vote cannot be decrypted by any individual authority
- A minimum number of trusted authorities must combine their partial decryptions
- This protects voter privacy and prevents early result tabulation

### ElGamal Cryptosystem

The system uses Threshold ElGamal, a public key cryptosystem with these properties:
- **Homomorphic**: Mathematical operations can be performed on encrypted data
- **Threshold Decryption**: Requires cooperation of multiple key holders
- **Provable Security**: Based on the Discrete Logarithm Problem

### Implementation in Phoniphaleia

1. **Key Generation** (before election starts):
   - System generates an ElGamal key pair with threshold parameters (n, t)
   - Public key is published and used for vote encryption
   - Private key is split into n shares, distributed to trusted authorities

2. **Vote Encryption** (during voting):
   - Votes are encrypted with the public key before submission
   - Each encrypted vote consists of two components (c1, c2)

3. **Threshold Decryption** (after election closes):
   - At least t trusted authorities submit partial decryptions
   - System combines these partial decryptions to reveal the original votes
   - Results are tallied and published

### Key Components

- **threshold_elgamal.py**: Backend service implementing threshold cryptography
- **shamir.py**: Implementation of Shamir's Secret Sharing for key splitting
- **elgamalService.ts**: Frontend service for encryption operations
- **DecryptionPanel.tsx**: UI component for threshold decryption
- **verification_controller.py**: API controller for handling decryption requests

## How to Test the Implementation

### Backend Tests

1. Install backend dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the test suite:
   ```bash
   cd backend
   python -m tests.run_tests
   ```

3. For Windows PowerShell users, run all tests with the included script:
   ```powershell
   .\run_crypto_tests.ps1
   ```

4. For Linux/Mac users:
   ```bash
   chmod +x run_crypto_tests.sh
   ./run_crypto_tests.sh
   ```

5. Run specific test files:
   ```bash
   python -m tests.test_threshold_elgamal
   python -m tests.test_snarkjs_verifier
   python -m tests.test_verification_controller
   python -m tests.test_crypto_integration
   ```

6. Try the interactive demo:
   ```bash
   python -m tests.demo_threshold_elgamal
   ```

The test suite includes:

* **Threshold ElGamal Tests**: Testing key generation, vote encryption, partial decryption, and threshold combination
* **ZKP Verification Tests**: Testing zero-knowledge proof verification functionality
* **Integration Tests**: Testing the complete flow from vote encryption to ZKP verification and threshold decryption
* **Controller Tests**: Testing API endpoints for verification and decryption

3. Run the demonstration script:
   ```bash
   python -m tests.demo_threshold_elgamal
   ```

### Frontend Tests

1. Install frontend dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Run the frontend test suite:
   ```bash
   node tests/run-tests.js
   ```

## Challenge-Response Authentication

### What is Challenge-Response Authentication?

Challenge-response authentication is a security mechanism that protects against replay attacks and ensures that trusted authorities are legitimate when they participate in the decryption process.

In Phoniphaleia:
- Trusted authorities must authenticate before submitting partial decryptions
- The server issues a cryptographic challenge that must be signed with the authority's private key
- Successful authentication proves possession of the correct private key without revealing it

### Implementation in Phoniphaleia

1. **Authentication Flow**:
   - Authority requests a challenge from the server
   - Server generates a random challenge string and stores it with an expiration time
   - Authority signs the challenge with their private key and sends the response
   - Server verifies the signature using the authority's known public key

2. **Security Features**:
   - Challenges expire after 5 minutes
   - Each challenge can only be used once
   - Signatures include timestamps to prevent replay attacks
   - Private keys never leave the trusted authority's device

3. **Integration with Threshold Decryption**:
   - Authentication required before submitting partial decryptions
   - Multiple levels of protection: authentication + threshold

### Key Components

- **challenge_response.py**: Backend service for challenge-response authentication
- **authorityAuthService.ts**: Frontend service for handling authentication flow
- **AuthorityDecryptionPanel.tsx**: UI component for authenticated decryptions
- **auth.py**: Decorator utilities for securing API endpoints

## Security Considerations

When using these cryptographic features, keep in mind:

1. **Key Management**:
   - Store key shares securely
   - Ensure trusted authorities protect their key shares and authentication keys
   - Key generation should happen on trusted hardware

2. **Threshold Selection**:
   - Choose an appropriate threshold value (typically n/2 + 1)
   - Balance between security and operational flexibility

3. **ZKP Circuit Design**:
   - Ensure circuits correctly enforce all voting rules
   - Test extensively before deployment

4. **Network Security**:
   - All cryptographic operations should use secured connections
   - Implement rate limiting to prevent DoS attacks

5. **Authentication Security**:
   - Ensure challenge randomness and uniqueness
   - Enforce timely challenge expiration
   - Verify all signature components including timestamps

## References

- [ThresholdElGamal Library Documentation](https://github.com/threshold-elgamal)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs for Electronic Voting](https://eprint.iacr.org/2016/670.pdf)
- [Threshold Cryptography in Electronic Elections](https://www.researchgate.net/publication/220334187_Threshold_Cryptography_in_Electronic_Elections)
