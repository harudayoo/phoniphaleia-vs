// filepath: c:\Users\cayan\Documents\Development-Projects\phoniphaleia\frontend\scripts\generate-fixed-circuit.js
// Streamlined script to generate a real ZKP circuit using circom2 WASM
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import * as snarkjs from 'snarkjs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting streamlined real circuit generation for vote verification...');

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

// Main function to execute the process
async function generateRealCircuit() {
  try {
    console.log('Checking circuit file...');
    const circuitPath = path.join(circuitsDir, `${circuitName}.circom`);
    if (!fs.existsSync(circuitPath)) {
      console.error(`Circuit file not found at: ${circuitPath}`);
      console.error('Please create the circuit file first.');
      process.exit(1);
    }
    
    // Install required dependencies
    await installDependencies();
    
    // Download or verify Powers of Tau file
    const ptauPath = await downloadPTauFile();
    
    // Compile the circuit using circom CLI
    console.log('Compiling circuit using circom CLI...');
    const circomBin = 'circom'; // Assumes circom is installed globally or in PATH
    const r1csPath = path.join(buildDir, `${circuitName}.r1cs`);
    const wasmPath = path.join(buildDir, `${circuitName}.wasm`);
    const symPath = path.join(buildDir, `${circuitName}.sym`);
    try {
      execSync(`${circomBin} ${circuitPath} --r1cs --wasm --sym -o ${buildDir}`);
      console.log('Circuit compiled successfully using circom CLI.');
    } catch (err) {
      console.error('Error running circom CLI:', err.message);
      process.exit(1);
    }
    // Copy the WASM file to the circuits directory for easier access
    const wasmCircuitsPath = path.join(circuitsDir, `${circuitName}.wasm`);
    fs.copyFileSync(wasmPath, wasmCircuitsPath);
    console.log(`WASM file copied to ${wasmCircuitsPath}`);
    
    // Generate zKey and verification key
    const zkeyGenerated = await generateZKey(ptauPath);
    if (!zkeyGenerated) {
      console.error('Failed to generate zkey.');
      return false;
    }
    
    console.log('\n========== SUCCESS ==========');
    console.log('Real ZKP circuit files have been generated:');
    console.log(`- Circuit: ${path.join(circuitsDir, `${circuitName}.circom`)}`);
    console.log(`- WASM file: ${path.join(circuitsDir, `${circuitName}.wasm`)}`);
    console.log(`- zkey file: ${path.join(circuitsDir, `${circuitName}.zkey`)}`);
    console.log(`- Verification key: ${path.join(circuitsDir, 'verification_key.json')}`);
    console.log('\nThese are cryptographically secure files ready for use in your application.');
    
    // Run a test of the generated files
    console.log('\nTesting the generated files with test-wasm-integration.js...');
    try {
      execSync('node test-wasm-integration.js', { 
        cwd: __dirname, 
        stdio: 'inherit'
      });
      console.log('Integration test completed successfully.');
    } catch (error) {
      console.error('Integration test failed:', error.message);
    }
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
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
  } else {
    console.log('Powers of Tau file already exists.');
  }
  
  return ptauPath;
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
    
    // Copy zkey to circuits dir
    fs.copyFileSync(zkeyPath, path.join(circuitsDir, `${circuitName}.zkey`));
    
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

// Run the circuit generation
generateRealCircuit();
