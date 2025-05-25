#!/usr/bin/env python3
"""
Test the fixed API endpoint for election results
"""
import sys
import os
import requests
import json

# Add the backend path to sys.path
backend_path = r'C:\Users\cayan\Documents\Development-Projects\phoniphaleia\backend'
sys.path.insert(0, backend_path)

def test_api_endpoint():
    """Test the fixed API endpoint"""
    
    # Test the API endpoint that was failing
    api_url = "http://localhost:5000/api/election_results/67"
    
    print(f"Testing API endpoint: {api_url}")
    
    try:
        response = requests.get(api_url, timeout=10)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ SUCCESS! API endpoint is working")
            data = response.json()
            print(f"Election Name: {data.get('election_name')}")
            print(f"Total Votes: {data.get('total_votes')}")
            print(f"Candidates: {len(data.get('candidates', []))}")
            print(f"Organization: {data.get('organization', {}).get('org_name')}")
        elif response.status_code == 404:
            print("✗ 404 Error: Election not found")
            print(f"Response: {response.text}")
        else:
            print(f"✗ Error {response.status_code}: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("✗ Connection Error: Make sure the Flask server is running on localhost:5000")
    except Exception as e:
        print(f"✗ Error: {e}")

def test_with_app_context():
    """Test the controller method directly"""
    try:
        from app import create_app
        from app.controllers.election_results_controller import ElectionResultsController
        
        app = create_app()
        
        with app.app_context():
            print("\n=== Testing Controller Method Directly ===")
            
            # Test the controller method
            result = ElectionResultsController.get_election_results_by_election_id(67)
            
            if hasattr(result, 'status_code'):
                print(f"Status Code: {result.status_code}")
                if result.status_code == 200:
                    print("✓ Controller method works correctly")
                else:
                    print(f"✗ Controller returned error: {result.get_data(as_text=True)}")
            else:
                print(f"✗ Unexpected result type: {type(result)}")
                
    except Exception as e:
        print(f"✗ Error testing controller: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("=== API Fix Test ===")
    test_with_app_context()
    print("\n=== API Endpoint Test ===")
    test_api_endpoint()
