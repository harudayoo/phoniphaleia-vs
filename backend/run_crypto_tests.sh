#!/bin/bash
# Setup and run tests for the ZKP and Threshold Cryptography system

# Color definitions
CYAN='\033[0;36m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Create and activate virtual environment
echo -e "\n${CYAN}[1/5] Creating and activating Python virtual environment...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate

# Install dependencies
echo -e "\n${CYAN}[2/5] Installing backend dependencies...${NC}"
pip install -r requirements.txt

echo -e "\n${CYAN}[3/5] Installing frontend dependencies...${NC}"
cd ../frontend
npm install

# Run backend tests
echo -e "\n${CYAN}[4/5] Running backend tests...${NC}"
cd ../backend

# Run regular tests
echo -e "${CYAN}Running core crypto tests...${NC}"
python -m tests.run_tests

# Run challenge-response authentication test if server is running
echo -e "${CYAN}Running challenge-response authentication tests...${NC}"
read -p "Is the backend server running for authentication tests? (y/n) " TEST_SERVER
if [ "$TEST_SERVER" = "y" ]; then
    python -m tests.test_challenge_response
else
    echo "Skipping authentication tests..."
fi

# Run frontend tests
echo -e "\n${CYAN}[5/5] Running frontend tests...${NC}"
cd ../frontend
node tests/run-tests.js

echo -e "\n${GREEN}All tests completed!${NC}"
cd ../backend
