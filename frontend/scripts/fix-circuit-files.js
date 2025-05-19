import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting wasm file fix script...');

// Get the content of our wasm files
const wasmFilePath = path.join(__dirname, '..', 'public', 'circuits', 'vote.wasm');
const zkeyFilePath = path.join(__dirname, '..', 'public', 'circuits', 'vote.zkey');

// Read the files as they are (which might be text with comments)
console.log(`Reading WASM file: ${wasmFilePath}`);
const wasmContent = fs.readFileSync(wasmFilePath, 'utf8');
console.log(`Reading ZKEY file: ${zkeyFilePath}`);
const zkeyContent = fs.readFileSync(zkeyFilePath, 'utf8');

// Extract the base64-encoded content, skipping any comment lines
function extractBase64(content) {
  // If the content starts with a comment line, remove it
  const contentLines = content.split('\n');
  const nonCommentLines = contentLines.filter(line => !line.trim().startsWith('//') && line.trim() !== '');
  return nonCommentLines.join('').trim();
}

// Create binary files from base64 strings
function createBinaryFromBase64(filePath, base64Content) {
  try {
    console.log(`Creating binary file: ${filePath}`);
    // Create a backup first
    const backupPath = `${filePath}.text_backup`;
    fs.copyFileSync(filePath, backupPath);
    console.log(`Created backup: ${backupPath}`);
    
    // Write the binary data
    const buffer = Buffer.from(base64Content, 'base64');
    fs.writeFileSync(filePath, buffer);
    console.log(`Successfully wrote binary data to: ${filePath} (${buffer.length} bytes)`);
    return true;
  } catch (error) {
    console.error(`Error creating binary file ${filePath}:`, error);
    return false;
  }
}

// Extract base64 content
const wasmBase64 = extractBase64(wasmContent);
const zkeyBase64 = extractBase64(zkeyContent);

console.log(`WASM base64 length: ${wasmBase64.length}`);
console.log(`ZKEY base64 length: ${zkeyBase64.length}`);

// Create binary files
const wasmSuccess = createBinaryFromBase64(wasmFilePath, wasmBase64);
const zkeySuccess = createBinaryFromBase64(zkeyFilePath, zkeyBase64);

console.log(`\nSummary:`);
console.log(`WASM file conversion: ${wasmSuccess ? 'SUCCESS' : 'FAILED'}`);
console.log(`ZKEY file conversion: ${zkeySuccess ? 'SUCCESS' : 'FAILED'}`);
