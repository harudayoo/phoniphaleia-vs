'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaPlus, FaEdit, FaTrash, FaEye } from 'react-icons/fa';
import { Filter, Calendar, BookOpen, FileText } from 'lucide-react';
import Link from 'next/link';

// Import reusable components
import PageHeader from '@/components/admin/PageHeader';
import SearchFilterBar from '@/components/admin/SearchFilterBar';
import FilterSelect from '@/components/admin/FilterSelect';
import DataView from '@/components/admin/DataView';

type Documentation = {
  doc_id: number;
  title: string;
  category: string;
  status: 'Published' | 'Draft' | 'Archived';
  published_at: string;
  description?: string;
  content?: string;
  author: string;
  last_updated?: string;
};

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

  useEffect(() => {
    // In a real app, fetch this data from an API
    const mockData: Documentation[] = [
      {
        doc_id: 1,
        title: "Getting Started with Phoniphaleia",
        category: "General",
        status: "Published",
        published_at: "2025-01-15",
        description: "Introduction to the voting system for new users",
        content: "Lorem ipsum dolor sit amet...",
        author: "Admin Team",
        last_updated: "2025-02-20"
      },
      {
        doc_id: 2,
        title: "How to Cast Your Vote",
        category: "Voters",
        status: "Published",
        published_at: "2025-01-20",
        description: "Step-by-step guide for voters on participating in elections",
        content: "Lorem ipsum dolor sit amet...",
        author: "Maria Rodriguez",
        last_updated: "2025-03-15"
      },
      {
        doc_id: 3,
        title: "Creating a New Election (Draft)",
        category: "Elections",
        status: "Draft",
        published_at: "2025-02-10",
        description: "Instructions for admins on setting up new elections",
        content: "Lorem ipsum dolor sit amet...",
        author: "John Smith"
      },
      {
        doc_id: 4,
        title: "Understanding Election Results",
        category: "Results",
        status: "Published",
        published_at: "2025-02-28",
        description: "How to interpret and export election results",
        content: "Lorem ipsum dolor sit amet...",
        author: "Sarah Johnson",
        last_updated: "2025-02-28"
      },
      {
        doc_id: 5,
        title: "Old Voter Registration Process",
        category: "Voters",
        status: "Archived",
        published_at: "2024-10-05",
        description: "Previous system for voter registration (deprecated)",
        content: "Lorem ipsum dolor sit amet...",
        author: "Legacy Admin",
        last_updated: "2024-12-31"
      },
      {
        doc_id: 6,
        title: "Security Best Practices",
        category: "Security",
        status: "Published",
        published_at: "2025-03-01",
        description: "Guidelines for maintaining system security",
        content: "Lorem ipsum dolor sit amet...",
        author: "Security Team",
        last_updated: "2025-04-10"
      },
      {
        doc_id: 7,
        title: "Frequently Asked Questions",
        category: "FAQ",
        status: "Published",
        published_at: "2025-01-10",
        description: "Common questions from users and voters",
        content: "Lorem ipsum dolor sit amet...",
        author: "Support Team",
        last_updated: "2025-05-01"
      },
      {
        doc_id: 8,
        title: "Troubleshooting Login Issues",
        category: "Technical",
        status: "Draft",
        published_at: "2025-04-15",
        description: "How to resolve common authentication problems",
        content: "Lorem ipsum dolor sit amet...",
        author: "Tech Support"
      }
    ];

    // Simulate API delay
    setTimeout(() => {
      setDocs(mockData);
      setLoading(false);
    }, 800);
  }, []);

  const filtered = docs
    .filter(d =>
      (status === 'ALL' || d.status === status) &&
      (category === 'ALL' || d.category === category) &&
      (d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.description?.toLowerCase().includes(search.toLowerCase()) ||
        d.author.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      if (sort === 'date_desc') return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      if (sort === 'title_asc') return a.title.localeCompare(b.title);
      if (sort === 'title_desc') return b.title.localeCompare(a.title);
      if (sort === 'category') return a.category.localeCompare(b.category);
      return 0;
    });

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
    }
  };

  // Create button for header
  const createButton = (
    <Link href="/admin/help-documentation/create">
      <button className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
        <FaPlus size={14} /> Create Document
      </button>
    </Link>
  );

  // Create empty state action
  const emptyStateAction = (
    <Link href="/admin/help-documentation/create">
      <button className="bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
        <FaPlus size={14} />
        <span>Create Document</span>
      </button>
    </Link>
  );

  const renderGridItem = (doc: Documentation) => (
    <div className="border rounded-xl bg-white shadow overflow-hidden flex flex-col">
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <span className="text-sm font-medium text-blue-600">{doc.category}</span>
          {getStatusBadge(doc.status)}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{doc.title}</h3>
        <p className="text-sm text-gray-500 mb-4 line-clamp-2">{doc.description}</p>
        
        <div className="flex items-center text-xs text-gray-500 mt-4">
          <Calendar className="h-3 w-3 mr-1" />
          <span>
            {new Date(doc.published_at).toLocaleDateString()}
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
          <button className="p-2 text-red-600 hover:bg-red-50 rounded">
            <FaTrash size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderListItem = (doc: Documentation) => (
    <div className="border rounded-lg bg-white shadow p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-blue-600">{doc.category}</span>
        {getStatusBadge(doc.status)}
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{doc.title}</h3>
      <p className="text-sm text-gray-500 mb-4">{doc.description}</p>
      <div className="flex items-center text-xs text-gray-500">
        <Calendar className="h-3 w-3 mr-1" />
        <span>
          {new Date(doc.published_at).toLocaleDateString()}
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
        <button className="p-2 text-red-600 hover:bg-red-50 rounded">
          <FaTrash size={16} />
        </button>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <PageHeader 
        title="Help & Documentation" 
        action={createButton}
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
      </SearchFilterBar>

      <DataView 
        data={filtered}
        isLoading={loading}
        emptyTitle="No documentation found"
        emptyDescription={
          search || status !== 'ALL' || category !== 'ALL'
            ? 'Try adjusting your search or filters' 
            : 'Get started by creating your first document'
        }
        emptyAction={emptyStateAction}
        view={view}
        renderGridItem={renderGridItem}
        renderListItem={renderListItem}
      />
    </AdminLayout>
  );
}