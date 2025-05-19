import React, { useState } from 'react';
import { Shield, Check, AlertCircle, RefreshCw, Upload } from 'lucide-react';
import { verifyVoteZKP } from '@/services/verificationService';

interface ZKPVerificationPanelProps {
  electionId: number;
}

const ZKPVerificationPanel: React.FC<ZKPVerificationPanelProps> = ({ electionId }) => {
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [publicSignalsFile, setPublicSignalsFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [result, setResult] = useState<{ valid: boolean } | null>(null);

  const handleVerify = async () => {
    if (!proofFile || !publicSignalsFile) {
      setError('Please upload both proof and public signals files');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Read the uploaded files
      const proofText = await proofFile.text();
      const publicSignalsText = await publicSignalsFile.text();

      // Parse the JSON
      const proof = JSON.parse(proofText);
      const publicSignals = JSON.parse(publicSignalsText);

      // Verify the proof
      const isValid = await verifyVoteZKP({
        proof,
        publicSignals,
        electionId
      });

      setResult({ valid: isValid });
    } catch (err) {
      console.error('Error verifying ZKP:', err);
      setError('Failed to verify proof. Please ensure the files are valid JSON.');
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setProofFile(files[0]);
    }
  };

  const handlePublicSignalsUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setPublicSignalsFile(files[0]);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow border border-gray-200">
      <div className="flex items-center mb-4">
        <Shield className="h-5 w-5 mr-2 text-green-600" />
        <h3 className="text-lg font-semibold">Verify Zero-Knowledge Proof</h3>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Upload the proof and public signals files to verify a vote&apos;s zero-knowledge proof.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4 flex items-start">
          <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className={`${
          result.valid 
            ? 'bg-green-50 border-green-200 text-green-700' 
            : 'bg-red-50 border-red-200 text-red-700'
          } border px-4 py-3 rounded mb-4 flex items-start`}
        >
          {result.valid 
            ? <Check className="h-5 w-5 mr-2 mt-0.5" /> 
            : <AlertCircle className="h-5 w-5 mr-2 mt-0.5" />
          }
          <span>{result.valid ? 'Verification successful! The proof is valid.' : 'Verification failed. The proof is invalid.'}</span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Proof File</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="border border-gray-300 rounded-md px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {proofFile ? proofFile.name : 'No file selected'}
              </div>
            </div>
            <label className="cursor-pointer px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleProofUpload}
              />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Public Signals File</label>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="border border-gray-300 rounded-md px-3 py-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {publicSignalsFile ? publicSignalsFile.name : 'No file selected'}
              </div>
            </div>
            <label className="cursor-pointer px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-sm">
              <Upload className="h-4 w-4" />
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handlePublicSignalsUpload}
              />
            </label>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button
          onClick={handleVerify}
          disabled={!proofFile || !publicSignalsFile || loading}
          className={`flex items-center px-4 py-2 rounded ${
            !proofFile || !publicSignalsFile || loading
              ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white'
          }`}
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            <>
              <Shield className="w-4 h-4 mr-2" />
              Verify Proof
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ZKPVerificationPanel;
