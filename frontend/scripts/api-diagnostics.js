/**
 * API Diagnostics Script
 * 
 * This script helps debug API endpoint issues in the Phoniphaleia E-Voting system.
 * It runs a series of mock requests to verify endpoint configurations.
 */

const fetch = require('node-fetch');
const chalk = require('chalk');
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

async function testEndpoint(path, method = 'GET', body = null) {
  console.log(chalk.blue(`Testing ${method} ${path}...`));
  
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${API_URL}${path}`, options);
    
    if (response.ok) {
      console.log(chalk.green(`✓ ${method} ${path} - ${response.status}`));
    } else {
      console.log(chalk.yellow(`✗ ${method} ${path} - ${response.status}: ${response.statusText}`));
    }
    
    return response;
  } catch (error) {
    console.error(chalk.red(`✗ ${method} ${path} - Error: ${error.message}`));
    return null;
  }
}

async function main() {
  console.log(chalk.cyan('=== Phoniphaleia API Diagnostics ==='));
  console.log(`Base API URL: ${chalk.magenta(API_URL)}\n`);
  
  // Test verification endpoints
  console.log(chalk.cyan('Testing verification endpoints...'));
  await testEndpoint('/verification/verify', 'POST', {
    proof: { pi_a: ['1'], pi_b: [['1']], pi_c: ['1'] },
    publicSignals: ['1'],
    electionId: 1
  });
  
  // Test challenge endpoints
  console.log(chalk.cyan('\nTesting authentication endpoints...'));
  await testEndpoint('/trusted_authorities/challenge', 'POST', { authorityId: 1 });
  
  console.log(chalk.cyan('\n=== API Diagnostics Complete ==='));
}

main().catch(error => {
  console.error(chalk.red(`Fatal error: ${error.message}`));
  process.exit(1);
});
