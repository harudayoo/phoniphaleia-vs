/**
 * Configuration file for the application
 */
import { API_URL } from '../config';

// Trusted Authority Authentication API endpoints
export const CHALLENGE_REQUEST_ENDPOINT = `${API_URL}/trusted_authorities/challenge`;
export const VERIFY_AUTHORITY_ENDPOINT = `${API_URL}/verification/verify-authority`;
export const SUBMIT_PARTIAL_DECRYPTION_ENDPOINT = `${API_URL}/verification/decrypt/submit-partial`;

// Authentication settings
export const CHALLENGE_EXPIRY_SECONDS = 300; // 5 minutes

// Decryption settings
export const MIN_AUTHORITIES_REQUIRED = 2; // Minimum number of authorities required for decryption
