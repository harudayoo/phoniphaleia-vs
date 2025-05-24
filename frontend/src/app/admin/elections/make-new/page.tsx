// Election creation page (no sidebar, back button, all fields, candidates section)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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
  // Validation for each step with detailed feedback
  const isGeneralValid = orgId && electionName.trim() && description.trim() && dateStart && endDate;
  const isAuthoritiesValid = personnel.length >= 3 && personnel.slice(0, 3).every(p => p.name.trim()) && publicKey;
  const hasValidCandidates = candidates.some(c => c.fullname.trim() && c.position_id);

  // Progress calculation
  const overallProgress = () => {
    let progress = 0;
    if (isGeneralValid) progress += 33;
    if (isAuthoritiesValid) progress += 33;
    if (hasValidCandidates || step > 2) progress += 34;
    return progress;
  };

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

  // Remove candidate photo
  const removeCandidatePhoto = (idx: number) => {
    setCandidates(c => c.map((cand, i) => i === idx ? { ...cand, photo: undefined } : cand));
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

      
      const storeRes = await fetch(`${API_URL}/crypto_configs/store-with-shares`, {
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
          security_data: keyGenResult.security_data,
          meta_data: keyGenResult.meta_data,
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
    <div className="min-h-screen flex flex-col items-center py-2 relative">      {/* Enhanced Back to Elections button */}
      <button
        type="button"
        className="fixed top-6 left-6 z-50 flex items-center gap-3 px-4 py-3 
                   bg-white/90 backdrop-blur-sm hover:bg-white text-gray-700 hover:text-red-700
                   rounded-xl shadow-lg hover:shadow-xl border border-gray-200 hover:border-red-300
                   transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 group"
        onClick={() => router.push('/admin/elections')}
      >
        <ArrowLeft size={20} className="text-red-600 group-hover:text-red-800 transition-colors duration-200" />
        <span className="font-semibold">Back to Elections</span>
      </button>

      {/* Scroll to Top Button */}
      <ArrowUpScrollToTop show={showScrollTop} />      {/* Enhanced Modal for notifications */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={modalContent.title}
        size="md"
        footer={modalContent.type === 'error' ? (
          <button 
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 
                     text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105" 
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
        ) : null}
      >
        <div className={`text-center py-4 ${modalContent.type === 'success' ? 'text-green-700' : 'text-red-700'}`}>
          <div className="mb-4">
            {modalContent.type === 'success' ? (
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-green-600 text-2xl">✅</span>
              </div>
            ) : (
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-red-600 text-2xl">❌</span>
              </div>
            )}
          </div>
          <p className="text-lg font-medium">{modalContent.message}</p>
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
      </div>      <div className="w-full max-w-7xl bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 my-4 border border-gray-200 relative z-10" 
           style={{ width: '95%', minHeight: '80vh' }}>        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold gradient-text mb-2">Create New Election</h1>
          <p className="text-gray-600 text-lg">Configure all aspects of your new election with our guided setup process.</p>
          <div className="mt-4 flex justify-center">
            <div className="h-1 w-24 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
          
          {/* Overall Progress Bar */}
          <div className="mt-6 max-w-md mx-auto">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-gray-600">Overall Progress</span>
              <span className="text-sm font-bold text-blue-600">{overallProgress()}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${overallProgress()}%` }}
              ></div>
            </div>
          </div>
        </div>{/* Enhanced Stepper */}
        <div className="flex justify-between items-center mb-12 relative">
          {/* Progress line */}
          <div className="absolute top-4 left-0 right-0 h-0.5 bg-gray-200 z-0">
            <div 
              className="h-full bg-blue-600 transition-all duration-500 ease-in-out"
              style={{ width: `${(step / 2) * 100}%` }}
            />
          </div>
            {[
            { label: 'General Details', icon: '📋', isValid: isGeneralValid },
            { label: 'Trusted Authorities', icon: '🔐', isValid: isAuthoritiesValid },
            { label: 'Candidates', icon: '👥', isValid: hasValidCandidates || step === 2 }
          ].map((item, idx) => (
            <div key={item.label} className="flex-1 flex flex-col items-center relative z-10">
              <div className={`
                rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg
                border-4 border-white shadow-lg transition-all duration-300 relative
                ${step === idx 
                  ? 'bg-blue-600 text-white scale-110 shadow-blue-200' 
                  : step > idx 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-500'
                }
              `}>
                {step > idx ? '✓' : item.icon}
                
                {/* Validation indicator */}
                {item.isValid && step >= idx && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}
              </div>
              <span className={`
                mt-3 text-sm font-semibold text-center max-w-24
                ${step === idx ? 'text-blue-700' : step > idx ? 'text-green-600' : 'text-gray-500'}
              `}>
                {item.label}
              </span>
              {item.isValid && (
                <span className="text-xs text-green-600 mt-1">Complete</span>
              )}
            </div>
          ))}
        </div>        {/* Step 1: General Details */}
        <div className={`${step === 0 ? 'block animate-fadeIn' : 'hidden'} ${stepAnim}`}> 
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-xl">📋</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-xl">General Details</h3>
                <p className="text-gray-600 text-sm">Basic information about your election</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="group">
                <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                  <span className="text-blue-600">🏢</span>
                  Organization 
                  <span className="text-red-500">*</span>
                </label>                <select 
                  className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 form-input
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                           group-hover:border-gray-300" 
                  value={orgId ?? ''} 
                  onChange={e => setOrgId(Number(e.target.value))} 
                  required
                >
                  <option value="" disabled>Select organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>
                      {org.name} - {org.college_name ? org.college_name : 'No affiliated college'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                  <span className="text-blue-600">🗳️</span>
                  Election Name 
                  <span className="text-red-500">*</span>
                </label>                <input 
                  className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 form-input
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                           group-hover:border-gray-300" 
                  value={electionName} 
                  onChange={e => setElectionName(e.target.value)} 
                  placeholder="Enter a descriptive election name" 
                  required 
                />
              </div>

              <div className="group">
                <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                  <span className="text-blue-600">📝</span>
                  Description 
                  <span className="text-red-500">*</span>
                </label>
                <textarea 
                  className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 h-32
                           focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                           group-hover:border-gray-300 resize-none" 
                  value={description} 
                  onChange={e => setDescription(e.target.value)} 
                  placeholder="Provide a detailed description of the election, its purpose, and any important details voters should know..." 
                  required 
                />
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="group">
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                    <span className="text-green-600">🕐</span>
                    Start Date 
                    <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                             group-hover:border-gray-300" 
                    value={dateStart} 
                    onChange={e => setDateStart(e.target.value)} 
                    required 
                  />
                </div>

                <div className="group">
                  <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                    <span className="text-red-600">🕑</span>
                    End Date 
                    <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 
                             focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                             group-hover:border-gray-300" 
                    value={endDate} 
                    onChange={e => setEndDate(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-orange-600 text-xl">⚙️</span>
                  <div>
                    <h4 className="font-semibold text-gray-700">Access Control Settings</h4>
                    <p className="text-sm text-gray-600">Configure how voters will access the election</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="font-medium text-gray-700">Queued Access</label>
                  <button
                    type="button"
                    className={`
                      px-6 py-2 rounded-lg font-medium transition-all duration-300 transform hover:scale-105
                      ${queuedAccess 
                        ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white shadow-lg' 
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white shadow-lg'
                      }
                    `}
                    onClick={() => setQueuedAccess(v => !v)}
                  >
                    {queuedAccess ? '✅ Enabled' : '❌ Disabled'}
                  </button>
                </div>
                
                {queuedAccess && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm text-blue-800 font-medium mb-2">
                      Maximum Concurrent Voters
                    </label>
                    <input 
                      type="number" 
                      min={1} 
                      className="w-full border-2 border-blue-200 text-gray-700 rounded-lg px-4 py-2 
                               focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200" 
                      value={maxConcurrentVoters} 
                      onChange={e => setMaxConcurrentVoters(Number(e.target.value))} 
                      placeholder="e.g., 100" 
                      required 
                    />
                    <p className="text-xs text-blue-600 mt-1">
                      Limit the number of voters who can vote simultaneously to manage server load
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-10">
            <button
              className={`
                px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-300 transform
                flex items-center gap-2
                ${!isGeneralValid 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl hover:scale-105'
                }
              `}
              onClick={() => isGeneralValid && setStep(1)}
              disabled={!isGeneralValid}
            >
              Continue to Authorities
              <span className="text-xl">→</span>
            </button>
          </div>
        </div>        {/* Step 2: Trusted Authorities */}
        <div className={`${step === 1 ? 'block animate-fadeIn' : 'hidden'} ${stepAnim}`}> 
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 text-xl">🔐</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-xl">Trusted Authorities</h3>
                <p className="text-gray-600 text-sm">Configure the people who will oversee election security</p>
              </div>
            </div>
            <div className="bg-blue-100 border border-blue-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-lg">ℹ️</span>
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Important Requirements:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>At least 3 trusted authorities are required</li>
                    <li>Each authority will receive a private key share</li>
                    <li>Majority of authorities needed to decrypt election results</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-700 text-lg flex items-center gap-2">
                  <span className="text-blue-600">👥</span>
                  Authority Personnel
                </h4>
                <button 
                  type="button" 
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 
                           hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-medium
                           transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => setPersonnel(p => [...p, { name: '' }])} 
                  disabled={personnel.length >= 10}
                >
                  <Plus size={16} /> 
                  Add Personnel
                </button>
              </div>

              <div className="space-y-4">
                {personnel.map((p, idx) => (
                  <div key={idx} className="group">
                    <div className="flex gap-3 items-center">
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                        ${idx < 3 
                          ? 'bg-red-100 text-red-600 border-2 border-red-200' 
                          : 'bg-gray-100 text-gray-600 border-2 border-gray-200'
                        }
                      `}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <input 
                          className={`
                            w-full border-2 text-gray-700 rounded-lg px-4 py-3 
                            transition-all duration-200 group-hover:border-gray-300
                            ${idx < 3 && !p.name.trim() 
                              ? 'border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50' 
                              : 'border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                            }
                          `} 
                          value={p.name} 
                          onChange={e => setPersonnel(arr => arr.map((item, i) => i === idx ? { ...item, name: e.target.value } : item))} 
                          placeholder={`Authority #${idx + 1}${idx < 3 ? ' (Required)' : ' (Optional)'}`} 
                          required={idx < 3} 
                        />
                        {idx < 3 && (
                          <p className="text-xs text-red-600 mt-1">Required for election security</p>
                        )}
                      </div>
                      {personnel.length > 3 && idx >= 3 && (
                        <button 
                          type="button" 
                          className="text-red-600 hover:text-red-800 text-sm px-3 py-2 border border-red-200 
                                   rounded-lg hover:bg-red-50 transition-all duration-200" 
                          onClick={() => setPersonnel(arr => arr.filter((_, i) => i !== idx))}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-yellow-600 text-xl">🔑</span>
                  <div>
                    <h4 className="font-semibold text-gray-700 text-lg">Cryptographic Key Generation</h4>
                    <p className="text-sm text-gray-600">Generate secure key pairs for election encryption</p>
                  </div>
                </div>
                
                <button
                  type="button"
                  className={`
                    w-full mb-4 px-6 py-4 rounded-lg font-semibold text-lg transition-all duration-300
                    flex items-center justify-center gap-3 transform hover:scale-105
                    ${generating || !!publicKey
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl'
                    }
                  `}
                  onClick={() => setShowKeyWarning(true)}
                  disabled={generating || !!publicKey}
                >
                  {generating ? (
                    <>
                      <div className="w-5 h-5 border-2 border-gray-400 border-t-gray-600 rounded-full animate-spin"></div>
                      Generating Keys...
                    </>
                  ) : publicKey ? (
                    <>
                      <span className="text-green-600">✅</span>
                      Key Pair Generated
                    </>
                  ) : (
                    <>
                      <span>🔑</span>
                      Generate Key Pair
                    </>
                  )}
                </button>

                <div>
                  <label className="block text-sm text-gray-700 font-medium mb-2">
                    Public Key Preview
                  </label>
                  <div className="relative">
                    <input
                      className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 text-sm font-mono 
                               bg-gray-50 text-gray-600 pr-10"
                      value={publicKey || "Public key will appear here after generation..."}
                      readOnly
                      disabled
                    />
                    {publicKey && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-green-500 text-lg">✅</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {publicKey && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-700">
                    <span className="text-lg">✅</span>
                    <span className="font-medium">Key generation completed successfully!</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Your election is now ready to proceed to the candidates section.
                  </p>
                </div>
              )}
            </div>
          </div>          {/* Key Generation Warning Modal */}
          <Modal
            isOpen={showKeyWarning}
            onClose={() => setShowKeyWarning(false)}
            title="🚨 Key Generation Security Warning"
            size="md"
            footer={null}
          >
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-xl">⚠️</span>
                  <div className="text-red-800">
                    <p className="font-bold mb-2">Critical Security Information</p>
                    <p className="text-sm">
                      The private key shares that will be generated contain critically sensitive security information.
                      <span className="font-semibold block mt-1">
                        You must download and store them securely before closing the next dialog.
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-l-4 border-blue-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <span className="text-blue-500 text-xl">🔄</span>
                  <div className="text-blue-800">
                    <p className="font-bold mb-2">How Key Generation Works</p>
                    <div className="text-sm space-y-2">
                      <p>When you continue, the system will:</p>
                      <ol className="list-decimal list-inside space-y-1 ml-4">
                        <li>Generate key pairs using the Paillier threshold cryptosystem</li>
                        <li>Create individual private key shares for each authority</li>
                        <li>Allow you to download the shares for secure distribution</li>
                      </ol>
                      <p className="mt-3 font-medium">
                        These authorities and keys will be permanently linked to your election upon submission.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                         text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105"
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
                🔑 Continue with Key Generation
              </button>
              <button
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 
                         transition-all duration-200"
                onClick={() => setShowKeyWarning(false)}
              >
                Cancel
              </button>
            </div>
          </Modal>

          {/* Enhanced Key Generation Modal */}
          <Modal
            isOpen={showKeyModal}
            onClose={() => setShowKeyModal(false)}
            title="🔐 Private Key Shares Distribution"
            size="lg"
            footer={
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-gray-600">
                  💾 Remember to download all key shares before closing
                </div>
                <button 
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                           text-white rounded-lg font-semibold transition-all duration-200 transform hover:scale-105" 
                  onClick={() => setShowKeyModal(false)}
                >
                  ✅ I&apos;ve Downloaded All Shares
                </button>
              </div>
            }
          >
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 p-4 rounded">
                <div className="flex items-start gap-3">
                  <span className="text-red-500 text-xl">🚨</span>
                  <div className="text-red-800">
                    <p className="font-bold mb-1">CRITICAL: One-Time Access Only</p>
                    <p className="text-sm">
                      When you close this dialog, you will <span className="font-bold text-red-600">NOT</span> be able to view these private key shares again. 
                      You must generate a completely new key pair if you lose them.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-blue-600 text-xl">📋</span>
                  <div className="text-blue-800">
                    <p className="font-semibold mb-2">Distribution Instructions:</p>
                    <ul className="text-sm space-y-1 list-disc list-inside">
                      <li>Each authority needs their corresponding key share to participate in decryption</li>
                      <li>These shares will be permanently linked to the authorities when you create this election</li>
                      <li>Store each share securely and distribute via secure channels only</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span>🔑</span>
                  Private Key Shares for Download
                </h4>
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {keySharesForModal.map((share, idx) => (
                    <div key={idx} className="border-2 border-gray-200 rounded-lg p-4 bg-gradient-to-r from-gray-50 to-white">
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-sm">{idx + 1}</span>
                          </div>
                          <span className="font-semibold text-gray-800">
                            {keyGenAuthorityNames[idx] || `Authority #${idx + 1}`}
                          </span>
                        </div>
                        <button
                          className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 
                                   text-white rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105
                                   flex items-center gap-2"
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
                          <span>💾</span>
                          Download Share
                        </button>
                      </div>
                      <div className="bg-white border border-gray-300 rounded p-3">
                        <input 
                          className="w-full text-xs font-mono text-gray-600 bg-transparent border-none outline-none" 
                          value={share} 
                          readOnly 
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Modal>

          <div className="flex justify-between mt-10">
            <button
              className="px-8 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 
                       text-gray-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105
                       flex items-center gap-2"
              onClick={() => setStep(0)}
            >
              <span className="text-xl">←</span>
              Back to General Details
            </button>
            <button
              className={`
                px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-300 transform
                flex items-center gap-2
                ${!isAuthoritiesValid 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl hover:scale-105'
                }
              `}
              onClick={() => isAuthoritiesValid && setStep(2)}
              disabled={!isAuthoritiesValid}
            >
              Continue to Candidates
              <span className="text-xl">→</span>
            </button>
          </div>
        </div>        {/* Step 3: Candidates (Enhanced) */}
        <div className={`${step === 2 ? 'block animate-fadeIn' : 'hidden'} ${stepAnim}`}> 
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <span className="text-green-600 text-xl">👥</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 text-xl">
                  Candidates 
                  <span className="text-gray-500 font-normal text-lg ml-2">(Optional)</span>
                </h3>
                <p className="text-gray-600 text-sm">Add candidates who will participate in this election</p>
              </div>
            </div>
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <span className="text-green-600 text-lg">💡</span>
                <div className="text-sm text-green-800">
                  <p className="font-medium mb-1">Candidate Information:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>You can add candidates now or after creating the election</li>
                    <li>Each candidate can be assigned to a specific position</li>
                    <li>Photos are optional but help voters identify candidates</li>
                    <li>All candidate information can be edited later if needed</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-6">
            <h4 className="font-semibold text-gray-700 text-lg flex items-center gap-2">
              <span className="text-blue-600">🗳️</span>
              Election Candidates
            </h4>
            <button 
              type="button" 
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 
                       hover:from-green-600 hover:to-green-700 text-white rounded-lg font-medium
                       transition-all duration-200 transform hover:scale-105" 
              onClick={addCandidate}
            >
              <Plus size={16} /> 
              Add New Candidate
            </button>
          </div>

          <div className="space-y-6">
            {candidates.map((cand, idx) => (
              <div key={idx} className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-blue-300 transition-all duration-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-sm">{idx + 1}</span>
                    </div>
                    <h5 className="font-semibold text-gray-800">
                      {cand.fullname || `Candidate #${idx + 1}`}
                    </h5>
                  </div>
                  {candidates.length > 3 && (
                    <button 
                      type="button" 
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1 rounded-lg
                               border border-red-200 hover:border-red-300 transition-all duration-200" 
                      onClick={() => removeCandidate(idx)}
                    >
                      <span className="text-sm">🗑️</span>
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="group">
                        <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                          <span className="text-blue-600">👤</span>
                          Full Name
                        </label>
                        <input 
                          className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                                   group-hover:border-gray-300" 
                          value={cand.fullname} 
                          onChange={e => updateCandidate(idx, 'fullname', e.target.value)} 
                          placeholder="Enter candidate&apos;s full name" 
                        />
                      </div>

                      <div className="group">
                        <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                          <span className="text-purple-600">🏛️</span>
                          Party/Affiliation
                        </label>
                        <input 
                          className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 
                                   focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                                   group-hover:border-gray-300" 
                          value={cand.party} 
                          onChange={e => updateCandidate(idx, 'party', e.target.value)} 
                          placeholder="Political party or organization" 
                        />
                      </div>
                    </div>

                    <div className="group">
                      <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                        <span className="text-green-600">🎯</span>
                        Position
                      </label>
                      <select 
                        className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                                 group-hover:border-gray-300" 
                        value={cand.position_id} 
                        onChange={e => updateCandidate(idx, 'position_id', Number(e.target.value))}
                      >
                        <option value="">Select a position</option>
                        {positions.map(pos => (
                          <option key={pos.id} value={pos.id}>{pos.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="group">
                      <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                        <span className="text-orange-600">📄</span>
                        Description/Platform
                      </label>
                      <textarea 
                        className="w-full border-2 border-gray-200 text-gray-700 rounded-lg px-4 py-3 h-24
                                 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200
                                 group-hover:border-gray-300 resize-none" 
                        value={cand.candidate_desc} 
                        onChange={e => updateCandidate(idx, 'candidate_desc', e.target.value)} 
                        placeholder="Candidate&apos;s background, qualifications, or campaign platform..." 
                      />
                    </div>
                  </div>

                  <div className="lg:col-span-1">
                    <div className="group">
                      <label className="flex items-center gap-2 text-sm text-gray-700 font-semibold mb-2">
                        Candidate Photo
                        <span className="text-gray-500 font-normal">(Optional)</span>
                      </label>
                      
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-all duration-200">
                        {cand.photo ? (
                          <div className="space-y-3">
                            <div className="mx-auto w-32 h-32 rounded-lg overflow-hidden border-2 border-gray-200">
                              <Image 
                                src={URL.createObjectURL(cand.photo)} 
                                alt={`Preview of ${cand.fullname || 'candidate'}`} 
                                height={128}
                                width={128}
                                className="w-full h-full object-cover"
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                            <p className="text-sm text-gray-600 font-medium">{cand.photo.name}</p>
                            <button
                              type="button"
                              className="text-xs text-red-600 hover:text-red-800 px-2 py-1 border border-red-200 rounded"
                              onClick={() => removeCandidatePhoto(idx)}
                            >
                              Remove Photo
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="mx-auto w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                            </div>
                            <div>
                              <input 
                                type="file" 
                                accept="image/jpeg,image/png,image/jpg"
                                className="hidden" 
                                id={`photo-${idx}`}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    updateCandidate(idx, 'photo', file);
                                  }
                                }}
                              />
                              <label 
                                htmlFor={`photo-${idx}`}
                                className="cursor-pointer inline-block px-4 py-2 bg-blue-500 text-white rounded-lg 
                                         hover:bg-blue-600 transition-all duration-200 text-sm font-medium"
                              >
                                Upload Photo
                              </label>
                              <p className="text-xs text-gray-500 mt-2">
                                JPG, PNG up to 5MB
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {candidates.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <div className="space-y-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-gray-400 text-2xl">👥</span>
                </div>
                <div>
                  <h4 className="text-gray-600 font-medium">No candidates added yet</h4>
                  <p className="text-gray-500 text-sm">Add candidates to your election or skip this step for now</p>
                </div>
                <button 
                  type="button" 
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 
                           text-white rounded-lg font-medium transition-all duration-200 transform hover:scale-105" 
                  onClick={addCandidate}
                >
                  <Plus size={16} className="inline mr-2" /> 
                  Add Your First Candidate
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-10">
            <button
              className="px-8 py-3 bg-gradient-to-r from-gray-200 to-gray-300 hover:from-gray-300 hover:to-gray-400 
                       text-gray-700 rounded-lg font-semibold transition-all duration-200 transform hover:scale-105
                       flex items-center gap-2"
              onClick={() => setStep(1)}
            >
              <span className="text-xl">←</span>
              Back to Authorities
            </button>
            <button
              className="px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 
                       text-white rounded-lg font-semibold text-lg transition-all duration-300 transform hover:scale-105
                       flex items-center gap-3 shadow-lg hover:shadow-xl"
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
