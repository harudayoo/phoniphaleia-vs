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

interface Election {
  election_id: number;
  election_name: string;
  election_desc: string;
  date_start: string;
  date_end: string;
  election_status: string;
  organization?: {
    org_id: number;
    org_name: string;
  };
}

export default function UserDashboard() {
  const { user } = useUser();
  const [electionStats, setElectionStats] = useState<ElectionStats>({
    ongoing: 0,
    upcoming: 0,
    completed: 0
  });
  const [ongoingElections, setOngoingElections] = useState<Election[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOngoing, setLoadingOngoing] = useState(true);
  const [participatedCount, setParticipatedCount] = useState(0);
  const [participatedElectionIds, setParticipatedElectionIds] = useState<Set<number>>(new Set());

  // Function to calculate days remaining until an election ends
  const calculateDaysRemaining = (endDateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Handle different date formats (YYYY-MM-DD or ISO format)
    let endDate: Date;
    try {
      if (endDateStr.includes('T')) {
        // ISO format
        endDate = new Date(endDateStr);
      } else {
        // YYYY-MM-DD format
        const [year, month, day] = endDateStr.split('-').map(Number);
        endDate = new Date(year, month - 1, day);
      }
      
      endDate.setHours(23, 59, 59, 999);
      const diffTime = endDate.getTime() - today.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    } catch (error) {
      console.error("Error calculating days remaining:", error, endDateStr);
      return 0; // Default to 0 days if there's an error
    }
  };
  // Fetch all elections to calculate stats
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const fetchElections = async () => {
      setLoading(true);
      try {
        // Log the current date for debugging
        const currentDate = new Date();
        console.log("Current date for comparison:", currentDate.toISOString());
        
        const res = await fetch(`${API_URL}/elections`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('voter_token')}` }
        });

        if (!res.ok) {
          throw new Error('Failed to fetch elections');
        }

        const data: Election[] = await res.json();
        console.log("Fetched elections:", data);

        // Calculate stats
        let ongoing = 0, upcoming = 0, completed = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const ongoingElectionsList = [];

        for (const election of data) {          // Parse start date - handle different date formats carefully
          let startDate: Date;
          try {
            if (election.date_start.includes('T')) {
              startDate = new Date(election.date_start);
            } else {
              const [startYear, startMonth, startDay] = election.date_start.split('-').map(Number);
              startDate = new Date(startYear, startMonth - 1, startDay);
              startDate.setHours(0, 0, 0, 0); // Start of day
            }
          } catch (error) {
            console.error(`Error parsing start date for ${election.election_name}:`, error, election.date_start);
            startDate = new Date(0); // Fallback to epoch
          }

          // Parse end date - handle different date formats carefully
          let endDate: Date;
          try {
            if (election.date_end.includes('T')) {
              endDate = new Date(election.date_end);
            } else {
              const [endYear, endMonth, endDay] = election.date_end.split('-').map(Number);
              endDate = new Date(endYear, endMonth - 1, endDay);
            }
          } catch (error) {
            console.error(`Error parsing end date for ${election.election_name}:`, error, election.date_end);
            endDate = new Date(0); // Fallback to epoch
          }

          // Set end date to end of day for accurate comparison
          endDate.setHours(23, 59, 59, 999);          // Log detailed information about date parsing and status detection
          console.log(`Election ${election.election_name}:`, {
            id: election.election_id,
            status: election.election_status,
            rawStartDate: election.date_start,
            rawEndDate: election.date_end,
            parsedStartDate: startDate.toISOString(),
            parsedEndDate: endDate.toISOString(),
            today: today.toISOString(),
            isBeforeStart: today < startDate,
            isAfterEnd: today > endDate,
            isOngoing: startDate <= today && today <= endDate
          });          // Determine election status based on API status first, then dates as fallback
          // Priority: API status takes precedence over date calculation
          if (election.election_status === 'Finished' || election.election_status === 'Canceled') {
            // Election is finished/canceled - API status overrides date calculation
            console.log(`Election ${election.election_name} is COMPLETED (API status: ${election.election_status})`);
            completed++;
          } else if (election.election_status === 'Ongoing') {
            // Election is explicitly marked as ongoing in the API
            console.log(`Election ${election.election_name} is ONGOING (API status: ${election.election_status})`);
            ongoing++;
            ongoingElectionsList.push(election);
          } else if (election.election_status === 'Upcoming' || today < startDate) {
            // Election hasn't started yet
            console.log(`Election ${election.election_name} is UPCOMING (API status: ${election.election_status})`);
            upcoming++;
          } else if (today > endDate || election.election_status === 'Completed') {
            // Election has ended based on date or is marked as completed
            console.log(`Election ${election.election_name} is COMPLETED (API status: ${election.election_status} or date-based)`);
            completed++;
          } else {
            // For any unknown status, use date-based logic as fallback
            if (startDate <= today && today <= endDate) {
              console.log(`Election ${election.election_name} is ONGOING (date-based fallback, API status: ${election.election_status})`);
              ongoing++;
              ongoingElectionsList.push(election);
            } else {
              console.warn(`Could not determine status for election ${election.election_name}, defaulting to upcoming`);
              upcoming++;
            }
          }
        }

        console.log("Stats:", { ongoing, upcoming, completed });
        console.log("Ongoing elections:", ongoingElectionsList);

        setElectionStats({ ongoing, upcoming, completed });
        setOngoingElections(ongoingElectionsList);
      } catch (error) {
        console.error('Error fetching elections:', error);
        setElectionStats({ ongoing: 0, upcoming: 0, completed: 0 });
        setOngoingElections([]);
      } finally {
        setLoading(false);
        setLoadingOngoing(false);
      }
    };

    fetchElections();
  }, []);

  // Fetch participated elections count and ids for the user
  useEffect(() => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    const fetchParticipated = async () => {
      if (!user || !user.student_id) return;
      try {
        const res = await fetch(`${API_URL}/votes/by-voter/${user.student_id}`);
        if (!res.ok) throw new Error('Failed to fetch votes');
        const data = await res.json();
        // Count unique election_ids
        const uniqueElections = new Set<number>((data.votes || []).map((v: { election_id: number }) => v.election_id));
        setParticipatedCount(uniqueElections.size);
        setParticipatedElectionIds(uniqueElections);
      } catch {
        setParticipatedCount(0);
        setParticipatedElectionIds(new Set());
      }
    };
    fetchParticipated();
  }, [user]);

  return (
    <UserLayout>
      <h1 className="text-2xl font-bold mb-8 text-gray-900">Student Dashboard</h1>

      {/* Election Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Ongoing Elections</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-red-600">
              {loading ? '...' : electionStats.ongoing}
            </div>
            <div className="ml-4 text-sm text-gray-600">
              Active elections you can explore
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Upcoming Elections</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-blue-600">
              {loading ? '...' : electionStats.upcoming}
            </div>
            <div className="ml-4 text-sm text-gray-600">
              Elections scheduled in the coming days
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow p-6 border border-gray-200">
          <h2 className="text-lg font-semibold mb-2 text-gray-800">Participated Elections</h2>
          <div className="flex items-center">
            <div className="text-3xl font-bold text-green-600">
              {loading ? '...' : participatedCount}
            </div>
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
            <Link href="/user/votes">
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
          {loadingOngoing ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-gray-500">Loading elections...</div>
            </div>
          ) : (
            ongoingElections.filter(election => !participatedElectionIds.has(election.election_id)).length > 0 ? (
              <div className="space-y-4">
                {ongoingElections.filter(election => !participatedElectionIds.has(election.election_id)).map((election: Election) => {
                  const daysLeft = calculateDaysRemaining(election.date_end);
                  return (
                    <div key={election.election_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex justify-between">
                        <h3 className="font-medium text-gray-800">{election.election_name}</h3>
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                          Ends in {daysLeft} days
                        </span>
                      </div>
                      {election.organization && (
                        <div className="text-xs text-gray-500 mt-1">
                          {election.organization.org_name}
                        </div>
                      )}
                      <p className="text-sm text-gray-600 mt-1">{election.election_desc}</p>
                      <Link href={`/user/votes/access-check?election_id=${election.election_id}`}>
                        <button
                          className="mt-3 text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded flex items-center gap-1"
                        >
                          Cast Your Vote <ArrowRight size={14} />
                        </button>
                      </Link>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                <p>No ongoing elections at this time where you are illegible to vote.</p>
                <p className="text-sm mt-1">Check back soon for upcoming elections!</p>
              </div>
            )
          )}
        </div>
      </div>
    </UserLayout>
  );
}