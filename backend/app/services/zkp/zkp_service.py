# backend/app/services/zkp_service.py
import hashlib
import re
from typing import Tuple, Optional
from ecpy.curves import Curve, Point
from ecpy.keys import ECPrivateKey
import os

class ZKPService:
    """Service for handling Zero-Knowledge Proof authentication"""
    
    def __init__(self):
        self.cv = Curve.get_curve('secp256k1')
        self.G = self.cv.generator
    
    @staticmethod
    def validate_student_id(student_id: str) -> bool:
        """Validate the format of a student ID"""
        pattern = r'^[0-9]{4}-[0-9]{5}$'
        return bool(re.match(pattern, student_id))
    
    def generate_challenge(self) -> str:
        """Generate a random challenge for authentication"""
        return hashlib.sha256(os.urandom(32)).hexdigest()
    
    def generate_proof(self, private_key: ECPrivateKey, challenge: str) -> Tuple[int, int]:
        """Generate a Schnorr proof for the given challenge"""
        # Generate random nonce
        k = int.from_bytes(os.urandom(32), byteorder='big') % self.cv.order
        R = self.G * k
        
        # Compute hash challenge
        e = int(hashlib.sha256(
            (R.export(compress=True).hex() + challenge).encode()
        ).hexdigest(), 16) % self.cv.order
        
        # Compute response
        s = (k + private_key.d * e) % self.cv.order
        
        return {
            'R': R.export(compress=True).hex(),
            's': hex(s)
        }
    
    def verify_proof(
        self, 
        proof: dict, 
        commitment: str, 
        challenge: str,
        public_key: dict
    ) -> bool:
        """Verify a Schnorr proof"""
        try:
            # Decode points
            R = self.cv.decode_point(bytes.fromhex(proof['R']))
            s = int(proof['s'], 16)
            
            # Reconstruct public key
            C = Point(public_key['x'], public_key['y'], self.cv)
            
            # Recompute challenge
            e = int(hashlib.sha256(
                (proof['R'] + challenge).encode()
            ).hexdigest(), 16) % self.cv.order
            
            # Verify proof
            left_side = self.G * s
            right_side = R + C * e
            
            return left_side == right_side
        except Exception:
            return False