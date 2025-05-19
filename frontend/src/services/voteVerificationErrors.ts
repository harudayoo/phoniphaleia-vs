// Vote verification error handling utilities

// Types of vote verification errors
export enum VoteVerificationErrorType {
  ALREADY_VOTED = 'already_voted',
  ZKP_GENERATION_FAILED = 'zkp_generation_failed',
  ZKP_VERIFICATION_FAILED = 'zkp_verification_failed',
  MULTIPLE_VOTES_FOR_POSITION = 'multiple_votes_for_position',
  ENCRYPTION_FAILED = 'encryption_failed',
  SUBMISSION_FAILED = 'submission_failed',
  NETWORK_ERROR = 'network_error',
  PUBLIC_KEY_ERROR = 'public_key_error',
  UNKNOWN_ERROR = 'unknown_error'
}

// Error class for vote verification errors
export class VoteVerificationError extends Error {
  type: VoteVerificationErrorType;
  details?: unknown;

  constructor(type: VoteVerificationErrorType, message: string, details?: unknown) {
    super(message);
    this.name = 'VoteVerificationError';
    this.type = type;
    this.details = details;
  }
}

// User-friendly error messages
export const getErrorMessage = (error: VoteVerificationError | Error): string => {
  if (error instanceof VoteVerificationError) {
    switch (error.type) {
      case VoteVerificationErrorType.ALREADY_VOTED:
        return 'You have already cast your vote in this election. Each voter can only vote once.';
      
      case VoteVerificationErrorType.ZKP_GENERATION_FAILED:
        return 'Failed to generate zero-knowledge proof for your vote. Please try again.';
      
      case VoteVerificationErrorType.ZKP_VERIFICATION_FAILED:
        return 'Vote verification failed. The system could not verify the validity of your vote.';
      
      case VoteVerificationErrorType.MULTIPLE_VOTES_FOR_POSITION:
        return 'You cannot vote for multiple candidates for the same position. Please select only one candidate per position.';
      
      case VoteVerificationErrorType.ENCRYPTION_FAILED:
        return 'Failed to encrypt your vote securely. Please try again.';
      
      case VoteVerificationErrorType.SUBMISSION_FAILED:
        return 'Failed to submit your vote to the server. Please try again.';
      
      case VoteVerificationErrorType.NETWORK_ERROR:
        return 'Network error occurred during vote submission. Please check your connection and try again.';
      
      case VoteVerificationErrorType.PUBLIC_KEY_ERROR:
        return 'Could not retrieve the encryption key needed to secure your vote. Please try again or contact support.';
      
      default:
        return error.message || 'An unknown error occurred during vote verification.';
    }
  }
  
  return error.message || 'An unknown error occurred.';
};

/**
 * Interface for error context data
 */
export interface ErrorContext {
  [key: string]: string | number | boolean | null | undefined;
}

/**
 * Interface for error log entry
 */
export interface ErrorLogEntry {
  type: VoteVerificationErrorType | string;
  message: string;
  stack?: string;
  context: ErrorContext;
  timestamp: string;
  errorId?: string;
}

/**
 * Logger for vote verification errors
 * @param error - The error that occurred
 * @param context - Additional context about the error
 */
export const logVerificationError = (error: VoteVerificationError | Error, context: ErrorContext = {}): void => {
  const errorType = error instanceof VoteVerificationError 
    ? error.type 
    : VoteVerificationErrorType.UNKNOWN_ERROR;
  
  const errorId = `err_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 5)}`;
  
  const errorLog: ErrorLogEntry = {
    type: errorType,
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString(),
    errorId
  };
  
  console.error('Vote Verification Error:', errorLog);
  
  // In a production system, you would send this error to your error monitoring service
  // e.g., Sentry, LogRocket, etc.
  
  // Save errors to local storage for debugging if needed
  try {
    const storedErrors = localStorage.getItem('verification_errors');
    const errors = storedErrors ? JSON.parse(storedErrors) as ErrorLogEntry[] : [];
    errors.push(errorLog);
    
    // Keep only last 10 errors to avoid excessive storage use
    const trimmedErrors = errors.slice(-10);
    localStorage.setItem('verification_errors', JSON.stringify(trimmedErrors));
  } catch (storageError) {
    console.warn('Could not store error in localStorage:', storageError);
  }
};

/**
 * Get recent verification error logs for debugging
 * @returns Array of recent error log entries
 */
export const getRecentVerificationErrors = (): ErrorLogEntry[] => {
  try {
    const storedErrors = localStorage.getItem('verification_errors');
    if (storedErrors) {
      return JSON.parse(storedErrors) as ErrorLogEntry[];
    }
  } catch (error) {
    console.warn('Could not retrieve error logs from localStorage:', error);
  }
  return [];
};

/**
 * Clear verification error logs
 */
export const clearVerificationErrorLogs = (): void => {
  try {
    localStorage.removeItem('verification_errors');
  } catch (error) {
    console.warn('Could not clear error logs from localStorage:', error);
  }
};

/**
 * Helper to extract an error message from any error type
 * @param error - The error object
 * @returns A string representation of the error
 */
export const getErrorStringFromUnknown = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === 'string') {
    return error;
  } else if (typeof error === 'object' && error !== null) {
    try {
      return JSON.stringify(error);
    } catch {
      return 'An unknown error object occurred';
    }
  }
  return 'An unknown error occurred';
};

/**
 * Helper to handle verification errors consistently
 * @param error - The error that occurred
 * @param errorType - Optional specific error type to assign
 * @returns A properly typed VoteVerificationError
 */
export const handleVerificationError = (error: unknown, errorType?: VoteVerificationErrorType): VoteVerificationError => {
  if (error instanceof VoteVerificationError) {
    logVerificationError(error);
    return error;
  }
  
  const type = errorType || VoteVerificationErrorType.UNKNOWN_ERROR;
  const message = error instanceof Error ? error.message : getErrorStringFromUnknown(error);
  
  const verificationError = new VoteVerificationError(type, message, error);
  logVerificationError(verificationError);
  
  return verificationError;
};
