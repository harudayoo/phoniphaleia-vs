import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting fix-wasm-files.js script...');
console.log('Current directory:', __dirname);

// Function to extract the base64 content from a file
function extractBase64FromFile(filePath) {
  console.log(`Reading file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`File content length: ${content.length}`);
  console.log(`File content (first 100 chars): ${content.substring(0, 100)}`);
  
  // Remove comment line and extract base64 content
  const base64Match = content.match(/^\/\/.*?\n(.*)/s);
  if (base64Match && base64Match[1]) {
    const base64Content = base64Match[1].trim();
    console.log(`Extracted base64 content (first 50 chars): ${base64Content.substring(0, 50)}...`);
    return base64Content;
  }
  throw new Error(`Could not extract base64 content from ${filePath}`);
}

// Function to write binary content from base64
function writeBinaryFileFromBase64(base64Content, outputPath) {
  console.log(`Creating binary file from base64: ${outputPath}`);
  try {
    const buffer = Buffer.from(base64Content, 'base64');
    console.log(`Buffer created, size: ${buffer.length} bytes`);
    
    fs.writeFileSync(outputPath + '.new', buffer);
    console.log(`Successfully created temp file: ${outputPath}.new`);
    
    // Rename the new file to replace the original
    fs.renameSync(outputPath + '.new', outputPath);
    console.log(`Successfully renamed temp file to: ${outputPath}`);
    
    return true;
  } catch (err) {
    console.error(`Error creating binary file: ${err.message}`);
    return false;
  }
}

// Main script execution
try {
  const circuitsDir = path.join(__dirname, '..', 'public', 'circuits');
  console.log(`Circuits directory: ${circuitsDir}`);
  
  // Check if directory exists
  if (!fs.existsSync(circuitsDir)) {
    console.log(`Creating circuits directory: ${circuitsDir}`);
    fs.mkdirSync(circuitsDir, { recursive: true });
  }
  
  // Process vote.wasm
  console.log('Processing vote.wasm...');
  const wasmPath = path.join(circuitsDir, 'vote.wasm');
  if (!fs.existsSync(wasmPath)) {
    console.error(`File does not exist: ${wasmPath}`);
  } else {
    const wasmBase64 = extractBase64FromFile(wasmPath);
    
    // Create a backup of the original file
    const backupPath = `${wasmPath}.backup`;
    console.log(`Creating backup: ${backupPath}`);
    fs.copyFileSync(wasmPath, backupPath);
    
    // Write the binary wasm file
    const wasmSuccess = writeBinaryFileFromBase64(wasmBase64, wasmPath);
    console.log(`WASM file ${wasmSuccess ? 'successfully created' : 'creation failed'}`);
  }
  
  // Process vote.zkey
  console.log('Processing vote.zkey...');
  const zkeyPath = path.join(circuitsDir, 'vote.zkey');
  if (!fs.existsSync(zkeyPath)) {
    console.error(`File does not exist: ${zkeyPath}`);
  } else {
    const zkeyBase64 = extractBase64FromFile(zkeyPath);
    
    // Create a backup of the original file
    const backupPath = `${zkeyPath}.backup`;
    console.log(`Creating backup: ${backupPath}`);
    fs.copyFileSync(zkeyPath, backupPath);
    
    // Write the binary zkey file
    const zkeySuccess = writeBinaryFileFromBase64(zkeyBase64, zkeyPath);
    console.log(`ZKEY file ${zkeySuccess ? 'successfully created' : 'creation failed'}`);
  }
  
  console.log('All circuit files have been processed!');
} catch (error) {
  console.error('Error fixing circuit files:', error);
  console.error(error.stack);
  process.exit(1);
}
