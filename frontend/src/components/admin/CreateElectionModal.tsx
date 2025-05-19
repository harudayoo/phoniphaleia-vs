import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import ErrorAlert from '@/components/ErrorAlert';
import { Download, Plus } from 'lucide-react';
import { authenticatedPost, authenticatedGet } from '@/services/apiService';

type Organization = { id: number; name: string; college_name?: string };
type Admin = { id: number; name: string; email: string };

interface KeyGenerationResponse {
  crypto_id: number;
  public_key: string;
  private_shares: string[];
  threshold?: number;
}

interface Election {
  election_id: number;
  election_name: string;
  election_status: string;
  date_created: string;
  date_start: string;
  date_end: string;
  org_id: number;
  [key: string]: unknown; // For any other properties that might be in the response
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const CreateElectionModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [step, setStep] = useState(1);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<number | undefined>();
  const [electionName, setElectionName] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState<string>('');
  const [dateStart, setDateStart] = useState<string>('');
  const [personnel, setPersonnel] = useState<{ name: string; id?: number }[]>([
    { name: '' }, { name: '' }, { name: '' }
  ]);
  const [adminSuggestions, setAdminSuggestions] = useState<Admin[][]>([[], [], []]);  const [publicKey, setPublicKey] = useState('');
  const [privateShares, setPrivateShares] = useState<string[]>([]);
  const [cryptoId, setCryptoId] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [queuedAccess, setQueuedAccess] = useState(false);
  const [maxConcurrentVoters, setMaxConcurrentVoters] = useState<number | ''>('');

  // Reset state on modal open/close
  useEffect(() => {
    if (!open) {
      setStep(1);
      setElectionName('');
      setDescription('');
      setEndDate('');
      setDateStart('');
      setOrgId(undefined);
      setPersonnel([{ name: '' }, { name: '' }, { name: '' }]);
      setAdminSuggestions([[], [], []]);
      setPublicKey('');
      setPrivateShares([]);
      setError(null);
      setSuccess(null);
      setQueuedAccess(false);
      setMaxConcurrentVoters('');
    }
  }, [open]);
  // Fetch organizations on open
  useEffect(() => {
    if (open) {
      // Regular fetch is fine for public data like organizations
      fetch(`${API_URL}/organizations`)
        .then(res => res.json())
        .then((data: Organization[]) => {
          setOrganizations(
            data.map(org => ({
              ...org,
              college_name: org.college_name ? org.college_name : 'None',
            }))
          );
        })
        .catch(() => setError('Failed to fetch organizations'));
      
      // Use authenticatedGet for protected admin info
      authenticatedGet<{full_name: string, id_number: number}>('/admin/me')
        .then(data => {
          setPersonnel(p => [{ name: data.full_name, id: data.id_number }, ...p.slice(1)]);
        })
        .catch(() => {});
    }
  }, [open]);

  // Admin auto-suggest
  const handlePersonnelChange = (idx: number, value: string): void => {
    setPersonnel(p => p.map((item, i) => i === idx ? { ...item, name: value } : item));
    if (value.trim()) {
      fetch(`${API_URL}/admins/search?query=${encodeURIComponent(value)}`)
        .then(res => res.json())
        .then((data: Admin[]) => {
          setAdminSuggestions(s => s.map((arr, i) => i === idx ? data : arr));
        });
    } else {
      setAdminSuggestions(s => s.map((arr, i) => i === idx ? [] : arr));
    }
  };

  // Add personnel input
  const addPersonnel = (): void => {
    if (personnel.length < 10) {
      setPersonnel(p => [...p, { name: '' }]);
      setAdminSuggestions(s => [...s, []]);
    }
  };  // Generate keys (call backend)
  const handleGenerateKeys = async (): Promise<void> => {
    setGenerating(true);
    setError(null);
    try {
      // First get a temporary election ID using a GET request
      const tempElectionData = await authenticatedGet<{ temp_election_id: number }>('/crypto_configs/temp-election-id');
      
      // Generate key pair with the temporary election ID
      const data = await authenticatedPost<KeyGenerationResponse>('/crypto_configs/generate', { 
        election_id: tempElectionData.temp_election_id,
        n_personnel: personnel.length 
      } as Record<string, unknown>);
      
      setPublicKey(data.public_key);
      setPrivateShares(data.private_shares);
      setCryptoId(data.crypto_id);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Key generation failed');
    } finally {
      setGenerating(false);
    }
  };  // Save all data
  const handleFinish = async (): Promise<void> => {
    setError(null);
    setSuccess(null);
    try {      // 1. Create election
      const election = await authenticatedPost<Election>('/elections', {
        org_id: orgId,
        election_name: electionName,
        election_desc: description,
        election_status: 'Upcoming',
        date_start: dateStart,
        date_end: endDate,
        queued_access: queuedAccess,
        max_concurrent_voters: queuedAccess ? maxConcurrentVoters : null
      });      // 2. Update the crypto config with the real election ID if we have a temporary one
      let crypto;      if (cryptoId) {
        // Update the existing crypto config with the real election ID
        crypto = await authenticatedPost<{crypto_id: number}>(`/crypto_configs/${cryptoId}/update-election`, {
          election_id: election.election_id
        });
      } else {
        // If no temporary crypto config exists, create a new one
        crypto = await authenticatedPost<{crypto_id: number}>('/crypto_configs', {
          election_id: election.election_id,
          public_key: publicKey
        });
      }      // 3. Save personnel and key shares
      for (let i = 0; i < personnel.length; i++) {
        // Save trusted authority
        const ta = await authenticatedPost<{authority_id: number}>('/trusted_authorities', {
          authority_name: personnel[i].name,
          contact_info: ''
        });
        
        // Save key share
        await authenticatedPost<{key_share_id: number}>('/key_shares', {
          crypto_id: crypto.crypto_id,
          authority_id: ta.authority_id,
          share_value: privateShares[i]
        });
      }
      setSuccess('Election created successfully!');
      setTimeout(() => {
        onClose();
        if (onCreated) onCreated();
      }, 1500);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Failed to create election');
    }
  };

  // Modal content per step
  let content;
  if (step === 1) {
    const selectedOrg = organizations.find(org => org.id === orgId);
    content = (
      <div>
        <h3 className="font-semibold text-lg mb-2">Election Details</h3>
        <p className="text-gray-600 mb-4">Input general election details</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Organization</label>
            <select
              className="w-full border rounded px-3 py-2"
              value={orgId ?? ''}
              onChange={e => setOrgId(Number(e.target.value))}
            >
              <option value="" disabled>Select organization</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
            {selectedOrg && (
              <div className="mt-2 text-xs text-gray-600">
                <span className="font-medium">College:</span> {selectedOrg.college_name || 'None'}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Election Name</label>
            <input
              className="w-full border rounded px-3 py-2"
              value={electionName}
              onChange={e => setElectionName(e.target.value)}
              placeholder="Election name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              className="w-full border rounded px-3 py-2"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Start Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={dateStart}
              onChange={e => setDateStart(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">End Date</label>
            <input
              type="date"
              className="w-full border rounded px-3 py-2"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 mt-4">
            <label className="font-medium">Queued Access</label>
            <button
              type="button"
              className={`px-3 py-1 rounded ${queuedAccess ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              onClick={() => setQueuedAccess(v => !v)}
            >
              {queuedAccess ? 'Enabled' : 'Disabled'}
            </button>
          </div>
          {queuedAccess && (
            <div className="mt-2">
              <label className="block text-sm font-medium mb-1">Max Concurrent Voters</label>
              <input
                type="number"
                min={1}
                className="w-full border rounded px-3 py-2"
                value={maxConcurrentVoters}
                onChange={e => setMaxConcurrentVoters(Number(e.target.value))}
                placeholder="Enter max voters allowed at a time"
                required
              />
            </div>
          )}
        </div>
      </div>
    );
  } else if (step === 2) {
    content = (
      <div>
        <h3 className="font-semibold text-lg mb-2">Authorized Personnel</h3>
        <p className="text-gray-600 mb-4">Trusted personnel needed for key decryption</p>
        <div className="space-y-4">
          {personnel.map((p, idx) => (
            <div key={idx} className="relative">
              <input
                className="w-full border rounded px-3 py-2"
                value={p.name}
                onChange={e => handlePersonnelChange(idx, e.target.value)}
                placeholder={`Assign Personnel Name #${idx + 1}`}
                autoComplete="off"
              />
              {adminSuggestions[idx] && adminSuggestions[idx].length > 0 && (
                <div className="absolute z-10 bg-white border rounded shadow w-full mt-1">
                  {adminSuggestions[idx].map(admin => (
                    <div
                      key={admin.id}
                      className="px-3 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => setPersonnel(pers => pers.map((item, i) => i === idx ? { name: admin.name, id: admin.id } : item))}
                    >
                      {admin.name} <span className="text-xs text-gray-500">{admin.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm mt-2"
            onClick={addPersonnel}
            disabled={personnel.length >= 10}
          >
            <Plus size={16} /> Add Personnel
          </button>
        </div>
      </div>
    );
  } else {
    // Step 3
    content = (
      <div>
        <h3 className="font-semibold text-lg mb-2">Security Keys</h3>
        <p className="text-gray-600 mb-4">Improved Key Generation</p>
        <div className="mb-4 text-sm text-yellow-700 bg-yellow-100 rounded p-2 border border-yellow-300">
          <strong>Important:</strong> Private key shares will <b>not</b> be viewable again after this step. Please save each share securely and distribute to the assigned personnel. The public key and private shares cannot be copied to clipboard for security reasons.
        </div>
        <div className="mb-4">
          <button
            type="button"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleGenerateKeys}
            disabled={generating || !!publicKey}
          >
            {generating ? 'Generating...' : 'Generate Key Pair'}
          </button>
        </div>
        {publicKey && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Public Key</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full border rounded px-3 py-2"
                value={publicKey}
                readOnly
              />
              {/* Remove copy button for public key */}
              <button
                type="button"
                className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                onClick={() => {
                  const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
                  const prefix = electionName ? sanitize(electionName) + '_' : '';
                  const blob = new Blob([publicKey], { type: 'text/plain' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${prefix}public_key.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={16} />
              </button>
            </div>
          </div>
        )}
        {privateShares.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Private Key Shares</label>
            <div className="space-y-2">
              {privateShares.map((share, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    className="w-full border rounded px-3 py-2"
                    value={share}
                    readOnly
                  />
                  {/* Remove copy button for private shares, update file name */}
                  <button
                    type="button"
                    className="p-2 bg-gray-100 rounded hover:bg-gray-200"
                    onClick={() => {
                      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
                      const prefix = electionName ? sanitize(electionName) + '_' : '';
                      const blobObj = new Blob([share], { type: 'text/plain' });
                      const url = URL.createObjectURL(blobObj);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${prefix}private_share_${idx + 1}.txt`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 100);
                    }}
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create footer buttons with proper keys and handling
  const footerButtons = [];
  if (step > 1) {
    footerButtons.push(
      <button key="back" className="px-4 py-2 bg-gray-200 text-gray-700 rounded mr-2" onClick={() => setStep(step - 1)}>
        Back
      </button>
    );
  }
  if (step < 3) {
    footerButtons.push(
      <button
        key="next"
        className="px-4 py-2 bg-red-700 text-white rounded"
        onClick={() => setStep(step + 1)}
        disabled={
          (step === 1 && (!orgId || !electionName || !description || !endDate || !dateStart)) ||
          (step === 2 && personnel.some(p => !p.name))
        }
      >
        Next
      </button>
    );
  } else {
    footerButtons.push(
      <button
        key="finish"
        className="px-4 py-2 bg-green-700 text-white rounded"
        onClick={handleFinish}
        disabled={!publicKey || privateShares.length !== personnel.length}
      >
        Finish
      </button>
    );
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title="Create New Election"
      size="md"
      footer={footerButtons}
    >
      {error && <ErrorAlert message={error} onDismiss={() => setError(null)} />}
      {success && <div className="bg-green-100 text-green-800 rounded p-3 mb-4 text-center">{success}</div>}
      {content}
    </Modal>
  );
};

export default CreateElectionModal;