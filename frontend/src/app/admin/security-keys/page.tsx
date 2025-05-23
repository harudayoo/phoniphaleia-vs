'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaKey, FaDownload, FaEye, FaTrash, FaCopy } from 'react-icons/fa';
import { ShieldAlert, Lock, Award, Calendar, Copy } from 'lucide-react';
import Modal from '@/components/Modal';
import TrustedAuthoritiesModal from '@/components/admin/TrustedAuthoritiesModal';

// Import reusable components
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';

type SecurityKey = {
  key_id: number;
  key_name: string;
  key_type: string;
  key_status: string;
  created_at: string;
  description?: string;
  associated_election?: string;
  key_fingerprint: string;
  election_id?: number;
};

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Revoked', label: 'Revoked' },
  { value: 'Expired', label: 'Expired' }
];

const typeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'Paillier', label: 'Paillier' }
];

const sortOptions = [
  { value: 'date_desc', label: 'Date (Newest)' },
  { value: 'date_asc', label: 'Date (Oldest)' },
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'type', label: 'Key Type' }
];

export default function AdminSecurityKeysPage() {
  const [keys, setKeys] = useState<SecurityKey[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [keyType, setKeyType] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showAuthoritiesModal, setShowAuthoritiesModal] = useState(false);
  const [selectedElectionId, setSelectedElectionId] = useState<number | null>(null);

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/crypto_configs/security-keys`);
        const data = await res.json();
        // Patch: If backend does not provide key_name, description, or key_fingerprint, generate them from available fields
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const keys = (data.keys || []).map((k: any) => ({
          key_id: k.key_id ?? k.crypto_id ?? k.id ?? Math.random(),
          key_name: k.key_name ?? k.associated_election ?? k.election_name ?? `Key #${k.crypto_id ?? k.key_id ?? ''}`,
          key_type: k.key_type ?? 'Paillier',
          key_status: k.key_status ?? k.status ?? 'Active',
          created_at: k.created_at ?? k.date_created ?? new Date().toISOString(),
          description: k.description ?? k.election_desc ?? '',
          associated_election: k.associated_election ?? k.election_name ?? '',
          key_fingerprint: k.key_fingerprint ?? (typeof k.public_key === 'string' ? (k.public_key.length > 47 ? k.public_key.slice(0, 47) + '...' : k.public_key) : ''),
          election_id: k.election_id ?? null,
        }));
        setKeys(keys);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching security keys:", error);
        setLoading(false);
      }
    };
    fetchKeys();
  }, []);

  const filtered = keys
    .filter(k =>
      (status === 'ALL' || k.key_status === status) &&
      (keyType === 'ALL' || k.key_type === keyType) &&
      (k.key_name.toLowerCase().includes(search.toLowerCase()) ||
        (k.description ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (k.associated_election ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sort === 'date_desc') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === 'name_asc') return a.key_name.localeCompare(b.key_name);
      if (sort === 'name_desc') return b.key_name.localeCompare(a.key_name);
      if (sort === 'type') return a.key_type.localeCompare(b.key_type);
      return 0;
    });

  const handleCopyFingerprint = (id: number, fingerprint: string) => {
    navigator.clipboard.writeText(fingerprint);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadKey = async (key: SecurityKey) => {
    const blob = new Blob([key.key_fingerprint], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${key.key_name.replace(/\s+/g, '_')}_public_key.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleDeleteKey = async (key: SecurityKey) => {
    if (key.key_status !== 'Revoked' && key.key_status !== 'Expired') return;
    if (!window.confirm('Are you sure you want to delete this key? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/crypto_configs/${key.key_id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setKeys(keys.filter(k => k.key_id !== key.key_id));
      } else {
        alert('Failed to delete key.');
      }
      setLoading(false);
    } catch {
      alert('Error deleting key.');
      setLoading(false);
    }
  };

  const getKeyStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>;
      case 'revoked':
        return <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></div>;
      case 'expired':
        return <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>;
      default:
        return null;
    }
  };

  const renderGridItem = (key: SecurityKey) => (
    <div key={key.key_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <FaKey className={`mr-2 ${
              key.key_status?.toLowerCase() === 'active' ? 'text-green-600' : 
              key.key_status?.toLowerCase() === 'revoked' ? 'text-yellow-500' : 
              key.key_status?.toLowerCase() === 'expired' ? 'text-red-500' : ''
            }`} />
            <span className="text-sm font-medium text-gray-800">{key.key_type}</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs flex items-center ${
            key.key_status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 
            key.key_status?.toLowerCase() === 'revoked' ? 'bg-yellow-100 text-yellow-800' : 
            key.key_status?.toLowerCase() === 'expired' ? 'bg-red-100 text-red-800' : ''
          }`}>
            {getKeyStatusIcon(key.key_status)}
            {key.key_status}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{key.key_name}</h3>
        {key.description && (
          <p className="text-gray-600 text-sm mb-3">{key.description}</p>
        )}
        {key.associated_election && (
          <button
            className="bg-blue-50 rounded-lg p-2 mb-3 flex items-center hover:bg-blue-100 transition"
            onClick={() => {
              setSelectedElectionId(typeof key.election_id === 'number' ? key.election_id : null);
              setShowAuthoritiesModal(true);
            }}
            title="View trusted authorities"
          >
            <Award className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-700">{key.associated_election}</span>
          </button>
        )}
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
        </div>
        <div className="mt-4">
          <div className="text-xs font-medium text-gray-500 mb-1">Fingerprint</div>
          <div className="flex items-center justify-between bg-gray-50 rounded-md p-2 font-mono text-xs text-gray-800">
            <div className="truncate">{key.key_fingerprint}</div>
            <button 
              className="ml-2 text-gray-500 hover:text-blue-600"
              onClick={() => handleCopyFingerprint(key.key_id, key.key_fingerprint)}
              aria-label="Copy fingerprint"
            >
              {copiedId === key.key_id ? (
                <span className="text-green-600 text-xs">Copied!</span>
              ) : (
                <FaCopy size={14} />
              )}
            </button>
            <button
              className="ml-2 text-gray-500 hover:text-blue-600"
              onClick={() => handleDownloadKey(key)}
              aria-label="Download key"
            >
              <FaDownload size={14} />
            </button>
          </div>
        </div>
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded"
              onClick={() => {
                setSelectedElectionId(typeof key.election_id === 'number' ? key.election_id : null);
                setShowAuthoritiesModal(true);
              }}
            >
              <FaEye size={16} title="View details" />
            </button>
          </div>
          <button
            className={`p-2 ${key.key_status === 'Revoked' || key.key_status === 'Expired' ? 'text-red-600 hover:bg-red-50' : 'text-gray-300 cursor-not-allowed'}`}
            onClick={() => handleDeleteKey(key)}
            disabled={key.key_status !== 'Revoked' && key.key_status !== 'Expired'}
          >
            <FaTrash size={16} title="Delete key" />
          </button>
        </div>
      </div>
    </div>
  );

  const renderListTable = () => (
    <div className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Key Name
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Created
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Fingerprint
            </th>
            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filtered.map((key) => (
            <tr key={key.key_id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{key.key_name}</div>
                <div className="text-sm text-gray-500 truncate max-w-[200px]">{key.description}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{key.key_type}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">{new Date(key.created_at).toLocaleDateString()}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${
                  key.key_status?.toLowerCase() === 'active' ? 'bg-green-100 text-green-800' : 
                  key.key_status?.toLowerCase() === 'revoked' ? 'bg-yellow-100 text-yellow-800' : 
                  key.key_status?.toLowerCase() === 'expired' ? 'bg-red-100 text-red-800' : ''
                }`}>
                  {getKeyStatusIcon(key.key_status)}
                  {key.key_status}
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center">
                  <div className="text-sm font-mono text-gray-900 truncate max-w-[150px]">
                    {key.key_fingerprint}
                  </div>
                  <button 
                    className="ml-2 text-gray-400 hover:text-blue-600"
                    onClick={() => handleCopyFingerprint(key.key_id, key.key_fingerprint)}
                    aria-label="Copy fingerprint"
                  >
                    {copiedId === key.key_id ? (
                      <span className="text-green-600 text-xs">Copied!</span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    className="ml-2 text-gray-400 hover:text-blue-600"
                    onClick={() => handleDownloadKey(key)}
                    aria-label="Download key"
                  >
                    <FaDownload size={14} />
                  </button>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button className="p-1 text-blue-600 hover:text-blue-900"
                    onClick={() => {
                      setSelectedElectionId(typeof key.election_id === 'number' ? key.election_id : null);
                      setShowAuthoritiesModal(true);
                    }}
                  >
                    <FaEye size={16} title="View details" />
                  </button>
                  <button
                    className={`p-1 ${key.key_status === 'Revoked' || key.key_status === 'Expired' ? 'text-red-600 hover:text-red-900' : 'text-gray-300 cursor-not-allowed'}`}
                    onClick={() => handleDeleteKey(key)}
                    disabled={key.key_status !== 'Revoked' && key.key_status !== 'Expired'}
                  >
                    <FaTrash size={16} title="Delete key" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <AdminLayout>
      <SearchFilterBar 
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search keys by name, description or election..."
        view={view}
        onViewChange={setView}
      >
        <FilterSelect 
          value={status}
          onChange={setStatus}
          options={statusOptions}
          icon={ShieldAlert}
        />
        
        <FilterSelect 
          value={keyType}
          onChange={setKeyType}
          options={typeOptions}
          icon={Lock}
        />
        
        <FilterSelect 
          value={sort}
          onChange={setSort}
          options={sortOptions}
          icon={Calendar}
        />
      </SearchFilterBar>

      <DataView 
        title="Security Keys"
        description="Manage cryptographic keys for elections."
      >
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">No security keys found</h3>
            <p className="text-gray-500 mb-4">
              {search || status !== 'ALL' || keyType !== 'ALL' 
                ? 'Try adjusting your search or filters' 
                : 'Generate your first security key to get started'}
            </p>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(renderGridItem)}
          </div>
        ) : (
          renderListTable()
        )}
      </DataView>

      {/* Create Key Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Generate New Security Key"
        size="md"
        footer={
          <>
            <button 
              className="px-4 py-2 border border-gray-300 rounded-lg mr-3"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 bg-red-800 text-white rounded-lg"
              onClick={() => setShowCreateModal(false)}
            >
              Generate Key
            </button>
          </>
        }
      >
        <p className="text-gray-600 mb-4">
          Create a new security key for your election. Select an election to create one!.
        </p>
        {/* Modal content would go here */}
      </Modal>

      <TrustedAuthoritiesModal
        isOpen={showAuthoritiesModal}
        onClose={() => setShowAuthoritiesModal(false)}
        electionId={selectedElectionId}
      />
    </AdminLayout>
  );
}