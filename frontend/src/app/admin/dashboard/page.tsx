'use client';
import AdminLayout from '@/layouts/AdminLayout';

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <h1 className="text-2xl font-bold mb-8 text-gray-900">Admin Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Ongoing Elections Graph Placeholder */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center min-h-[200px] border border-gray-200">
          <span className="text-lg font-semibold mb-2 text-gray-800">Ongoing Elections</span>
          <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400">
            [Graph Placeholder]
          </div>
        </div>
        {/* Active Voters Graph Placeholder */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center min-h-[200px] border border-gray-200">
          <span className="text-lg font-semibold mb-2 text-gray-800">Active Voters</span>
          <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400">
            [Graph Placeholder]
          </div>
        </div>
        {/* Workload Traffic Graph Placeholder */}
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center justify-center min-h-[200px] border border-gray-200">
          <span className="text-lg font-semibold mb-2 text-gray-800">Workload Traffic</span>
          <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400">
            [Graph Placeholder]
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}