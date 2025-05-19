// Utility for working with snarkjs in the frontend
import * as snarkjs from 'snarkjs';

/**
 * Interface for signal value types that are valid in a circuit
 */
export type SignalValueType = number | string | bigint | SignalValueType[];

/**
 * Interface aligning with snarkjs's expected circuit inputs
 */
export interface CircuitSignals {
  [key: string]: SignalValueType;
}

/**
 * Interface for circuit inputs, compatible with our existing code
 */
export interface CircuitInputs {
  [key: string]: number | string | bigint | boolean | CircuitInputs;
}

/**
 * Interface for ZKP proof structure conforming to snarkjs Groth16Proof
 */
export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

/**
 * Interface for verification key
 */
export interface VerificationKey {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  vk_alphabeta_12: string[][][];
  IC: string[][];
}

/**
 * Generate a ZK proof using snarkjs
 * @param inputs - The inputs to the circuit
 * @param wasmPath - Path to the wasm file
 * @param zkeyPath - Path to the zkey file
 * @returns The generated proof and public signals
 */
export const generateProof = async (
  inputs: CircuitInputs,
  wasmPath: string,
  zkeyPath: string
): Promise<{ proof: ZKProof; publicSignals: string[] }> => {
  try {
    console.log('Generating ZK proof with inputs:', JSON.stringify(inputs, null, 2));
    console.log(`Using WASM path: ${wasmPath}`);
    console.log(`Using ZKEY path: ${zkeyPath}`);
    const sanitizedInputs: CircuitSignals = {};
    Object.keys(inputs).forEach(key => {
      const value = inputs[key];
      if (typeof value === 'boolean') {
        sanitizedInputs[key] = value ? '1' : '0';
      } else {
        sanitizedInputs[key] = value as SignalValueType;
      }
    });
    const result = await snarkjs.groth16.fullProve(sanitizedInputs, wasmPath, zkeyPath);
    if (!result || typeof result !== 'object' || !result.proof || !result.publicSignals) {
      throw new Error('Invalid proof result structure from snarkjs');
    }
    const proof: ZKProof = {
      pi_a: Array.isArray(result.proof.pi_a) ? result.proof.pi_a : [],
      pi_b: Array.isArray(result.proof.pi_b) ? result.proof.pi_b : [],
      pi_c: Array.isArray(result.proof.pi_c) ? result.proof.pi_c : [],
      protocol: result.proof.protocol || 'groth16',
      curve: result.proof.curve || 'bn128'
    };
    const publicSignals: string[] = Array.isArray(result.publicSignals)
      ? result.publicSignals.map(String)
      : [];
    return { proof, publicSignals };
  } catch (error: unknown) {
    console.error('Error generating proof:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Verify a ZK proof using snarkjs
 * @param verificationKey - The verification key
 * @param publicSignals - The public signals from the proof
 * @param proof - The generated proof
 * @returns True if the proof is valid
 */
export const verifyProof = async (
  verificationKey: VerificationKey,
  publicSignals: string[],
  proof: ZKProof
): Promise<boolean> => {
  try {
    if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {
      throw new Error('Invalid proof structure');
    }
    return await snarkjs.groth16.verify(verificationKey, publicSignals, proof);
  } catch (error: unknown) {
    console.error('Error verifying proof:', error);
    throw error instanceof Error ? error : new Error(String(error));
  }
};

/**
 * Export a proof to a Solidity verifier format
 * @param proof - The proof to export
 * @param publicSignals - The public signals from the proof
 * @returns The Solidity calldata
 */
export const exportSolidityCallData = async (
  proof: ZKProof,
  publicSignals: string[]
): Promise<string> => {
  try {
    // Defensive: ensure proof structure
    if (!proof || !proof.pi_a || !proof.pi_b || !proof.pi_c) {
      throw new Error('Invalid proof structure');
    }
    const calldata = await snarkjs.groth16.exportSolidityCallData(proof, publicSignals);
    return calldata;
  } catch (error: unknown) {
    console.error('Error exporting Solidity calldata:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Unknown error exporting Solidity calldata: ${String(error)}`);
    }
  }
};
