"""
Zero-knowledge proof verification using snarkjs
"""
import json
import subprocess
import os
from typing import Dict, Any, List, Optional
import tempfile
import logging

logger = logging.getLogger(__name__)

class SnarkjsVerifier:
    """
    Service for verifying zero-knowledge proofs using snarkjs
    """
    
    @staticmethod
    def verify_proof(
        verification_key: Dict[str, Any], 
        public_signals: List[str], 
        proof: Dict[str, Any]
    ) -> bool:
        """
        Verify a zkSnark proof using snarkjs
        
        Args:
            verification_key: The verification key
            public_signals: The public signals (inputs)
            proof: The proof to verify
            
        Returns:
            True if the proof is valid, False otherwise
        """
        try:
            # Create temporary files for the verification process
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False) as vk_file, \
                 tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False) as proof_file, \
                 tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False) as public_file:
                
                # Write the verification key, proof and public signals to temporary files
                json.dump(verification_key, vk_file)
                json.dump(proof, proof_file)
                json.dump(public_signals, public_file)
                
                vk_file_path = vk_file.name
                proof_file_path = proof_file.name
                public_file_path = public_file.name
            
            # Run snarkjs to verify the proof
            cmd = [
                "node", "-e", 
                f"const snarkjs = require('snarkjs'); "
                f"(async() => {{"
                f"  const vkey = require('{vk_file_path}'); "
                f"  const proof = require('{proof_file_path}'); "
                f"  const publicSignals = require('{public_file_path}'); "
                f"  const res = await snarkjs.groth16.verify(vkey, publicSignals, proof); "
                f"  process.stdout.write(res.toString()); "
                f"}})()"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Clean up temporary files
            for file_path in [vk_file_path, proof_file_path, public_file_path]:
                try:
                    os.unlink(file_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {file_path}: {e}")
            
            # Parse the result
            is_valid = result.stdout.strip().lower() == "true"
            
            return is_valid
        
        except Exception as e:
            logger.error(f"Error verifying zkSnark proof: {e}")
            return False
    
    @staticmethod
    def generate_verification_key_from_zkey(zkey_path: str) -> Dict[str, Any]:
        """
        Generate a verification key from a zkey file using snarkjs
        
        Args:
            zkey_path: Path to the zkey file
            
        Returns:
            The verification key as a dictionary
        """
        try:
            with tempfile.NamedTemporaryFile(mode='w+', suffix='.json', delete=False) as vkey_file:
                vkey_file_path = vkey_file.name
                
            # Generate the verification key
            cmd = [
                "node", "-e",
                f"const snarkjs = require('snarkjs'); "
                f"(async() => {{"
                f"  await snarkjs.zKey.exportVerificationKey('{zkey_path}', '{vkey_file_path}'); "
                f"}})()"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Read the verification key
            with open(vkey_file_path, 'r') as f:
                verification_key = json.load(f)
                
            # Clean up
            try:
                os.unlink(vkey_file_path)
            except Exception as e:
                logger.warning(f"Failed to delete temporary file {vkey_file_path}: {e}")
                
            return verification_key
            
        except Exception as e:
            logger.error(f"Error generating verification key: {e}")
            raise
    
    @staticmethod
    def store_verification_key(verification_key: Dict[str, Any], output_path: str) -> None:
        """
        Store a verification key to a file
        
        Args:
            verification_key: The verification key
            output_path: Path where to store the verification key
        """
        try:
            with open(output_path, 'w') as f:
                json.dump(verification_key, f)
        except Exception as e:
            logger.error(f"Error storing verification key: {e}")
            raise
    
    @staticmethod
    def load_verification_key(vkey_path: str) -> Dict[str, Any]:
        """
        Load a verification key from a file
        
        Args:
            vkey_path: Path to the verification key file
            
        Returns:
            The verification key as a dictionary
        """
        try:
            with open(vkey_path, 'r') as f:
                verification_key = json.load(f)
            return verification_key
        except Exception as e:
            logger.error(f"Error loading verification key: {e}")
            raise
