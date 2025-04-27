import SHA256 from 'crypto-js';
import { v4 as uuidv4 } from 'uuid';

class ZKPService {
  /**
   * Generate a secure hash of student ID and password
   */
  static hashCredentials(studentId: string, password: string): string {
    // First hash password
    const passwordHash = SHA256(password).toString();
    
    // Combine with student ID and hash again
    const combinedHash = SHA256(studentId + passwordHash).toString();
    
    return combinedHash;
  }

  /**
   * Generate ZKP commitment for registration
   * This creates a unique commitment that will be stored in the database
   * and used for zero-knowledge proof verification
   */
  static generateCommitment(studentId: string, password: string): string {
    // Generate a unique salt for this commitment
    const salt = uuidv4();
    
    // First hash password
    const passwordHash = SHA256(password).toString();
    
    // Create commitment with salt for added security
    const commitment = SHA256(studentId + passwordHash + salt).toString();
    
    return commitment;
  }

  /**
   * Validate student ID format
   */
  static validateStudentId(studentId: string): boolean {
    const pattern = /^[0-9]{4}-[0-9]{5}$/;
    return pattern.test(studentId);
  }
}

export default ZKPService;