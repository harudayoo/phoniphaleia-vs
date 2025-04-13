# backend/app/zkp/verifier.py
import os
import json
import hashlib
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.backends import default_backend

class ZKPVerifier:
    def __init__(self, setup_dir='zkp_setup'):
        self.setup_dir = os.path.join(os.path.dirname(__file__), setup_dir)
        
        # Load verification key
        try:
            with open(os.path.join(self.setup_dir, 'verification_key.json'), 'r') as f:
                self.verification_key = json.load(f)
                
            # Load public key
            self.public_key = serialization.load_pem_public_key(
                self.verification_key['public_key'].encode('utf-8'),
                backend=default_backend()
            )
        except Exception as e:
            raise Exception(f"Failed to load verification key: {str(e)}")
    
    def verify_proof(self, proof, public_inputs):
        """
        Verify a zero-knowledge proof
        
        Args:
            proof: The proof provided by the client
            public_inputs: Public inputs for verification
            
        Returns:
            bool: True if proof is valid, False otherwise
        """
        try:
            # In a real zk-SNARK implementation, this would use a proper verification algorithm
            # This is a simplified version using RSA signature verification
            
            # Check that hashes match (part of the proof verification)
            expected_hash = public_inputs['expected_hash']
            user_provided_hash = public_inputs['user_provided_hash']
            
            # Verify signature
            try:
                self.public_key.verify(
                    bytes.fromhex(proof['signature']),
                    bytes.fromhex(proof['message']),
                    padding.PSS(
                        mgf=padding.MGF1(hashes.SHA256()),
                        salt_length=padding.PSS.MAX_LENGTH
                    ),
                    hashes.SHA256()
                )
                # Additional verification: check that the commitment matches
                return user_provided_hash == expected_hash
            except Exception:
                return False
        except Exception as e:
            print(f"Error verifying proof: {str(e)}")
            return False