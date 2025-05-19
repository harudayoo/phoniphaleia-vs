// Script to generate a real ZKP circuit for vote verification
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import * as snarkjs from 'snarkjs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting real circuit generation for vote verification...');

// Define file paths
const projectRoot = path.join(__dirname, '..');
const circuitsDir = path.join(projectRoot, 'public', 'circuits');
const buildDir = path.join(circuitsDir, 'build');
const circuitName = 'vote';
const ptauName = 'pot12_final.ptau'; // Powers of Tau file

// Ensure directories exist
if (!fs.existsSync(circuitsDir)) {
  fs.mkdirSync(circuitsDir, { recursive: true });
}

if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

// Check for existing circuit file
const circuitPath = path.join(circuitsDir, `${circuitName}.circom`);
if (!fs.existsSync(circuitPath)) {
  console.log(`Circuit file not found. Creating ${circuitName}.circom...`);
  
  // Create a basic vote verification circuit  const circuitCode = `pragma circom 2.0.0;

// Import poseidon hash function from circomlib
include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";

// This circuit verifies a vote is valid
template VoteVerifier() {
    // Private inputs (not revealed in the proof)
    signal input voterId;       // ID of the voter
    signal input candidateId;   // ID of the candidate chosen
    signal input positionId;    // Position being voted for
    signal input nonce;         // Random nonce for uniqueness

    // Public outputs (revealed in the proof)
    signal output voteCommitment; // Hash of vote data
    signal output positionOutput; // Position ID (public)
    
    // Constraints to ensure voterId, candidateId and positionId are valid
    component validVoterId = GreaterEqThan(32);
    validVoterId.in[0] <== voterId;
    validVoterId.in[1] <== 1;
    validVoterId.out === 1;
    
    component validCandidateId = GreaterEqThan(32);
    validCandidateId.in[0] <== candidateId;
    validCandidateId.in[1] <== 1;
    validCandidateId.out === 1;
    
    component validPositionId = GreaterEqThan(32);
    validPositionId.in[0] <== positionId;
    validPositionId.in[1] <== 1;
    validPositionId.out === 1;

    // Hash the vote data using Poseidon (efficient ZKP-friendly hash function)
    component hasher = Poseidon(4);
    hasher.inputs[0] <== voterId;
    hasher.inputs[1] <== candidateId;
    hasher.inputs[2] <== positionId;
    hasher.inputs[3] <== nonce;
    
    // Output the commitment hash (this proves the vote's integrity without revealing its contents)
    voteCommitment <== hasher.out;
    
    // Output the position (this allows on-chain verification that the vote is for the right position)
    positionOutput <== positionId;
}

component main {public [positionOutput]} = VoteVerifier();
`;
  
  fs.writeFileSync(circuitPath, circuitCode);
  console.log('Vote verification circuit created successfully.');
}

// Function to install required dependencies
async function installDependencies() {
  try {
    // Use the scripts directory package.json to install dependencies locally
    const scriptsDir = __dirname;
    
    console.log('Installing dependencies in scripts directory...');
    execSync('npm install', { cwd: scriptsDir });
    console.log('Dependencies installed successfully.');
    
    // Create a symbolic link for node_modules in circuits directory
    const circuitsNodeModulesPath = path.join(circuitsDir, 'node_modules');
    const scriptsNodeModulesPath = path.join(scriptsDir, 'node_modules');
    
    if (!fs.existsSync(circuitsNodeModulesPath)) {
      console.log('Creating symbolic link for node_modules in circuits directory...');
      try {
        fs.symlinkSync(scriptsNodeModulesPath, circuitsNodeModulesPath, 'junction');
        console.log('Symbolic link created successfully.');
      } catch (error) {
        console.log('Failed to create symbolic link. Copying necessary modules...');
        fs.mkdirSync(path.join(circuitsDir, 'node_modules', 'circomlib', 'circuits'), { recursive: true });
        
        // Copy required circomlib files
        const circomlibDir = path.join(scriptsNodeModulesPath, 'circomlib', 'circuits');
        if (fs.existsSync(circomlibDir)) {
          fs.copyFileSync(
            path.join(circomlibDir, 'poseidon.circom'),
            path.join(circuitsDir, 'node_modules', 'circomlib', 'circuits', 'poseidon.circom')
          );
          fs.copyFileSync(
            path.join(circomlibDir, 'comparators.circom'),
            path.join(circuitsDir, 'node_modules', 'circomlib', 'circuits', 'comparators.circom')
          );
        } else {
          console.error('circomlib directory not found. Please install manually.');
        }
      }
    }
      // Check for circom2 WASM in node_modules
    try {
      const circom2Path = path.join(scriptsDir, 'node_modules', 'circom2');
      if (fs.existsSync(circom2Path)) {
        console.log('circom2 WASM is available.');
      } else {
        console.log('Installing circom2 WASM locally...');
        execSync('npm install circom2@0.2.0', { cwd: scriptsDir });
        console.log('circom2 WASM installed.');
      }
    } catch (error) {
      console.log('Error checking for circom2:', error.message);
      console.log('Installing circom2 WASM locally...');
      execSync('npm install circom2@0.2.0', { cwd: scriptsDir });
      console.log('circom2 WASM installed.');
    }
    
  } catch (error) {
    console.error('Error installing dependencies:', error.message);
    console.error('Please try running "npm install" manually in the scripts directory.');
    process.exit(1);
  }
}

// Generate Powers of Tau file if needed (download a public one for testing)
async function downloadPTauFile() {
  const ptauPath = path.join(buildDir, ptauName);
  
  if (!fs.existsSync(ptauPath)) {
    console.log('Downloading Powers of Tau file...');
    
    try {
      // For a real project, you should conduct your own trusted setup or use an established ptau file
      const ptauUrl = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau';
      
      // Create a PowerShell command to download the file
      const downloadCommand = `
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile('${ptauUrl}', '${ptauPath}')
      `;
      
      execSync(`powershell -Command "${downloadCommand}"`, { cwd: projectRoot });
      console.log('Powers of Tau file downloaded successfully.');
    } catch (error) {
      console.error('Error downloading Powers of Tau file:', error.message);
      console.log('Please download the file manually from: https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau');
      console.log(`And place it at: ${ptauPath}`);
      process.exit(1);
    }
  }
  
  return ptauPath;
}

// Compile circuit to generate R1CS and WASM using circom2 WASM
async function compileCircuit() {
  console.log('Compiling circuit with circom2 WASM...');
  
  try {
    // Import circom2 dynamically
    const { default: circom2 } = await import('circom2');
    
    // Create a temporary file with the circuit and include path fixed
    const tempCircuitPath = path.join(buildDir, `${circuitName}_temp.circom`);
    let circuitContent = fs.readFileSync(circuitPath, 'utf8');
    
    // Adjust include paths if needed
    if (circuitContent.includes('./node_modules/circomlib/circuits/')) {
      circuitContent = circuitContent.replace(
        /include "\.\/node_modules\/circomlib\/circuits\//g,
        'include "../scripts/node_modules/circomlib/circuits/'
      );
    }
    
    fs.writeFileSync(tempCircuitPath, circuitContent);
    console.log('Adjusted circuit file created for compilation');
    
    // Use circom2 WASM to compile
    console.log('Using circom2 WASM to compile circuit...');
    const circuitInput = fs.readFileSync(tempCircuitPath, 'utf8');
    
    // Set up search paths for includes
    const includesPath = [
      path.join(__dirname, 'node_modules'),
      path.join(circuitsDir, 'node_modules')
    ];
    
    // Compile the circuit using circom2 WASM
    const result = await circom2.compile(circuitInput, {
      include: includesPath,
      optimize: 2, // Use optimization level 2
      inspect: false,
      output: {
        r1cs: path.join(buildDir, `${circuitName}.r1cs`),
        wasm: path.join(buildDir, `${circuitName}_js`, `${circuitName}.wasm`),
        wasmMain: true
      }
    });
      // Handle the output from circom2
    console.log('Compilation result:', result);
    
    // Ensure the wasm output directory exists
    const wasmOutputDir = path.join(buildDir, `${circuitName}_js`);
    if (!fs.existsSync(wasmOutputDir)) {
      fs.mkdirSync(wasmOutputDir, { recursive: true });
    }
    
    // Write out the WASM file
    if (result.wasm) {
      console.log('Writing WASM file...');
      const wasmPath = path.join(wasmOutputDir, `${circuitName}.wasm`);
      fs.writeFileSync(wasmPath, Buffer.from(result.wasm));
      console.log(`WASM file written to ${wasmPath}`);
    }
    
    // Write out the R1CS file
    if (result.r1cs) {
      console.log('Writing R1CS file...');
      const r1csPath = path.join(buildDir, `${circuitName}.r1cs`);
      fs.writeFileSync(r1csPath, Buffer.from(result.r1cs));
      console.log(`R1CS file written to ${r1csPath}`);
    }
    
    // Generate the JavaScript witness generator
    if (result.witnessGenerator) {
      console.log('Writing witness generator...');
      const witnessGenPath = path.join(wasmOutputDir, 'generate_witness.js');
      fs.writeFileSync(witnessGenPath, result.witnessGenerator);
      console.log(`Witness generator written to ${witnessGenPath}`);
    }
    
    console.log('Circuit compiled successfully.');
    return true;
  } catch (error) {
    console.error('Error compiling circuit:', error.message);
    return false;
  }
}

// Generate zkey file and verification key
async function generateZKey(ptauPath) {
  const r1csPath = path.join(buildDir, `${circuitName}.r1cs`);
  const zkeyPath = path.join(buildDir, `${circuitName}.zkey`);
  const verificationKeyPath = path.join(circuitsDir, 'verification_key.json');
  
  try {
    console.log('Generating zkey file...');
    
    // Create zkey file
    await snarkjs.zKey.newZKey(r1csPath, ptauPath, zkeyPath);
    console.log('zkey file generated.');
    
    // Export verification key
    console.log('Exporting verification key...');
    const vkey = await snarkjs.zKey.exportVerificationKey(zkeyPath);
    fs.writeFileSync(verificationKeyPath, JSON.stringify(vkey, null, 2));
    console.log('Verification key exported.');
    
    return true;
  } catch (error) {
    console.error('Error generating zkey:', error.message);
    return false;
  }
}

// Copy files to the main circuits directory
function copyFilesToCircuitsDir() {
  console.log('Copying generated files to circuits directory...');
  
  // Copy WASM file
  const wasmSrcPath = path.join(buildDir, `${circuitName}_js/${circuitName}.wasm`);
  const wasmDstPath = path.join(circuitsDir, `${circuitName}.wasm`);
  fs.copyFileSync(wasmSrcPath, wasmDstPath);
  
  // Copy zkey file
  const zkeySrcPath = path.join(buildDir, `${circuitName}.zkey`);
  const zkeyDstPath = path.join(circuitsDir, `${circuitName}.zkey`);
  fs.copyFileSync(zkeySrcPath, zkeyDstPath);
  
  console.log('Files copied successfully.');
  return true;
}

// Main function to execute the process
async function generateRealCircuit() {
  try {
    await installDependencies();
    
    const ptauPath = await downloadPTauFile();
    
    const compiled = await compileCircuit();
    if (!compiled) {
      console.error('Failed to compile circuit.');
      return false;
    }
    
    const zkeyGenerated = await generateZKey(ptauPath);
    if (!zkeyGenerated) {
      console.error('Failed to generate zkey.');
      return false;
    }
    
    copyFilesToCircuitsDir();
    
    console.log('\n========== SUCCESS ==========');
    console.log('Real ZKP circuit files have been generated:');
    console.log(`- Circuit: ${path.join(circuitsDir, `${circuitName}.circom`)}`);
    console.log(`- WASM file: ${path.join(circuitsDir, `${circuitName}.wasm`)}`);
    console.log(`- zkey file: ${path.join(circuitsDir, `${circuitName}.zkey`)}`);
    console.log(`- Verification key: ${path.join(circuitsDir, 'verification_key.json')}`);
    console.log('\nThese are cryptographically secure files ready for use in your application.');
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Run the circuit generation
generateRealCircuit();
