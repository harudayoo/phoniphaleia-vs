'use client';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/AdminLayout';
import Link from 'next/link';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { AlertTriangle, ArrowRight, Calendar, Users, Award, Vote, ChevronDown, ChevronUp } from 'lucide-react';
import PageHeader from '@/components/admin/PageHeader';

// Mock data for dashboard
const electionData = [
  { name: 'Mon', ongoing: 2, completed: 1, scheduled: 3 },
  { name: 'Tue', ongoing: 3, completed: 1, scheduled: 2 },
  { name: 'Wed', ongoing: 2, completed: 3, scheduled: 1 },
  { name: 'Thu', ongoing: 4, completed: 2, scheduled: 2 },
  { name: 'Fri', ongoing: 3, completed: 2, scheduled: 4 },
  { name: 'Sat', ongoing: 1, completed: 4, scheduled: 2 },
  { name: 'Sun', ongoing: 2, completed: 1, scheduled: 1 },
];

const voterData = [
  { name: 'Jan', active: 345 },
  { name: 'Feb', active: 421 },
  { name: 'Mar', active: 532 },
  { name: 'Apr', active: 620 },
  { name: 'May', active: 502 },
];

const workloadData = [
  { name: '00:00', traffic: 30 },
  { name: '04:00', traffic: 10 },
  { name: '08:00', traffic: 150 },
  { name: '12:00', traffic: 250 },
  { name: '16:00', traffic: 320 },
  { name: '20:00', traffic: 180 },
  { name: '23:59', traffic: 120 },
];

const participationData = [
  { name: 'Voted', value: 68, color: '#10b981' },
  { name: 'Not Voted', value: 32, color: '#f87171' },
];

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

interface RecentActivity {
  id: number;
  action: string;
  user: string;
  timestamp: string;
}

interface Alert {
  id: number;
  message: string;
  level: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, fetch this data from an API endpoint
    const mockStats: StatCard[] = [
      {
        title: 'Active Elections',
        value: 7,
        description: 'Currently ongoing elections',
        icon: <Calendar className="h-6 w-6 text-blue-600" />,
        trend: {
          value: 16.5,
          isPositive: true
        }
      },
      {
        title: 'Registered Voters',
        value: 2458,
        description: 'Total registered voters',
        icon: <Users className="h-6 w-6 text-purple-600" />,
        trend: {
          value: 3.2,
          isPositive: true
        }
      },
      {
        title: 'Completed Elections',
        value: 23,
        description: 'Elections with published results',
        icon: <Award className="h-6 w-6 text-green-600" />,
        trend: {
          value: 9.1,
          isPositive: true
        }
      },
      {
        title: 'Average Participation',
        value: 68,
        description: 'Average voter turnout percentage',
        icon: <Vote className="h-6 w-6 text-orange-500" />,
        trend: {
          value: 2.8,
          isPositive: false
        }
      },
    ];

    const mockActivity: RecentActivity[] = [
      { id: 1, action: 'Published results for Student Council Election', user: 'Admin Maria', timestamp: '10 minutes ago' },
      { id: 2, action: 'Created new election: Department Representative Selection', user: 'Admin John', timestamp: '1 hour ago' },
      { id: 3, action: 'Updated system settings', user: 'Admin Maria', timestamp: '3 hours ago' },
      { id: 4, action: 'Generated security key for Library Committee Election', user: 'Admin Alex', timestamp: '5 hours ago' },
      { id: 5, action: 'Added new help documentation article', user: 'Admin Sarah', timestamp: '1 day ago' },
    ];

    const mockAlerts: Alert[] = [
      { id: 1, message: 'Student Council Election ends in 6 hours', level: 'info', timestamp: 'Just now' },
      { id: 2, message: 'Unusual login activity detected', level: 'warning', timestamp: '2 hours ago' },
      { id: 3, message: 'Backup system offline', level: 'critical', timestamp: '4 hours ago' },
    ];

    // Simulate API delay
    setTimeout(() => {
      setStats(mockStats);
      setRecentActivity(mockActivity);
      setAlerts(mockAlerts);
      setLoading(false);
    }, 800);

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
      )}

      {/* Graphs and Data Visualization */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Election Activity Chart */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-800">Election Activity</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={electionData}
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
                data={voterData}
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

        {/* Participation Pie Chart */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <h2 className="text-lg font-medium mb-4 text-gray-800">Participation Rate</h2>
          <div className="h-64 flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={participationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {participationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Percentage']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
              </PieChart>
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
                data={workloadData}
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
        </div>

        {/* System Alerts */}
        <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-800">System Alerts</h2>
            <Link href="/admin/alerts" className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center">
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
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
              {alerts.map((alert) => (
                <div key={alert.id} className="flex gap-3">
                  {renderAlertIcon(alert.level)}
                  <div>
                    <p className="text-gray-800">{alert.message}</p>
                    <p className="text-xs text-gray-500">{alert.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white rounded-xl shadow border border-gray-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-medium text-gray-800">Recent Activity</h2>
          <Link href="/admin/activity" className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
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
        ) : (
          <div className="divide-y divide-gray-200">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex justify-between py-3">
                <div>
                  <p className="text-gray-800">{item.action}</p>
                  <p className="text-sm text-gray-500">{item.user}</p>
                </div>
                <span className="text-sm text-gray-500">{item.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}