// This script creates basic mock WebAssembly and zkey files 
// compatible with snarkjs for testing purposes

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Creating mock circuit files for vote verification...');

// Define file paths
const circuitsDir = path.join(__dirname, '..', 'public', 'circuits');
const wasmPath = path.join(circuitsDir, 'vote.wasm');
const zkeyPath = path.join(circuitsDir, 'vote.zkey');
const vkPath = path.join(circuitsDir, 'verification_key.json');

// Basic mock wasm file content (first part of a real WebAssembly binary file)
// This contains the WebAssembly magic number (00 61 73 6D) and version (01 00 00 00)
const wasmMagicHeader = new Uint8Array([
  0x00, 0x61, 0x73, 0x6D, // Magic: \0asm
  0x01, 0x00, 0x00, 0x00, // Version: 1
  
  // Type section
  0x01, 0x04, 0x01, 0x60, 0x00, 0x00,
  
  // Function section 
  0x03, 0x02, 0x01, 0x00,
  
  // Export section
  0x07, 0x05, 0x01, 0x01, 0x65, 0x00, 0x00,
  
  // Code section
  0x0A, 0x04, 0x01, 0x02, 0x00, 0x0B
]);

// Basic mock zkey structure (minimum required for snarkjs to recognize it)
const zkeyMock = {
  protocol: "groth16",
  curve: "bn128",
  nPublic: 1,
  vk_alpha_1: ["0", "0", "0"],
  vk_beta_2: [["0", "0"], ["0", "0"], ["0", "0"]],
  vk_gamma_2: [["0", "0"], ["0", "0"], ["0", "0"]],
  vk_delta_2: [["0", "0"], ["0", "0"], ["0", "0"]],
  vk_alphabeta_12: [[["0", "0"], ["0", "0"]], [["0", "0"], ["0", "0"]]],
  IC: [["1", "0", "0"], ["0", "1", "0"]]
};

// Basic verification key (will be used by the frontend)
const verificationKey = {
  protocol: "groth16",
  curve: "bn128",
  nPublic: 1,
  vk_alpha_1: ["0x01", "0x01", "0x01"],
  vk_beta_2: [["0x01", "0x01"], ["0x01", "0x01"], ["0x01", "0x01"]],
  vk_gamma_2: [["0x01", "0x01"], ["0x01", "0x01"], ["0x01", "0x01"]],
  vk_delta_2: [["0x01", "0x01"], ["0x01", "0x01"], ["0x01", "0x01"]],
  vk_alphabeta_12: [[["0x01", "0x01"], ["0x01", "0x01"]], [["0x01", "0x01"], ["0x01", "0x01"]]],
  IC: [["0x01", "0x01", "0x01"], ["0x01", "0x01", "0x01"]]
};

// Function to write files and backup originals
async function writeCircuitFile(filePath, content, isBinary = false) {
  try {
    // Create backup if file exists
    if (fs.existsSync(filePath)) {
      const backupPath = `${filePath}.backup_${Date.now()}`;
      console.log(`Creating backup: ${backupPath}`);
      fs.copyFileSync(filePath, backupPath);
    }
    
    // Write the new file
    if (isBinary) {
      fs.writeFileSync(filePath, content);
    } else {
      fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
    }
    
    console.log(`Successfully wrote: ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
    return false;
  }
}

// Main execution
async function main() {
  try {
    console.log('Starting mock circuit files generation...');
    console.log(`Circuits directory: ${circuitsDir}`);
    
    // Ensure circuits directory exists
    if (!fs.existsSync(circuitsDir)) {
      fs.mkdirSync(circuitsDir, { recursive: true });
      console.log(`Created circuits directory: ${circuitsDir}`);
    } else {
      console.log(`Circuits directory already exists: ${circuitsDir}`);
    }
    
    // Print current files
    const files = fs.readdirSync(circuitsDir);
    console.log(`Existing files in circuits directory: ${files.join(', ')}`);
      // Write wasm file (binary)
    console.log(`Writing wasm file: ${wasmPath}`);
    await writeCircuitFile(wasmPath, wasmMagicHeader, true);
    
    // Write zkey file as binary (convert from JSON to binary format)
    console.log(`Writing zkey file: ${zkeyPath}`);
    const zkeyBuffer = Buffer.from(JSON.stringify(zkeyMock));
    await writeCircuitFile(zkeyPath, zkeyBuffer, true);
    
    // Write verification key (JSON)
    console.log(`Writing verification key: ${vkPath}`);
    await writeCircuitFile(vkPath, verificationKey);
    
    console.log('Mock circuit files successfully created.');
    console.log('These files are minimal placeholders for testing - they will allow the frontend');
    console.log('to load without errors, but will not actually verify ZK proofs correctly.');
    console.log('For production, you should replace them with properly generated circuit files.');
    
    // Verify file contents
    console.log('\nVerifying files:');
    if (fs.existsSync(wasmPath)) {
      const wasmStats = fs.statSync(wasmPath);
      console.log(`WASM file size: ${wasmStats.size} bytes`);
      
      // Check the magic number
      const wasmHeader = fs.readFileSync(wasmPath, { encoding: null, flag: 'r' }).slice(0, 4);
      console.log(`WASM header: ${Buffer.from(wasmHeader).toString('hex')}`);
    } else {
      console.error('WASM file was not created!');
    }
    
    if (fs.existsSync(zkeyPath)) {
      const zkeyStats = fs.statSync(zkeyPath);
      console.log(`ZKEY file size: ${zkeyStats.size} bytes`);
    } else {
      console.error('ZKEY file was not created!');
    }
  } catch (error) {
    console.error('Error creating mock circuit files:', error);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
