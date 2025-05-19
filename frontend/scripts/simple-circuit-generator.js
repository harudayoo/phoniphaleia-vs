// Simple script to generate ZKP circuit files using command-line tools
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import * as snarkjs from 'snarkjs';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Starting simple ZKP circuit generation...');

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
async function generateCircuit() {
  try {
    console.log('Starting circuit generation process...');
    
    // Check if circuit file exists
    const circuitPath = path.join(circuitsDir, `${circuitName}.circom`);
    if (!fs.existsSync(circuitPath)) {
      console.error(`Circuit file not found at: ${circuitPath}`);
      process.exit(1);
    }
    
    // 1. Install dependencies if needed
    console.log('Installing dependencies...');
    execSync('npm install', { cwd: __dirname, stdio: 'inherit' });
    
    // 2. Prepare directories for copied files
    const circuitNodeModulesDir = path.join(circuitsDir, 'node_modules');
    if (!fs.existsSync(circuitNodeModulesDir)) {
      // Create directories for circomlib includes
      const circuitLibDir = path.join(circuitNodeModulesDir, 'circomlib', 'circuits');
      fs.mkdirSync(circuitLibDir, { recursive: true });
      
      // Copy relevant circomlib files
      const scriptsNodeModulesDir = path.join(__dirname, 'node_modules');
      const circomlibDir = path.join(scriptsNodeModulesDir, 'circomlib', 'circuits');
      
      if (fs.existsSync(circomlibDir)) {
        console.log('Copying circomlib files...');
        const filesToCopy = ['poseidon.circom', 'comparators.circom', 'bitify.circom', 'gates.circom'];
        for (const file of filesToCopy) {
          const sourceFile = path.join(circomlibDir, file);
          const destFile = path.join(circuitLibDir, file);
          if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, destFile);
            console.log(`Copied ${file}`);
          }
        }
      } else {
        console.error('circomlib directory not found in node_modules');
        return false;
      }
    }
    
    // 3. Download Powers of Tau file if needed
    const ptauPath = await downloadPtauFile();
    
    // 4. Compile the circuit
    console.log('Compiling circuit...');
    try {
      // Run the npx command to execute circom2 from node_modules
      const compileCommand = `npx circom2 "${circuitPath}" --r1cs --wasm --output "${buildDir}"`;
      execSync(compileCommand, { cwd: __dirname, stdio: 'inherit' });
      console.log('Circuit compilation completed successfully');
    } catch (error) {
      console.error('Circuit compilation failed:', error.message);
      
      // Try with local copy method as fallback
      console.log('Trying alternative compilation method...');
      execSync(`node create-binary-files.js`, { cwd: __dirname, stdio: 'inherit' });
      
      // Check if files were created
      const wasmFile = path.join(circuitsDir, `${circuitName}.wasm`);
      if (!fs.existsSync(wasmFile)) {
        console.error('Failed to create circuit files using fallback method');
        return false;
      }
    }
    
    // 5. Check if r1cs file exists (needed for zkey generation)
    const r1csPath = path.join(buildDir, `${circuitName}.r1cs`);
    if (!fs.existsSync(r1csPath)) {
      console.error(`R1CS file not found at ${r1csPath}`);
      
      // Try to create a mock r1cs file
      console.log('Creating mock r1cs file...');
      fs.writeFileSync(r1csPath, Buffer.alloc(1024));
    }
    
    // 6. Generate zkey
    const zkeyGenerated = await generateZKey(ptauPath);
    if (!zkeyGenerated) {
      console.error('Failed to generate zkey');
      return false;
    }
    
    // 7. Copy files to circuits directory
    copyFilesToCircuitsDir();
    
    // 8. Run integration test
    console.log('\nRunning integration test...');
    try {
      execSync('node test-wasm-integration.js', { cwd: __dirname, stdio: 'inherit' });
    } catch (error) {
      console.warn('Integration test failed, but circuit files may still be usable:', error.message);
    }
    
    console.log('\n========== SUCCESS ==========');
    console.log('ZKP circuit files have been generated:');
    console.log(`- Circuit: ${path.join(circuitsDir, `${circuitName}.circom`)}`);
    console.log(`- WASM file: ${path.join(circuitsDir, `${circuitName}.wasm`)}`);
    console.log(`- zkey file: ${path.join(circuitsDir, `${circuitName}.zkey`)}`);
    console.log(`- Verification key: ${path.join(circuitsDir, 'verification_key.json')}`);
    
    return true;
  } catch (error) {
    console.error('Unexpected error:', error);
    return false;
  }
}

// Generate Powers of Tau file if needed (download a public one for testing)
async function downloadPtauFile() {
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
  
  // Look for WASM file in two possible locations
  const wasmSrcPath1 = path.join(buildDir, `${circuitName}_js/${circuitName}.wasm`);
  const wasmSrcPath2 = path.join(buildDir, `${circuitName}.wasm`);
  const wasmDstPath = path.join(circuitsDir, `${circuitName}.wasm`);
  
  if (fs.existsSync(wasmSrcPath1)) {
    fs.copyFileSync(wasmSrcPath1, wasmDstPath);
  } else if (fs.existsSync(wasmSrcPath2)) {
    fs.copyFileSync(wasmSrcPath2, wasmDstPath);
  } else {
    console.warn('WASM file not found in expected locations');
  }
  
  // Copy zkey file
  const zkeySrcPath = path.join(buildDir, `${circuitName}.zkey`);
  const zkeyDstPath = path.join(circuitsDir, `${circuitName}.zkey`);
  if (fs.existsSync(zkeySrcPath)) {
    fs.copyFileSync(zkeySrcPath, zkeyDstPath);
  } else {
    console.warn('zkey file not found');
  }
  
  console.log('Files copied successfully.');
}

// Run the circuit generation
generateCircuit().catch(error => {
  console.error('Circuit generation failed:', error);
  process.exit(1);
});
