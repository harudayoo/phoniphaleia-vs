'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaThLarge, FaList } from 'react-icons/fa';
import NothingIcon from '@/components/NothingIcon';

type Result = {
  result_id: number;
  election_name: string;
  organization?: { org_name: string };
  status: string;
  published_at: string;
  description?: string;
};

const statusOptions = ['ALL', 'Published', 'Pending', 'Archived'];

export default function AdminResultsPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');

  useEffect(() => {
    fetch('http://localhost:5000/api/results/')
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('API error:', text);
          throw new Error('Failed to fetch results');
        }
        return res.json();
      })
      .then(data => setResults(data))
      .catch(err => {
        console.error('Fetch error:', err);
        setResults([]);
      });
  }, []);

  const filtered = results
    .filter(r =>
      (status === 'ALL' || r.status === status) &&
      (r.election_name.toLowerCase().includes(search.toLowerCase()) ||
        (r.organization?.org_name ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (r.description ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.published_at).getTime() - new Date(b.published_at).getTime();
      if (sort === 'date_desc') return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
      if (sort === 'name_asc') return a.election_name.localeCompare(b.election_name);
      if (sort === 'name_desc') return b.election_name.localeCompare(a.election_name);
      return 0;
    });

  return (
    <AdminLayout>
      <div className="flex flex-col mb-8 gap-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900">Results</h1>
          <div className="flex gap-2 items-center px-0 py-0">
            <input
              type="text"
              placeholder="Search results..."
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
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
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
          <span className="text-lg font-semibold">No results found.</span>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(r => (
            <div key={r.result_id} className="border rounded-xl p-5 bg-white shadow flex flex-col gap-2">
              <span className="font-semibold">{r.organization?.org_name}</span>
              <span className="font-bold">{r.election_name}</span>
              <span className="text-sm text-gray-500">{new Date(r.published_at).toLocaleDateString()}</span>
              <span className="text-xs text-gray-600">{r.description}</span>
              <span className={`px-2 py-1 rounded text-xs border w-fit ${
                r.status === 'Published' ? 'border-blue-400 text-blue-600' :
                r.status === 'Pending' ? 'border-yellow-400 text-yellow-600' :
                r.status === 'Archived' ? 'border-gray-400 text-gray-600' :
                'border-gray-300 text-gray-500'
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(r => (
            <div key={r.result_id} className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="font-semibold">{r.organization?.org_name}</span>
                <div className="font-bold">{r.election_name}</div>
                <div className="text-sm text-gray-500">{new Date(r.published_at).toLocaleDateString()}</div>
                <div className="text-xs text-gray-600">{r.description}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs border ${
                r.status === 'Published' ? 'border-blue-400 text-blue-600' :
                r.status === 'Pending' ? 'border-yellow-400 text-yellow-600' :
                r.status === 'Archived' ? 'border-gray-400 text-gray-600' :
                'border-gray-300 text-gray-500'
              }`}>
                {r.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}