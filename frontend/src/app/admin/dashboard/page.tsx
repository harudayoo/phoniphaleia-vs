'use client';
import Sidebar from '@/components/Sidebar';
import {
  LayoutDashboard,
  CalendarCheck2,
  KeyRound,
  BarChart2,
  HelpCircle,
  Settings2,
} from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar>
        <ul className="flex flex-col gap-2 mt-2">
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <LayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <CalendarCheck2 className="w-5 h-5" />
              <span>Election Management</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <KeyRound className="w-5 h-5" />
              <span>Security and Keys</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <BarChart2 className="w-5 h-5" />
              <span>Results</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <HelpCircle className="w-5 h-5" />
              <span>Help and Documentation</span>
            </a>
          </li>
          <li>
            <a href="#" className="flex items-center gap-3 px-2 py-2 rounded-md text-gray-800 hover:bg-gray-200 font-medium">
              <Settings2 className="w-5 h-5" />
              <span>System Settings</span>
            </a>
          </li>
        </ul>
      </Sidebar>
      <main className="flex-1 ml-64 p-10">
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
      </main>
    </div>
  );
}