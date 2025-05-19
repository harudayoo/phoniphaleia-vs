// Election creation page (no sidebar, back button, all fields, candidates section)
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PageHeader from '@/components/admin/PageHeader';
import { Download, Plus, ArrowLeft } from 'lucide-react';
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
  const [maxConcurrentVoters, setMaxConcurrentVoters] = useState<number | ''>('');  const [personnel, setPersonnel] = useState<{ name: string; id?: number }[]>([
    { name: '' }, { name: '' }, { name: '' }
  ]);
  const [publicKey, setPublicKey] = useState('');
  const [privateShares, setPrivateShares] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([
    { fullname: '', party: '', candidate_desc: '', position_id: '' },
    { fullname: '', party: '', candidate_desc: '', position_id: '' },
    { fullname: '', party: '', candidate_desc: '', position_id: '' },
  ]);
  const [showKeyWarning, setShowKeyWarning] = useState(false);
  const [keyModalOpen, setKeyModalOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [step, setStep] = useState(0); // 0: General, 1: Authorities, 2: Candidates
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; message: string; type: 'success' | 'error' }>({ title: '', message: '', type: 'success' });

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
      // 1. Create election (without candidates with photos, we'll add those separately)
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
          // Only include candidates without photos here
          candidates: candidates
            .filter(c => c.fullname && c.position_id && !c.photo)
        })
      });
      if (!electionRes.ok) throw new Error('Failed to create election');
      const election = await electionRes.json();
      
      // Handle candidates with photos separately
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
          body: formData // No Content-Type header for FormData
        });
        
        if (!candidateRes.ok) {
          console.error('Failed to add candidate with photo');
        }
      }      // 2. Use the already generated key pair and create trusted authorities for the real election
      const adminToken = localStorage.getItem('admin_token');
      if (!adminToken) {
        throw new Error('You are not logged in. Please log in as an administrator.');
      }
      
      // Get valid personnel with names
      const validPersonnel = personnel.filter(p => p.name.trim());
      
      // Step 1: Create real trusted authorities for each personnel
      const newAuthorityIds: number[] = [];
      for (const person of validPersonnel) {
        try {
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
            console.error('Failed to create trusted authority:', await authorityRes.text());
            continue;
          }
          
          const authority = await authorityRes.json();
          newAuthorityIds.push(authority.authority_id);
          console.log(`Successfully created trusted authority ID: ${authority.authority_id} for ${person.name}`);
        } catch (error) {
          console.error('Error creating trusted authority:', error);
        }
      }
      
      if (newAuthorityIds.length === 0) {
        throw new Error('Failed to create trusted authorities for this election.');
      }
      
      // Log the created authority IDs for debugging
      console.log(`Created ${newAuthorityIds.length} trusted authorities with IDs:`, newAuthorityIds);// Generate key shares if they don't exist yet
      if (privateShares.length === 0 && publicKey === '') {
        try {
          console.log('Generating new key shares for trusted authorities...');
          const keyGenResult = await handleGenerateKeyPair({
            electionId: election.election_id,
            nPersonnel: validPersonnel.length,
            threshold: Math.ceil(validPersonnel.length / 2) + 1,
            authorityIds: newAuthorityIds,
          });
          
          // Set the public key and private shares from generation
          setPublicKey(keyGenResult.public_key);
          setPrivateShares(keyGenResult.private_shares || []);
          
          console.log(`Generated ${keyGenResult.private_shares?.length || 0} private key shares`);
        } catch (error) {
          console.error('Error generating key shares:', error);
          throw new Error('Failed to generate cryptographic key shares: ' + (error as Error).message);
        }
      }
        
      // Step 2: Store crypto configuration and key shares for the real election
      
      if (!publicKey) {
        throw new Error('No public key available. Please generate a key pair first.');
      }      // Create authority shares with the newly created authority IDs
      let authorityShares: AuthorityShare[] = [];
      
      // Check if we have private shares and authority IDs
      console.log(`Creating authority shares mapping with ${privateShares.length} shares and ${newAuthorityIds.length} authorities`);
      
      if (privateShares.length === 0) {
        throw new Error('No private key shares available. Please generate keys before creating the election.');
      }
      
      if (newAuthorityIds.length === 0) {
        throw new Error('No trusted authorities available. Please add at least one authority.');
      }
      
      // Make sure we have the same number of shares as authorities, or at least distribute evenly
      if (privateShares.length < newAuthorityIds.length) {
        console.warn(`Warning: More authorities (${newAuthorityIds.length}) than shares (${privateShares.length})`);
      } else if (privateShares.length > newAuthorityIds.length) {
        console.warn(`Warning: More shares (${privateShares.length}) than authorities (${newAuthorityIds.length})`);
      }
        // Create direct mapping between private shares and newly created authorities
      authorityShares = [];
      for (let i = 0; i < Math.min(privateShares.length, newAuthorityIds.length); i++) {
        const authorityId = newAuthorityIds[i];
        const shareValue = privateShares[i];
        
        // Make sure both authority ID and share value exist
        if (authorityId && shareValue) {
          console.log(`Mapping share ${i} to authority ID ${authorityId}`);
          authorityShares.push({
            authority_id: authorityId, 
            share_value: shareValue
          });
        } else {
          console.error(`Invalid mapping for share ${i}: authorityId=${authorityId}, shareValue=${!!shareValue}`);
        }
      }
      
      // If there are extra shares, distribute them to the existing authorities
      if (privateShares.length > newAuthorityIds.length) {
        for (let i = newAuthorityIds.length; i < privateShares.length; i++) {
          const authorityId = newAuthorityIds[i % newAuthorityIds.length];
          const shareValue = privateShares[i];
          
          if (authorityId && shareValue) {
            console.log(`Mapping extra share ${i} to authority ID ${authorityId}`);
            authorityShares.push({
              authority_id: authorityId, 
              share_value: shareValue
            });
          }
        }
      }
      
      console.log(`Successfully mapped ${authorityShares.length} shares to ${newAuthorityIds.length} authorities`);
      
      // Debug log to verify share values
      authorityShares.forEach((share, index) => {
        console.log(`Share ${index}: Authority ID ${share.authority_id}, share value length: ${share.share_value.length} chars`);
      });        // Store crypto configuration and shares in one atomic operation
      console.log('Storing crypto configuration and key shares...');      try {
        // Final validation of authority shares
        if (!authorityShares || authorityShares.length === 0) {
          console.error('No authority shares available to store');
          
          // Create authority shares directly from private shares and authority IDs
          if (privateShares.length > 0 && newAuthorityIds.length > 0) {
            console.log('Creating authority shares from existing private shares and authority IDs');
            
            // Filter out any invalid combinations
            authorityShares = privateShares
              .map((shareValue, index) => {
                // Use modulo to wrap around if more shares than authorities
                const authorityId = newAuthorityIds[index % newAuthorityIds.length];
                if (!shareValue || !authorityId) {
                  console.error(`Invalid share mapping at index ${index}`);
                  return null;
                }
                return {
                  authority_id: authorityId,
                  share_value: shareValue
                };
              })
              .filter(share => share !== null); // Remove invalid entries
          } else {
            throw new Error('No key shares available for trusted authorities');
          }
        }
        
        // Extra validation to ensure we have valid shares to proceed
        if (!authorityShares || authorityShares.length === 0) {
          throw new Error('Failed to create valid key share mappings for trusted authorities');
        }

        // Log what we're sending
        console.log(`Sending ${authorityShares.length} authority shares for election ${election.election_id}`);
        
        // Ensure private shares and authority IDs are still valid
        if (privateShares.length === 0) {
          console.error('Private shares are missing. Regenerating key shares...');
            // Regenerate key shares if they're somehow missing
          const keyGenResult = await handleGenerateKeyPair({
            electionId: election.election_id,
            nPersonnel: validPersonnel.length,
            threshold: Math.ceil(validPersonnel.length / 2) + 1,
            authorityIds: newAuthorityIds,
          });
          
          // Update the private shares and public key
          const regeneratedShares = keyGenResult.private_shares || [];
          setPrivateShares(regeneratedShares);
          setPublicKey(keyGenResult.public_key);
          console.log(`Regenerated ${regeneratedShares.length} private key shares`);
          
          // Recreate authority shares mapping
          authorityShares = regeneratedShares.map((shareValue: string, index: number) => {
            const authorityId = index < newAuthorityIds.length ? 
              newAuthorityIds[index] : 
              newAuthorityIds[newAuthorityIds.length - 1];
              
            console.log(`Remapping share ${index} to authority ID ${authorityId}`);
            return {
              authority_id: authorityId, 
              share_value: shareValue
            };
          });
        }
          // Prepare metadata with threshold information
        const metaData = JSON.stringify({
          crypto_type: 'paillier',
          n_personnel: newAuthorityIds.length,
          threshold: Math.ceil(newAuthorityIds.length / 2) + 1,
          creation_timestamp: new Date().toISOString()
        });
        
        console.log('Prepared metadata:', metaData);
        console.log('Public key length:', publicKey.length);
        console.log('Authority shares count:', authorityShares.length);
        
        // Make the API call to store crypto config with shares
        const requestBody = {
          election_id: election.election_id,
          public_key: publicKey,
          key_type: 'paillier',
          meta_data: metaData,
          authority_shares: authorityShares
        };
          console.log('Request body prepared, sending to backend...');
        console.log('Making API request to store crypto configuration and shares...');
        
        // Log the request body for debugging (excluding sensitive data)
        const debugRequestBody = {
          ...requestBody,
          public_key: requestBody.public_key ? `[${requestBody.public_key.length} chars]` : null,
          authority_shares: requestBody.authority_shares ? 
            `[${requestBody.authority_shares.length} shares]` : null
        };
        console.log('Debug request body:', debugRequestBody);
        
        try {
          const storeRes = await fetch(`${API_URL}/crypto_configs/store-with-shares`, {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${adminToken}`,
              'Content-Type': 'application/json' 
            },
            body: JSON.stringify(requestBody)
          });
          
          const responseText = await storeRes.text();
          let responseData;
          
          try {
            responseData = JSON.parse(responseText);
            console.log('Response data:', responseData);
          } catch (parseError) {
            console.error('Error parsing JSON response:', parseError);
            console.log('Raw response text:', responseText);
            throw new Error('Invalid response from server when storing crypto configuration');
          }
          
          if (!storeRes.ok) {
            console.error('Failed to store crypto configuration. Server returned:', storeRes.status, storeRes.statusText);
            console.error('Response data:', responseData);
            throw new Error(responseData.error || 'Failed to store crypto configuration');
          }
        } catch (apiError) {
          console.error('API error during crypto config storage:', apiError);
          
          // Attempt to diagnose the problem
          console.log('Verifying trusted authorities...');
          const authoritiesRes = await fetch(`${API_URL}/trusted_authorities`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
          });
          
          if (authoritiesRes.ok) {
            const authoritiesData = await authoritiesRes.json();
            console.log(`Found ${authoritiesData.length} trusted authorities in system`);
          }
          
          throw apiError; // Re-throw the original error after diagnostics
        }
          // Use responseData instead of Response (fixes incorrect usage)
          console.log('Successfully stored crypto configuration with ID:', responseData?.crypto_id);

        // Verify key shares were created
        if (responseData?.key_shares && responseData.key_shares.length > 0) {
          console.log('Key shares created successfully:', responseData.key_shares);

          // Verify with a separate API call if the key shares are in the database
          try {
            console.log(`Verifying key shares for election ID ${election.election_id}...`);
            const verifyRes = await fetch(`${API_URL}/crypto_configs/check-key-shares-status?election_id=${election.election_id}`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${adminToken}` }
            });

            const verifyText = await verifyRes.text();
            try {
              const verifyData = JSON.parse(verifyText);
              console.log('Key shares verification:', verifyData);

              if (verifyRes.ok) {
                if (verifyData.key_shares && verifyData.key_shares.length > 0) {
                  console.log(`✓ Verified ${verifyData.key_shares.length} key shares in database`);

                  // Display details about each key share for debugging
                  verifyData.key_shares.forEach((share: any, idx: number) => {
                    console.log(`Share #${idx}: Authority ID ${share.authority_id}, Share Length: ${share.share_value_length}`);
                  });
                } else {
                  console.warn('⚠️ No key shares found in database during verification');
                }
              } else {
                console.error(`✗ Verification API call failed: ${verifyRes.status} ${verifyRes.statusText}`);
              }
            } catch (parseError) {
              console.error('Error parsing verification response:', parseError);
              console.log('Raw verification response:', verifyText);
            }
          } catch (verifyError) {
            console.warn('Could not verify key shares status:', verifyError);
            // Continue anyway since the main operation succeeded
          }
        } else {
          console.warn('⚠️ No key shares were reported as created. This may indicate a problem.');
        }
      } catch (e) {
        console.error('Error storing crypto configuration:', e);
        throw e;
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
          <div className="flex items-center gap-4 mb-4">            <button
              type="button"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-800 hover:to-blue-950 disabled:opacity-60 text-white rounded transition-all duration-200 ease-in-out"
              onClick={async () => {
                setShowKeyWarning(true);
                setKeyModalOpen(false);
                setGenerating(true);
                try {
                  // Get temporary election ID from backend
                  const adminToken = localStorage.getItem('admin_token');
                  if (!adminToken) {
                    throw new Error('You are not logged in. Please log in as an administrator.');
                  }
                    // First, get a temporary election ID
                  const tempIdRes = await fetch(`${API_URL}/crypto_configs/temp-election-id`, {
                    method: 'GET',
                    headers: {
                      'Authorization': `Bearer ${adminToken}`,
                      'Content-Type': 'application/json'
                    }
                  });
                  const tempIdData = await tempIdRes.json();
                  if (!tempIdRes.ok) {
                    throw new Error(tempIdData.error || 'Failed to get temporary election ID');
                  }
                    // Create temporary trusted authorities for each personnel
                  const validPersonnel = personnel.filter(p => p.name.trim());
                  if (validPersonnel.length < 3) {
                    throw new Error('At least 3 trusted authorities with names are required.');
                  }
                  
                  console.log(`Creating ${validPersonnel.length} temporary trusted authorities`);
                  
                  // Create temporary trusted authorities
                  const authorityIds: number[] = [];
                  for (const person of validPersonnel) {
                    try {
                      const authorityRes = await fetch(`${API_URL}/trusted_authorities`, {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${adminToken}`,
                          'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                          authority_name: person.name,
                          contact_info: ''  // Optional contact info
                        })
                      });
                      
                      if (!authorityRes.ok) {
                        const error = await authorityRes.json();
                        console.error('Failed to create trusted authority:', error);
                        continue;
                      }
                      
                      const authority = await authorityRes.json();
                      authorityIds.push(authority.authority_id);
                    } catch (error) {
                      console.error('Error creating trusted authority:', error);
                    }                  }
                  
                  if (authorityIds.length === 0) {
                    throw new Error('Failed to create any trusted authorities. Please check your network connection and try again.');
                  }
                  
                  // Generate key pair
                  const result = await handleGenerateKeyPair({
                    electionId: tempIdData.temp_election_id,
                    nPersonnel: authorityIds.length,
                    threshold: Math.ceil(authorityIds.length / 2) + 1, // Set threshold to majority
                    authorityIds,
                    cryptoMethod: 'paillier',
                  });
                  setPublicKey(result.public_key);
                  setPrivateShares(result.private_shares || []);
                  // crypto_id may not exist on result, so check before using
                  if ((result as any).crypto_id) {
                    localStorage.setItem('temp_crypto_id', (result as any).crypto_id.toString());
                  }
                  
                  setKeyModalOpen(true);
                } catch (e) {
                  const errorMessage = e instanceof Error ? e.message : 'Key generation failed';
                  console.error('Key generation error:', e);
                  
                  // Check for authorization errors specifically
                  if (errorMessage.toLowerCase().includes('authorization') || 
                      errorMessage.toLowerCase().includes('token') || 
                      errorMessage.toLowerCase().includes('privileges') || 
                      errorMessage.toLowerCase().includes('login')) {
                    console.error('Auth error detected:', errorMessage);
                    
                    // Show auth error to user before redirecting
                    setModalContent({
                      title: 'Authentication Error',
                      message: 'Your session has expired. You will be redirected to the login page.',
                      type: 'error',
                    });
                    setShowModal(true);
                    
                    // Handle auth errors - redirect to login after a short delay
                    localStorage.removeItem('admin_token');
                    setTimeout(() => {
                      router.push('/auth/admin_login');
                    }, 2000);
                    return;
                  }
                  
                  // Show other errors
                  setModalContent({
                    title: 'Error Generating Keys',
                    message: errorMessage,
                    type: 'error',
                  });
                  setShowModal(true);
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={generating || !!publicKey}
            >
              {generating ? 'Generating...' : 'Generate Key Pair'}
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
          {/* Key Generation Warning Notification as Modal */}
          <Modal
            isOpen={showKeyWarning}
            onClose={() => setShowKeyWarning(false)}
            title="Key Generation Warning"
            size="md"
            footer={null}
          >            <div className="mb-4 text-yellow-700 bg-red-100 border border-red-300 rounded p-3 text-sm">
              <b>Warning:</b> The private key shares that will be displayed are critically sensitive security information. <br />
              <span className="font-medium">Download and store them securely before closing this dialog.</span>
            </div>
            <div className="mb-4 text-blue-700 bg-blue-100 border border-blue-300 rounded p-3 text-sm">
              <b>How this works:</b> When you continue, the system will:
              <ol className="list-decimal pl-5 mt-2 space-y-1">
                <li>Create temporary trusted authorities from your personnel list</li>
                <li>Generate key pairs using the Paillier threshold cryptosystem</li>
                <li>Allow you to download the private key shares to distribute to each authority</li>
              </ol>
              <p className="mt-2">These authorities and keys will be properly linked to your election when you submit the form.</p>
            </div>
            <div className="flex justify-end gap-2">              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  setShowKeyWarning(false);
                  setGenerating(true);
                  try {
                    // Use the personnel names directly instead of looking for existing authorities
                    const validPersonnel = personnel.filter(p => p.name.trim());                      if (validPersonnel.length < 3) {
                        throw new Error('At least 3 personnel with names are required');
                      }
                      
                      // First get a temporary election ID
                      const adminToken = localStorage.getItem('admin_token');
                      if (!adminToken) {
                        throw new Error('You are not logged in. Please log in as an administrator.');
                      }
                      
                      const tempIdRes = await fetch(`${API_URL}/crypto_configs/temp-election-id`, {
                        method: 'GET',
                        headers: {
                          'Authorization': `Bearer ${adminToken}`,
                          'Content-Type': 'application/json'
                        }
                      });
                      const tempIdData = await tempIdRes.json();
                      if (!tempIdRes.ok) {
                        throw new Error(tempIdData.error || 'Failed to get temporary election ID');
                      }
                      
                      // Create temporary trusted authorities
                      const authorityIds: number[] = [];
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
                          console.error('Failed to create trusted authority');
                          continue;
                        }
                        
                        const authority = await authorityRes.json();
                        authorityIds.push(authority.authority_id);
                      }
                      
                      if (authorityIds.length === 0) {
                        throw new Error('Failed to create any trusted authorities');
                      }
                        // Now generate the key pair
                      const data = await handleGenerateKeyPair({
                        electionId: tempIdData.temp_election_id,
                        nPersonnel: authorityIds.length,
                        threshold: Math.ceil(authorityIds.length / 2) + 1, // Set threshold to majority
                        authorityIds,
                        cryptoMethod: 'paillier',
                      });
                    
                      // Store information about which authority gets which key share
                      const keyShareMapping = validPersonnel.map((person, idx) => {
                        const authorityId = authorityIds[idx];
                        const keyShare = idx < data.private_shares.length ? data.private_shares[idx] : null;
                        return {
                          name: person.name,
                          authorityId,
                          keyShare
                        };
                      }).filter(item => item.keyShare !== null);
                      
                      // Store the mapping in local storage for later use
                      localStorage.setItem('key_share_mapping', JSON.stringify(keyShareMapping));
                      
                      // Use the response data directly
                      setPublicKey(data.public_key);
                      setPrivateShares(data.private_shares || []);
                      setKeyModalOpen(true);
                  } catch (e) {
                    setModalContent({ 
                      title: 'Error', 
                      message: e instanceof Error ? e.message : 'Key generation failed', 
                      type: 'error' 
                    });
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
          {/* Private Key Modal */}
          <Modal
            isOpen={keyModalOpen}
            onClose={() => { setKeyModalOpen(false); setPrivateShares([]); }}
            title="Private Key Shares"
            size="lg"
            footer={<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => { setKeyModalOpen(false); setPrivateShares([]); }}>Close</button>}
          >            <div className="mb-4 text-yellow-700 bg-yellow-100 border border-yellow-300 rounded p-3 text-sm">
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
                {privateShares.map((share, idx) => {
                  // Get the authority name if available from local storage
                  let authorityName = `Authority #${idx + 1}`;
                  try {
                    const mapping = JSON.parse(localStorage.getItem('key_share_mapping') || '[]');
                    if (mapping[idx] && mapping[idx].name) {
                      authorityName = mapping[idx].name;
                    }
                  } catch (e) {
                    console.error('Failed to parse key share mapping', e);
                  }
                  
                  return (
                    <div key={idx} className="border rounded p-3 bg-gray-50">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-medium text-blue-700">{authorityName}</div>
                        <button 
                          type="button" 
                          className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 flex items-center gap-1"
                          onClick={() => {
                            const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
                            const safeAuthorityName = sanitize(authorityName);
                            const prefix = electionName ? sanitize(electionName) + '_' : '';
                            const blobObj = new Blob([share], { type: 'text/plain' });
                            const url = URL.createObjectURL(blobObj);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${prefix}${safeAuthorityName}_private_share.txt`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(url), 100);
                          }}
                        >
                          <Download size={12} /> Download Share
                        </button>
                      </div>                      <input className="w-full border rounded px-3 py-2 text-sm font-mono bg-white" value={share} readOnly />
                    </div>
                  );
                })}
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
          <div className="space-y-4">            {candidates.map((cand, idx) => (
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
                  />                  {cand.photo && (
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
