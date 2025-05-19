/**
 * Test script for ZKP vote verification
 * 
 * This script tests the complete flow of vote verification using ZKP:
 * 1. Generate a vote
 * 2. Create a ZK proof for the vote
 * 3. Verify the proof
 */
import { 
  generateVoteProof, 
  verifyVoteProof,
  encryptVote
} from '../src/services/voteVerificationService';

// Define interface for vote data structure used in tests
interface TestVoteData {
  voterId: string;
  electionId: number;
  candidateIds: number[];
  positionIds: number[];
}

// Mock fetch for testing purposes
global.fetch = jest.fn().mockImplementation((url) => {
  if (url === '/circuits/verification_key.json') {
    return Promise.resolve({
      json: () => Promise.resolve({
        protocol: 'groth16',
        curve: 'bn128',
        nPublic: 2,
        vk_alpha_1: ['1', '2', '3'],
        vk_beta_2: [['1', '2'], ['3', '4'], ['5', '6']],
        vk_gamma_2: [['1', '2'], ['3', '4'], ['5', '6']],
        vk_delta_2: [['1', '2'], ['3', '4'], ['5', '6']],
        vk_alphabeta_12: [[['1', '2']], [['3', '4']]],
        IC: [['1', '2'], ['3', '4']]
      })
    });
  }
  return Promise.reject(new Error(`Unexpected URL: ${url}`));
});

// Test vote data
const testVoteData: TestVoteData = {
  voterId: '12345',
  electionId: 1,
  candidateIds: [101, 202],
  positionIds: [1, 2]
};

// Mock public key for ElGamal encryption
const mockElGamalPublicKey = JSON.stringify({
  g: '123',
  h: '456',
  p: '789',
  q: '012'
});

describe('Vote Verification Flow', () => {
  test('Generate and verify vote proof', async () => {
    // Generate proof for vote
    const result = await generateVoteProof(testVoteData);
    
    // Verify proof structure
    expect(result.isValid).toBe(true);
    expect(result.proof).toBeDefined();
    expect(result.publicSignals).toBeDefined();
    
    // Verify the proof
    if (result.proof && result.publicSignals) {
      const isVerified = await verifyVoteProof(result.proof, result.publicSignals);
      expect(isVerified).toBe(true);
    }
  });
  
  test('Encrypt vote with ElGamal', () => {
    // Test vote value
    const voteValue = 1;
    
    // Encrypt using our service
    const encrypted = encryptVote(voteValue, mockElGamalPublicKey);
    expect(encrypted).toBeDefined();
    
    // Parse the encrypted data
    const encryptedData = JSON.parse(encrypted);
    expect(encryptedData.c1).toBeDefined();
    expect(encryptedData.c2).toBeDefined();
    expect(encryptedData.metadata).toBeDefined();
    expect(encryptedData.metadata.encryption_scheme).toBe('elgamal');
  });
  
  test('Complete vote verification flow', async () => {
    // 1. Generate proof for vote
    const result = await generateVoteProof(testVoteData);
    expect(result.isValid).toBe(true);
    
    // 2. Verify the proof
    const isProofValid = result.proof && result.publicSignals 
      ? await verifyVoteProof(result.proof, result.publicSignals)
      : false;
    expect(isProofValid).toBe(true);
    
    // 3. Encrypt votes
    const encryptedVotes = testVoteData.candidateIds.map(candidateId => {
      return encryptVote(candidateId, mockElGamalPublicKey);
    });
    
    // Verify we have encrypted votes
    expect(encryptedVotes.length).toBe(testVoteData.candidateIds.length);
    encryptedVotes.forEach(ev => {
      const parsed = JSON.parse(ev);
      expect(parsed.c1).toBeDefined();
      expect(parsed.c2).toBeDefined();
    });
    
    console.log('Complete vote verification flow passed successfully');
  });
});
