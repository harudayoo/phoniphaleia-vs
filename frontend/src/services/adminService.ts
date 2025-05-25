import { authenticatedGet } from './apiService';

export interface AdminStats {
  activeElections: number;
  registeredVoters: number;
  completedElections: number;
  averageParticipation: number;
}

export interface ElectionActivity {
  name: string;
  ongoing: number;
  completed: number;
  scheduled: number;
}

export interface VoterEngagement {
  name: string;
  active: number;
}

export interface ParticipationRate {
  name: string;
  value: number;
  color: string;
}

export interface SystemLoad {
  name: string;
  traffic: number;
}

export interface RecentActivity {
  id: number;
  action: string;
  user: string;
  timestamp: string;
}

export interface SystemAlert {
  id: number;
  message: string;
  level: 'critical' | 'warning' | 'info';
  timestamp: string;
}

export interface DashboardData {
  stats: AdminStats;
  electionActivity: ElectionActivity[];
  voterEngagement: VoterEngagement[];
  participationRate: ParticipationRate[];
  systemLoad: SystemLoad[];
  recentActivity: RecentActivity[];
  systemAlerts: SystemAlert[];
}

/**
 * Fetches admin dashboard data from the API
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  return authenticatedGet<DashboardData>('/admin/dashboard');
};

/**
 * Fetches the stats card data for the admin dashboard
 */
export const fetchAdminStats = async (): Promise<AdminStats> => {
  return authenticatedGet<AdminStats>('/admin/stats');
};

/**
 * Fetches the election activity data for the chart
 */
export const fetchElectionActivity = async (): Promise<ElectionActivity[]> => {
  return authenticatedGet<ElectionActivity[]>('/admin/elections/activity');
};

/**
 * Fetches the voter engagement data for the chart
 */
export const fetchVoterEngagement = async (): Promise<VoterEngagement[]> => {
  return authenticatedGet<VoterEngagement[]>('/admin/voters/engagement');
};

/**
 * Fetches the participation rate data for the pie chart
 */
export const fetchParticipationRate = async (): Promise<ParticipationRate[]> => {
  return authenticatedGet<ParticipationRate[]>('/admin/participation/rate');
};

/**
 * Fetches the system load data for the chart
 */
export const fetchSystemLoad = async (): Promise<SystemLoad[]> => {
  return authenticatedGet<SystemLoad[]>('/admin/system/load');
};

/**
 * Fetches recent activity data
 */
export const fetchRecentActivity = async (): Promise<RecentActivity[]> => {
  return authenticatedGet<RecentActivity[]>('/admin/activity/recent');
};

/**
 * Fetches system alerts
 */
export const fetchSystemAlerts = async (): Promise<SystemAlert[]> => {
  return authenticatedGet<SystemAlert[]>('/admin/alerts');
};

const adminService = {
  fetchDashboardData,
  fetchAdminStats,
  fetchElectionActivity,
  fetchVoterEngagement,
  fetchParticipationRate,
  fetchSystemLoad,
  fetchRecentActivity,
  fetchSystemAlerts,
};

export default adminService;
