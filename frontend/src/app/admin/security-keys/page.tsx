'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaKey, FaDownload, FaEye, FaTrash, FaCopy } from 'react-icons/fa';
import { ShieldAlert, Lock, Award, Calendar, Copy } from 'lucide-react';
import Link from 'next/link';
import Modal from '@/components/Modal';

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
  expires_at?: string;
  last_used?: string;
  description?: string;
  associated_election?: string;
  key_fingerprint: string;
};

const statusOptions = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'Active', label: 'Active' },
  { value: 'Revoked', label: 'Revoked' },
  { value: 'Expired', label: 'Expired' }
];

const typeOptions = [
  { value: 'ALL', label: 'All Types' },
  { value: 'RSA', label: 'RSA' },
  { value: 'ED25519', label: 'ED25519' },
  { value: 'ECDSA', label: 'ECDSA' }
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

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        setLoading(true);
        
        const mockData: SecurityKey[] = [
          {
            key_id: 1,
            key_name: "Student Council Election Key",
            key_type: "RSA",
            key_status: "Active",
            created_at: "2025-03-15T10:30:00",
            expires_at: "2025-06-15T10:30:00",
            last_used: "2025-04-02T14:22:15",
            description: "Primary encryption key for Student Council Election 2025",
            associated_election: "Student Council Election 2025",
            key_fingerprint: "8F:23:84:A6:7E:DA:0F:88:21:6D:B3:C5:7E:F4:23:86"
          },
          {
            key_id: 2,
            key_name: "CS Department Chair Selection Key",
            key_type: "ED25519",
            key_status: "Active",
            created_at: "2025-04-01T09:15:00",
            expires_at: "2025-07-01T09:15:00",
            description: "Secure key for CS Department Chair election process",
            associated_election: "CS Department Chair Selection",
            key_fingerprint: "4A:B2:15:C3:D1:E0:F2:34:56:78:9A:BC:DE:F0:12:34"
          },
          {
            key_id: 3,
            key_name: "Faculty Senate Election Key",
            key_type: "ECDSA",
            key_status: "Revoked",
            created_at: "2025-02-20T15:45:00",
            expires_at: "2025-05-20T15:45:00",
            last_used: "2025-02-25T11:30:42",
            description: "Revoked due to security policy update",
            associated_election: "Faculty Senate Election 2025",
            key_fingerprint: "D7:E8:F9:0A:B1:C2:D3:E4:F5:06:17:28:39:4A:5B:6C"
          },
          {
            key_id: 4,
            key_name: "Library Committee Backup Key",
            key_type: "RSA",
            key_status: "Expired",
            created_at: "2024-11-10T08:00:00",
            expires_at: "2025-02-10T08:00:00",
            last_used: "2025-01-15T16:45:22",
            description: "Backup encryption key for Library Committee election",
            associated_election: "Library Committee Representatives",
            key_fingerprint: "7C:8D:9E:AF:B0:C1:D2:E3:F4:05:16:27:38:49:5A:6B"
          }
        ];
        
        setTimeout(() => {
          setKeys(mockData);
          setLoading(false);
        }, 800);
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

  const getKeyStatusIcon = (status: string) => {
    switch (status) {
      case 'Active':
        return <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>;
      case 'Revoked':
        return <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>;
      case 'Expired':
        return <div className="h-2 w-2 bg-gray-500 rounded-full mr-2"></div>;
      default:
        return null;
    }
  };

  // Create empty state action
  const emptyStateAction = (
    <button 
      className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
      onClick={() => setShowCreateModal(true)}
    >
      <FaKey size={14} />
      <span>Generate New Key</span>
    </button>
  );

  const renderGridItem = (key: SecurityKey) => (
    <div key={key.key_id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center">
            <FaKey className={`mr-2 ${
              key.key_status === 'Active' ? 'text-green-600' : 
              key.key_status === 'Revoked' ? 'text-red-600' : 'text-gray-500'
            }`} />
            <span className="text-sm font-medium text-gray-800">{key.key_type}</span>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs flex items-center ${
            key.key_status === 'Active' ? 'bg-green-100 text-green-800' : 
            key.key_status === 'Revoked' ? 'bg-red-100 text-red-800' : 
            'bg-gray-100 text-gray-800'
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
          <div className="bg-blue-50 rounded-lg p-2 mb-3 flex items-center">
            <Award className="h-4 w-4 text-blue-600 mr-2" />
            <span className="text-sm text-blue-700">{key.associated_election}</span>
          </div>
        )}
        
        <div className="flex items-center mb-3 text-sm text-gray-600">
          <Calendar className="h-4 w-4 mr-2" />
          <span>Created: {new Date(key.created_at).toLocaleDateString()}</span>
        </div>
        
        {key.expires_at && (
          <div className="flex items-center mb-3 text-sm text-gray-600">
            <Calendar className="h-4 w-4 mr-2" />
            <span>Expires: {new Date(key.expires_at).toLocaleDateString()}</span>
          </div>
        )}
        
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
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
              <FaDownload size={16} title="Export key" />
            </button>
            <Link href={`/admin/security-keys/${key.key_id}`}>
              <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                <FaEye size={16} title="View details" />
              </button>
            </Link>
          </div>
          <button className="p-2 text-red-600 hover:bg-red-50 rounded">
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
              Expires
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
                <div className="text-sm text-gray-900">
                  {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className={`px-2 py-1 rounded-full text-xs inline-flex items-center ${
                  key.key_status === 'Active' ? 'bg-green-100 text-green-800' : 
                  key.key_status === 'Revoked' ? 'bg-red-100 text-red-800' : 
                  'bg-gray-100 text-gray-800'
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
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div className="flex justify-end space-x-2">
                  <button className="p-1 text-blue-600 hover:text-blue-900">
                    <FaDownload size={16} title="Export key" />
                  </button>
                  <Link href={`/admin/security-keys/${key.key_id}`}>
                    <button className="p-1 text-blue-600 hover:text-blue-900">
                      <FaEye size={16} title="View details" />
                    </button>
                  </Link>
                  <button className="p-1 text-red-600 hover:text-red-900">
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
        addButtonText="Generate New Key"
        onAdd={() => setShowCreateModal(true)}
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
            {emptyStateAction}
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
          Create a new security key for your election. You can choose the type of key and set permissions.
        </p>
        {/* Modal content would go here */}
      </Modal>
    </AdminLayout>
  );
}