// Configuration variables for the frontend application

// API URL for making backend requests
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

// Application settings
export const APP_NAME = 'Phoniphaleia E-Voting System';
export const APP_VERSION = '1.0.0';

// Cryptography settings
export const DEFAULT_THRESHOLD = 3; // Default threshold for k-of-n secret sharing
export const DEFAULT_KEY_SHARES = 5; // Default number of key shares to generate

// ZKP settings
export const ZKP_WASM_PATH = '/circuits/vote_verification.wasm';
export const ZKP_ZKEY_PATH = '/circuits/vote_verification.zkey';

// Authentication settings
export const SESSION_TIMEOUT_MS = 3600000; // 1 hour

// Feature flags
export const FEATURES = {
  THRESHOLD_CRYPTO: true,
  ZKP_VERIFICATION: true,
};

// Export default config object
const config = {
  API_URL,
  APP_NAME,
  APP_VERSION,
  DEFAULT_THRESHOLD,
  DEFAULT_KEY_SHARES,
  ZKP_WASM_PATH,
  ZKP_ZKEY_PATH,
  SESSION_TIMEOUT_MS,
  FEATURES,
};

export default config;
