'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { Filter, Calendar, BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'react-hot-toast';

// Import reusable components
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';

// Import documentation service
import documentationService, { Documentation } from '@/services/documentationService';

const statusOptions = [
  { value: 'ALL', label: 'All Status' },
  { value: 'Published', label: 'Published' },
  { value: 'Draft', label: 'Draft' },
  { value: 'Archived', label: 'Archived' }
];

const categoryOptions = [
  { value: 'ALL', label: 'All Categories' },
  { value: 'General', label: 'General' },
  { value: 'Voters', label: 'Voters' },
  { value: 'Elections', label: 'Elections' },
  { value: 'Results', label: 'Results' },
  { value: 'Security', label: 'Security' },
  { value: 'Technical', label: 'Technical' },
  { value: 'FAQ', label: 'FAQ' }
];

const sortOptions = [
  { value: 'date_desc', label: 'Newest First' },
  { value: 'date_asc', label: 'Oldest First' },
  { value: 'title_asc', label: 'Title (A-Z)' },
  { value: 'title_desc', label: 'Title (Z-A)' },
  { value: 'category', label: 'By Category' }
];

export default function AdminHelpDocumentationPage() {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');
  const [loading, setLoading] = useState(true);

  // Function to load documentation
  const loadDocumentation = async () => {
    setLoading(true);
    try {
      const data = await documentationService.getAllDocumentation(status, category, search, sort);
      setDocs(data);
    } catch (error) {
      console.error('Error loading documentation:', error);
      toast.error('Failed to load documentation');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle document deletion
  const handleDelete = async (docId: number) => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }
    
    try {
      const success = await documentationService.deleteDocumentation(docId);
      if (success) {
        toast.success('Document deleted successfully');
        // Refresh the documentation list
        loadDocumentation();
      } else {
        toast.error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  // Reload documentation when filters change
  useEffect(() => {
    loadDocumentation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, category, search, sort]);

  // No need for client-side filtering since we're using the API for filtering

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Published':
        return <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">Published</span>;
      case 'Draft':
        return <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full">Draft</span>;
      case 'Archived':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">Archived</span>;
      default:
        return null;
    }  };
  // Message for empty state
  const emptyStateMessage = (
    <p className="text-gray-600">
      Use the &quot;Create Document&quot; button above to add your first document.
    </p>
  );
  const renderGridItem = (doc: Documentation) => (
    <div key={doc.doc_id} className="border rounded-xl bg-white shadow overflow-hidden flex flex-col">
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-blue-600">{doc.category}</span>
          {getStatusBadge(doc.status)}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{doc.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{doc.description}</p>        <div className="flex items-center text-xs text-gray-500 mt-4">
          <Calendar className="h-3 w-3 mr-1" />
          <span>
            {doc.published_at ? new Date(doc.published_at).toLocaleDateString() : 'Not published'}
            {doc.last_updated && doc.last_updated !== doc.published_at && 
              ` (Updated: ${new Date(doc.last_updated).toLocaleDateString()})`}
          </span>
        </div>
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <FileText className="h-3 w-3 mr-1" />
          <span>By {doc.author}</span>
        </div>
      </div>
      
      <div className="px-6 pb-6 mt-2 flex justify-end">
        <div className="flex gap-2">
          <Link href={`/admin/help-documentation/${doc.doc_id}`}>
            <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
              <FaEye size={16} />
            </button>
          </Link>
          <Link href={`/admin/help-documentation/${doc.doc_id}/edit`}>
            <button className="p-2 text-amber-600 hover:bg-amber-50 rounded" disabled={doc.status === 'Archived'}>
              <FaEdit size={16} />
            </button>
          </Link>
          <button 
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            onClick={() => handleDelete(doc.doc_id)}
          >
            <FaTrash size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderListItem = (doc: Documentation) => (
    <div key={doc.doc_id} className="border rounded-lg bg-white shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-600">{doc.category}</span>
        {getStatusBadge(doc.status)}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{doc.title}</h3>
      <p className="text-sm text-gray-500 mb-4">{doc.description}</p>      <div className="flex items-center text-xs text-gray-500">
        <Calendar className="h-3 w-3 mr-1" />
        <span>
          {doc.published_at ? new Date(doc.published_at).toLocaleDateString() : 'Not published'}
          {doc.last_updated && doc.last_updated !== doc.published_at && 
            ` (Updated: ${new Date(doc.last_updated).toLocaleDateString()})`}
        </span>
      </div>
      <div className="flex items-center text-xs text-gray-500 mt-1">
        <FileText className="h-3 w-3 mr-1" />
        <span>By {doc.author}</span>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Link href={`/admin/help-documentation/${doc.doc_id}`}>
          <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
            <FaEye size={16} />
          </button>
        </Link>
        <Link href={`/admin/help-documentation/${doc.doc_id}/edit`}>
          <button className="p-2 text-amber-600 hover:bg-amber-50 rounded" disabled={doc.status === 'Archived'}>
            <FaEdit size={16} />
          </button>
        </Link>
        <button 
          className="p-2 text-red-600 hover:bg-red-50 rounded"
          onClick={() => handleDelete(doc.doc_id)}
        >
          <FaTrash size={16} />
        </button>
      </div>
    </div>
  );
  return (
    <AdminLayout>
      <PageHeader 
        title="Help & Documentation" 
      />

      <SearchFilterBar 
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search documentation..."
        view={view}
        onViewChange={setView}
      >
        <FilterSelect 
          value={status}
          onChange={setStatus}
          options={statusOptions}
          icon={Filter}
        />
        
        <FilterSelect 
          value={category}
          onChange={setCategory}
          options={categoryOptions}
          icon={BookOpen}
        />
        
        <FilterSelect 
          value={sort}
          onChange={setSort}
          options={sortOptions}
          icon={Calendar}
        />
      </SearchFilterBar>      <DataView
        title="Help & Documentation"
        description="Browse, search, and manage help documents for the system."
        addButtonText="Create Document"
        onAdd={() => { window.location.href = '/admin/help-documentation/create'; }}
      >
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : docs.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2 text-gray-700">No documentation found</h3>
            <p className="text-gray-500 mb-4">              {search || status !== 'ALL' || category !== 'ALL'
                ? 'Try adjusting your search or filters'
                : 'Get started by creating your first document'}
            </p>
            {emptyStateMessage}
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {docs.map(renderGridItem)}
          </div>
        ) : (
          <div className="space-y-4">
            {docs.map(renderListItem)}
          </div>
        )}
      </DataView>
    </AdminLayout>
  );
}