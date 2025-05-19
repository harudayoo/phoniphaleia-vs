// This is a debugging script for key share storage issues
// Run it after you've created an election to verify the key shares were stored correctly

import { API_URL } from '../config';

async function verifyElectionKeyShares(electionId: number) {
  try {
    const adminToken = localStorage.getItem('admin_token');
    if (!adminToken) {
      console.error('No admin token found. Please log in first.');
      return;
    }
    
    console.log(`Verifying key shares for election ID ${electionId}...`);
    
    // Check if the crypto config exists
    const cryptoRes = await fetch(`${API_URL}/crypto_configs/election/${electionId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    if (!cryptoRes.ok) {
      console.error(`No crypto configuration found for election ${electionId}`);
      return;
    }
    
    const cryptoData = await cryptoRes.json();
    console.log('Found crypto config:', cryptoData);
    
    // Check key shares status
    const verifyRes = await fetch(`${API_URL}/crypto_configs/check-key-shares-status?election_id=${electionId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    });
    
    const verifyText = await verifyRes.text();
    try {
      const verifyData = JSON.parse(verifyText);
      console.log('Key shares verification data:', verifyData);
      
      if (verifyRes.ok) {
        if (verifyData.key_shares && verifyData.key_shares.length > 0) {
          console.log(`✓ Verified ${verifyData.key_shares.length} key shares in database`);
          
          // Display details about each key share for debugging
          verifyData.key_shares.forEach((share, idx) => {
            console.log(`Share #${idx}: Authority ID ${share.authority_id}, Share Length: ${share.share_value_length}`);
          });
          return true;
        } else {
          console.warn('⚠️ No key shares found in database during verification');
          return false;
        }
      } else {
        console.error(`✗ Verification API call failed: ${verifyRes.status} ${verifyRes.statusText}`);
        return false;
      }
    } catch (parseError) {
      console.error('Error parsing verification response:', parseError);
      console.log('Raw verification response:', verifyText);
      return false;
    }
  } catch (error) {
    console.error('Error verifying key shares:', error);
    return false;
  }
}

// You can call this function from your browser console after creating an election:
// verifyElectionKeyShares(123) // Replace 123 with your election ID

export default verifyElectionKeyShares;
