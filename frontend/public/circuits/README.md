# Zero-Knowledge Proof Circuit Files

This directory contains the necessary files for the zero-knowledge proof (ZKP) system used in the voting application.

## Files

- `vote.circom` - The circuit definition written in the Circom language
- `vote.wasm` - WebAssembly binary file compiled from the circom circuit
- `vote.zkey` - Key file for proving and verification
- `verification_key.json` - Public verification key extracted from the zkey file

## Important Notes

### Development Environment

The current files are minimal mock files that allow the application to function without errors. They will produce dummy proofs that are not cryptographically secure but allow the UI to function correctly.

### Production Deployment

For a production deployment, you need to replace these mock files with properly generated circuit files:

1. Install circom (version 2.0 or higher)
2. Compile the circuit: `circom vote.circom --wasm --r1cs`
3. Set up the proving system: `snarkjs groth16 setup vote.r1cs pot12_final.ptau vote.zkey`
4. Export verification key: `snarkjs zkey export verificationkey vote.zkey verification_key.json`

### Security Considerations

- The real ZKP system should be thoroughly audited before production use
- The zkey file must be generated using a secure trusted setup ceremony
- The verification key should be properly distributed and verified

## Troubleshooting WebAssembly Issues

If you encounter WebAssembly errors (e.g., "expected magic word 00 61 73 6d"), the WebAssembly files might be corrupted. Use the script in `scripts/generate-mock-circuit.js` to regenerate proper mock files.

## References

- [Circom Documentation](https://docs.circom.io/)
- [SnarkJS Documentation](https://github.com/iden3/snarkjs)
- [Zero-Knowledge Proofs Guide](https://zkp.science/)
