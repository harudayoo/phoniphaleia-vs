/**
 * Utility functions for handling key shares in the election system
 */

/**
 * Formats a key share string into the expected x,y format for the backend
 * Attempts to clean up and extract the key share data from various formats
 * 
 * @param shareStr - The key share string to format
 * @returns A properly formatted key share string or null if invalid
 */
export const formatKeyShare = (shareStr: string): string | null => {
  if (!shareStr || shareStr.trim() === '') {
    return null;
  }

  const trimmed = shareStr.trim();
  
  // Check if it's already in x,y format
  if (/^\d+,\d+$/.test(trimmed)) {
    return trimmed;
  }
  
  // Check if it's in x:hex format (how shares are often serialized)
  if (trimmed.includes(':')) {
    const [xStr, yHex] = trimmed.split(':');
    try {
      const x = parseInt(xStr, 10);
      const y = parseInt(yHex, 16); // Parse hex
      return `${x},${y}`;
    } catch (e) {
      console.error('Failed to parse x:hex format:', e);
    }
  }
  
  // Check for space or tab delimited format
  const spaceMatch = trimmed.match(/^(\d+)[\s\t]+(\d+)$/);
  if (spaceMatch && spaceMatch.length === 3) {
    return `${spaceMatch[1]},${spaceMatch[2]}`;
  }
  
  // Try to extract the first two numbers found
  const numbers = trimmed.match(/\d+/g);
  if (numbers && numbers.length >= 2) {
    return `${numbers[0]},${numbers[1]}`;
  }
  
  // Could not parse in any known format
  console.error('Could not parse key share:', shareStr);
  return null;
}

/**
 * Validates if a key share string is in a valid format
 * 
 * @param shareStr - The key share string to validate
 * @returns True if valid, false otherwise
 */
export const isValidKeyShare = (shareStr: string): boolean => {
  return formatKeyShare(shareStr) !== null;
}

/**
 * Attempts to extract numbers from a string that might contain key share information
 * 
 * @param text - Text that might contain key share information
 * @returns An array of potential key share strings
 */
export const extractKeyShares = (text: string): string[] => {
  if (!text) return [];
  
  const lines = text.split(/[\r\n]+/);
  return lines
    .map(line => formatKeyShare(line))
    .filter((share): share is string => share !== null);
}
