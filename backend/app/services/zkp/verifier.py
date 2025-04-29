# backend/app/services/zkp/verifier.py
from hashlib import sha256
import os
from ecpy.curves import Curve

class ZKPVerifier:
    def __init__(self):
        self.cv = Curve.get_curve('secp256k1')
        self.G = self.cv.generator
    
    def verify_registration(self, commitment):
        """Verify a registration commitment is valid"""
        try:
            point = self.cv.decode_point(commitment.encode('utf-8'))
            return True
        except:
            return False
    
    def generate_challenge(self):
        """Generate a random challenge for authentication"""
        return sha256(os.urandom(32)).hexdigest()
    
    def verify_proof(self, proof, commitment, challenge):
        """Verify a ZKP proof"""
        try:
            R = self.cv.decode_point(proof['R'].encode('utf-8'))
            s = int(proof['s'])
            
            # Reconstruct challenge
            e = int(sha256((proof['R'] + challenge).encode('utf-8')).hexdigest(), 16)
            
            # Reconstruct expected point
            C = self.cv.decode_point(commitment.encode('utf-8'))
            left_side = self.G * s
            right_side = R + C * e
            
            return left_side == right_side
        except:
            return False