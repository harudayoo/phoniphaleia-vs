'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { AlertTriangle, ArrowRight, Calendar, Users, Award, Vote, ChevronDown, ChevronUp, X } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';
import adminService, { 
  AdminStats, 
  ElectionActivity, 
  VoterEngagement, 
  SystemLoad, 
  RecentActivity, 
  SystemAlert 
} from '@/services/adminService';

interface StatCard {
  title: string;
  value: number;
  description: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [electionActivity, setElectionActivity] = useState<ElectionActivity[]>([]);
  const [voterEngagement, setVoterEngagement] = useState<VoterEngagement[]>([]);
  const [systemLoad, setSystemLoad] = useState<SystemLoad[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAlertsModal, setShowAlertsModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        // Fetch all data in a single API call
        const dashboardData = await adminService.fetchDashboardData();
        setStats(transformStats(dashboardData.stats));
        setElectionActivity(dashboardData.electionActivity);
        setVoterEngagement(dashboardData.voterEngagement);
        setSystemLoad(dashboardData.systemLoad);
        setRecentActivity(dashboardData.recentActivity);
        setAlerts(dashboardData.systemAlerts);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        // Set fallback data if API calls fail
        setStats([
          {
            title: 'Active Elections',
            value: 0,
            description: 'Currently ongoing elections',
            icon: <Calendar className="h-6 w-6 text-blue-600" />
          },
          {
            title: 'Registered Voters',
            value: 0,
            description: 'Total registered voters',
            icon: <Users className="h-6 w-6 text-purple-600" />
          },
          {
            title: 'Completed Elections',
            value: 0,
            description: 'Elections with published results',
            icon: <Award className="h-6 w-6 text-green-600" />
          },
          {
            title: 'Average Participation',
            value: 0,
            description: 'Average voter turnout percentage',
            icon: <Vote className="h-6 w-6 text-orange-500" />
          },
        ]);
        setElectionActivity([]);
        setVoterEngagement([]);
        setSystemLoad([]);
        setRecentActivity([]);
        setAlerts([]);
      } finally {
        setLoading(false);
      }
    };

    // Transform admin stats into the format expected by the UI
    const transformStats = (adminStats: AdminStats): StatCard[] => {
      return [
        {
          title: 'Active Elections',
          value: adminStats.activeElections,
          description: 'Currently ongoing elections',
          icon: <Calendar className="h-6 w-6 text-blue-600" />,
          trend: {
            value: 16.5, // In a real app, calculate from historical data
            isPositive: true
          }
        },
        {
          title: 'Registered Voters',
          value: adminStats.registeredVoters,
          description: 'Total registered voters',
          icon: <Users className="h-6 w-6 text-purple-600" />,
          trend: {
            value: 3.2, // In a real app, calculate from historical data
            isPositive: true
          }
        },
        {
          title: 'Completed Elections',
          value: adminStats.completedElections,
          description: 'Elections with published results',
          icon: <Award className="h-6 w-6 text-green-600" />,
          trend: {
            value: 9.1, // In a real app, calculate from historical data
            isPositive: true
          }
        },
        {
          title: 'Average Participation',
          value: adminStats.averageParticipation,
          description: 'Average voter turnout percentage',
          icon: <Vote className="h-6 w-6 text-orange-500" />,
          trend: {
            value: 2.8, // In a real app, calculate from historical data
            isPositive: false
          }
        },
      ];
    };

    fetchDashboardData();
  }, []);

  const renderAlertIcon = (level: string) => {
    const baseClasses = "h-5 w-5";
    
    switch(level) {
      case 'critical':
        return <AlertTriangle className={`${baseClasses} text-red-600`} />;
      case 'warning':
        return <AlertTriangle className={`${baseClasses} text-amber-500`} />;
      case 'info':
        return <AlertTriangle className={`${baseClasses} text-blue-500`} />;
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <PageHeader 
        title="Admin Dashboard" 
      />
      
      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow border border-gray-200 p-6 animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="h-6 w-24 bg-gray-200 rounded"></div>
                <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-8 w-16 bg-gray-300 rounded mb-2"></div>
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-xl shadow border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-sm font-medium text-gray-600">{stat.title}</h2>
                {stat.icon}
              </div>
              <p className="text-3xl font-bold text-gray-800 mb-1">{stat.value}{stat.title === 'Average Participation' ? '%' : ''}</p>
              <div className="flex items-center">
                <span className="text-sm text-gray-500">{stat.description}</span>
                {stat.trend && (
                  <div className={`ml-2 flex items-center text-xs ${stat.trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                    {stat.trend.isPositive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    <span>{stat.trend.value}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}      {/* Graphs and Data Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Election Activity Chart */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-800">Election Activity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={electionActivity}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
                />
                <Legend />
                <Bar dataKey="ongoing" name="Ongoing" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="scheduled" name="Scheduled" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Voter Activity Chart */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-800">Voter Engagement</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={voterEngagement}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  cursor={{ stroke: '#d1d5db' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="active" 
                  name="Active Voters"
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* System Load Chart and Alerts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* System Load Chart */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-medium mb-4 text-gray-800">System Load (24h)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={systemLoad}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => [`${value} users`, 'Traffic']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  cursor={{ stroke: '#d1d5db' }}
                />
                <Line
                  type="monotone"
                  dataKey="traffic"
                  name="Active Users"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ stroke: '#ef4444', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>        {/* System Alerts */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800">System Alerts</h2>
            <button 
              onClick={() => setShowAlertsModal(true)}
              className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </button>
          </div>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="h-5 w-5 bg-gray-200 rounded-full mt-0.5"></div>
                  <div className="flex-1">
                    <div className="h-5 bg-gray-300 rounded mb-1 w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <div key={alert.id} className="flex gap-3">
                    {renderAlertIcon(alert.level)}
                    <div>
                      <p className="text-gray-800">{alert.message}</p>
                      <p className="text-xs text-gray-500">{alert.timestamp}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-500">No system alerts</p>
              )}
            </div>
          )}
        </div>
      </div>      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-800">Recent Activity</h2>
          <button 
            onClick={() => setShowActivityModal(true)}
            className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </button>
        </div>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex justify-between py-3 border-b border-gray-200 animate-pulse">
                <div className="flex-1">
                  <div className="h-5 bg-gray-300 rounded mb-1 w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : (          <div className="divide-y divide-gray-200">
            {recentActivity.length > 0 ? (
              recentActivity.map((item) => (
                <div key={item.id} className="flex justify-between py-3">
                  <div>
                    <p className="text-gray-800">{item.action}</p>
                    <p className="text-sm text-gray-500">{item.user}</p>
                  </div>
                  <span className="text-sm text-gray-500">{item.timestamp}</span>
                </div>
              ))
            ) : (
              <p className="text-gray-500">No recent activity</p>
            )}
          </div>
        )}
      </div>

      {/* System Alerts Modal */}
      {showAlertsModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">System Alerts</h2>
              <button 
                onClick={() => setShowAlertsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {alerts.length > 0 ? (
                <div className="space-y-4">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex gap-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                      {renderAlertIcon(alert.level)}
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium">{alert.message}</p>
                        <p className="text-sm text-gray-500 mt-1">{alert.timestamp}</p>
                        <div className="mt-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            alert.level === 'critical' ? 'bg-red-100 text-red-800' :
                            alert.level === 'warning' ? 'bg-amber-100 text-amber-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {alert.level.charAt(0).toUpperCase() + alert.level.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No system alerts at this time</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black/70 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">Recent Activity</h2>
              <button 
                onClick={() => setShowActivityModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((item) => (
                    <div key={item.id} className="flex justify-between items-start p-4 rounded-lg border border-gray-200 hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="text-gray-800 font-medium">{item.action}</p>
                        <p className="text-sm text-gray-500 mt-1">by {item.user}</p>
                      </div>
                      <span className="text-sm text-gray-500 ml-4">{item.timestamp}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No recent activity found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}