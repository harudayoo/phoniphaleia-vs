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
};

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
  const updateCandidate = (idx: number, field: keyof Candidate, value: string | number) => {
    setCandidates(c => c.map((cand, i) => i === idx ? { ...cand, [field]: value } : cand));
  };

  // Remove candidate
  const removeCandidate = (idx: number) => {
    setCandidates(c => c.length > 3 ? c.filter((_, i) => i !== idx) : c);
  };

  // Save all data
  const handleFinish = async () => {
    try {
      // 1. Create election (with candidates)
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
          candidates: candidates.filter(c => c.fullname && c.position_id)
        })
      });
      if (!electionRes.ok) throw new Error('Failed to create election');
      const election = await electionRes.json();
      // 2. Save public key
      const cryptoRes = await fetch(`${API_URL}/crypto_configs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          election_id: election.election_id,
          public_key: publicKey
        })
      });
      if (!cryptoRes.ok) throw new Error('Failed to save public key');
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
              onClick={() => {
                setShowKeyWarning(true);
                setKeyModalOpen(false);
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
          >
            <div className="mb-4 text-yellow-700 bg-red-100 border border-red-300 rounded p-3 text-sm">
              <b>Warning:</b> The private key shares that will be displayed are critically sensitive security information. <br />
              <span className="font-medium">Download and store them securely before closing this dialog.</span>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={async () => {
                  setShowKeyWarning(false);
                  setGenerating(true);
                  try {
                    const res = await fetch(`${API_URL}/crypto_configs/generate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ n_personnel: personnel.length })
                    });
                    if (!res.ok) throw new Error('Failed to generate keys');
                    const data = await res.json();
                    setPublicKey(data.public_key);
                    setPrivateShares(data.private_shares);
                    setKeyModalOpen(true);
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
          {/* Private Key Modal */}
          <Modal
            isOpen={keyModalOpen}
            onClose={() => { setKeyModalOpen(false); setPrivateShares([]); }}
            title="Private Key Shares"
            size="lg"
            footer={<button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => { setKeyModalOpen(false); setPrivateShares([]); }}>Close</button>}
          >
            <div className="mb-4 text-yellow-700 bg-yellow-100 border border-yellow-300 rounded p-3 text-sm">
              <b>Note:</b> When you close this dialog, you will <b className='text-red-600 text-md text-shadow-md'>NOT</b> be able to view the private key shares again. You must generate a new key pair for this election session if you lose them.
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-700 font-medium mb-1">Private Key Shares</label>
              <div className="space-y-2">
                {privateShares.map((share, idx) => (
                  <div key={idx} className="flex items-center text-gray-700 gap-2">
                    <input className="w-full border rounded px-3 py-2" value={share} readOnly />
                    <button type="button" className="p-2 bg-gray-100 rounded hover:bg-gray-200" onClick={() => {
                      const sanitize = (str: string) => str.replace(/[^a-zA-Z0-9_-]/g, '_');
                      const prefix = electionName ? sanitize(electionName) + '_' : '';
                      const blobObj = new Blob([share], { type: 'text/plain' });
                      const url = URL.createObjectURL(blobObj);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${prefix}private_share_${idx + 1}.txt`;
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 100);
                    }}>
                      <Download size={16} />
                    </button>
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
