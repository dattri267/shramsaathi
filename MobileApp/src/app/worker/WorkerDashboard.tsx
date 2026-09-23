import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as Location from 'expo-location';

import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  Image,
  View,
  Linking,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type {
  RootStackParamList,
} from '../navigation/AppNavigator';

import {
  logout,
  getWorkerProfile,
  getWorkerBookings,
  getSkillsWithSubskills,
  updateWorkerProfile,
  acceptBooking,
  startBooking,
  completeBooking,
  rejectBooking,
  updateWorkerLocation,
} from '../../api';


type Props = NativeStackScreenProps<
  RootStackParamList,
  'WorkerDashboard'
>;


/* =========================================================
   TYPES
========================================================= */

type BookingStatus =
  | 'pending'
  | 'accepted'
  | 'started'
  | 'completed'
  | 'payment_pending'
  | 'paid'
  | 'rejected';

type Booking = {
  id: string;
  bookingType?: 'normal' | 'emergency';

  customerName: string;
  customerPhone: string;

  service: string;
  serviceDescription: string;

  date: string;
  time: string;

  address: string;

  // Optional now; the backend will provide the real coordinates later.
  latitude?: number;
  longitude?: number;

  amount: number;

  commission: number;

  workerEarning: number;

  status: BookingStatus;
};

const formatMoney = (val: number | string | undefined | null): string => {
  const n = Number(val ?? 0);
  if (isNaN(n)) return '0';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};


/* =========================================================
   WORKER INFORMATION
========================================================= */

const DEFAULT_WORKER = {
  name: 'Worker',
  skill: 'Not specified',
  rating: 4.8,
  completedJobs: 0,
};


/* =========================================================
   COMPONENT
========================================================= */

export default function WorkerDashboard({
  navigation,
  route,
}: Props) {

  /* =======================================================
     STATE
  ======================================================= */

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loadingBookings, setLoadingBookings] =
    useState(false);

  const [activeTab, setActiveTab] =
    useState<'home' | 'requests' | 'earnings' | 'profile'>(
      'home'
    );

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [detailsVisible, setDetailsVisible] =
    useState(false);

  /* =======================================================
     PROFILE EDITOR STATE
  ======================================================= */

  const [workerEditVisible, setWorkerEditVisible] = useState(false);
  const [workerEditSaving, setWorkerEditSaving] = useState(false);
  const [workerLocationLoading, setWorkerLocationLoading] = useState(false);

  const [workerEditName, setWorkerEditName] = useState("");
  const [workerEditPhone, setWorkerEditPhone] = useState("");
  const [workerEditBio, setWorkerEditBio] = useState("");
  const [workerEditPrimarySkill, setWorkerEditPrimarySkill] = useState("");
  const [workerEditSubskillId, setWorkerEditSubskillId] = useState("");
  const [workerEditAvailableSubskills, setWorkerEditAvailableSubskills] = useState<any[]>([]);
  const [workerEditExperience, setWorkerEditExperience] = useState("");
  const [workerEditRadius, setWorkerEditRadius] = useState("");
  const [workerEditDays, setWorkerEditDays] = useState("");
  const [workerEditHours, setWorkerEditHours] = useState("");
  const [workerEditHouse, setWorkerEditHouse] = useState("");
  const [workerEditLocality, setWorkerEditLocality] = useState("");
  const [workerEditCity, setWorkerEditCity] = useState("");
  const [workerEditState, setWorkerEditState] = useState("");
  const [workerEditPincode, setWorkerEditPincode] = useState("");
  const [workerEditLandmark, setWorkerEditLandmark] = useState("");
  const [workerEditLatitude, setWorkerEditLatitude] = useState<number | null>(null);
  const [workerEditLongitude, setWorkerEditLongitude] = useState<number | null>(null);

  /*
     WorkerDetailsScreen can pass the worker information through
     AppNavigator. Until the backend is connected, we fall back to
     DEFAULT_WORKER so the UI still works in Expo Go.
  */
  const workerFromRoute = route.params?.worker;
  const [workerProfile, setWorkerProfile] = useState<any>(null);
  const dashboardRefreshInFlight = useRef(false);

  const WORKER = useMemo(() => {
    const backend = workerProfile?.worker_profile || {};
    const primarySkill =
      backend?.skills?.find((skill: any) => skill.is_primary) ||
      backend?.skills?.[0];

    return {
      ...DEFAULT_WORKER,
      name: workerProfile?.full_name || workerFromRoute?.name || DEFAULT_WORKER.name,
      email: workerProfile?.email || workerFromRoute?.email || '',
      phone: workerProfile?.phone || workerFromRoute?.phone || '',
      skill: primarySkill?.name || DEFAULT_WORKER.skill,
      rating: backend?.average_rating ?? DEFAULT_WORKER.rating,
      completedJobs: backend?.completed_jobs ?? DEFAULT_WORKER.completedJobs,
      avatarUrl: workerProfile?.avatar_url || null,
      bio: backend?.bio || '',
      yearsExperience: primarySkill?.years_experience ?? backend?.years_experience ?? null,
      serviceRadiusKm: backend?.service_radius_km ?? null,
      serviceAddress: backend?.service_address || {},
      workingDays: backend?.working_days || [],
      workingHours: backend?.working_hours || [],
      documents: backend?.worker_documents || [],
    };
  }, [workerProfile, workerFromRoute]);


  const formatBackendWorkerBooking = (item: any): Booking => {
    const scheduled = item?.scheduled_start_at ? new Date(item.scheduled_start_at) : null;
    const estimated = item?.price?.estimated_amount ?? item?.estimated_amount ?? 0;
    const finalAmount = item?.price?.final_amount ?? item?.final_amount;
    const amount = Number(finalAmount ?? estimated ?? 0);
    const paymentStatus = item?.payment?.status;

    let status: BookingStatus = 'pending';
    switch (item?.status) {
      case 'accepted':
      case 'worker_assigned':
        status = 'accepted';
        break;
      case 'in_progress':
        status = 'started';
        break;
      case 'completed':
        status = paymentStatus === 'paid' ? 'paid' : 'payment_pending';
        break;
      case 'cancelled':
        status = 'rejected';
        break;
      default:
        status = 'pending';
    }

    return {
      id: String(item.id),
      bookingType: item?.booking_type === 'emergency' ? 'emergency' : 'normal',
      customerName: item?.customer?.name || 'Customer',
      customerPhone: item?.customer?.phone || '',
      service: item?.service?.name || 'Service',
      serviceDescription: item?.customer_notes || 'Service request',
      date: scheduled
        ? scheduled.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Not scheduled',
      time: scheduled
        ? scheduled.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        : 'Not scheduled',
      address: item?.service_address || 'Service address unavailable',
      latitude: typeof item?.location?.latitude === 'number' ? item.location.latitude : undefined,
      longitude: typeof item?.location?.longitude === 'number' ? item.location.longitude : undefined,
      amount,
      commission: Number((amount * 0.10).toFixed(2)),
      workerEarning: Number((amount * 0.80).toFixed(2)),
      status,
    };
  };

  const loadWorkerDashboard = async (silent = false) => {
    if (dashboardRefreshInFlight.current) return;

    dashboardRefreshInFlight.current = true;

    try {
      if (!silent) setLoadingBookings(true);
      const [profileResponse, bookingResponse] = await Promise.all([
        getWorkerProfile(),
        getWorkerBookings(),
      ]);

      setWorkerProfile(profileResponse?.profile || null);
      const rawBookings = bookingResponse?.bookings || bookingResponse?.jobs || [];
      setBookings(rawBookings.map(formatBackendWorkerBooking));
    } catch (error) {
      console.error('Failed to load worker dashboard:', error);
      if (!silent) {
        Alert.alert(
          'Unable to load dashboard',
          error instanceof Error ? error.message : 'Please try again.'
        );
      }
    } finally {
      if (!silent) setLoadingBookings(false);
      dashboardRefreshInFlight.current = false;
    }
  };

  useEffect(() => {
    loadWorkerDashboard();

    const refreshInterval = setInterval(() => {
      loadWorkerDashboard(true);
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Share the worker's current position only while an emergency job
  // has been accepted/in progress. The backend stores it in Redis.
  useEffect(() => {
    const workerId = workerProfile?.worker_profile?.id;

    const hasActiveEmergency = bookings.some(
      booking =>
        booking.bookingType === "emergency" &&
        (booking.status === "accepted" || booking.status === "started")
    );

    if (!workerId || !hasActiveEmergency) return;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const startLocationSharing = async () => {
      try {
        const { status } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(
            "Location Permission Required",
            "Allow location access so the customer can see your live location during an emergency job."
          );
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!cancelled) {
          await updateWorkerLocation(
            current.coords.latitude,
            current.coords.longitude
          );
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          async location => {
            if (cancelled) return;

            const { latitude, longitude } = location.coords;

            if (
              Number.isFinite(latitude) &&
              Number.isFinite(longitude)
            ) {
              try {
                await updateWorkerLocation(latitude, longitude);
              } catch (error) {
                console.warn(
                  "Failed to update worker live location:",
                  error
                );
              }
            }
          }
        );
      } catch (error) {
        console.warn("Worker location sharing failed:", error);
      }
    };

    startLocationSharing();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [
    workerProfile?.worker_profile?.id,
    bookings.some(
      booking =>
        booking.bookingType === "emergency" &&
        (booking.status === "accepted" || booking.status === "started")
    ),
  ]);

  /* =======================================================
     LOCATION + CALL ACTIONS
  ======================================================= */

  const handleCallCustomer = async (booking: Booking) => {
    const phone = booking.customerPhone?.trim();

    if (!phone) {
      Alert.alert('Phone unavailable', 'The customer phone number is not available yet.');
      return;
    }

    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Unable to call', 'Calling is not supported on this device.');
    }
  };

  const handleOpenCustomerLocation = async (booking: Booking) => {
    const destination =
      typeof booking.latitude === 'number' && typeof booking.longitude === 'number'
        ? `${booking.latitude},${booking.longitude}`
        : encodeURIComponent(booking.address);

    // Google Maps supports both coordinates and an address query.
    const url = `https://www.google.com/maps/search/?api=1&query=${destination}`;

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Unable to open Maps', 'Google Maps could not be opened on this device.');
    }
  };


  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const pendingRequests = useMemo(() => {
    return bookings.filter(
      booking => booking.status === 'pending'
    );
  }, [bookings]);


  const activeJobs = useMemo(() => {
    return bookings.filter(
      booking =>
        booking.status === 'accepted' ||
        booking.status === 'started' ||
        booking.status === 'completed' ||
        booking.status === 'payment_pending'
    );
  }, [bookings]);


  const completedPaidJobs = useMemo(() => {
    return bookings.filter(
      booking => booking.status === 'paid'
    );
  }, [bookings]);


  const totalEarnings = useMemo(() => {
    return completedPaidJobs.reduce(
      (total, booking) =>
        total + booking.workerEarning,
      0
    );
  }, [completedPaidJobs]);


  const pendingEarnings = useMemo(() => {
    return bookings
      .filter(
        booking =>
          booking.status === 'completed' ||
          booking.status === 'payment_pending'
      )
      .reduce(
        (total, booking) =>
          total + booking.workerEarning,
        0
      );
  }, [bookings]);


  /* =======================================================
     UPDATE BOOKING
  ======================================================= */

  const updateBookingStatus = (
    bookingId: string,
    status: BookingStatus
  ) => {

    setBookings(current =>
      current.map(booking =>
        booking.id === bookingId
          ? {
              ...booking,
              status,
            }
          : booking
      )
    );

    setSelectedBooking(current =>
      current
        ? {
            ...current,
            status,
          }
        : null
    );
  };


  /* =======================================================
     ACCEPT BOOKING
  ======================================================= */

  const handleAcceptBooking = (booking: Booking) => {
    Alert.alert(
      'Accept Booking',
      `Accept ${booking.service} request from ${booking.customerName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              await acceptBooking(booking.id);
              await loadWorkerDashboard();
              setDetailsVisible(false);
              Alert.alert('Booking Accepted', 'The customer has been notified that you accepted the job.');
            } catch (error) {
              Alert.alert('Unable to accept', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };


  /* =======================================================
     REJECT BOOKING
  ======================================================= */

  const handleRejectBooking = (booking: Booking) => {
    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectBooking(booking.id);
              setBookings(current => current.filter(item => item.id !== booking.id));
              setSelectedBooking(null);
              setDetailsVisible(false);
              Alert.alert('Request Rejected', 'The request has been removed from your incoming requests.');
            } catch (error) {
              Alert.alert('Unable to reject', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };


  /* =======================================================
     START JOB
  ======================================================= */

  const handleStartJob = (booking: Booking) => {
    Alert.alert(
      'Start Job',
      'Are you ready to start this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start Job',
          onPress: async () => {
            try {
              await startBooking(booking.id);
              await loadWorkerDashboard();
              setDetailsVisible(false);
              Alert.alert('Job Started', 'The job has been marked as started.');
            } catch (error) {
              Alert.alert('Unable to start job', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };


  /* =======================================================
     COMPLETE JOB
  ======================================================= */

  const handleCompleteJob = (booking: Booking) => {
    Alert.alert(
      'Complete Job',
      'Confirm that you have completed this service?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Complete',
          onPress: async () => {
            try {
              await completeBooking(booking.id, booking.amount);
              await loadWorkerDashboard();
              setDetailsVisible(false);
              Alert.alert('Work Completed', 'The customer has been notified to complete the payment.');
            } catch (error) {
              Alert.alert('Unable to complete job', error instanceof Error ? error.message : 'Please try again.');
            }
          },
        },
      ]
    );
  };


  /* =======================================================
     OPEN BOOKING DETAILS
  ======================================================= */

  const openBookingDetails = (
    booking: Booking
  ) => {

    setSelectedBooking(booking);
    setDetailsVisible(true);
  };


  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Logout',
          style: 'destructive',

          onPress: async () => {
            await logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };


  /* =======================================================
     STATUS HELPERS
  ======================================================= */

  const getStatusText = (
    status: BookingStatus
  ) => {

    switch (status) {

      case 'pending':
        return 'New Request';

      case 'accepted':
        return 'Accepted';

      case 'started':
        return 'Work In Progress';

      case 'completed':
        return 'Completed';

      case 'payment_pending':
        return 'Payment Pending';

      case 'paid':
        return 'Payment Received';

      case 'rejected':
        return 'Rejected';

      default:
        return 'Unknown';
    }
  };


  const getStatusColor = (
    status: BookingStatus
  ) => {

    switch (status) {

      case 'pending':
        return '#D97706';

      case 'accepted':
        return '#2563EB';

      case 'started':
        return '#7C3AED';

      case 'completed':
        return '#16A34A';

      case 'payment_pending':
        return '#EA580C';

      case 'paid':
        return '#16A34A';

      case 'rejected':
        return '#DC2626';

      default:
        return '#6B7280';
    }
  };


  /* =======================================================
     BOOKING CARD
  ======================================================= */

  const renderBookingCard = (
    booking: Booking
  ) => {

    return (
      <Pressable
        key={booking.id}
        style={({ pressed }) => [
          styles.bookingCard,

          pressed && {
            opacity: 0.9,
            transform: [
              {
                scale: 0.985,
              },
            ],
          },
        ]}
        onPress={() =>
          openBookingDetails(booking)
        }
      >

        {/* TOP */}

        <View style={styles.bookingTop}>

          <View style={styles.customerAvatar}>
            <Ionicons
              name="person-outline"
              size={22}
              color="#2563EB"
            />
          </View>

          <View style={styles.customerInfo}>

            <Text
              style={styles.customerName}
              numberOfLines={1}
            >
              {booking.customerName}
            </Text>

            <Text style={styles.serviceName}>
              {booking.service}
            </Text>

          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  getStatusColor(
                    booking.status
                  ) + '15',
              },
            ]}
          >

            <Text
              style={[
                styles.statusText,
                {
                  color:
                    getStatusColor(
                      booking.status
                    ),
                },
              ]}
            >
              {getStatusText(
                booking.status
              )}
            </Text>

          </View>

        </View>


        {booking.bookingType === 'emergency' && (
          <View style={styles.emergencyRequestBanner}>
            <Ionicons name="flash" size={16} color="#DC2626" />
            <Text style={styles.emergencyRequestText}>EMERGENCY REQUEST • RESPOND IMMEDIATELY</Text>
          </View>
        )}

        {/* SERVICE */}

        <View style={styles.bookingServiceRow}>

          <View style={styles.bookingIconSmall}>
            <Ionicons
              name="construct-outline"
              size={18}
              color="#2563EB"
            />
          </View>

          <View style={styles.bookingServiceInfo}>

            <Text style={styles.bookingServiceTitle}>
              {booking.serviceDescription}
            </Text>

            <Text style={styles.bookingServiceAddress}>
              {booking.address}
            </Text>

          </View>

        </View>


        {/* DATE / TIME */}

        <View style={styles.bookingMetaRow}>

          <View style={styles.metaItem}>

            <Ionicons
              name="calendar-outline"
              size={17}
              color="#6B7280"
            />

            <Text style={styles.metaText}>
              {booking.date}
            </Text>

          </View>


          <View style={styles.metaItem}>

            <Ionicons
              name="time-outline"
              size={17}
              color="#6B7280"
            />

            <Text style={styles.metaText}>
              {booking.time}
            </Text>

          </View>

        </View>


        {/* MONEY */}

        <View style={styles.moneyRow}>

          <View>

            <Text style={styles.moneyLabel}>
              Customer pays
            </Text>

            <Text style={styles.moneyAmount}>
              ₹{formatMoney(booking.amount)}
            </Text>

          </View>


          <View style={styles.moneyDivider} />


          <View>

            <Text style={styles.moneyLabel}>
              Your earning
            </Text>

            <Text style={styles.workerAmount}>
              ₹{formatMoney(booking.workerEarning)}
            </Text>

          </View>

        </View>


        {/* PAYMENT NOTE */}

        {(booking.status === 'completed' ||
          booking.status === 'payment_pending') && (

          <View style={styles.paymentPendingBox}>

            <Ionicons
              name="time-outline"
              size={17}
              color="#EA580C"
            />

            <Text style={styles.paymentPendingText}>
              Waiting for customer payment
            </Text>

          </View>

        )}


        {booking.status === 'paid' && (

          <View style={styles.paymentReceivedBox}>

            <Ionicons
              name="checkmark-circle"
              size={17}
              color="#16A34A"
            />

            <Text style={styles.paymentReceivedText}>
              Payment received • ₹{formatMoney(booking.workerEarning)}
            </Text>

          </View>

        )}


        {/* CUSTOMER CONTACT + LOCATION */}

        {(booking.status === 'accepted' ||
          booking.status === 'started' ||
          booking.status === 'completed' ||
          booking.status === 'payment_pending' ||
          booking.status === 'paid') && (

          <View style={styles.contactActionRow}>

            <Pressable
              style={styles.contactButton}
              onPress={(event) => {
                event.stopPropagation();
                handleCallCustomer(booking);
              }}
            >
              <Ionicons name="call-outline" size={17} color="#2563EB" />
              <Text style={styles.contactButtonText}>Call Customer</Text>
            </Pressable>

            <Pressable
              style={styles.contactButton}
              onPress={(event) => {
                event.stopPropagation();
                handleOpenCustomerLocation(booking);
              }}
            >
              <Ionicons name="map-outline" size={17} color="#2563EB" />
              <Text style={styles.contactButtonText}>Open Maps</Text>
            </Pressable>

          </View>

        )}


        {/* REQUEST ACTIONS */}

        {booking.status === 'pending' && (

          <View style={styles.actionRow}>

            <Pressable
              style={styles.rejectButton}
              onPress={(event) => {
                event.stopPropagation();
                handleRejectBooking(
                  booking
                );
              }}
            >

              <Text style={styles.rejectButtonText}>
                Decline
              </Text>

            </Pressable>


            <Pressable
              style={styles.acceptButton}
              onPress={(event) => {
                event.stopPropagation();
                handleAcceptBooking(
                  booking
                );
              }}
            >

              <Text style={styles.acceptButtonText}>
                Accept
              </Text>

            </Pressable>

          </View>

        )}


        {/* ACCEPTED */}

        {booking.status === 'accepted' && (

          <Pressable
            style={styles.startButton}
            onPress={(event) => {
              event.stopPropagation();
              handleStartJob(
                booking
              );
            }}
          >

            <Ionicons
              name="play"
              size={17}
              color="#FFFFFF"
            />

            <Text style={styles.startButtonText}>
              Start Job
            </Text>

          </Pressable>

        )}


        {/* STARTED */}

        {booking.status === 'started' && (

          <Pressable
            style={styles.completeButton}
            onPress={(event) => {
              event.stopPropagation();
              handleCompleteJob(
                booking
              );
            }}
          >

            <Ionicons
              name="checkmark-circle-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.completeButtonText}>
              Mark Work Completed
            </Text>

          </Pressable>

        )}

      </Pressable>
    );
  };


  /* =======================================================
     HOME
  ======================================================= */

  const renderHome = () => {

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        {/* HEADER */}

        <View style={styles.header}>

          <View style={styles.headerLeft}>

            <Text style={styles.welcomeText}>
              Welcome back 👋
            </Text>

            <Text style={styles.workerName}>
              {WORKER.name}
            </Text>

            <View style={styles.workerSkillRow}>

              <View style={styles.skillBadge}>
                <Text style={styles.skillBadgeText}>
                  {WORKER.skill}
                </Text>
              </View>

              <Ionicons
                name="star"
                size={15}
                color="#F59E0B"
              />

              <Text style={styles.ratingText}>
                {WORKER.rating}
              </Text>

            </View>

          </View>


          <Pressable
            style={styles.notificationButton}
            onPress={() =>
              Alert.alert(
                'Notifications',
                'New booking notifications will appear here.'
              )
            }
          >

            <Ionicons
              name="notifications-outline"
              size={23}
              color="#111827"
            />

            {pendingRequests.length > 0 && (
              <View style={styles.notificationDot} />
            )}

          </Pressable>

        </View>


        {/* AVAILABILITY */}

        <View style={styles.availabilityCard}>

          <View style={styles.availabilityIcon}>

            <Ionicons
              name="radio-outline"
              size={22}
              color="#16A34A"
            />

          </View>

          <View style={styles.availabilityContent}>

            <Text style={styles.availabilityTitle}>
              You're available
            </Text>

            <Text style={styles.availabilitySubtitle}>
              Customers can request your services
            </Text>

          </View>

          <View style={styles.onlineDot} />

        </View>


        {/* STATS */}

        <View style={styles.statsRow}>

          <View style={styles.statCard}>

            <View style={styles.statIcon}>
              <Ionicons
                name="calendar-outline"
                size={21}
                color="#2563EB"
              />
            </View>

            <Text style={styles.statValue}>
              {pendingRequests.length}
            </Text>

            <Text style={styles.statLabel}>
              New Requests
            </Text>

          </View>


          <View style={styles.statCard}>

            <View style={styles.statIcon}>
              <Ionicons
                name="briefcase-outline"
                size={21}
                color="#2563EB"
              />
            </View>

            <Text style={styles.statValue}>
              {activeJobs.length}
            </Text>

            <Text style={styles.statLabel}>
              Active Jobs
            </Text>

          </View>


          <View style={styles.statCard}>

            <View style={styles.statIcon}>
              <Ionicons
                name="wallet-outline"
                size={21}
                color="#2563EB"
              />
            </View>

            <Text style={styles.statValue}>
              ₹{formatMoney(totalEarnings)}
            </Text>

            <Text style={styles.statLabel}>
              Earnings
            </Text>

          </View>

        </View>


        {/* NEW REQUESTS */}

        <View style={styles.sectionHeader}>

          <View>

            <Text style={styles.sectionTitle}>
              New Requests
            </Text>

            <Text style={styles.sectionSubtitle}>
              Customers looking for your service
            </Text>

          </View>


          {pendingRequests.length > 0 && (

            <Pressable
              onPress={() =>
                setActiveTab('requests')
              }
            >

              <Text style={styles.viewAllText}>
                View All
              </Text>

            </Pressable>

          )}

        </View>


        {pendingRequests.length === 0 ? (

          <View style={styles.emptyCard}>

            <View style={styles.emptyIcon}>

              <Ionicons
                name="checkmark-circle-outline"
                size={30}
                color="#16A34A"
              />

            </View>

            <Text style={styles.emptyTitle}>
              No new requests
            </Text>

            <Text style={styles.emptySubtitle}>
              New customer requests will appear here.
            </Text>

          </View>

        ) : (

          pendingRequests
            .slice(0, 2)
            .map(renderBookingCard)

        )}


        {/* ACTIVE JOBS */}

        <View style={[
          styles.sectionHeader,
          {
            marginTop: 8,
          },
        ]}>

          <View>

            <Text style={styles.sectionTitle}>
              Active Jobs
            </Text>

            <Text style={styles.sectionSubtitle}>
              Your upcoming and ongoing services
            </Text>

          </View>

        </View>


        {activeJobs.length === 0 ? (

          <View style={styles.emptyCard}>

            <View style={styles.emptyIcon}>

              <Ionicons
                name="briefcase-outline"
                size={28}
                color="#2563EB"
              />

            </View>

            <Text style={styles.emptyTitle}>
              No active jobs
            </Text>

            <Text style={styles.emptySubtitle}>
              Accepted jobs will appear here.
            </Text>

          </View>

        ) : (

          activeJobs
            .slice(0, 2)
            .map(renderBookingCard)

        )}


        {/* EARNINGS INFO */}

        <View style={styles.earningInfoCard}>

          <View style={styles.earningInfoIcon}>

            <Ionicons
              name="shield-checkmark-outline"
              size={24}
              color="#2563EB"
            />

          </View>

          <View style={styles.earningInfoContent}>

            <Text style={styles.earningInfoTitle}>
              Secure payments
            </Text>

            <Text style={styles.earningInfoText}>
              You receive your earning only after the
              customer completes payment. Platform
              commission is deducted automatically.
            </Text>

          </View>

        </View>

      </ScrollView>
    );
  };


  /* =======================================================
     REQUESTS
  ======================================================= */

  const renderRequests = () => {

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        <View style={styles.pageHeader}>

          <Text style={styles.pageTitle}>
            Booking Requests
          </Text>

          <Text style={styles.pageSubtitle}>
            Review and manage customer requests
          </Text>

        </View>


        <View style={styles.requestCountCard}>

          <View style={styles.requestCountIcon}>

            <Ionicons
              name="notifications-outline"
              size={22}
              color="#2563EB"
            />

          </View>

          <View style={styles.requestCountContent}>

            <Text style={styles.requestCountTitle}>
              {pendingRequests.length} new request
              {pendingRequests.length !== 1
                ? 's'
                : ''}
            </Text>

            <Text style={styles.requestCountSubtitle}>
              {pendingRequests.some(request => request.bookingType === 'emergency')
                ? 'Emergency requests need immediate response'
                : 'Respond to requests to grow your earnings'}
            </Text>

          </View>

        </View>


        {pendingRequests.length === 0 ? (

          <View style={styles.largeEmptyCard}>

            <View style={styles.largeEmptyIcon}>

              <Ionicons
                name="checkmark-circle-outline"
                size={42}
                color="#16A34A"
              />

            </View>

            <Text style={styles.largeEmptyTitle}>
              You're all caught up
            </Text>

            <Text style={styles.largeEmptySubtitle}>
              There are no pending booking requests right now.
            </Text>

          </View>

        ) : (

          pendingRequests.map(
            renderBookingCard
          )

        )}

      </ScrollView>
    );
  };


  /* =======================================================
     EARNINGS
  ======================================================= */

  const renderEarnings = () => {

    return (
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        <View style={styles.pageHeader}>

          <Text style={styles.pageTitle}>
            Earnings
          </Text>

          <Text style={styles.pageSubtitle}>
            Track your completed service payments
          </Text>

        </View>


        {/* TOTAL */}

        <View style={styles.totalEarningsCard}>

          <View style={styles.totalEarningsIcon}>

            <Ionicons
              name="wallet-outline"
              size={27}
              color="#FFFFFF"
            />

          </View>

          <Text style={styles.totalEarningsLabel}>
            Available Earnings
          </Text>

          <Text style={styles.totalEarningsAmount}>
            ₹{formatMoney(totalEarnings)}
          </Text>

          <Text style={styles.totalEarningsSubtext}>
            From {completedPaidJobs.length} paid job
            {completedPaidJobs.length !== 1
              ? 's'
              : ''}
          </Text>

        </View>


        {/* PENDING */}

        <View style={styles.pendingEarningsCard}>

          <View style={styles.pendingEarningsIcon}>

            <Ionicons
              name="time-outline"
              size={23}
              color="#EA580C"
            />

          </View>

          <View style={styles.pendingEarningsContent}>

            <Text style={styles.pendingEarningsTitle}>
              Payment Pending
            </Text>

            <Text style={styles.pendingEarningsAmount}>
              ₹{formatMoney(pendingEarnings)}
            </Text>

            <Text style={styles.pendingEarningsSubtitle}>
              Waiting for customers to complete payment
            </Text>

          </View>

        </View>


        {/* COMMISSION EXPLANATION */}

        <View style={styles.commissionCard}>

          <View style={styles.commissionIcon}>

            <Ionicons
              name="information-circle-outline"
              size={22}
              color="#2563EB"
            />

          </View>

          <View style={styles.commissionContent}>

            <Text style={styles.commissionTitle}>
              How your earnings work
            </Text>

            <Text style={styles.commissionText}>
              Customer payment → platform commission
              → your final earning.
            </Text>

            <Text style={styles.commissionExample}>
              Example: ₹800 customer payment
              {'\n'}
              ₹80 platform commission
              {'\n'}
              ₹720 worker earning
            </Text>

          </View>

        </View>


        {/* PAYMENT HISTORY */}

        <Text style={styles.historyTitle}>
          Payment History
        </Text>


        {completedPaidJobs.length === 0 ? (

          <View style={styles.emptyCard}>

            <View style={styles.emptyIcon}>

              <Ionicons
                name="receipt-outline"
                size={28}
                color="#2563EB"
              />

            </View>

            <Text style={styles.emptyTitle}>
              No payment history
            </Text>

            <Text style={styles.emptySubtitle}>
              Your completed payments will appear here.
            </Text>

          </View>

        ) : (

          completedPaidJobs.map(
            booking => (

              <View
                key={booking.id}
                style={styles.historyCard}
              >

                <View style={styles.historyIcon}>

                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color="#16A34A"
                  />

                </View>

                <View style={styles.historyContent}>

                  <Text style={styles.historyService}>
                    {booking.service}
                  </Text>

                  <Text style={styles.historyCustomer}>
                    {booking.customerName}
                  </Text>

                  <Text style={styles.historyDate}>
                    {booking.date}
                  </Text>

                </View>

                <View style={styles.historyAmountContainer}>

                  <Text style={styles.historyAmount}>
                    +₹{formatMoney(booking.workerEarning)}
                  </Text>

                  <Text style={styles.paidText}>
                    Paid
                  </Text>

                </View>

              </View>

            )

          )

        )}

      </ScrollView>
    );
  };


  /* =======================================================
     PROFILE
  ======================================================= */

  const workerBackend = workerProfile?.worker_profile || {};

  const workerAddressText = useMemo(() => {
    const address = workerBackend?.service_address || {};
    return [
      address.house,
      address.locality,
      address.city,
      address.state,
      address.pincode,
    ].filter(Boolean).join(', ') || 'Service location not available';
  }, [workerBackend]);

  const formatWorkingHours = (hours: any) => {
    if (!Array.isArray(hours) || hours.length === 0) {
      return 'Preferred hours not set';
    }
    return hours.join(', ');
  };

  const formatWorkingDays = (days: any) => {
    if (!Array.isArray(days) || days.length === 0) {
      return 'Working days not set';
    }
    return days.join(', ');
  };

  /* =======================================================
     EDIT WORKER PROFILE
  ======================================================= */

  const openWorkerEdit = async () => {
    const backend = workerProfile?.worker_profile || {};
    const skills = Array.isArray(backend?.skills) ? backend.skills : [];
    const primary = skills.find((skill: any) => skill.is_primary) || skills[0] || {};
    const currentSubskill = Array.isArray(backend?.subskills)
      ? backend.subskills.find((subskill: any) => subskill.is_primary) || backend.subskills[0]
      : null;

    const address = backend?.service_address || {};
    const location = backend?.location || {};

    setWorkerEditName(workerProfile?.full_name || workerFromRoute?.name || "");
    setWorkerEditPhone(workerProfile?.phone || workerFromRoute?.phone || "");
    setWorkerEditBio(backend?.bio || "");
    setWorkerEditPrimarySkill(primary?.slug || primary?.name || "");
    setWorkerEditSubskillId(
      currentSubskill && String(currentSubskill.skill_id) === String(primary?.id)
        ? currentSubskill.id
        : ""
    );
    setWorkerEditExperience(
      primary?.years_experience != null ? String(primary.years_experience) : ""
    );
    setWorkerEditRadius(
      backend?.service_radius_km != null ? String(backend.service_radius_km) : ""
    );
    setWorkerEditDays(
      Array.isArray(backend?.working_days) ? backend.working_days.join(", ") : ""
    );
    setWorkerEditHours(
      Array.isArray(backend?.working_hours) ? backend.working_hours.join(", ") : ""
    );
    setWorkerEditHouse(address?.house || "");
    setWorkerEditLocality(address?.locality || "");
    setWorkerEditCity(address?.city || "");
    setWorkerEditState(address?.state || "");
    setWorkerEditPincode(address?.pincode || "");
    setWorkerEditLandmark(address?.landmark || "");
    setWorkerEditLatitude(location?.latitude ?? address?.latitude ?? null);
    setWorkerEditLongitude(location?.longitude ?? address?.longitude ?? null);

    try {
      const catalog = await getSkillsWithSubskills();
      const primarySkillId = primary?.id;
      const primaryRecord = (Array.isArray(catalog) ? catalog : []).find(
        (skill: any) => String(skill.id) === String(primarySkillId)
      );
      setWorkerEditAvailableSubskills(
        Array.isArray(primaryRecord?.subskills) ? primaryRecord.subskills : []
      );
    } catch (error) {
      console.error("Failed to load worker subskills:", error);
      setWorkerEditAvailableSubskills([]);
    }

    setWorkerEditVisible(true);
  };

  const handleWorkerEditCurrentLocation = async () => {
    setWorkerLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Location Permission Required",
          "Please allow location access so ShramSaathi can automatically fill your service address."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setWorkerEditLatitude(latitude);
      setWorkerEditLongitude(longitude);

      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length === 0) {
        Alert.alert(
          "Address Not Found",
          "We could not determine your address. Please enter it manually."
        );
        return;
      }

      const currentAddress = addresses[0];
      setWorkerEditHouse(currentAddress.streetNumber || currentAddress.name || "");
      setWorkerEditLocality(currentAddress.district || currentAddress.subregion || "");
      setWorkerEditCity(currentAddress.city || currentAddress.subregion || "");
      setWorkerEditState(currentAddress.region || "");
      setWorkerEditPincode(currentAddress.postalCode || "");

      Alert.alert(
        "Location Found",
        "Address fields have been filled from your current location. Please verify them and save."
      );
    } catch (error) {
      console.error("Worker address location error:", error);
      Alert.alert(
        "Location Error",
        "Unable to fetch your current location. Please enter your address manually."
      );
    } finally {
      setWorkerLocationLoading(false);
    }
  };

  const handleSaveWorkerProfile = async () => {
    const name = workerEditName.trim();
    const phone = workerEditPhone.trim();
    const pincode = workerEditPincode.trim();

    if (name.length < 2) {
      Alert.alert("Invalid Name", "Please enter your full name.");
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      Alert.alert("Invalid Mobile Number", "Please enter a valid 10-digit mobile number.");
      return;
    }

    if (
      !workerEditHouse.trim() ||
      !workerEditLocality.trim() ||
      !workerEditCity.trim() ||
      !workerEditState.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      Alert.alert(
        "Incomplete Address",
        "Please fill in house, locality, city, state and a valid 6-digit PIN code."
      );
      return;
    }

    if (workerEditLatitude === null || workerEditLongitude === null) {
      Alert.alert(
        "Location Required",
        'Please use "Current Location" before saving your service address.'
      );
      return;
    }

    const experience = Number(workerEditExperience);
    const radius = Number(workerEditRadius);

    if (
      workerEditExperience.trim() &&
      (!Number.isFinite(experience) || experience < 0 || experience > 60)
    ) {
      Alert.alert(
        "Invalid Experience",
        "Years of experience must be between 0 and 60."
      );
      return;
    }

    if (
      workerEditRadius.trim() &&
      (!Number.isFinite(radius) || radius <= 0)
    ) {
      Alert.alert(
        "Invalid Service Radius",
        "Service radius must be greater than 0."
      );
      return;
    }

    const formattedAddress = [
      workerEditHouse.trim(),
      workerEditLocality.trim(),
      workerEditCity.trim(),
      workerEditState.trim(),
      pincode,
    ].filter(Boolean).join(", ");

    // Primary skill is fixed after worker registration. Use the saved
    // primary skill from the backend and never take it from editable input.
    const primarySkillRecord = (Array.isArray(workerBackend?.skills) ? workerBackend.skills : []).find(
      (skill: any) => skill.is_primary
    ) || (Array.isArray(workerBackend?.skills) ? workerBackend.skills[0] : null);

    if (!primarySkillRecord?.id) {
      Alert.alert(
        "Primary Skill Unavailable",
        "Your saved primary skill could not be found. Please try again."
      );
      return;
    }

    if (!workerEditSubskillId) {
      Alert.alert(
        "Select Subskill",
        "Please select a subskill under your primary skill."
      );
      return;
    }

    const selectedSubskill = workerEditAvailableSubskills.find(
      (subskill: any) => subskill.id === workerEditSubskillId
    );

    if (workerEditSubskillId && (!selectedSubskill || String(selectedSubskill.skill_id) !== String(primarySkillRecord.id))) {
      Alert.alert(
        "Invalid Subskill",
        "Please select a subskill that belongs to your primary skill."
      );
      return;
    }

    const workingDays = workerEditDays
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    const workingHours = workerEditHours
      .split(",")
      .map(value => value.trim())
      .filter(Boolean);

    try {
      setWorkerEditSaving(true);

      await updateWorkerProfile({
        full_name: name,
        phone,
        bio: workerEditBio.trim(),
        primary_skill_id: primarySkillRecord.id,
        primary_subskill_id: workerEditSubskillId,
        years_experience: Number.isFinite(experience) ? experience : 0,
        ...(workerEditRadius.trim()
          ? { service_radius_km: radius }
          : {}),
        working_days: workingDays,
        working_hours: workingHours,
        service_address: {
          house: workerEditHouse.trim(),
          locality: workerEditLocality.trim(),
          city: workerEditCity.trim(),
          state: workerEditState.trim(),
          pincode,
          landmark: workerEditLandmark.trim(),
        },
        latitude: workerEditLatitude,
        longitude: workerEditLongitude,
      });

      setWorkerEditVisible(false);
      await loadWorkerDashboard(true);

      Alert.alert(
        "Profile Updated",
        "Your worker profile has been updated successfully."
      );
    } catch (error) {
      console.error("Worker profile update error:", error);
      Alert.alert(
        "Unable to Update Profile",
        error instanceof Error
          ? error.message
          : "Something went wrong while saving your profile."
      );
    } finally {
      setWorkerEditSaving(false);
    }
  };


  const showProfessionalProfile = () => {
    const skills = Array.isArray(workerBackend?.skills)
      ? workerBackend.skills
      : [];
    const skillText = skills.length
      ? skills.map((skill: any) =>
          `${skill.name}${skill.years_experience != null ? ` (${skill.years_experience} yrs)` : ''}${skill.is_primary ? ' • Primary' : ''}`
        ).join('\n')
      : 'No skills available';

    Alert.alert(
      'Professional Profile',
      `Skills:\n${skillText}\n\nExperience: ${WORKER.yearsExperience != null ? `${WORKER.yearsExperience} years` : 'Not provided'}\n\nDescription:\n${WORKER.bio || 'No description provided.'}`
    );
  };

  const showServiceArea = () => {
    Alert.alert(
      'Service Area',
      `Work location:\n${workerAddressText}\n\nService radius: ${WORKER.serviceRadiusKm != null ? `${WORKER.serviceRadiusKm} km` : 'Not set'}\n\nCoordinates: ${workerBackend?.location?.latitude != null && workerBackend?.location?.longitude != null ? `${workerBackend.location.latitude}, ${workerBackend.location.longitude}` : 'Not available'}`
    );
  };

  const showAvailability = () => {
    Alert.alert(
      'Availability',
      `Working days:\n${formatWorkingDays(WORKER.workingDays)}\n\nPreferred hours:\n${formatWorkingHours(WORKER.workingHours)}`
    );
  };

  const showVerification = () => {
    const documents = Array.isArray(WORKER.documents)
      ? WORKER.documents
      : [];

    if (documents.length === 0) {
      Alert.alert(
        "Verification",
        "No verification documents found."
      );
      return;
    }

    const buttons = documents.slice(0, 3).map((doc: any) => ({
      text: `View ${doc.title || doc.file_type || "Document"}`,
      onPress: async () => {
        const url = doc.public_url || doc.url;

        if (!url) {
          Alert.alert(
            "Document Unavailable",
            "This document does not have a viewable URL."
          );
          return;
        }

        try {
          const supported = await Linking.canOpenURL(url);

          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert(
              "Unable to Open Document",
              "This document could not be opened on this device."
            );
          }
        } catch (error) {
          console.error("Document open error:", error);
          Alert.alert(
            "Unable to Open Document",
            "This document could not be opened on this device."
          );
        }
      },
    }));

    Alert.alert(
      "Verification Documents",
      `${documents.length} document${documents.length === 1 ? "" : "s"} on file.\n\n${documents
        .map(
          (doc: any) =>
            `• ${doc.title || doc.file_type || "Document"}`
        )
        .join("\n")}`,
      buttons
    );
  };

  const renderProfile = () => {

    return (
      <>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={
          styles.scrollContent
        }
      >

        <View style={styles.pageHeader}>

          <Text style={styles.pageTitle}>
            My Profile
          </Text>

          <Text style={styles.pageSubtitle}>
            Manage your worker account
          </Text>

          <Pressable
            style={styles.profileEditButton}
            onPress={openWorkerEdit}
          >
            <Ionicons name="create-outline" size={18} color="#FFFFFF" />
            <Text style={styles.profileEditButtonText}>Edit Profile</Text>
          </Pressable>

        </View>


        {/* PROFILE */}

        <View style={styles.profileCard}>

          <View style={styles.profileAvatar}>
            {WORKER.avatarUrl ? (
              <Image
                source={{ uri: WORKER.avatarUrl }}
                style={styles.profileAvatarImage}
              />
            ) : (
              <Ionicons
                name="person"
                size={38}
                color="#2563EB"
              />
            )}
          </View>

          <Text style={styles.profileName}>
            {WORKER.name}
          </Text>

          <Text style={styles.profileSkill}>
            {WORKER.skill}
          </Text>

          <View style={styles.profileRating}>

            <Ionicons
              name="star"
              size={16}
              color="#F59E0B"
            />

            <Text style={styles.profileRatingText}>
              {WORKER.rating} rating
            </Text>

            <Text style={styles.profileDivider}>
              •
            </Text>

            <Text style={styles.profileJobs}>
              {WORKER.completedJobs} jobs completed
            </Text>

          </View>

        </View>


        {/* PROFILE OPTIONS */}

        <View style={styles.profileOptions}>

          <Pressable
            style={styles.profileOption}
            onPress={showProfessionalProfile}
          >

            <View style={styles.profileOptionIcon}>

              <Ionicons
                name="person-outline"
                size={21}
                color="#2563EB"
              />

            </View>

            <View style={styles.profileOptionContent}>

              <Text style={styles.profileOptionTitle}>
                Professional Profile
              </Text>

              <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                {WORKER.skill} • {WORKER.yearsExperience != null ? `${WORKER.yearsExperience} years experience` : 'Experience not set'}
              </Text>

            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color="#9CA3AF"
            />

          </Pressable>


          <Pressable
            style={styles.profileOption}
            onPress={showServiceArea}
          >

            <View style={styles.profileOptionIcon}>

              <Ionicons
                name="location-outline"
                size={21}
                color="#2563EB"
              />

            </View>

            <View style={styles.profileOptionContent}>

              <Text style={styles.profileOptionTitle}>
                Service Area
              </Text>

              <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                {workerAddressText} • {WORKER.serviceRadiusKm != null ? `${WORKER.serviceRadiusKm} km radius` : 'Radius not set'}
              </Text>

            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color="#9CA3AF"
            />

          </Pressable>


          <Pressable
            style={styles.profileOption}
            onPress={showAvailability}
          >

            <View style={styles.profileOptionIcon}>

              <Ionicons
                name="time-outline"
                size={21}
                color="#2563EB"
              />

            </View>

            <View style={styles.profileOptionContent}>

              <Text style={styles.profileOptionTitle}>
                Availability
              </Text>

              <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                {WORKER.workingDays?.length ? `${WORKER.workingDays.join(', ')}` : 'Working days not set'}
              </Text>

            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color="#9CA3AF"
            />

          </Pressable>


          <Pressable
            style={styles.profileOption}
            onPress={showVerification}
          >

            <View style={styles.profileOptionIcon}>

              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color="#2563EB"
              />

            </View>

            <View style={styles.profileOptionContent}>

              <Text style={styles.profileOptionTitle}>
                Verification
              </Text>

              <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                {WORKER.documents?.length || 0} verification document{(WORKER.documents?.length || 0) === 1 ? '' : 's'} on file
              </Text>

            </View>

            <Ionicons
              name="chevron-forward"
              size={19}
              color="#9CA3AF"
            />

          </Pressable>

        </View>


        {/* LOGOUT */}

        <Pressable
          style={styles.logoutButton}
          onPress={handleLogout}
        >

          <Ionicons
            name="log-out-outline"
            size={20}
            color="#DC2626"
          />

          <Text style={styles.logoutText}>
            Logout
          </Text>

        </Pressable>


        <Text style={styles.profileFooter}>
          ShramSaathi • Worker Portal
        </Text>

      </ScrollView>

      <Modal
        visible={workerEditVisible}
        animationType="slide"
        onRequestClose={() => {
          if (!workerEditSaving && !workerLocationLoading) {
            setWorkerEditVisible(false);
          }
        }}
      >
        <SafeAreaView style={styles.workerEditScreen} edges={["top", "bottom"]}>
          <View style={styles.workerEditHeader}>
            <Pressable
              onPress={() => {
                if (!workerEditSaving && !workerLocationLoading) {
                  setWorkerEditVisible(false);
                }
              }}
            >
              <Ionicons name="arrow-back" size={24} color="#222222" />
            </Pressable>

            <Text style={styles.workerEditTitle}>Edit Profile</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.workerEditContent}
          >
            <Text style={styles.workerEditSectionTitle}>Personal Information</Text>

            <Text style={styles.workerEditLabel}>Full Name</Text>
            <TextInput
              style={styles.workerEditInput}
              value={workerEditName}
              onChangeText={setWorkerEditName}
              placeholder="Enter your full name"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.workerEditLabel}>Phone Number</Text>
            <TextInput
              style={styles.workerEditInput}
              value={workerEditPhone}
              onChangeText={setWorkerEditPhone}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
            />

            <Text style={styles.workerEditLabel}>Professional Description</Text>
            <TextInput
              style={[styles.workerEditInput, styles.workerEditTextArea]}
              value={workerEditBio}
              onChangeText={setWorkerEditBio}
              placeholder="Describe your experience and services"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />

            <Text style={styles.workerEditSectionTitle}>Professional Details</Text>

            <Text style={styles.workerEditLabel}>Primary Skill</Text>
            <TextInput
              style={[styles.workerEditInput, { backgroundColor: "#F3F4F6", color: "#6B7280" }]}
              value={workerEditPrimarySkill}
              editable={false}
              placeholder="Primary skill"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={{ color: "#6B7280", fontSize: 12, marginTop: -6, marginBottom: 12 }}>
              Primary skill is fixed after registration. You can change your subskill below.
            </Text>

            <Text style={styles.workerEditLabel}>Subskill</Text>
            {workerEditAvailableSubskills.length > 0 ? (
              <View style={styles.workerEditSubskillList}>
                {workerEditAvailableSubskills.map((subskill: any) => {
                  const selected = workerEditSubskillId === subskill.id;
                  return (
                    <Pressable
                      key={subskill.id}
                      style={[
                        styles.workerEditSubskillOption,
                        selected && styles.workerEditSubskillOptionSelected,
                      ]}
                      onPress={() => setWorkerEditSubskillId(subskill.id)}
                    >
                      <Text
                        style={[
                          styles.workerEditSubskillText,
                          selected && styles.workerEditSubskillTextSelected,
                        ]}
                      >
                        {subskill.name}
                      </Text>
                      {selected ? (
                        <Ionicons name="checkmark-circle" size={18} color="#7047E8" />
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.workerEditSubskillEmpty}>
                <Text style={styles.workerEditSubskillEmptyText}>
                  No subskills are available for this primary skill.
                </Text>
              </View>
            )}

            <Text style={styles.workerEditLabel}>Years of Experience</Text>
            <TextInput
              style={styles.workerEditInput}
              value={workerEditExperience}
              onChangeText={setWorkerEditExperience}
              placeholder="e.g. 5"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />

            <Text style={styles.workerEditLabel}>Service Radius (km)</Text>
            <TextInput
              style={styles.workerEditInput}
              value={workerEditRadius}
              onChangeText={setWorkerEditRadius}
              placeholder="e.g. 10"
              placeholderTextColor="#9CA3AF"
              keyboardType="decimal-pad"
            />

            <Text style={styles.workerEditSectionTitle}>Availability</Text>

            <Text style={styles.workerEditLabel}>Working Days</Text>
            <TextInput
              style={styles.workerEditInput}
              value={workerEditDays}
              onChangeText={setWorkerEditDays}
              placeholder="Monday, Tuesday, Wednesday"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.workerEditLabel}>Preferred Hours</Text>
            <TextInput
              style={styles.workerEditInput}
              value={workerEditHours}
              onChangeText={setWorkerEditHours}
              placeholder="09:00 AM - 01:00 PM, 02:00 PM - 06:00 PM"
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.workerEditSectionTitle}>Service Address</Text>

            <Pressable
              style={[
                styles.workerLocationButton,
                workerLocationLoading && styles.workerLocationButtonDisabled,
              ]}
              onPress={handleWorkerEditCurrentLocation}
              disabled={workerLocationLoading || workerEditSaving}
            >
              {workerLocationLoading ? (
                <ActivityIndicator size="small" color="#2563EB" />
              ) : (
                <Ionicons name="location-outline" size={21} color="#2563EB" />
              )}

              <View style={{ flex: 1 }}>
                <Text style={styles.workerLocationTitle}>
                  {workerLocationLoading
                    ? "Fetching Location..."
                    : "Use Current Location"}
                </Text>
                <Text style={styles.workerLocationSubtitle}>
                  Automatically fill your service address and coordinates
                </Text>
              </View>
            </Pressable>

            {[
              ["House / Flat / Building", workerEditHouse, setWorkerEditHouse, "House no., flat no., building"],
              ["Street / Locality", workerEditLocality, setWorkerEditLocality, "Street, colony, locality"],
              ["City", workerEditCity, setWorkerEditCity, "Enter city"],
              ["State", workerEditState, setWorkerEditState, "Enter state"],
              ["PIN Code", workerEditPincode, setWorkerEditPincode, "6-digit PIN code"],
              ["Landmark (optional)", workerEditLandmark, setWorkerEditLandmark, "Nearby landmark"],
            ].map(([label, value, setter, placeholder]) => (
              <View key={label as string}>
                <Text style={styles.workerEditLabel}>{label as string}</Text>
                <TextInput
                  style={styles.workerEditInput}
                  value={value as string}
                  onChangeText={setter as (value: string) => void}
                  placeholder={placeholder as string}
                  placeholderTextColor="#9CA3AF"
                  keyboardType={label === "PIN Code" ? "number-pad" : "default"}
                  maxLength={label === "PIN Code" ? 6 : undefined}
                />
              </View>
            ))}

            <Pressable
              style={[
                styles.workerSaveButton,
                workerEditSaving && styles.workerSaveButtonDisabled,
              ]}
              onPress={handleSaveWorkerProfile}
              disabled={workerEditSaving || workerLocationLoading}
            >
              {workerEditSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={styles.workerSaveButtonText}>Save Changes</Text>
                </>
              )}
            </Pressable>

            <Text style={styles.workerEditNote}>
              Verification documents are read-only here and cannot be edited or replaced from your profile.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
      </>
    );
  };


  /* =======================================================
     BOOKING DETAILS MODAL
  ======================================================= */

  const renderBookingDetails = () => {

    if (!selectedBooking) {
      return null;
    }

    const booking =
      selectedBooking;


    return (
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          setDetailsVisible(false)
        }
      >

        <View style={styles.modalOverlay}>

          <View style={styles.modalContainer}>

            <View style={styles.modalHandle} />


            {/* HEADER */}

            <View style={styles.modalHeader}>

              <View>

                <Text style={styles.modalTitle}>
                  Booking Details
                </Text>

                <Text style={styles.modalSubtitle}>
                  Booking ID: {booking.id}
                </Text>

              </View>


              <Pressable
                style={styles.modalClose}
                onPress={() =>
                  setDetailsVisible(false)
                }
              >

                <Ionicons
                  name="close"
                  size={21}
                  color="#6B7280"
                />

              </Pressable>

            </View>


            {/* CUSTOMER */}

            <View style={styles.modalCustomer}>

              <View style={styles.modalCustomerAvatar}>

                <Ionicons
                  name="person-outline"
                  size={27}
                  color="#2563EB"
                />

              </View>

              <View style={styles.modalCustomerInfo}>

                <Text style={styles.modalCustomerName}>
                  {booking.customerName}
                </Text>

                <Text style={styles.modalCustomerPhone}>
                  {booking.customerPhone}
                </Text>

              </View>

            </View>


            {/* CUSTOMER ACTIONS */}

            <View style={styles.modalContactRow}>

              <Pressable
                style={styles.modalContactButton}
                onPress={() => handleCallCustomer(booking)}
              >
                <Ionicons name="call-outline" size={18} color="#2563EB" />
                <Text style={styles.modalContactText}>Call Customer</Text>
              </Pressable>

              <Pressable
                style={styles.modalContactButton}
                onPress={() => handleOpenCustomerLocation(booking)}
              >
                <Ionicons name="map-outline" size={18} color="#2563EB" />
                <Text style={styles.modalContactText}>Open Maps</Text>
              </Pressable>

            </View>


            {/* SERVICE */}

            <View style={styles.modalDetailSection}>

              <Text style={styles.modalDetailLabel}>
                Service
              </Text>

              <Text style={styles.modalDetailValue}>
                {booking.service}
              </Text>

              <Text style={styles.modalDetailSubvalue}>
                {booking.serviceDescription}
              </Text>

            </View>


            {booking.bookingType === 'emergency' && (
              <View style={styles.modalEmergencyBanner}>
                <Ionicons name="flash" size={20} color="#DC2626" />
                <View style={styles.modalEmergencyContent}>
                  <Text style={styles.modalEmergencyTitle}>Emergency Service</Text>
                  <Text style={styles.modalEmergencyText}>Customer requested immediate service.</Text>
                </View>
              </View>
            )}

            {/* DATE */}

            {booking.bookingType === 'emergency' ? (
              <View style={styles.modalImmediateRow}>
                <Ionicons name="flash-outline" size={19} color="#DC2626" />
                <View>
                  <Text style={styles.detailSmallLabel}>Response</Text>
                  <Text style={styles.detailSmallValue}>Immediate</Text>
                </View>
              </View>
            ) : (
            <View style={styles.modalTwoColumns}>

              <View style={styles.modalDetailColumn}>

                <View style={styles.detailIcon}>

                  <Ionicons
                    name="calendar-outline"
                    size={19}
                    color="#2563EB"
                  />

                </View>

                <Text style={styles.detailSmallLabel}>
                  Date
                </Text>

                <Text style={styles.detailSmallValue}>
                  {booking.date}
                </Text>

              </View>


              <View style={styles.modalDetailColumn}>

                <View style={styles.detailIcon}>

                  <Ionicons
                    name="time-outline"
                    size={19}
                    color="#2563EB"
                  />

                </View>

                <Text style={styles.detailSmallLabel}>
                  Time
                </Text>

                <Text style={styles.detailSmallValue}>
                  {booking.time}
                </Text>

              </View>

            </View>
            )}


            {/* ADDRESS */}

            <View style={styles.modalDetailSection}>

              <Text style={styles.modalDetailLabel}>
                Service Address
              </Text>

              <View style={styles.addressRow}>

                <Ionicons
                  name="location-outline"
                  size={19}
                  color="#2563EB"
                />

                <Text style={styles.addressText}>
                  {booking.address}
                  {typeof booking.latitude === 'number' && typeof booking.longitude === 'number'
                    ? `\n\nMap location available`
                    : ''}
                </Text>

              </View>

            </View>


            {/* PAYMENT */}

            <View style={styles.paymentBreakdown}>

              <Text style={styles.paymentBreakdownTitle}>
                Payment Summary
              </Text>


              <View style={styles.paymentLine}>

                <Text style={styles.paymentLineLabel}>
                  Customer payment
                </Text>

                <Text style={styles.paymentLineValue}>
                  ₹{formatMoney(booking.amount)}
                </Text>

              </View>


              <View style={styles.paymentLine}>

                <Text style={styles.paymentLineLabel}>
                  Platform commission
                </Text>

                <Text style={styles.commissionValue}>
                  - ₹{formatMoney(booking.commission)}
                </Text>

              </View>


              <View style={styles.paymentSeparator} />


              <View style={styles.paymentLine}>

                <Text style={styles.finalEarningLabel}>
                  Your earning
                </Text>

                <Text style={styles.finalEarningValue}>
                  ₹{formatMoney(booking.workerEarning)}
                </Text>

              </View>

            </View>


            {/* PAYMENT STATUS */}

            {booking.status === 'payment_pending' && (

              <View style={styles.modalPaymentPending}>

                <Ionicons
                  name="time-outline"
                  size={19}
                  color="#EA580C"
                />

                <View style={styles.modalPaymentContent}>

                  <Text style={styles.modalPaymentTitle}>
                    Waiting for customer payment
                  </Text>

                  <Text style={styles.modalPaymentText}>
                    The customer will receive a payment
                    request after you complete the work.
                  </Text>

                </View>

              </View>

            )}


            {booking.status === 'paid' && (

              <View style={styles.modalPaymentReceived}>

                <Ionicons
                  name="checkmark-circle"
                  size={19}
                  color="#16A34A"
                />

                <Text style={styles.modalPaymentReceivedText}>
                  Payment received. ₹{formatMoney(booking.workerEarning)}
                  {' '}is now available as your earning.
                </Text>

              </View>

            )}


            {/* ACTIONS */}

            {booking.status === 'pending' && (

              <View style={styles.modalActions}>

                <Pressable
                  style={styles.modalRejectButton}
                  onPress={() =>
                    handleRejectBooking(
                      booking
                    )
                  }
                >

                  <Text style={styles.modalRejectText}>
                    Decline
                  </Text>

                </Pressable>


                <Pressable
                  style={styles.modalAcceptButton}
                  onPress={() => {

                    handleAcceptBooking(
                      booking
                    );

                    setDetailsVisible(false);

                  }}
                >

                  <Text style={styles.modalAcceptText}>
                    Accept Request
                  </Text>

                </Pressable>

              </View>

            )}


            {booking.status === 'accepted' && (

              <Pressable
                style={styles.modalStartButton}
                onPress={() => {

                  handleStartJob(
                    booking
                  );

                }}
              >

                <Ionicons
                  name="play"
                  size={18}
                  color="#FFFFFF"
                />

                <Text style={styles.modalStartText}>
                  Start Job
                </Text>

              </Pressable>

            )}


            {booking.status === 'started' && (

              <Pressable
                style={styles.modalCompleteButton}
                onPress={() =>
                  handleCompleteJob(
                    booking
                  )
                }
              >

                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.modalCompleteText}>
                  Mark Work Completed
                </Text>

              </Pressable>

            )}


            <Pressable
              style={styles.modalCancelButton}
              onPress={() =>
                setDetailsVisible(false)
              }
            >

              <Text style={styles.modalCancelText}>
                Close
              </Text>

            </Pressable>

          </View>

        </View>

      </Modal>
    );
  };


  /* =======================================================
     MAIN RETURN
  ======================================================= */

  return (

    <SafeAreaView
      style={styles.safeArea}
      edges={['top', 'bottom']}
    >

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F9FAFB"
      />


      <View style={styles.container}>

        {/* CONTENT */}

        <View style={styles.content}>

          {activeTab === 'home' &&
            renderHome()}

          {activeTab === 'requests' &&
            renderRequests()}

          {activeTab === 'earnings' &&
            renderEarnings()}

          {activeTab === 'profile' &&
            renderProfile()}

        </View>


        {/* BOTTOM NAVIGATION */}

        <View style={styles.bottomNavigation}>

          {/* HOME */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              setActiveTab('home')
            }
          >

            <View
              style={[
                styles.navIcon,
                activeTab === 'home' &&
                  styles.navIconActive,
              ]}
            >

              <Ionicons
                name={
                  activeTab === 'home'
                    ? 'home'
                    : 'home-outline'
                }
                size={21}
                color={
                  activeTab === 'home'
                    ? '#FFFFFF'
                    : '#777777'
                }
              />

            </View>

            <Text
              style={[
                styles.navText,
                activeTab === 'home' &&
                  styles.navTextActive,
              ]}
            >
              Home
            </Text>

          </Pressable>


          {/* REQUESTS */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              setActiveTab('requests')
            }
          >

            <View
              style={[
                styles.navIcon,
                activeTab === 'requests' &&
                  styles.navIconActive,
              ]}
            >

              <Ionicons
                name={
                  activeTab === 'requests'
                    ? 'calendar'
                    : 'calendar-outline'
                }
                size={21}
                color={
                  activeTab === 'requests'
                    ? '#FFFFFF'
                    : '#777777'
                }
              />

              {pendingRequests.length > 0 && (
                <View style={styles.navBadge}>
                  <Text style={styles.navBadgeText}>
                    {pendingRequests.length}
                  </Text>
                </View>
              )}

            </View>

            <Text
              style={[
                styles.navText,
                activeTab === 'requests' &&
                  styles.navTextActive,
              ]}
            >
              Requests
            </Text>

          </Pressable>


          {/* EARNINGS */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              setActiveTab('earnings')
            }
          >

            <View
              style={[
                styles.navIcon,
                activeTab === 'earnings' &&
                  styles.navIconActive,
              ]}
            >

              <Ionicons
                name={
                  activeTab === 'earnings'
                    ? 'wallet'
                    : 'wallet-outline'
                }
                size={21}
                color={
                  activeTab === 'earnings'
                    ? '#FFFFFF'
                    : '#777777'
                }
              />

            </View>

            <Text
              style={[
                styles.navText,
                activeTab === 'earnings' &&
                  styles.navTextActive,
              ]}
            >
              Earnings
            </Text>

          </Pressable>


          {/* PROFILE */}

          <Pressable
            style={styles.navItem}
            onPress={() =>
              setActiveTab('profile')
            }
          >

            <View
              style={[
                styles.navIcon,
                activeTab === 'profile' &&
                  styles.navIconActive,
              ]}
            >

              <Ionicons
                name={
                  activeTab === 'profile'
                    ? 'person'
                    : 'person-outline'
                }
                size={21}
                color={
                  activeTab === 'profile'
                    ? '#FFFFFF'
                    : '#777777'
                }
              />

            </View>

            <Text
              style={[
                styles.navText,
                activeTab === 'profile' &&
                  styles.navTextActive,
              ]}
            >
              Profile
            </Text>

          </Pressable>

        </View>

      </View>


      {/* BOOKING DETAILS */}

      {renderBookingDetails()}

    </SafeAreaView>
  );
}


/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
  },


  /* =======================================================
     HEADER
  ======================================================= */

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },

  headerLeft: {
    flex: 1,
  },

  welcomeText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 3,
  },

  workerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },

  workerSkillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 7,
    gap: 5,
  },

  skillBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    marginRight: 3,
  },

  skillBadgeText: {
    fontSize: 10.5,
    color: '#2563EB',
    fontWeight: '700',
  },

  ratingText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },

  notificationButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
  },

  notificationDot: {
    position: 'absolute',
    right: 9,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },


  /* =======================================================
     AVAILABILITY
  ======================================================= */

  availabilityCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 15,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },

  availabilityIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    justifyContent: 'center',
    alignItems: 'center',
  },

  availabilityContent: {
    flex: 1,
    marginLeft: 11,
  },

  availabilityTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#15803D',
  },

  availabilitySubtitle: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    marginRight: 3,
  },


  /* =======================================================
     STATS
  ======================================================= */

  statsRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 23,
  },

  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 11,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },

  statValue: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  statLabel: {
    fontSize: 9.5,
    color: '#6B7280',
    marginTop: 2,
  },


  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },

  sectionSubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
    marginBottom: 2,
  },


  /* =======================================================
     BOOKING CARD
  ======================================================= */

  bookingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    marginBottom: 12,
  },

  bookingTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  customerAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  customerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  customerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  serviceName: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 9.5,
    fontWeight: '700',
  },

  bookingServiceRow: {
    flexDirection: 'row',
    marginTop: 14,
  },

  bookingIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },

  bookingServiceInfo: {
    flex: 1,
    marginLeft: 9,
  },

  bookingServiceTitle: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
  },

  bookingServiceAddress: {
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 3,
  },

  bookingMetaRow: {
    flexDirection: 'row',
    marginTop: 13,
    gap: 18,
  },

  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  metaText: {
    fontSize: 10.5,
    color: '#6B7280',
  },


  /* =======================================================
     MONEY
  ======================================================= */

  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    padding: 10,
    marginTop: 13,
  },

  moneyLabel: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginBottom: 2,
  },

  moneyAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: '#374151',
  },

  workerAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#16A34A',
  },

  moneyDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 25,
  },


  /* =======================================================
     PAYMENT
  ======================================================= */

  emergencyRequestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 11,
  },

  emergencyRequestText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 10,
    fontWeight: '800',
    color: '#DC2626',
  },

  modalEmergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },

  modalEmergencyContent: {
    flex: 1,
    marginLeft: 9,
  },

  modalEmergencyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },

  modalEmergencyText: {
    fontSize: 11,
    color: '#991B1B',
    marginTop: 3,
  },

  modalImmediateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },

  paymentPendingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderRadius: 9,
    padding: 9,
    marginTop: 10,
  },

  paymentPendingText: {
    fontSize: 10.5,
    color: '#C2410C',
    fontWeight: '600',
    marginLeft: 6,
  },

  paymentReceivedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 9,
    padding: 9,
    marginTop: 10,
  },

  paymentReceivedText: {
    fontSize: 10.5,
    color: '#15803D',
    fontWeight: '600',
    marginLeft: 6,
  },


  /* =======================================================
     ACTIONS
  ======================================================= */

  contactActionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },

  contactButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  contactButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563EB',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
  },

  rejectButton: {
    flex: 1,
    height: 43,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  rejectButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },

  acceptButton: {
    flex: 1.4,
    height: 43,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  acceptButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  startButton: {
    height: 43,
    borderRadius: 10,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },

  startButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  completeButton: {
    height: 43,
    borderRadius: 10,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },

  completeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },


  /* =======================================================
     EMPTY
  ======================================================= */

  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 22,
    alignItems: 'center',
    marginBottom: 15,
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
  },

  emptyTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#374151',
  },

  emptySubtitle: {
    fontSize: 10.5,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 4,
  },


  /* =======================================================
     EARNING INFO
  ======================================================= */

  earningInfoCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    marginTop: 3,
  },

  earningInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  earningInfoContent: {
    flex: 1,
    marginLeft: 10,
  },

  earningInfoTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#1E40AF',
  },

  earningInfoText: {
    fontSize: 10.5,
    color: '#4B5563',
    lineHeight: 16,
    marginTop: 3,
  },


  /* =======================================================
     PAGE HEADER
  ======================================================= */

  pageHeader: {
    marginBottom: 20,
  },

  pageTitle: {
    fontSize: 25,
    fontWeight: '800',
    color: '#111827',
  },

  pageSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },


  /* =======================================================
     REQUEST COUNT
  ======================================================= */

  requestCountCard: {
    backgroundColor: '#EFF6FF',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    marginBottom: 17,
  },

  requestCountIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  requestCountContent: {
    flex: 1,
    marginLeft: 10,
  },

  requestCountTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E40AF',
  },

  requestCountSubtitle: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 3,
  },


  /* =======================================================
     LARGE EMPTY
  ======================================================= */

  largeEmptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 45,
    paddingHorizontal: 25,
    alignItems: 'center',
  },

  largeEmptyIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 13,
  },

  largeEmptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#374151',
  },

  largeEmptySubtitle: {
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 17,
    marginTop: 5,
  },


  /* =======================================================
     EARNINGS
  ======================================================= */

  totalEarningsCard: {
    backgroundColor: '#2563EB',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    marginBottom: 13,
  },

  totalEarningsIcon: {
    width: 51,
    height: 51,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 9,
  },

  totalEarningsLabel: {
    fontSize: 11,
    color: '#DBEAFE',
  },

  totalEarningsAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 3,
  },

  totalEarningsSubtext: {
    fontSize: 10,
    color: '#DBEAFE',
    marginTop: 2,
  },

  pendingEarningsCard: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    marginBottom: 13,
  },

  pendingEarningsIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: '#FFEDD5',
    justifyContent: 'center',
    alignItems: 'center',
  },

  pendingEarningsContent: {
    flex: 1,
    marginLeft: 10,
  },

  pendingEarningsTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C2410C',
  },

  pendingEarningsAmount: {
    fontSize: 19,
    fontWeight: '800',
    color: '#9A3412',
    marginTop: 2,
  },

  pendingEarningsSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 1,
  },

  commissionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 14,
    flexDirection: 'row',
    marginBottom: 20,
  },

  commissionIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  commissionContent: {
    flex: 1,
    marginLeft: 10,
  },

  commissionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },

  commissionText: {
    fontSize: 10.5,
    color: '#6B7280',
    lineHeight: 16,
    marginTop: 3,
  },

  commissionExample: {
    fontSize: 10.5,
    color: '#2563EB',
    lineHeight: 16,
    marginTop: 7,
    fontWeight: '600',
  },

  historyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
  },

  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },

  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#F0FDF4',
    justifyContent: 'center',
    alignItems: 'center',
  },

  historyContent: {
    flex: 1,
    marginLeft: 10,
  },

  historyService: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
  },

  historyCustomer: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
  },

  historyDate: {
    fontSize: 9.5,
    color: '#9CA3AF',
    marginTop: 2,
  },

  historyAmountContainer: {
    alignItems: 'flex-end',
  },

  historyAmount: {
    fontSize: 13,
    fontWeight: '800',
    color: '#16A34A',
  },

  paidText: {
    fontSize: 9.5,
    color: '#16A34A',
    marginTop: 2,
  },


  /* =======================================================
     PROFILE
  ======================================================= */

  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    padding: 22,
    marginBottom: 14,
  },

  profileAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },

  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },

  profileName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },

  profileSkill: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
    marginTop: 3,
  },

  profileRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 5,
  },

  profileRatingText: {
    fontSize: 10.5,
    color: '#6B7280',
  },

  profileDivider: {
    color: '#D1D5DB',
    marginHorizontal: 2,
  },

  profileJobs: {
    fontSize: 10.5,
    color: '#6B7280',
  },

  profileOptions: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 14,
  },

  profileOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },

  profileOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },

  profileOptionContent: {
    flex: 1,
    marginLeft: 10,
  },

  profileOptionTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
  },

  profileOptionSubtitle: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },

  profileEditButton: {
    alignSelf: "flex-start",
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  profileEditButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  workerEditScreen: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  workerEditHeader: {
    minHeight: 58,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  workerEditTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#222222",
  },

  workerEditContent: {
    padding: 20,
    paddingBottom: 36,
  },

  workerEditSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222222",
    marginTop: 10,
    marginBottom: 12,
  },

  workerEditLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 7,
    marginTop: 9,
  },

  workerEditInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    fontSize: 13,
    color: "#222222",
  },

  workerEditSubskillList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  workerEditSubskillOption: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  workerEditSubskillOptionSelected: {
    borderColor: "#7047E8",
    backgroundColor: "#F3EEFF",
  },

  workerEditSubskillText: {
    fontSize: 12,
    color: "#4B5563",
  },

  workerEditSubskillTextSelected: {
    color: "#7047E8",
    fontWeight: "700",
  },

  workerEditSubskillEmpty: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 13,
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 14,
    justifyContent: "center",
  },

  workerEditSubskillEmptyText: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  workerEditTextArea: {
    minHeight: 105,
    paddingTop: 13,
  },

  workerLocationButton: {
    minHeight: 68,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    marginBottom: 5,
  },

  workerLocationButtonDisabled: {
    opacity: 0.65,
  },

  workerLocationTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },

  workerLocationSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 3,
  },

  workerSaveButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },

  workerSaveButtonDisabled: {
    opacity: 0.65,
  },

  workerSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },

  workerEditNote: {
    fontSize: 11,
    lineHeight: 17,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 13,
  },

  logoutButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },

  logoutText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },

  profileFooter: {
    textAlign: 'center',
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 15,
  },


  /* =======================================================
     BOTTOM NAVIGATION
  ======================================================= */

  bottomNavigation: {
    height: 68,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 5,
  },

  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },

  navIconActive: {
    backgroundColor: '#2563EB',
  },

  navText: {
    fontSize: 9.5,
    color: '#777777',
    marginTop: 2,
    fontWeight: '500',
  },

  navTextActive: {
    color: '#2563EB',
    fontWeight: '700',
  },

  navBadge: {
    position: 'absolute',
    right: -2,
    top: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },

  navBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
  },


  /* =======================================================
     MODAL
  ======================================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    maxHeight: '92%',
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 17,
  },

  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 17,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
  },

  modalSubtitle: {
    fontSize: 10.5,
    color: '#9CA3AF',
    marginTop: 3,
  },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCustomer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    padding: 11,
    marginBottom: 14,
  },

  modalCustomerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCustomerInfo: {
    marginLeft: 11,
  },

  modalCustomerName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },

  modalCustomerPhone: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 3,
  },

  modalContactRow: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 14,
  },

  modalContactButton: {
    flex: 1,
    height: 43,
    borderRadius: 11,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },

  modalContactText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#2563EB',
  },

  modalDetailSection: {
    marginBottom: 13,
  },

  modalDetailLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
    marginBottom: 4,
  },

  modalDetailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },

  modalDetailSubvalue: {
    fontSize: 10.5,
    color: '#6B7280',
    marginTop: 2,
  },

  modalTwoColumns: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 13,
  },

  modalDetailColumn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 11,
    padding: 10,
  },

  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },

  detailSmallLabel: {
    fontSize: 9.5,
    color: '#9CA3AF',
  },

  detailSmallValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#374151',
    marginTop: 2,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
  },

  addressText: {
    flex: 1,
    fontSize: 11,
    color: '#4B5563',
    lineHeight: 16,
    marginLeft: 7,
  },


  /* =======================================================
     PAYMENT BREAKDOWN
  ======================================================= */

  paymentBreakdown: {
    backgroundColor: '#F8FAFC',
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },

  paymentBreakdownTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 9,
  },

  paymentLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },

  paymentLineLabel: {
    fontSize: 10.5,
    color: '#6B7280',
  },

  paymentLineValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#374151',
  },

  commissionValue: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#DC2626',
  },

  paymentSeparator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 5,
  },

  finalEarningLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  finalEarningValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },


  /* =======================================================
     MODAL PAYMENT
  ======================================================= */

  modalPaymentPending: {
    backgroundColor: '#FFF7ED',
    borderRadius: 11,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  modalPaymentContent: {
    flex: 1,
    marginLeft: 7,
  },

  modalPaymentTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C2410C',
  },

  modalPaymentText: {
    fontSize: 10,
    color: '#78716C',
    lineHeight: 15,
    marginTop: 2,
  },

  modalPaymentReceived: {
    backgroundColor: '#F0FDF4',
    borderRadius: 11,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  modalPaymentReceivedText: {
    flex: 1,
    fontSize: 10.5,
    color: '#15803D',
    fontWeight: '600',
    marginLeft: 7,
    lineHeight: 15,
  },


  /* =======================================================
     MODAL ACTIONS
  ======================================================= */

  modalActions: {
    flexDirection: 'row',
    gap: 9,
  },

  modalRejectButton: {
    flex: 1,
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalRejectText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6B7280',
  },

  modalAcceptButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalAcceptText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalStartButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: '#2563EB',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginBottom: 9,
  },

  modalStartText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalCompleteButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
    marginBottom: 9,
  },

  modalCompleteText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalCancelButton: {
    height: 45,
    borderRadius: 11,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalCancelText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#4B5563',
  },

});