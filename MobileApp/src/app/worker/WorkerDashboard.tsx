import React, { useMemo, useState } from 'react';

import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
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


/* =========================================================
   MOCK BOOKINGS
========================================================= */

/*
   These are temporary local bookings.

   Later these will come from FastAPI.

   Expected backend structure can be something like:

   {
     id: "B001",
     customerName: "Rahul Sharma",
     customerPhone: "9876543210",
     service: "Electrician",
     serviceDescription: "Fan installation",
     date: "12 Sep 2026",
     time: "10:00 AM",
     address: "Sector 62, Noida",
     amount: 800,
     commission: 80,
     workerEarning: 720,
     status: "pending"
   }

*/

const INITIAL_BOOKINGS: Booking[] = [

  {
    id: 'B001',

    customerName: 'Rahul Sharma',
    customerPhone: '9876543210',

    service: 'Electrician',
    serviceDescription: 'Fan installation',

    date: '12 Sep 2026',
    time: '10:00 AM',

    address: 'Sector 62, Noida',
    latitude: 28.6208,
    longitude: 77.3639,

    amount: 800,

    commission: 80,

    workerEarning: 720,

    status: 'pending',
  },

  {
    id: 'B002',

    customerName: 'Priya Verma',
    customerPhone: '9812345678',

    service: 'Plumber',
    serviceDescription: 'Bathroom pipe repair',

    date: '13 Sep 2026',
    time: '02:00 PM',

    address: 'Sector 61, Noida',
    latitude: 28.6259,
    longitude: 77.3725,

    amount: 650,

    commission: 65,

    workerEarning: 585,

    status: 'accepted',
  },

  {
    id: 'B003',

    customerName: 'Amit Kumar',
    customerPhone: '9898989898',

    service: 'Electrician',
    serviceDescription: 'Switch and socket repair',

    date: '14 Sep 2026',
    time: '05:00 PM',

    address: 'Sector 18, Noida',
    latitude: 28.5708,
    longitude: 77.3260,

    amount: 500,

    commission: 50,

    workerEarning: 450,

    status: 'payment_pending',
  },

];


/* =========================================================
   WORKER INFORMATION
========================================================= */

const DEFAULT_WORKER = {
  name: 'Ramesh Kumar',
  skill: 'Electrician',
  rating: 4.8,
  completedJobs: 47,
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
    useState<Booking[]>(INITIAL_BOOKINGS);

  const [activeTab, setActiveTab] =
    useState<'home' | 'requests' | 'earnings' | 'profile'>(
      'home'
    );

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [detailsVisible, setDetailsVisible] =
    useState(false);

  /*
     WorkerDetailsScreen can pass the worker information through
     AppNavigator. Until the backend is connected, we fall back to
     DEFAULT_WORKER so the UI still works in Expo Go.
  */
  const workerFromRoute = route.params?.worker;
  const WORKER = {
    ...DEFAULT_WORKER,
    name: workerFromRoute?.name || DEFAULT_WORKER.name,
    email: workerFromRoute?.email || '',
    phone: workerFromRoute?.phone || '',
  };


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

  const handleAcceptBooking = (
    booking: Booking
  ) => {

    Alert.alert(
      'Accept Booking',
      `Accept ${booking.service} request from ${booking.customerName}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Accept',
          onPress: () => {

            /*
              BACKEND LATER:

              PATCH /api/bookings/{booking_id}/accept

              body:

              {
                worker_id: worker.id
              }

            */

            updateBookingStatus(
              booking.id,
              'accepted'
            );

            Alert.alert(
              'Booking Accepted',
              'The customer has been notified that you accepted the job.'
            );
          },
        },
      ]
    );
  };


  /* =======================================================
     REJECT BOOKING
  ======================================================= */

  const handleRejectBooking = (
    booking: Booking
  ) => {

    Alert.alert(
      'Reject Booking',
      'Are you sure you want to reject this request?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Reject',
          style: 'destructive',

          onPress: () => {

            /*
              BACKEND LATER:

              PATCH /api/bookings/{booking_id}/reject
            */

            updateBookingStatus(
              booking.id,
              'rejected'
            );

            setDetailsVisible(false);
          },
        },
      ]
    );
  };


  /* =======================================================
     START JOB
  ======================================================= */

  const handleStartJob = (
    booking: Booking
  ) => {

    Alert.alert(
      'Start Job',
      'Are you ready to start this service?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Start Job',
          onPress: () => {

            /*
              BACKEND LATER:

              PATCH /api/bookings/{booking_id}/start
            */

            updateBookingStatus(
              booking.id,
              'started'
            );

            Alert.alert(
              'Job Started',
              'The job has been marked as started.'
            );
          },
        },
      ]
    );
  };


  /* =======================================================
     COMPLETE JOB
  ======================================================= */

  const handleCompleteJob = (
    booking: Booking
  ) => {

    Alert.alert(
      'Complete Job',
      'Confirm that you have completed this service?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },

        {
          text: 'Complete',
          onPress: () => {

            /*
              IMPORTANT PAYMENT FLOW

              Worker does NOT receive money immediately.

              Backend changes booking to:

              payment_pending

              Customer will then receive:

              "Your service is completed.
               Please complete payment."

              After Razorpay payment succeeds:

              payment_pending
                    ↓
                  paid

              Only then worker earning becomes available.

            */

            updateBookingStatus(
              booking.id,
              'payment_pending'
            );

            Alert.alert(
              'Work Completed',
              'The customer has been notified to complete the payment.'
            );
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

          onPress: () => {

            /*
              BACKEND LATER:

              await AsyncStorage.removeItem('token');

              navigation.replace('Login');
            */

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
              ₹{booking.amount}
            </Text>

          </View>


          <View style={styles.moneyDivider} />


          <View>

            <Text style={styles.moneyLabel}>
              Your earning
            </Text>

            <Text style={styles.workerAmount}>
              ₹{booking.workerEarning}
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
              Payment received • ₹{booking.workerEarning}
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
              ₹{totalEarnings}
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
              Respond to requests to grow your earnings
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
            ₹{totalEarnings}
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
              ₹{pendingEarnings}
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
                    +₹{booking.workerEarning}
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

  const renderProfile = () => {

    return (
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

        </View>


        {/* PROFILE */}

        <View style={styles.profileCard}>

          <View style={styles.profileAvatar}>

            <Ionicons
              name="person"
              size={38}
              color="#2563EB"
            />

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
            onPress={() =>
              Alert.alert(
                'Worker Profile',
                'Your professional details will be editable here.'
              )
            }
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

              <Text style={styles.profileOptionSubtitle}>
                Skills, experience and description
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
            onPress={() =>
              Alert.alert(
                'Service Area',
                'Your service radius and work location will be managed here.'
              )
            }
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

              <Text style={styles.profileOptionSubtitle}>
                Location and service radius
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
            onPress={() =>
              Alert.alert(
                'Availability',
                'Working days and hours will be managed here.'
              )
            }
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

              <Text style={styles.profileOptionSubtitle}>
                Working days and preferred hours
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
            onPress={() =>
              Alert.alert(
                'Verification',
                'Your verification documents will be managed here.'
              )
            }
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

              <Text style={styles.profileOptionSubtitle}>
                Identity and work verification
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


            {/* DATE */}

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
                  ₹{booking.amount}
                </Text>

              </View>


              <View style={styles.paymentLine}>

                <Text style={styles.paymentLineLabel}>
                  Platform commission
                </Text>

                <Text style={styles.commissionValue}>
                  - ₹{booking.commission}
                </Text>

              </View>


              <View style={styles.paymentSeparator} />


              <View style={styles.paymentLine}>

                <Text style={styles.finalEarningLabel}>
                  Your earning
                </Text>

                <Text style={styles.finalEarningValue}>
                  ₹{booking.workerEarning}
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
                  Payment received. ₹{booking.workerEarning}
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