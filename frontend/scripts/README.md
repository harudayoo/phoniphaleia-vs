# ZKP Circuit Utility Scripts

This directory contains ES Module scripts for managing, testing, and generating the zero-knowledge proof (ZKP) circuit files used by the application.

## Setup

These scripts use ES modules. To run them, first install dependencies:

```powershell
cd scripts
npm install
```

## Available Scripts

### 1. `generate-real-circuit.js`

Generates a real, cryptographically secure ZKP circuit for vote verification:
- Creates a proper `vote.circom` circuit file
- Compiles it to WebAssembly
- Sets up a proper ZK proving system

### 2. `generate-fixed-circuit.js`

An improved version of the circuit generator that uses circom2:
- Uses the CircomRunner API to compile circuits
- Handles file and directory paths correctly
- Produces compatible zkey and verification key files

### 3. `simple-circuit-generator.js` (RECOMMENDED)

The most reliable circuit generation script:
- Works with both circom2 WASM and CLI
- Falls back to binary file generation if needed
- Automatically validates generated files
- Generates cryptographically secure keys

```powershell
npm run generate-real
```

This script:
1. Installs necessary dependencies (circom, circomlib, snarkjs)
2. Downloads a Powers of Tau file (or uses an existing one)
3. Compiles the circuit to generate R1CS and WASM files
4. Creates a proper zkey file using a trusted setup
5. Exports a verification key for the frontend

### 2. `generate-mock-circuit.js`

Creates mock circuit files with proper formats but simple content:
- `vote.wasm` - WebAssembly binary with correct headers
- `vote.zkey` - Mock zkey file in JSON format
- `verification_key.json` - Mock verification key for the frontend

```powershell
node generate-mock-circuit.js
```

### 3. `create-binary-files.js`

Creates proper binary files with the correct magic numbers:
- `vote.wasm` - WebAssembly binary starting with `00 61 73 6d`
- `vote.zkey` - Binary file with custom header `1a 3c b6 45`

```powershell
npm run create-binary
```

### 4. `test-wasm-integration.js`

Tests the WebAssembly files and snarkjs integration:
- Validates file existence
- Checks file format and magic numbers
- Tests integration with snarkjs
- Verifies fallback mechanism for development

```powershell
npm run test-wasm
```

### 5. `fix-wasm-files.js` and `fix-circuit-files.js`

Earlier attempts at fixing the files, now superseded by the above scripts.

## Real vs. Mock Circuits

The mock scripts (`generate-mock-circuit.js` and `create-binary-files.js`) create placeholder files that have the correct format but don't perform real cryptographic operations. They're useful for UI development and testing.

The real circuit script (`generate-real-circuit.js`) creates fully functional ZKP circuits that can prove vote authenticity without revealing the actual vote contents. Use these for production.

## Testing ZKP Flow

For complete end-to-end testing with real cryptographic validation:

1. Run `npm run generate-real` to create proper circuit files
2. Use the created files in your frontend application
3. Verify that ZKP generation and verification work correctly

## Converting from CommonJS to ES Modules

All scripts have been updated to use ES modules instead of CommonJS, fixing the ESLint warnings about `require()` style imports.
