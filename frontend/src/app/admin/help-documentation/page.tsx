'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaThLarge, FaList } from 'react-icons/fa';
import NothingIcon from '@/components/NothingIcon';

type Documentation = {
  doc_id: number;
  title: string;
  category: string;
  status: string;
  published_at: string;
  description?: string;
};

const statusOptions = ['ALL', 'Published', 'Draft', 'Archived'];

export default function AdminHelpDocumentationPage() {
  const [docs, setDocs] = useState<Documentation[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');

  useEffect(() => {
    fetch('http://localhost:5000/api/help-documentation/')
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('API error:', text);
          throw new Error('Failed to fetch documentation');
        }
        return res.json();
      })
      .then(data => setDocs(data))
      .catch(err => {
        console.error('Fetch error:', err);
        setDocs([]);
      });
  }, []);

  const filtered = docs
    .filter(d =>
      (status === 'ALL' || d.status === status) &&
      (d.title.toLowerCase().includes(search.toLowerCase()) ||
        (d.category ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (d.description ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      if (sort === 'date_desc') return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      if (sort === 'name_asc') return a.title.localeCompare(b.title);
      if (sort === 'name_desc') return b.title.localeCompare(a.title);
      return 0;
    });

  return (
    <AdminLayout>
      <div className="flex flex-col mb-8 gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Help & Documentation</h1>
          <div className="flex gap-2 items-center px-0 py-0">
            <input
              type="text"
              placeholder="Search documentation..."
              className="border-1 border-[#800000] focus:border-[#a83232] rounded-full w-xs px-2 py-1 text-sm bg-white transition text-gray-900 placeholder-gray-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="border-1 border-[#800000] focus:border-[#a83232] rounded px-2 py-1 text-sm bg-white transition text-gray-900"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              {statusOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <select
              className="border-1 border-[#800000] focus:border-[#a83232] rounded px-2 py-1 text-sm bg-white transition text-gray-900"
              value={sort}
              onChange={e => setSort(e.target.value)}
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="name_asc">Title (A-Z)</option>
              <option value="name_desc">Title (Z-A)</option>
            </select>
            <button
              className={`p-1 rounded border-1 transition-all duration-200 ${
                view === 'grid'
                  ? 'bg-[#800000]/10 border-[#b51919] scale-110 shadow-md'
                  : 'border-[#800000] bg-white'
              }`}
              onClick={() => setView('grid')}
              aria-label="Grid view"
            >
              <FaThLarge className="text-[#800000]" />
            </button>
            <button
              className={`p-1 rounded border-1 transition-all duration-200 ${
                view === 'list'
                  ? 'bg-[#800000]/10 border-[#b51919] scale-110 shadow-md'
                  : 'border-[#800000] bg-white'
              }`}
              onClick={() => setView('list')}
              aria-label="List view"
            >
              <FaList className="text-[#800000]" />
            </button>
          </div>
        </div>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-gray-700">
          <NothingIcon className="mb-4" width={64} height={64} />
          <span className="text-lg font-semibold">No documentation found.</span>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(d => (
            <div key={d.doc_id} className="border rounded-xl p-5 bg-white shadow flex flex-col gap-2">
              <span className="font-semibold">{d.category}</span>
              <span className="font-bold">{d.title}</span>
              <span className="text-sm text-gray-500">{new Date(d.published_at).toLocaleDateString()}</span>
              <span className="text-xs text-gray-600">{d.description}</span>
              <span className={`px-2 py-1 rounded text-xs border w-fit ${
                d.status === 'Published' ? 'border-blue-400 text-blue-600' :
                d.status === 'Draft' ? 'border-yellow-400 text-yellow-600' :
                d.status === 'Archived' ? 'border-gray-400 text-gray-600' :
                'border-gray-300 text-gray-500'
              }`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(d => (
            <div key={d.doc_id} className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="font-semibold">{d.category}</span>
                <div className="font-bold">{d.title}</div>
                <div className="text-sm text-gray-500">{new Date(d.published_at).toLocaleDateString()}</div>
                <div className="text-xs text-gray-600">{d.description}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs border ${
                d.status === 'Published' ? 'border-blue-400 text-blue-600' :
                d.status === 'Draft' ? 'border-yellow-400 text-yellow-600' :
                d.status === 'Archived' ? 'border-gray-400 text-gray-600' :
                'border-gray-300 text-gray-500'
              }`}>
                {d.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}