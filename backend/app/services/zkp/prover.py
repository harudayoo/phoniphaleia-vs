# backend/app/zkp/prover.py
import os
import json
import hashlib

from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.backends import default_backend


class ZKPProver:
    def __init__(self, setup_dir='zkp_setup'):
        self.setup_dir = os.path.join(os.path.dirname(__file__), setup_dir)
        
        # Load proving key
        try:
            with open(os.path.join(self.setup_dir, 'proving_key.json'), 'r') as f:
                self.proving_key = json.load(f)
                
            # Load private key
            self.private_key = serialization.load_pem_private_key(
                self.proving_key['private_key'].encode('utf-8'),
                password=None,
                backend=default_backend()
            )
        except Exception as e:
            raise Exception(f"Failed to load proving key: {str(e)}")
    
    def generate_proof(self, student_id, password, stored_commitment):
        """
        Generate a zero-knowledge proof of password knowledge
        
        Args:
            student_id: Student ID used for authentication
            password: Password provided by user
            stored_commitment: Hash stored in the database
            
        Returns:
            tuple: (proof, public_inputs)
        """
        try:
            # Hash inputs
            student_id_hash = hashlib.sha256(student_id.encode()).hexdigest()
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            # Create message combining user identity and password knowledge
            message = (student_id_hash + password_hash).encode()
            message_hash = hashlib.sha256(message).digest()
            
            # Sign the message (simulating actual zk-SNARK proof)
            signature = self.private_key.sign(
                message_hash,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # Create proof structure
            proof = {
                'message': message_hash.hex(),
                'signature': signature.hex()
            }
            
            # Public inputs for verification
            public_inputs = {
                'student_id_hash': student_id_hash,
                'user_provided_hash': password_hash,
                'expected_hash': stored_commitment
            }
            
            return proof, public_inputs
        except Exception as e:
            print(f"Error generating proof: {str(e)}")
            raise