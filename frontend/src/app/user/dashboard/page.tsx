'use client';
import UserLayout from '@/layouts/UserLayout';
import { useUser } from '@/contexts/UserContext';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface ElectionStats {
  ongoing: number;
  upcoming: number;
  completed: number;
}

export default function UserDashboard() {
  useUser();
  const [electionStats, setElectionStats] = useState<ElectionStats>({
    ongoing: 0,
    upcoming: 0,
    completed: 0
  });
  
  // Fetch election stats on component mount
  useEffect(() => {
    // This would be replaced with an actual API call
    // Example: fetch(`${API_URL}/user/election_stats`)
    
    // Mock data for now
    const mockStats = {
      ongoing: 2,
      upcoming: 1,
      completed: 5
    };
    
    setElectionStats(mockStats);
  }, []);

  return (
    <UserLayout>
      <h1 className="text-2xl font-bold mb-8 text-gray-900">Student Dashboard</h1>
      
      {/* Election Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Ongoing Elections</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-red-600">{electionStats.ongoing}</div>
            <div className="ml-4 text-sm text-gray-600">
              Elections you can currently participate in
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Upcoming Elections</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-blue-600">{electionStats.upcoming}</div>
            <div className="ml-4 text-sm text-gray-600">
              Elections scheduled in the coming days
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Past Elections</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-green-600">{electionStats.completed}</div>
            <div className="ml-4 text-sm text-gray-600">
              Elections you&apos;ve participated in
            </div>
          </div>
        </div>
      </div>
      
      {/* Quick Access and Current Elections Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Quick Access Buttons */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Quick Access</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/user/vote">
              <button className="w-full py-3 px-4 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg text-left transition duration-200">
                <span className="block font-medium">Cast Vote</span>
                <span className="text-xs text-red-600">View active ballots</span>
              </button>
            </Link>
            <Link href="/user/history">
              <button className="w-full py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-left transition duration-200">
                <span className="block font-medium">My History</span>
                <span className="text-xs text-blue-600">Past participation</span>
              </button>
            </Link>
            <Link href="/user/results">
              <button className="w-full py-3 px-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-lg text-left transition duration-200">
                <span className="block font-medium">Results</span>
                <span className="text-xs text-green-600">Finalized elections</span>
              </button>
            </Link>
            <Link href="/user/help">
              <button className="w-full py-3 px-4 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-left transition duration-200">
                <span className="block font-medium">Help Center</span>
                <span className="text-xs text-purple-600">Get assistance</span>
              </button>
            </Link>
          </div>
        </div>
        
        {/* Current Elections */}
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Current Elections</h2>
          
          {electionStats.ongoing > 0 ? (
            <div className="space-y-4">
              {/* Election items would be mapped from actual data */}
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-800">Student Council Election</h3>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Ends in 2 days</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Cast your vote for student representatives.</p>
                <Link href="/user/vote/student-council-2025">
                  <button className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1">
                    Vote Now <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <h3 className="font-medium text-gray-800">Department Chair Selection</h3>
                  <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">Ends in 5 days</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">Select your preferred department chair candidate.</p>
                <Link href="/user/vote/dept-chair-2025">
                  <button className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1">
                    Vote Now <ArrowRight size={14} />
                  </button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500">
              <p>No ongoing elections at this time.</p>
              <p className="text-sm mt-1">Check back soon for upcoming votes!</p>
            </div>
          )}
        </div>
      </div>
    </UserLayout>
  );
}