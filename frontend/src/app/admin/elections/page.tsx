'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { FaThLarge, FaList } from 'react-icons/fa';
import NothingIcon from '@/components/NothingIcon';

type Election = {
  election_id: number;
  election_name: string;
  election_desc: string;
  election_status: string;
  date_end: string;
  organization?: { org_name: string };
};

const statusOptions = ['ALL', 'Ongoing', 'Scheduled', 'Finished'];

export default function AdminElectionsPage() {
  const [elections, setElections] = useState<Election[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('date_desc');

  useEffect(() => {
    fetch('http://localhost:5000/api/elections')
      .then(async res => {
        if (!res.ok) {
          const text = await res.text();
          console.error('API error:', text);
          throw new Error('Failed to fetch elections');
        }
        return res.json();
      })
      .then(data => setElections(data))
      .catch(err => {
        console.error('Fetch error:', err);
        setElections([]); // Optionally clear elections on error
      });
  }, []);

  // Filtering
  const filtered = elections
    .filter(e =>
      (status === 'ALL' || e.election_status === status) &&
      (e.election_name.toLowerCase().includes(search.toLowerCase()) ||
        (e.organization?.org_name ?? '').toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => {
      if (sort === 'date_asc') return new Date(a.date_end).getTime() - new Date(b.date_end).getTime();
      if (sort === 'date_desc') return new Date(b.date_end).getTime() - new Date(a.date_end).getTime();
      if (sort === 'org_asc') return (a.organization?.org_name ?? '').localeCompare(b.organization?.org_name ?? '');
      if (sort === 'org_desc') return (b.organization?.org_name ?? '').localeCompare(a.organization?.org_name ?? '');
      if (sort === 'name_asc') return a.election_name.localeCompare(b.election_name);
      if (sort === 'name_desc') return b.election_name.localeCompare(a.election_name);
      return 0;
    });

  return (
    <AdminLayout>
    <div className="flex flex-col mb-8 gap-2">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">Elections</h1>
        <div className="flex gap-2 items-center px-0 py-0">
        <input
          type="text"
          placeholder="Search elections..."
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
          <option value="org_asc">Organization (A-Z)</option>
          <option value="org_desc">Organization (Z-A)</option>
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
      <div className="flex justify-end">
        <button
        className="w-fit bg-gradient-to-r from-red-700/95 to-red-800 px-4 py-2 text-white font-medium shadow-sm 
                  bg-[length:200%_100%] bg-right transition-[background-position] duration-300
                  hover:bg-left focus:outline-none focus:ring-2 focus:ring-red-800 disabled:opacity-75 rounded-full"
        // TODO: Add navigation or modal logic for scheduling a new election
        >
        Schedule a New Election
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-gray-700">
          <NothingIcon className="mb-4" width={64} height={64} />
          <span className="text-lg font-semibold">No elections found.</span>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filtered.map(e => (
            <div key={e.election_id} className="border rounded-xl p-5 bg-white shadow flex flex-col gap-2">
              <span className="font-semibold">{e.organization?.org_name}</span>
              <span className="font-bold">{e.election_name}</span>
              <span className="text-sm text-gray-500">{new Date(e.date_end).toLocaleDateString()}</span>
              <span className={`px-2 py-1 rounded text-xs border w-fit ${
                e.election_status === 'Ongoing' ? 'border-blue-400 text-blue-600' :
                e.election_status === 'Scheduled' ? 'border-yellow-400 text-yellow-600' :
                'border-gray-400 text-gray-600'
              }`}>
                {e.election_status}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map(e => (
            <div key={e.election_id} className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="font-semibold">{e.organization?.org_name}</span>
                <div className="font-bold">{e.election_name}</div>
                <div className="text-sm text-gray-500">{new Date(e.date_end).toLocaleDateString()}</div>
              </div>
              <span className={`px-2 py-1 rounded text-xs border ${
                e.election_status === 'Ongoing' ? 'border-blue-400 text-blue-600' :
                e.election_status === 'Scheduled' ? 'border-yellow-400 text-yellow-600' :
                'border-gray-400 text-gray-600'
              }`}>
                {e.election_status}
              </span>
            </div>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}