// Election creation page (no sidebar, back button, all fields, candidates section)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/admin/PageHeader';
import { Plus, ArrowLeft } from 'lucide-react';
import Image from 'next/image';
import ArrowUpScrollToTop from '@/components/ArrowUpScrollToTop';
import Modal from '@/components/Modal';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type Organization = { id: number; name: string; college_name?: string };
type Position = { id: number; name: string };

type Candidate = {
  fullname: string;
  party?: string;
  candidate_desc?: string;
  position_id: number | '';
  photo?: File;
};

// Define interface for authority shares
interface AuthorityShare {
  authority_id: number;
  share_value: string;
}

// Add this function to handle key pair generation and distribution
async function handleGenerateKeyPair({
  nPersonnel,
  threshold,
  authorityIds,
  cryptoMethod = 'paillier',
}: {
  electionId: number;
  nPersonnel: number;
  threshold: number;
  authorityIds: number[];
  cryptoMethod?: string;
}) {
  const adminToken = localStorage.getItem('admin_token');
  if (!adminToken) {
    throw new Error('You are not logged in. Please log in as an administrator.');
  }
  
  try {
    console.log(`Generating in-memory key pair for ${nPersonnel} authorities with threshold ${threshold}`);
    
    // Validate input parameters
    if (threshold > nPersonnel) {
      throw new Error('Threshold cannot be greater than the number of personnel');
    }
    
    if (!authorityIds || authorityIds.length === 0) {
      throw new Error('At least one trusted authority is required');
    }
    
    // Make the API call to generate key pair WITHOUT storing in the database
    const res = await fetch(`${API_URL}/crypto_configs/generate-in-memory`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        n_personnel: nPersonnel,
        threshold,
        crypto_method: cryptoMethod,
      }),
    });
    
    // Handle authentication errors specifically
    if (res.status === 401 || res.status === 403) {
      throw new Error('Missing or Invalid authorization token. Please log in again.');
    }
    
    const data = await res.json();
    if (!res.ok) {
      console.error('Error response:', data);
      throw new Error(data.error || 'Key generation failed');
    }
    
    // Log successful key generation
    console.log(`Successfully generated key pair in memory`);
    console.log(`Generated ${data.private_shares?.length || 0} private key shares`);
    
    if (!data.public_key || !data.private_shares || data.private_shares.length === 0) {
      throw new Error('Invalid key generation response: missing public key or private shares');
    }
    
    // Store authority-share mapping in memory for later use
    const authorityShares: AuthorityShare[] = [];
    for (let i = 0; i < authorityIds.length && i < data.private_shares.length; i++) {
      authorityShares.push({
        authority_id: authorityIds[i],
        share_value: data.private_shares[i]
      });
    }
    
    // Store mapping in localStorage for later access
    localStorage.setItem('key_share_mapping', JSON.stringify(
      authorityIds.map((id, idx) => ({
        authorityId: id,
        shareIndex: idx,
        shareValue: idx < data.private_shares.length ? data.private_shares[idx] : null
      }))
    ));
    
    // Return the data with associated authority shares
    return {
      public_key: data.public_key,
      private_shares: data.private_shares,
      threshold: data.threshold,
      crypto_type: data.crypto_type,
      meta_data: data.meta_data,
      authority_shares: authorityShares
    };
  } catch (error) {
    console.error('Key generation error:', error);
    // Re-throw the error to be caught by the caller
    throw error;
  }
}

export default function CreateElectionPage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [orgId, setOrgId] = useState<number | undefined>();
  const [electionName, setElectionName] = useState('');
  const [description, setDescription] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateStart, setDateStart] = useState('');
  const [queuedAccess, setQueuedAccess] = useState(false);
  const [maxConcurrentVoters, setMaxConcurrentVoters] = useState<number | ''>('');
  const [personnel, setPersonnel] = useState<{ name: string; id?: number }[]>([
    { name: '' }, { name: '' }, { name: '' }
  ]);
  const [publicKey, setPublicKey] = useState('');
  const [, setPrivateShares] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([
    { fullname: '', party: '', candidate_desc: '', position_id: '' },
    { fullname: '', party: '', candidate_desc: '', position_id: '' },
    { fullname: '', party: '', candidate_desc: '', position_id: '' },
  ]);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [step, setStep] = useState(0); // 0: General, 1: Authorities, 2: Candidates
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; message: string; type: 'success' | 'error' }>({ title: '', message: '', type: 'success' });
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keySharesForModal, setKeySharesForModal] = useState<string[]>([]);
  const [keyGenAuthorityNames, setKeyGenAuthorityNames] = useState<string[]>([]);
  const [showKeyWarning, setShowKeyWarning] = useState(false);

  // Validation for each step
  const isGeneralValid = orgId && electionName.trim() && description.trim() && dateStart && endDate;
  const isAuthoritiesValid = personnel.length >= 3 && personnel.slice(0, 3).every(p => p.name.trim()) && publicKey;

  // Step transition animation classes
  const stepAnim = 'transition-all duration-500 ease-in-out';

  // Fetch organizations on mount
  useEffect(() => {
    fetch(`${API_URL}/organizations`)
      .then(res => res.json())
      .then((data: Organization[]) => setOrganizations(data))
      .catch(() => setModalContent({ title: 'Error', message: 'Failed to fetch organizations', type: 'error' }));
  }, []);

  // Fetch positions when orgId changes
  useEffect(() => {
    if (!orgId) {
      setPositions([]);
      return;
    }
    fetch(`${API_URL}/positions`)
      .then(res => res.json())
      .then((data: { id: number; name: string; organization_id: number }[]) => {
        setPositions(data.filter(p => p.organization_id === orgId).map(p => ({ id: p.id, name: p.name })));
      })
      .catch(() => setModalContent({ title: 'Error', message: 'Failed to fetch positions', type: 'error' }));
  }, [orgId]);

  // Show "scroll to top" button when near bottom
  useEffect(() => {
    const onScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;
      // Show if scrolled down and near bottom (100px from bottom)
      setShowScrollTop(scrollY > 100 && windowHeight + scrollY >= docHeight - 100);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Add candidate
  const addCandidate = () => {
    setCandidates(c => [...c, { fullname: '', party: '', candidate_desc: '', position_id: '' }]);
  };

  // Update candidate
  const updateCandidate = (idx: number, field: keyof Candidate, value: string | number | File) => {
    setCandidates(c => c.map((cand, i) => i === idx ? { ...cand, [field]: value } : cand));
  };

  // Remove candidate
  const removeCandidate = (idx: number) => {
    setCandidates(c => c.length > 3 ? c.filter((_, i) => i !== idx) : c);
  };

  // Save all data
  const handleFinish = async () => {
    try {
      // 1. Create the election (without candidates with photos)
      const electionRes = await fetch(`${API_URL}/elections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          election_name: electionName,
          election_desc: description,
          election_status: 'Upcoming',
          date_start: dateStart,
          date_end: endDate,
          queued_access: queuedAccess,
          max_concurrent_voters: queuedAccess ? (maxConcurrentVoters === '' ? null : maxConcurrentVoters) : null,
          candidates: candidates.filter(c => c.fullname && c.position_id && !c.photo)
        })
      });
      if (!electionRes.ok) throw new Error('Failed to create election');
      const election = await electionRes.json();

      // 2. Create trusted authorities for each personnel
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) throw new Error('You are not logged in. Please log in as an administrator.');
      const validPersonnel = personnel.filter(p => p.name.trim());
      const newAuthorityIds: number[] = [];
      for (const person of validPersonnel) {
        const authorityRes = await fetch(`${API_URL}/trusted_authorities`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            authority_name: person.name,
            contact_info: ''
          })
        });
        if (!authorityRes.ok) {
          const err = await authorityRes.json();
          throw new Error(err.error || 'Failed to create trusted authority');
        }
        const authority = await authorityRes.json();
        newAuthorityIds.push(authority.authority_id);
      }
      if (newAuthorityIds.length === 0) throw new Error('Failed to create trusted authorities for this election.');

      // 3. Generate key pair and private shares for the real authorities
      let keyGenResult;
      try {
        keyGenResult = await handleGenerateKeyPair({
          electionId: election.election_id,
          nPersonnel: newAuthorityIds.length,
          threshold: Math.ceil(newAuthorityIds.length / 2) + 1,
          authorityIds: newAuthorityIds,
        });
      } catch (error) {
        throw new Error('Failed to generate cryptographic key shares: ' + (error as Error).message);
      }
      if (!keyGenResult || !keyGenResult.public_key || !keyGenResult.private_shares) {
        throw new Error('Key generation failed. No key shares or public key returned.');
      }
      setPublicKey(keyGenResult.public_key);
      setPrivateShares(keyGenResult.private_shares);

      // 4. Store crypto configuration and key shares
      const authorityShares: AuthorityShare[] = newAuthorityIds.map((authority_id, idx) => ({
        authority_id,
        share_value: keyGenResult.private_shares[idx] || ''
      }));
      const metaData = JSON.stringify({
        crypto_type: 'paillier',
        n_personnel: newAuthorityIds.length,
        threshold: Math.ceil(newAuthorityIds.length / 2) + 1,
        creation_timestamp: new Date().toISOString()
      });      const storeRes = await fetch(`${API_URL}/crypto_configs/store-with-shares`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          election_id: election.election_id,
          public_key: keyGenResult.public_key,
          crypto_type: 'paillier',
          key_type: 'paillier',
          threshold: keyGenResult.threshold,
          security_data: keyGenResult.security_data || {},
          meta_data: keyGenResult.meta_data || metaData,
          authority_shares: authorityShares
        })
      });
      if (!storeRes.ok) {
        const err = await storeRes.json();
        throw new Error(err.error || 'Failed to store crypto configuration');
      }

      // 5. Add candidates with photos
      const candidatesWithPhotos = candidates.filter(c => c.fullname && c.position_id && c.photo);
      for (const candidate of candidatesWithPhotos) {
        const formData = new FormData();
        formData.append('fullname', candidate.fullname);
        formData.append('position_id', String(candidate.position_id));
        if (candidate.party) formData.append('party', candidate.party);
        if (candidate.candidate_desc) formData.append('candidate_desc', candidate.candidate_desc);
        if (candidate.photo) formData.append('photo', candidate.photo);
        const candidateRes = await fetch(`${API_URL}/elections/${election.election_id}/candidates`, {
          method: 'POST',
          body: formData
        });
        if (!candidateRes.ok) {
          const err = await candidateRes.json();
          throw new Error(err.error || 'Failed to add candidate with photo');
        }
      }

      // Clean up all temporary data
      localStorage.removeItem('temp_crypto_id');
      localStorage.removeItem('key_share_mapping');
      setModalContent({ title: 'Success', message: 'Election created successfully!', type: 'success' });
      setShowModal(true);
      setTimeout(() => router.push('/admin/elections'), 1200);
    } catch (e: unknown) {
      setModalContent({ title: 'Error', message: e instanceof Error ? e.message : 'Failed to create election', type: 'error' });
      setShowModal(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-2 relative">
      {/* Back to Elections button (sticky/fixed at top-left) */}
      <button
        type="button"
        className="relative top-2 left-8 z-50 flex self-start gap-2 px-2 py-2 my-2 transition-all duration-200 hover:-translate-x-1 hover:-translate-y-1"
        onClick={() => router.push('/admin/elections')}
        style={{ backdropFilter: 'blur(2px)' }}
      >
        {/* ArrowLeft icon absolutely positioned to the left, outside the border */}
        <span className="absolute -left-6 top-1/2 -translate-y-1/2 mr-2">
          <ArrowLeft size={22} className="text-red-600 drop-shadow hover:text-red-800 hover:drop-shadow-amber-200" />
        </span>
        <span className="font-bold text-gray-700 hover:text-red-800">Back to Elections</span>
      </button>

      {/* Scroll to Top Button */}
      <ArrowUpScrollToTop show={showScrollTop} />

      {/* Modal for notifications */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        size="sm"
        footer={modalContent.type === 'error' ? (
          <button className="px-4 py-2 bg-red-600 text-white rounded" onClick={() => setShowModal(false)}>Close</button>
        ) : null}
      >
        <div className={`${modalContent.type === 'success' ? 'text-green-700' : 'text-red-700'} text-center`}>
          {modalContent.message}
        </div>
      </Modal>

      {/* Background image with overlay and gradient */}
      <div className="absolute inset-0 z-0">
        {/* USEP background image with 0.6 opacity using next/image */}
        <Image
          src="/usep-bg.jpg"
          alt="USEP Background"
          fill
          style={{ objectFit: 'cover', opacity: 0.6 }}
          className="!absolute !inset-0"
          priority
        />
        {/* Yellow gradient overlay from bottom to transparent */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(to top, #FFF9E5 0%, #FFF9E5 40%, transparent 100%)',
            pointerEvents: 'none',
          }}
        ></div>
      </div>
      <div className="w-full max-w-5xl bg-white rounded-xl shadow p-4 my-1 border border-gray-200 relative z-10" style={{ width: '90%' }}>
        <PageHeader title="Create New Election" description="Fill out all details to create a new election." />
        {/* Stepper */}
        <div className="flex justify-between items-center mb-8">
          {['General Details', 'Trusted Authorities', 'Candidates'].map((label, idx) => (
            <div key={label} className="flex-1 flex flex-col items-center">
              <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-white ${step === idx ? 'bg-blue-700 scale-110' : step > idx ? 'bg-green-600' : 'bg-gray-300'} ${stepAnim}`}>{idx + 1}</div>
              <span className={`mt-2 text-xs font-medium ${step === idx ? 'text-blue-700' : 'text-gray-500'}`}>{label}</span>
            </div>
          ))}
        </div>
        {/* Step 1: General Details */}
        <div className={`${step === 0 ? 'block animate-fadeIn' : 'hidden'} ${stepAnim}`}> 
          <h3 className="font-semibold text-gray-700 text-lg mb-2">General Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Organization <span className="text-red-500">*</span></label>
              <select className="w-full border text-gray-700 rounded px-3 py-2" value={orgId ?? ''} onChange={e => setOrgId(Number(e.target.value))} required>
                <option value="" disabled>Select organization</option>
                {organizations.map(org => (
                  <option key={org.id} value={org.id}>
                    {org.name} - {org.college_name ? org.college_name : 'No affiliated college'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Election Name <span className="text-red-500">*</span></label>
              <input className="w-full border text-gray-700 rounded px-3 py-2" value={electionName} onChange={e => setElectionName(e.target.value)} placeholder="Election name" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-700 font-medium mb-1">Description <span className="text-red-500">*</span></label>
              <textarea className="w-full border text-gray-700 rounded px-3 py-2" value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">Start Date <span className="text-red-500">*</span></label>
              <input type="date" className="w-full border text-gray-700 rounded px-3 py-2" value={dateStart} onChange={e => setDateStart(e.target.value)} required />
            </div>
            <div>
              <label className="block text-sm text-gray-700 font-medium mb-1">End Date <span className="text-red-500">*</span></label>
              <input type="date" className="w-full border text-gray-700 rounded px-3 py-2" value={endDate} onChange={e => setEndDate(e.target.value)} required />
            </div>
            <div className="flex items-center gap-2 mt-4 md:col-span-2">
              <label className="font-medium text-gray-700">Queued Access</label>
              <button
                type="button"
                className={`px-3 py-1 rounded transition-all duration-200 ease-in-out ${queuedAccess ? 'bg-gradient-to-r from-green-700 to-green-900 hover:from-green-800 hover:to-green-950 text-white' : 'bg-gradient-to-r from-red-200 to-red-400 hover:from-red-300 hover:to-red-500 text-gray-700'}`}
                onClick={() => setQueuedAccess(v => !v)}
              >
                {queuedAccess ? 'Enabled' : 'Disabled'}
              </button>
              {queuedAccess && (
                <input type="number" min={1} className="ml-4 w-52 border text-gray-700 rounded px-3 py-2" value={maxConcurrentVoters} onChange={e => setMaxConcurrentVoters(Number(e.target.value))} placeholder="Max concurrent voters" required />
              )}
            </div>
          </div>
          <div className="flex justify-end mt-8">
            <button
              className={`px-6 py-2 bg-blue-700 text-white rounded transition-all duration-200 ${!isGeneralValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800'}`}
              onClick={() => isGeneralValid && setStep(1)}
              disabled={!isGeneralValid}
            >
              Proceed
            </button>
          </div>
        </div>
        {/* Step 2: Trusted Authorities */}
        <div className={`${step === 1 ? 'block animate-fadeIn' : 'hidden'} ${stepAnim}`}> 
          <h3 className="font-semibold text-gray-700 text-lg mb-2">Trusted Authorities <span className="text-red-500">*</span></h3>
          <div className="flex items-center justify-between mb-2">
            <button type="button" className="flex items-center text-gray-700 gap-2 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm" onClick={() => setPersonnel(p => [...p, { name: '' }])} disabled={personnel.length >= 10}>
              <Plus size={16} /> Add Personnel
            </button>
          </div>
          <div className="space-y-2 mb-4">
            {personnel.map((p, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input className={`w-full border text-gray-700 rounded px-3 py-2 ${idx < 3 && !p.name.trim() ? 'border-red-400' : ''}`} value={p.name} onChange={e => setPersonnel(arr => arr.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} placeholder={`Personnel Name #${idx + 1}${idx < 3 ? ' (required)' : ''}`} required={idx < 3} />
                {personnel.length > 1 && (
                  <button type="button" className="text-red-600 hover:text-red-800 text-xs px-2 py-1 border border-red-200 rounded" onClick={() => setPersonnel(arr => arr.filter((_, i) => i !== idx))}>
                    Delete Personnel
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mb-4">
            <button
              type="button"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-950 disabled:opacity-60 text-white rounded transition-all duration-200 ease-in-out"
              onClick={() => setShowKeyWarning(true)}
              disabled={generating || !!publicKey}
            >
              {generating ? 'Generating...' : (publicKey ? 'Key Pair Generated' : 'Generate Key Pair')}
            </button>
            <input
              className="w-full border rounded px-3 py-2 text-gray-700 bg-gray-100"
              value={publicKey}
              readOnly
              disabled
              placeholder="Public key will appear here"
              style={{ maxWidth: 400 }}
            />
          </div>
          {/* Key Generation Warning Modal */}
          <Modal
            isOpen={showKeyWarning}
            onClose={() => setShowKeyWarning(false)}
            title="Key Generation Warning"
            size="md"
            footer={null}
          >
            <div className="mb-4 text-yellow-700 bg-red-100 border border-red-300 rounded p-3 text-sm">
              <b>Warning:</b> The private key shares that will be generated are critically sensitive security information.<br />
              <span className="font-medium">Download and store them securely before closing the next dialog.</span>
            </div>
            <div className="mb-4 text-blue-700 bg-blue-100 border border-blue-300 rounded p-3 text-sm">
              <b>How this works:</b> When you continue, the system will:<br />
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>Generate key pairs using the Paillier threshold cryptosystem</li>
                <li>Allow you to download the private key shares to distribute to each authority</li>
              </ol>
              <p className="mt-2">These authorities and keys will be properly linked to your election when you submit the form.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  setShowKeyWarning(false);
                  setGenerating(true);
                  try {
                    const validPersonnel = personnel.filter(p => p.name.trim());
                    if (validPersonnel.length < 3) {
                      setModalContent({ title: 'Error', message: 'At least 3 trusted authorities with names are required.', type: 'error' });
                      setShowModal(true);
                      setGenerating(false);
                      return;
                    }
                    // Simulate temp authority IDs for modal
                    const tempAuthorityIds = validPersonnel.map((_, idx) => idx + 1);
                    const keyGenResult = await handleGenerateKeyPair({
                      electionId: -1,
                      nPersonnel: validPersonnel.length,
                      threshold: Math.ceil(validPersonnel.length / 2) + 1,
                      authorityIds: tempAuthorityIds,
                    });
                    setPublicKey(keyGenResult.public_key);
                    setKeySharesForModal(keyGenResult.private_shares);
                    setKeyGenAuthorityNames(validPersonnel.map(p => p.name));
                    setShowKeyModal(true);
                  } catch (e) {
                    setModalContent({ title: 'Error', message: e instanceof Error ? e.message : 'Key generation failed', type: 'error' });
                    setShowModal(true);
                  } finally {
                    setGenerating(false);
                  }
                }}
              >
                Continue
              </button>
              <button
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                onClick={() => setShowKeyWarning(false)}
              >
                Cancel
              </button>
            </div>
          </Modal>
          {/* Key Generation Modal */}
          <Modal
            isOpen={showKeyModal}
            onClose={() => setShowKeyModal(false)}
            title="Private Key Shares"
            size="lg"
            footer={<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setShowKeyModal(false)}>Close</button>}
          >
            <div className="mb-4 text-yellow-700 bg-yellow-100 border border-yellow-300 rounded p-3 text-sm">
              <b>IMPORTANT:</b> When you close this dialog, you will <b className='text-red-600 text-md text-shadow-md'>NOT</b> be able to view the private key shares again. You must generate a new key pair for this election session if you lose them.
            </div>
            <div className="mb-4 text-blue-700 bg-blue-100 border border-blue-300 rounded p-3">
              <p className="font-medium mb-2">Distribute these key shares to your trusted authorities:</p>
              <p className="text-sm mb-1">Each authority needs their corresponding key share to participate in decryption.</p>
              <p className="text-sm">These shares will be permanently linked to the authorities when you create this election.</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-700 font-medium mb-1">Private Key Shares</label>
              <div className="space-y-4">
                {keySharesForModal.map((share, idx) => (
                  <div key={idx} className="border rounded p-3 bg-gray-50">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{keyGenAuthorityNames[idx] || `Authority #${idx + 1}`}</span>
                      <button
                        className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-800 ml-2"
                        onClick={() => {
                          const blob = new Blob([
                            `Authority: ${keyGenAuthorityNames[idx] || `Authority #${idx + 1}`}` + '\n' +
                            `Key Share:\n${share}`
                          ], { type: 'text/plain' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `key_share_${(keyGenAuthorityNames[idx] || `authority_${idx + 1}`).replace(/\s+/g, '_')}.txt`;
                          document.body.appendChild(a);
                          a.click();
                          setTimeout(() => {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(url);
                          }, 100);
                        }}
                      >
                        Export
                      </button>
                    </div>
                    <input className="w-full border rounded px-3 py-2 text-sm font-mono bg-white" value={share} readOnly />
                  </div>
                ))}
              </div>
            </div>
          </Modal>
          <div className="flex justify-between mt-8">
            <button
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setStep(0)}
            >
              Back
            </button>
            <button
              className={`px-6 py-2 bg-blue-700 text-white rounded transition-all duration-200 ${!isAuthoritiesValid ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-800'}`}
              onClick={() => isAuthoritiesValid && setStep(2)}
              disabled={!isAuthoritiesValid}
            >
              Proceed
            </button>
          </div>
        </div>
        {/* Step 3: Candidates (optional) */}
        <div className={`${step === 2 ? 'block animate-fadeIn' : 'hidden'} ${stepAnim}`}> 
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-700 text-lg">Candidates <span className="text-gray-400">(Optional)</span></h3>
            <button type="button" className="flex items-center text-gray-700 gap-2 px-3 py-2 bg-gray-100 rounded hover:bg-gray-200 text-sm" onClick={addCandidate}>
              <Plus size={16} /> Add Candidate
            </button>
          </div>
          <div className="space-y-4">
            {candidates.map((cand, idx) => (
              <div key={idx} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end border-b pb-4 mb-2">
                <div className="md:col-span-2">
                  <label className="block text-sm text-gray-700 font-medium mb-1">Full Name</label>
                  <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.fullname} onChange={e => updateCandidate(idx, 'fullname', e.target.value)} placeholder="Candidate Name" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Party</label>
                  <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.party} onChange={e => updateCandidate(idx, 'party', e.target.value)} placeholder="Party" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Position</label>
                  <select className="w-full border text-gray-700 rounded px-3 py-2" value={cand.position_id} onChange={e => updateCandidate(idx, 'position_id', Number(e.target.value))}>
                    <option value="">Select position</option>
                    {positions.map(pos => (
                      <option key={pos.id} value={pos.id}>{pos.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-1">Description</label>
                  <input className="w-full border text-gray-700 rounded px-3 py-2" value={cand.candidate_desc} onChange={e => updateCandidate(idx, 'candidate_desc', e.target.value)} placeholder="Description" />
                </div>
                <div className="flex items-center gap-2">
                  {candidates.length > 3 && (
                    <button type="button" className="text-red-600 hover:text-red-800" onClick={() => removeCandidate(idx)}>Remove</button>
                  )}
                </div>
                <div className="md:col-span-5 mt-2">
                  <label className="block text-sm text-gray-700 font-medium mb-1">Photo (optional)</label>
                  <input 
                    type="file" 
                    accept="image/jpeg,image/png,image/jpg"
                    className="w-full border text-gray-700 rounded px-3 py-2" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        // Store the file in the candidates array
                        updateCandidate(idx, 'photo', file);
                      }
                    }}
                  />
                  {cand.photo && (
                    <div className="mt-2">
                      <Image 
                        src={URL.createObjectURL(cand.photo)} 
                        alt={`Preview of ${cand.fullname}`} 
                        height={96}
                        width={96}
                        className="h-24 w-24 object-cover rounded"
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-8">
            <button
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
              onClick={() => setStep(1)}
            >
              Back
            </button>
            <button
              className={`px-6 py-2 bg-gradient-to-r from-green-700 to-green-900 hover:from-green-800 hover:to-green-950 text-white rounded transition-all duration-200 ease-in-out`}
              onClick={handleFinish}
              disabled={generating || !publicKey}
            >
              Create Election
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
