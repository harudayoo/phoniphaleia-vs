# Verification Status Fix

## Issue Description

There was a discrepancy between the actual verification status in the database and what was displayed in the frontend:

1. The `election_result` table in the database had `false` in the `verified` field for some elections.
2. However, the frontend always showed these results as "verified" regardless of the actual database value.

## Root Cause

The issue was identified in the `get_decrypted_results` method in `election_results_controller.py` where the verification status was hardcoded to `True` regardless of the actual state in the database:

```python
# Original problematic code
verification_status = {
    "verified": True,  # Default to true unless issues found
    "vote_count_match": True,
    "total_decrypted": sum(candidate['vote_count'] for position in results for candidate in position['candidates'])
}
```

This meant that even if an election result had `verified=false` in the database, the API would always return `verified=true` to the frontend.

## Fixes Implemented

1. Modified the `get_decrypted_results` method to check the actual verified status from the database:
   ```python
   # Check the actual verification status from the database
   all_verified = True
   if verified_column_exists:
       verification_query = db.session.query(ElectionResult).filter_by(election_id=election_id).all()
       all_verified = all(getattr(result, 'verified', False) for result in verification_query)
   
   verification_status = {
       "verified": all_verified,  # Use the actual verification status from the database
       "vote_count_match": True,
       "total_decrypted": sum(candidate['vote_count'] for position in results for candidate in position['candidates'])
   }
   ```

2. Enhanced the `decrypt_tally` method to run verification after decryption:
   ```python
   # Verify vote counts and update verified status in the database
   verified, issues = ElectionResult.verify_vote_counts(election_id)
   if verified:
       logger.info(f"Vote count verification passed for election {election_id}")
   else:
       logger.warning(f"Vote count verification found issues for election {election_id}: {issues}")
   ```

3. Added a new endpoint and utility script to fix the verification status for existing elections:
   - Added `fix_verification_status` method to `ElectionResultsController`
   - Added API route `/api/election_results/fix-verification`
   - Created utility scripts:
     - `fix_verification_status.py` - Python script to call the API
     - `fix_verification_status.ps1` - PowerShell wrapper for Windows users

## How to Fix Existing Elections

### Option 1: Using the script

Run the provided PowerShell script to fix all elections:

```powershell
.\fix_verification_status.ps1
```

Or fix a specific election:

```powershell
.\fix_verification_status.ps1 -ElectionId 55
```

### Option 2: Using the API directly

Make a POST request to the API endpoint:

```
POST /api/election_results/fix-verification
Content-Type: application/json

{
  "election_id": 55  # Optional - omit to fix all elections
}
```

## Verification

After running the fix, the frontend should now correctly display the verification status based on the actual value in the database.
