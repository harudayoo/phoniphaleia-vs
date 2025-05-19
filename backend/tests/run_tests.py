"""
Test runner script for Phoniphaleia cryptography tests
"""
import unittest
import sys
import os
import subprocess
from colorama import Fore, Style, init

# Initialize colorama
init()

def print_header(text):
    print(f"\n{Fore.CYAN}{'=' * 80}")
    print(f" {text}")
    print(f"{'=' * 80}{Style.RESET_ALL}\n")

def run_python_tests():
    print_header("Running Python Unit Tests")
    
    # Discover and run tests
    loader = unittest.TestLoader()
    start_dir = os.path.dirname(os.path.abspath(__file__))
    suite = loader.discover(start_dir, pattern="test_*.py")
    
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    return result.wasSuccessful()

def run_demo():
    print_header("Running Threshold ElGamal Demo")
    
    demo_script = os.path.join(
        os.path.dirname(os.path.abspath(__file__)),
        "demo_threshold_elgamal.py"
    )
    
    result = subprocess.run([sys.executable, demo_script], capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print(f"{Fore.RED}ERRORS:{Style.RESET_ALL}\n{result.stderr}")
        return False
    return result.returncode == 0

def main():
    success = True
    
    # Run Python unit tests
    if not run_python_tests():
        success = False
    
    # Run demo script
    if not run_demo():
        success = False
    
    # Print final result
    if success:
        print(f"\n{Fore.GREEN}All tests PASSED{Style.RESET_ALL}")
        return 0
    else:
        print(f"\n{Fore.RED}Some tests FAILED{Style.RESET_ALL}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
