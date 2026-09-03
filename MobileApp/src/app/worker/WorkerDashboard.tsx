import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'WorkerDashboard'>;

/* =========================================================
   BACKEND CONFIG
   ========================================================= */

const USE_BACKEND = false;

// Change this when your FastAPI backend is ready.
const BASE_URL = 'https://YOUR_FASTAPI_URL/api';

/*
  Later your FastAPI backend can provide:

  GET    /worker/profile
  GET    /worker/jobs
  PATCH  /worker/availability
  PATCH  /worker/jobs/{job_id}/status
*/

/* =========================================================
   TYPES
   ========================================================= */

type JobStatus =
  | 'assigned'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

type WorkerProfile = {
  id: string;
  name: string;
  phone: string;
  skill: string;
  rating: number;
  jobsCompleted: number;
  availability: boolean;
};

type Job = {
  id: string;
  service: string;
  customerName: string;
  customerPhone: string;
  address: string;
  price: number;
  status: JobStatus;
  createdAt: string;
};

/* =========================================================
   DEMO DATA
   ========================================================= */

const DEMO_PROFILE: WorkerProfile = {
  id: 'worker-001',
  name: 'Rahul Kumar',
  phone: '9876543210',
  skill: 'Electrician',
  rating: 4.8,
  jobsCompleted: 126,
  availability: true,
};

const DEMO_JOBS: Job[] = [
  {
    id: 'JOB-1001',
    service: 'Electrical Repair',
    customerName: 'Amit Sharma',
    customerPhone: '9876543211',
    address: 'Sector 62, Noida',
    price: 450,
    status: 'assigned',
    createdAt: 'Today, 11:30 AM',
  },
  {
    id: 'JOB-1002',
    service: 'Fan Installation',
    customerName: 'Priya Singh',
    customerPhone: '9876543212',
    address: 'Sector 18, Noida',
    price: 350,
    status: 'accepted',
    createdAt: 'Today, 10:15 AM',
  },
  {
    id: 'JOB-1003',
    service: 'Switchboard Repair',
    customerName: 'Rohit Verma',
    customerPhone: '9876543213',
    address: 'Sector 76, Noida',
    price: 500,
    status: 'in_progress',
    createdAt: 'Yesterday, 5:30 PM',
  },
  {
    id: 'JOB-1004',
    service: 'AC Wiring',
    customerName: 'Neha Gupta',
    customerPhone: '9876543214',
    address: 'Sector 137, Noida',
    price: 800,
    status: 'completed',
    createdAt: 'Yesterday, 1:20 PM',
  },
  {
    id: 'JOB-1005',
    service: 'Light Installation',
    customerName: 'Karan Mehta',
    customerPhone: '9876543215',
    address: 'Sector 50, Noida',
    price: 300,
    status: 'completed',
    createdAt: '2 days ago',
  },
];

/* =========================================================
   API FUNCTIONS
   ========================================================= */

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',

      // Later:
      // Authorization: `Bearer ${token}`,

      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

async function fetchWorkerProfile(): Promise<WorkerProfile> {
  return apiRequest<WorkerProfile>('/worker/profile');
}

async function fetchWorkerJobs(): Promise<Job[]> {
  return apiRequest<Job[]>('/worker/jobs');
}

async function updateWorkerAvailability(
  availability: boolean,
): Promise<WorkerProfile> {
  return apiRequest<WorkerProfile>('/worker/availability', {
    method: 'PATCH',
    body: JSON.stringify({ availability }),
  });
}

async function updateJobStatus(
  jobId: string,
  status: JobStatus,
): Promise<Job> {
  return apiRequest<Job>(`/worker/jobs/${jobId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

/* =========================================================
   HELPERS
   ========================================================= */

const STATUS_INFO: Record<
  JobStatus,
  {
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  assigned: {
    label: 'New Job',
    icon: 'notifications-outline',
  },
  accepted: {
    label: 'Accepted',
    icon: 'checkmark-circle-outline',
  },
  in_progress: {
    label: 'In Progress',
    icon: 'construct-outline',
  },
  completed: {
    label: 'Completed',
    icon: 'checkmark-done-circle-outline',
  },
  cancelled: {
    label: 'Cancelled',
    icon: 'close-circle-outline',
  },
};

function formatMoney(amount: number) {
  return `₹${amount}`;
}

function getNextStatus(status: JobStatus): JobStatus | null {
  if (status === 'assigned') return 'accepted';
  if (status === 'accepted') return 'in_progress';
  if (status === 'in_progress') return 'completed';

  return null;
}

function getNextStatusLabel(status: JobStatus) {
  if (status === 'assigned') return 'Accept Job';
  if (status === 'accepted') return 'Start Job';
  if (status === 'in_progress') return 'Complete Job';

  return null;
}

function openMap(address: string) {
  const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    address,
  )}`;

  Linking.openURL(url).catch(() => {
    Alert.alert('Error', 'Unable to open maps.');
  });
}

function callCustomer(phone: string) {
  Linking.openURL(`tel:${phone}`).catch(() => {
    Alert.alert('Error', 'Unable to make the call.');
  });
}

/* =========================================================
   JOB CARD
   ========================================================= */

function JobCard({
  job,
  onStatusChange,
}: {
  job: Job;
  onStatusChange: (job: Job) => void;
}) {
  const statusInfo = STATUS_INFO[job.status];
  const nextStatus = getNextStatus(job.status);
  const nextLabel = getNextStatusLabel(job.status);

  return (
    <View style={styles.jobCard}>
      {/* Top row */}
      <View style={styles.jobTopRow}>
        <View style={styles.serviceIcon}>
          <Ionicons
            name="flash-outline"
            size={23}
            color="#6C4FE0"
          />
        </View>

        <View style={styles.jobTitleContainer}>
          <Text style={styles.jobService}>{job.service}</Text>

          <Text style={styles.jobId}>
            Job ID: {job.id}
          </Text>
        </View>

        <Text style={styles.jobPrice}>
          {formatMoney(job.price)}
        </Text>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        <View style={styles.statusBadge}>
          <Ionicons
            name={statusInfo.icon}
            size={15}
            color="#6C4FE0"
          />

          <Text style={styles.statusText}>
            {statusInfo.label}
          </Text>
        </View>

        <Text style={styles.jobDate}>
          {job.createdAt}
        </Text>
      </View>

      <View style={styles.divider} />

      {/* Customer */}
      <View style={styles.customerRow}>
        <View style={styles.customerAvatar}>
          <Text style={styles.customerAvatarText}>
            {job.customerName.charAt(0)}
          </Text>
        </View>

        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>
            {job.customerName}
          </Text>

          <Text style={styles.customerAddress}>
            {job.address}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actionRow}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => callCustomer(job.customerPhone)}
        >
          <Ionicons
            name="call-outline"
            size={18}
            color="#6C4FE0"
          />

          <Text style={styles.secondaryButtonText}>
            Call
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => openMap(job.address)}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color="#6C4FE0"
          />

          <Text style={styles.secondaryButtonText}>
            Map
          </Text>
        </Pressable>

        {nextStatus && nextLabel && (
          <Pressable
            style={styles.primaryButton}
            onPress={() => onStatusChange(job)}
          >
            <Text style={styles.primaryButtonText}>
              {nextLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/* =========================================================
   MAIN SCREEN
   ========================================================= */

export default function WorkerDashboard({ navigation }: Props) {
  const [profile, setProfile] =
    useState<WorkerProfile>(DEMO_PROFILE);

  const [jobs, setJobs] =
    useState<Job[]>(DEMO_JOBS);

  const [activeTab, setActiveTab] =
    useState<'active' | 'history'>('active');

  const [refreshing, setRefreshing] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  /* =======================================================
     LOAD DATA
     ======================================================= */

  const loadData = useCallback(async () => {
    if (!USE_BACKEND) {
      return;
    }

    try {
      setLoading(true);

      const [profileData, jobsData] =
        await Promise.all([
          fetchWorkerProfile(),
          fetchWorkerJobs(),
        ]);

      setProfile(profileData);
      setJobs(jobsData);
    } catch (error) {
      console.log('Worker dashboard API error:', error);

      Alert.alert(
        'Connection Error',
        'Unable to load worker data.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /* =======================================================
     REFRESH
     ======================================================= */

  const handleRefresh = async () => {
    setRefreshing(true);

    if (USE_BACKEND) {
      await loadData();
    }

    setRefreshing(false);
  };

  /* =======================================================
     AVAILABILITY
     ======================================================= */

  const toggleAvailability = async () => {
    const newValue = !profile.availability;

    // Update UI immediately.
    setProfile(prev => ({
      ...prev,
      availability: newValue,
    }));

    if (USE_BACKEND) {
      try {
        const updatedProfile =
          await updateWorkerAvailability(newValue);

        setProfile(updatedProfile);
      } catch (error) {
        console.log(error);

        // Revert UI if API fails.
        setProfile(prev => ({
          ...prev,
          availability: !newValue,
        }));

        Alert.alert(
          'Error',
          'Unable to update availability.',
        );
      }
    }
  };

  /* =======================================================
     JOB STATUS
     ======================================================= */

  const handleStatusChange = async (job: Job) => {
    const nextStatus = getNextStatus(job.status);

    if (!nextStatus) return;

    // Demo / optimistic UI update.
    setJobs(prev =>
      prev.map(item =>
        item.id === job.id
          ? {
              ...item,
              status: nextStatus,
            }
          : item,
      ),
    );

    if (USE_BACKEND) {
      try {
        const updatedJob =
          await updateJobStatus(
            job.id,
            nextStatus,
          );

        setJobs(prev =>
          prev.map(item =>
            item.id === updatedJob.id
              ? updatedJob
              : item,
          ),
        );
      } catch (error) {
        console.log(error);

        // Reload actual backend data.
        await loadData();

        Alert.alert(
          'Error',
          'Unable to update job status.',
        );
      }
    }
  };

  /* =======================================================
     FILTER JOBS
     ======================================================= */

  const activeJobs = jobs.filter(job =>
    ['assigned', 'accepted', 'in_progress'].includes(
      job.status,
    ),
  );

  const historyJobs = jobs.filter(job =>
    ['completed', 'cancelled'].includes(
      job.status,
    ),
  );

  const displayedJobs =
    activeTab === 'active'
      ? activeJobs
      : historyJobs;

  /* =======================================================
     STATS
     ======================================================= */

  const completedJobs = jobs.filter(
    job => job.status === 'completed',
  ).length;

  const totalEarnings = jobs
    .filter(job => job.status === 'completed')
    .reduce(
      (total, job) => total + job.price,
      0,
    );

  /* =======================================================
     RENDER
     ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />

      <View style={styles.container}>

        {/* HEADER */}
        <View style={styles.header}>
          <View>
            <Text style={styles.smallHeading}>
              Worker Dashboard
            </Text>

            <Text style={styles.welcomeText}>
              Hello, {profile.name.split(' ')[0]} 👋
            </Text>
          </View>

          <Pressable
            style={styles.profileButton}
            onPress={() => {
              Alert.alert(
                'Worker Profile',
                `${profile.name}\n${profile.skill}\n⭐ ${profile.rating}`,
              );
            }}
          >
            <Ionicons
              name="person-outline"
              size={23}
              color="#6C4FE0"
            />
          </Pressable>
        </View>

        {/* PROFILE CARD */}
        <View style={styles.profileCard}>
          <View style={styles.profileLeft}>
            <View style={styles.workerAvatar}>
              <Text style={styles.workerAvatarText}>
                {profile.name.charAt(0)}
              </Text>
            </View>

            <View>
              <Text style={styles.workerName}>
                {profile.name}
              </Text>

              <Text style={styles.workerSkill}>
                {profile.skill}
              </Text>

              <View style={styles.ratingRow}>
                <Ionicons
                  name="star"
                  size={15}
                  color="#F5A623"
                />

                <Text style={styles.ratingText}>
                  {profile.rating}
                </Text>
              </View>
            </View>
          </View>

          {/* Availability */}
          <Pressable
            style={[
              styles.availabilityButton,
              profile.availability &&
                styles.availabilityButtonActive,
            ]}
            onPress={toggleAvailability}
          >
            <View
              style={[
                styles.availabilityDot,
                profile.availability &&
                  styles.availabilityDotActive,
              ]}
            />

            <Text
              style={[
                styles.availabilityText,
                profile.availability &&
                  styles.availabilityTextActive,
              ]}
            >
              {profile.availability
                ? 'Online'
                : 'Offline'}
            </Text>
          </Pressable>
        </View>

        {/* STATS */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons
              name="briefcase-outline"
              size={21}
              color="#6C4FE0"
            />

            <Text style={styles.statValue}>
              {profile.jobsCompleted}
            </Text>

            <Text style={styles.statLabel}>
              Jobs Done
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="star-outline"
              size={21}
              color="#6C4FE0"
            />

            <Text style={styles.statValue}>
              {profile.rating}
            </Text>

            <Text style={styles.statLabel}>
              Rating
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons
              name="wallet-outline"
              size={21}
              color="#6C4FE0"
            />

            <Text style={styles.statValue}>
              ₹{totalEarnings}
            </Text>

            <Text style={styles.statLabel}>
              Earnings
            </Text>
          </View>
        </View>

        {/* TABS */}
        <View style={styles.tabsContainer}>
          <Pressable
            style={[
              styles.tab,
              activeTab === 'active' &&
                styles.activeTab,
            ]}
            onPress={() => setActiveTab('active')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'active' &&
                  styles.activeTabText,
              ]}
            >
              Active Jobs ({activeJobs.length})
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.tab,
              activeTab === 'history' &&
                styles.activeTab,
            ]}
            onPress={() => setActiveTab('history')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'history' &&
                  styles.activeTabText,
              ]}
            >
              History ({historyJobs.length})
            </Text>
          </Pressable>
        </View>

        {/* JOB LIST */}
        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator
              size="large"
              color="#6C4FE0"
            />

            <Text style={styles.loadingText}>
              Loading jobs...
            </Text>
          </View>
        ) : (
          <FlatList
            data={displayedJobs}
            keyExtractor={item => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={
              styles.listContent
            }
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
              />
            }
            renderItem={({ item }) => (
              <JobCard
                job={item}
                onStatusChange={
                  handleStatusChange
                }
              />
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="briefcase-outline"
                  size={50}
                  color="#C8C8CC"
                />

                <Text style={styles.emptyTitle}>
                  No Jobs Found
                </Text>

                <Text style={styles.emptyText}>
                  {activeTab === 'active'
                    ? 'New jobs will appear here.'
                    : 'Completed jobs will appear here.'}
                </Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   STYLES
   ========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 16,
  },

  smallHeading: {
    fontSize: 13,
    color: '#6B6B70',
    marginBottom: 3,
  },

  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
  },

  profileButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileCard: {
    marginHorizontal: 20,
    padding: 17,
    borderRadius: 18,
    backgroundColor: '#F7F5FF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  workerAvatar: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#6C4FE0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  workerAvatarText: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '700',
  },

  workerName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },

  workerSkill: {
    fontSize: 13,
    color: '#6B6B70',
    marginTop: 2,
  },

  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },

  ratingText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    color: '#444444',
  },

  availabilityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDDDDD',
  },

  availabilityButtonActive: {
    backgroundColor: '#EAF9F0',
    borderColor: '#C7EED7',
  },

  availabilityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#AAAAAA',
    marginRight: 6,
  },

  availabilityDotActive: {
    backgroundColor: '#1FAF63',
  },

  availabilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#777777',
  },

  availabilityTextActive: {
    color: '#1FAF63',
  },

  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 15,
    gap: 10,
  },

  statCard: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 15,
    backgroundColor: '#F7F7F8',
    alignItems: 'center',
  },

  statValue: {
    marginTop: 6,
    fontSize: 17,
    fontWeight: '700',
    color: '#111111',
  },

  statLabel: {
    marginTop: 2,
    fontSize: 11,
    color: '#777777',
  },

  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },

  tab: {
    paddingVertical: 12,
    marginRight: 25,
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#6C4FE0',
  },

  tabText: {
    fontSize: 14,
    color: '#777777',
    fontWeight: '600',
  },

  activeTabText: {
    color: '#6C4FE0',
  },

  listContent: {
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 30,
  },

  jobCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#ECECEE',
    elevation: 2,
    shadowColor: '#000000',
    shadowOpacity: 0.04,
    shadowRadius: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
  },

  jobTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  serviceIcon: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#F2EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },

  jobTitleContainer: {
    flex: 1,
  },

  jobService: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },

  jobId: {
    fontSize: 11,
    color: '#888888',
    marginTop: 3,
  },

  jobPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111111',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 15,
    backgroundColor: '#F2EEFF',
  },

  statusText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '600',
    color: '#6C4FE0',
  },

  jobDate: {
    fontSize: 11,
    color: '#888888',
  },

  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 13,
  },

  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEEF0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },

  customerAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#555555',
  },

  customerInfo: {
    flex: 1,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },

  customerAddress: {
    fontSize: 12,
    color: '#777777',
    marginTop: 3,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 8,
  },

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#F2EEFF',
  },

  secondaryButtonText: {
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
    color: '#6C4FE0',
  },

  primaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#6C4FE0',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#777777',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 70,
  },

  emptyTitle: {
    marginTop: 15,
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
  },
});