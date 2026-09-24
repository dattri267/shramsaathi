import React, { useEffect, useMemo, useRef, useState } from "react";
import LanguageButton from "../../components/LanguageButton";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";

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
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/AppNavigator";

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
} from "../../api";

type Props = NativeStackScreenProps<RootStackParamList, "WorkerDashboard">;

/* =========================================================
   TYPES
========================================================= */

type BookingStatus =
  | "pending"
  | "accepted"
  | "started"
  | "completed"
  | "payment_pending"
  | "paid"
  | "rejected";

type Booking = {
  id: string;
  bookingType?: "normal" | "emergency";

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
  if (isNaN(n)) return "0";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

/* =========================================================
   WORKER INFORMATION
========================================================= */

const DEFAULT_WORKER = {
  name: "Worker",
  skill: "Not specified",
  rating: 4.8,
  completedJobs: 0,
};

/* =========================================================
   COMPONENT
========================================================= */

export default function WorkerDashboard({ navigation, route }: Props) {
  const { t, i18n } = useTranslation();
  const translateSkillName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    return t(`workerDetails.skillTranslations.${normalized}`, {
      defaultValue: name,
    });
  };

  const translateSubskillName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    return t(`workerDetails.skillTranslations.${normalized}`, {
      defaultValue: name,
    });
  };

  const getStatusText = (status: BookingStatus) =>
    t(`workerDashboard.status.${status}`, { defaultValue: status });

  /* =======================================================
     STATE
  ======================================================= */

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [loadingBookings, setLoadingBookings] = useState(false);

  const [activeTab, setActiveTab] = useState<
    "home" | "requests" | "earnings" | "profile"
  >("home");

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [detailsVisible, setDetailsVisible] = useState(false);

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
  const [workerEditAvailableSubskills, setWorkerEditAvailableSubskills] =
    useState<any[]>([]);
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
  const [workerEditLatitude, setWorkerEditLatitude] = useState<number | null>(
    null,
  );
  const [workerEditLongitude, setWorkerEditLongitude] = useState<number | null>(
    null,
  );

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
      name:
        workerProfile?.full_name ||
        workerFromRoute?.name ||
        DEFAULT_WORKER.name,
      email: workerProfile?.email || workerFromRoute?.email || "",
      phone: workerProfile?.phone || workerFromRoute?.phone || "",
      skill: primarySkill?.name || DEFAULT_WORKER.skill,
      rating: backend?.average_rating ?? DEFAULT_WORKER.rating,
      completedJobs: backend?.completed_jobs ?? DEFAULT_WORKER.completedJobs,
      avatarUrl: workerProfile?.avatar_url || null,
      bio: backend?.bio || "",
      yearsExperience:
        primarySkill?.years_experience ?? backend?.years_experience ?? null,
      serviceRadiusKm: backend?.service_radius_km ?? null,
      serviceAddress: backend?.service_address || {},
      workingDays: backend?.working_days || [],
      workingHours: backend?.working_hours || [],
      documents: backend?.worker_documents || [],
    };
  }, [workerProfile, workerFromRoute]);

  const formatBackendWorkerBooking = (item: any): Booking => {
    const scheduled = item?.scheduled_start_at
      ? new Date(item.scheduled_start_at)
      : null;
    const estimated =
      item?.price?.estimated_amount ?? item?.estimated_amount ?? 0;
    const finalAmount = item?.price?.final_amount ?? item?.final_amount;
    const amount = Number(finalAmount ?? estimated ?? 0);
    const paymentStatus = item?.payment?.status;

    let status: BookingStatus = "pending";
    switch (item?.status) {
      case "accepted":
      case "worker_assigned":
        status = "accepted";
        break;
      case "in_progress":
        status = "started";
        break;
      case "completed":
        status = paymentStatus === "paid" ? "paid" : "payment_pending";
        break;
      case "cancelled":
        status = "rejected";
        break;
      default:
        status = "pending";
    }

    return {
      id: String(item.id),
      bookingType: item?.booking_type === "emergency" ? "emergency" : "normal",
      customerName: item?.customer?.name || "Customer",
      customerPhone: item?.customer?.phone || "",
      service: item?.service?.name || "Service",
      serviceDescription: item?.customer_notes || t("workerDashboard.serviceRequest", {
        defaultValue: "Service request",
      }),
      date: scheduled
        ? scheduled.toLocaleDateString(i18n.language === "hi" ? "hi-IN" : "en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Not scheduled",
      time: scheduled
        ? scheduled.toLocaleTimeString(i18n.language === "hi" ? "hi-IN" : "en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not scheduled",
      address: item?.service_address || "Service address unavailable",
      latitude:
        typeof item?.location?.latitude === "number"
          ? item.location.latitude
          : undefined,
      longitude:
        typeof item?.location?.longitude === "number"
          ? item.location.longitude
          : undefined,
      amount,
      commission: Number((amount * 0.1).toFixed(2)),
      workerEarning: Number((amount * 0.8).toFixed(2)),
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
      const rawBookings =
        bookingResponse?.bookings || bookingResponse?.jobs || [];
      setBookings(rawBookings.map(formatBackendWorkerBooking));
    } catch (error) {
      console.error("Failed to load worker dashboard:", error);
      if (!silent) {
        Alert.alert(t("workerDashboard.alerts.loadDashboardTitle"), error instanceof Error ? error.message : t("workerDashboard.alerts.tryAgain"));
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
      (booking) =>
        booking.bookingType === "emergency" &&
        (booking.status === "accepted" || booking.status === "started"),
    );

    if (!workerId || !hasActiveEmergency) return;

    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    const startLocationSharing = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          Alert.alert(t("workerDashboard.alerts.locationPermissionTitle"), t("workerDashboard.alerts.liveLocationPermissionMessage"));
          return;
        }

        const current = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        if (!cancelled) {
          await updateWorkerLocation(
            current.coords.latitude,
            current.coords.longitude,
          );
        }

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 5000,
            distanceInterval: 5,
          },
          async (location) => {
            if (cancelled) return;

            const { latitude, longitude } = location.coords;

            if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
              try {
                await updateWorkerLocation(latitude, longitude);
              } catch (error) {
                console.warn("Failed to update worker live location:", error);
              }
            }
          },
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
      (booking) =>
        booking.bookingType === "emergency" &&
        (booking.status === "accepted" || booking.status === "started"),
    ),
  ]);

  /* =======================================================
     LOCATION + CALL ACTIONS
  ======================================================= */

  const handleCallCustomer = async (booking: Booking) => {
    const phone = booking.customerPhone?.trim();

    if (!phone) {
      Alert.alert(t("workerDashboard.alerts.phoneUnavailableTitle"), t("workerDashboard.alerts.phoneUnavailableMessage"));
      return;
    }

    const url = `tel:${phone}`;
    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t("workerDashboard.alerts.unableToCallTitle"), t("workerDashboard.alerts.unableToCallMessage"));
    }
  };

  const handleOpenCustomerLocation = async (booking: Booking) => {
    const destination =
      typeof booking.latitude === "number" &&
      typeof booking.longitude === "number"
        ? `${booking.latitude},${booking.longitude}`
        : encodeURIComponent(booking.address);

    // Google Maps supports both coordinates and an address query.
    const url = `https://www.google.com/maps/search/?api=1&query=${destination}`;

    const supported = await Linking.canOpenURL(url);

    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(t("workerDashboard.alerts.unableToOpenMapsTitle"), t("workerDashboard.alerts.unableToOpenMapsMessage"));
    }
  };

  /* =======================================================
     CALCULATIONS
  ======================================================= */

  const pendingRequests = useMemo(() => {
    return bookings.filter((booking) => booking.status === "pending");
  }, [bookings]);

  const activeJobs = useMemo(() => {
    return bookings.filter(
      (booking) =>
        booking.status === "accepted" ||
        booking.status === "started" ||
        booking.status === "completed" ||
        booking.status === "payment_pending",
    );
  }, [bookings]);

  const completedPaidJobs = useMemo(() => {
    return bookings.filter((booking) => booking.status === "paid");
  }, [bookings]);

  const totalEarnings = useMemo(() => {
    return completedPaidJobs.reduce(
      (total, booking) => total + booking.workerEarning,
      0,
    );
  }, [completedPaidJobs]);

  const pendingEarnings = useMemo(() => {
    return bookings
      .filter(
        (booking) =>
          booking.status === "completed" ||
          booking.status === "payment_pending",
      )
      .reduce((total, booking) => total + booking.workerEarning, 0);
  }, [bookings]);

  /* =======================================================
     UPDATE BOOKING
  ======================================================= */

  const updateBookingStatus = (bookingId: string, status: BookingStatus) => {
    setBookings((current) =>
      current.map((booking) =>
        booking.id === bookingId
          ? {
              ...booking,
              status,
            }
          : booking,
      ),
    );

    setSelectedBooking((current) =>
      current
        ? {
            ...current,
            status,
          }
        : null,
    );
  };

  /* =======================================================
     ACCEPT BOOKING
  ======================================================= */

  const handleAcceptBooking = (booking: Booking) => {
    Alert.alert(
      t("workerDashboard.alerts.acceptBookingTitle"),
      t("workerDashboard.alerts.acceptBookingMessage", { service: translateSkillName(booking.service), customer: booking.customerName }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workerDashboard.accept"),
          onPress: async () => {
            try {
              await acceptBooking(booking.id);
              await loadWorkerDashboard();
              setDetailsVisible(false);
              Alert.alert(t("workerDashboard.alerts.bookingAcceptedTitle"), t("workerDashboard.alerts.bookingAcceptedMessage"),
              );
            } catch (error) {
              Alert.alert(t("workerDashboard.alerts.unableToAcceptTitle"), error instanceof Error ? error.message : t("workerDashboard.alerts.tryAgain"),
              );
            }
          },
        },
      ],
    );
  };

  /* =======================================================
     REJECT BOOKING
  ======================================================= */

  const handleRejectBooking = (booking: Booking) => {
    Alert.alert(t("workerDashboard.alerts.rejectBookingTitle"), t("workerDashboard.alerts.rejectBookingMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workerDashboard.reject"),
          style: "destructive",
          onPress: async () => {
            try {
              await rejectBooking(booking.id);
              setBookings((current) =>
                current.filter((item) => item.id !== booking.id),
              );
              setSelectedBooking(null);
              setDetailsVisible(false);
              Alert.alert(t("workerDashboard.alerts.requestRejectedTitle"), t("workerDashboard.alerts.requestRejectedMessage"),
              );
            } catch (error) {
              Alert.alert(t("workerDashboard.alerts.unableToRejectTitle"), error instanceof Error ? error.message : t("workerDashboard.alerts.tryAgain"),
              );
            }
          },
        },
      ],
    );
  };

  /* =======================================================
     START JOB
  ======================================================= */

  const handleStartJob = (booking: Booking) => {
    Alert.alert(t("workerDashboard.alerts.startJobTitle"), t("workerDashboard.alerts.startJobMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("workerDashboard.startJob"),
        onPress: async () => {
          try {
            await startBooking(booking.id);
            await loadWorkerDashboard();
            setDetailsVisible(false);
            Alert.alert(t("workerDashboard.alerts.jobStartedTitle"), t("workerDashboard.alerts.jobStartedMessage"));
          } catch (error) {
            Alert.alert(t("workerDashboard.alerts.unableToStartTitle"), error instanceof Error ? error.message : t("workerDashboard.alerts.tryAgain"),
            );
          }
        },
      },
    ]);
  };

  /* =======================================================
     COMPLETE JOB
  ======================================================= */

  const handleCompleteJob = (booking: Booking) => {
    Alert.alert(
      t("workerDashboard.alerts.completeJobTitle"),
      t("workerDashboard.alerts.completeJobMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("workerDashboard.complete"),
          onPress: async () => {
            try {
              await completeBooking(booking.id, booking.amount);
              await loadWorkerDashboard();
              setDetailsVisible(false);
              Alert.alert(t("workerDashboard.alerts.workCompletedTitle"), t("workerDashboard.alerts.workCompletedMessage"));
            } catch (error) {
              Alert.alert(t("workerDashboard.alerts.unableToCompleteTitle"), error instanceof Error ? error.message : t("workerDashboard.alerts.tryAgain"),
              );
            }
          },
        },
      ],
    );
  };

  /* =======================================================
     OPEN BOOKING DETAILS
  ======================================================= */

  const openBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setDetailsVisible(true);
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    Alert.alert(t("common.logout"), t("common.logoutConfirm"), [
      {
        text: "Cancel",
        style: "cancel",
      },

      {
        text: "Logout",
        style: "destructive",

        onPress: async () => {
          await logout();
          navigation.replace("Login");
        },
      },
    ]);
  };

  const getStatusColor = (status: BookingStatus) => {
    switch (status) {
      case "pending":
        return "#D97706";

      case "accepted":
        return "#2563EB";

      case "started":
        return "#7C3AED";

      case "completed":
        return "#16A34A";

      case "payment_pending":
        return "#EA580C";

      case "paid":
        return "#16A34A";

      case "rejected":
        return "#DC2626";

      default:
        return "#6B7280";
    }
  };

  /* =======================================================
     BOOKING CARD
  ======================================================= */

  const renderBookingCard = (booking: Booking) => {
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
        onPress={() => openBookingDetails(booking)}
      >
        {/* TOP */}

        <View style={styles.bookingTop}>
          <View style={styles.customerAvatar}>
            <Ionicons name="person-outline" size={22} color="#2563EB" />
          </View>

          <View style={styles.customerInfo}>
            <Text style={styles.customerName} numberOfLines={1}>
              {booking.customerName}
            </Text>

            <Text style={styles.serviceName}>{translateSkillName(booking.service)}</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: getStatusColor(booking.status) + "15",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: getStatusColor(booking.status),
                },
              ]}
            >
              {getStatusText(booking.status)}
            </Text>
          </View>
        </View>

        {booking.bookingType === "emergency" && (
          <View style={styles.emergencyRequestBanner}>
            <Ionicons name="flash" size={16} color="#DC2626" />
            <Text style={styles.emergencyRequestText}>
              {t("workerDashboard.emergencyBanner")}
            </Text>
          </View>
        )}

        {/* SERVICE */}

        <View style={styles.bookingServiceRow}>
          <View style={styles.bookingIconSmall}>
            <Ionicons name="construct-outline" size={18} color="#2563EB" />
          </View>

          <View style={styles.bookingServiceInfo}>
            <Text style={styles.bookingServiceTitle}>
              {booking.serviceDescription}
            </Text>

            <Text style={styles.bookingServiceAddress}>{booking.address}</Text>
          </View>
        </View>

        {/* DATE / TIME */}

        <View style={styles.bookingMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={17} color="#6B7280" />

            <Text style={styles.metaText}>{booking.date}</Text>
          </View>

          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={17} color="#6B7280" />

            <Text style={styles.metaText}>{booking.time}</Text>
          </View>
        </View>

        {/* MONEY */}

        <View style={styles.moneyRow}>
          <View>
            <Text style={styles.moneyLabel}>{t("workerDashboard.customerPayment")}</Text>

            <Text style={styles.moneyAmount}>
              ₹{formatMoney(booking.amount)}
            </Text>
          </View>

          <View style={styles.moneyDivider} />

          <View>
            <Text style={styles.moneyLabel}>{t("workerDashboard.yourEarning")}</Text>

            <Text style={styles.workerAmount}>
              ₹{formatMoney(booking.workerEarning)}
            </Text>
          </View>
        </View>

        {/* PAYMENT NOTE */}

        {(booking.status === "completed" ||
          booking.status === "payment_pending") && (
          <View style={styles.paymentPendingBox}>
            <Ionicons name="time-outline" size={17} color="#EA580C" />

            <Text style={styles.paymentPendingText}>
              {t("workerDashboard.waitingCustomerPaymentTitle")}
            </Text>
          </View>
        )}

        {booking.status === "paid" && (
          <View style={styles.paymentReceivedBox}>
            <Ionicons name="checkmark-circle" size={17} color="#16A34A" />

            <Text style={styles.paymentReceivedText}>
              {t("workerDashboard.paymentReceivedShort", { amount: formatMoney(booking.workerEarning) })}
            </Text>
          </View>
        )}

        {/* CUSTOMER CONTACT + LOCATION */}

        {(booking.status === "accepted" ||
          booking.status === "started" ||
          booking.status === "completed" ||
          booking.status === "payment_pending" ||
          booking.status === "paid") && (
          <View style={styles.contactActionRow}>
            <Pressable
              style={styles.contactButton}
              onPress={(event) => {
                event.stopPropagation();
                handleCallCustomer(booking);
              }}
            >
              <Ionicons name="call-outline" size={17} color="#2563EB" />
              <Text style={styles.contactButtonText}>{t("workerDashboard.callCustomer")}</Text>
            </Pressable>

            <Pressable
              style={styles.contactButton}
              onPress={(event) => {
                event.stopPropagation();
                handleOpenCustomerLocation(booking);
              }}
            >
              <Ionicons name="map-outline" size={17} color="#2563EB" />
              <Text style={styles.contactButtonText}>{t("workerDashboard.openMaps")}</Text>
            </Pressable>
          </View>
        )}

        {/* REQUEST ACTIONS */}

        {booking.status === "pending" && (
          <View style={styles.actionRow}>
            <Pressable
              style={styles.rejectButton}
              onPress={(event) => {
                event.stopPropagation();
                handleRejectBooking(booking);
              }}
            >
              <Text style={styles.rejectButtonText}>{t("workerDashboard.decline")}</Text>
            </Pressable>

            <Pressable
              style={styles.acceptButton}
              onPress={(event) => {
                event.stopPropagation();
                handleAcceptBooking(booking);
              }}
            >
              <Text style={styles.acceptButtonText}>{t("workerDashboard.accept")}</Text>
            </Pressable>
          </View>
        )}

        {/* ACCEPTED */}

        {booking.status === "accepted" && (
          <Pressable
            style={styles.startButton}
            onPress={(event) => {
              event.stopPropagation();
              handleStartJob(booking);
            }}
          >
            <Ionicons name="play" size={17} color="#FFFFFF" />

            <Text style={styles.startButtonText}>{t("workerDashboard.startJob")}</Text>
          </Pressable>
        )}

        {/* STARTED */}

        {booking.status === "started" && (
          <Pressable
            style={styles.completeButton}
            onPress={(event) => {
              event.stopPropagation();
              handleCompleteJob(booking);
            }}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={19}
              color="#FFFFFF"
            />

            <Text style={styles.completeButtonText}>{t("workerDashboard.markWorkCompleted")}</Text>
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
        contentContainerStyle={styles.scrollContent}
      >
        {/* HEADER */}

        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.welcomeText}>{t("workerDashboard.welcome")} 👋</Text>

            <Text style={styles.workerName}>{WORKER.name}</Text>

            <View style={styles.workerSkillRow}>
              <View style={styles.skillBadge}>
                <Text style={styles.skillBadgeText}>{translateSkillName(WORKER.skill)}</Text>
              </View>

              <Ionicons name="star" size={15} color="#F59E0B" />

              <Text style={styles.ratingText}>{WORKER.rating}</Text>
            </View>
          </View>

          <Pressable
            style={styles.notificationButton}
            onPress={() =>
              Alert.alert(
                "Notifications",
                "New booking notifications will appear here.",
              )
            }
          >
            <Ionicons name="notifications-outline" size={23} color="#111827" />

            {pendingRequests.length > 0 && (
              <View style={styles.notificationDot} />
            )}
          </Pressable>
        </View>

        {/* AVAILABILITY */}

        <View style={styles.availabilityCard}>
          <View style={styles.availabilityIcon}>
            <Ionicons name="radio-outline" size={22} color="#16A34A" />
          </View>

          <View style={styles.availabilityContent}>
            <Text style={styles.availabilityTitle}>{t("workerDashboard.youAreAvailable")}</Text>

            <Text style={styles.availabilitySubtitle}>
              {t("workerDashboard.customersCanRequest")}
            </Text>
          </View>

          <View style={styles.onlineDot} />
        </View>

        {/* STATS */}

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="calendar-outline" size={21} color="#2563EB" />
            </View>

            <Text style={styles.statValue}>{pendingRequests.length}</Text>

            <Text style={styles.statLabel}>{t("workerDashboard.newRequests")}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="briefcase-outline" size={21} color="#2563EB" />
            </View>

            <Text style={styles.statValue}>{activeJobs.length}</Text>

            <Text style={styles.statLabel}>{t("workerDashboard.activeJobs")}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statIcon}>
              <Ionicons name="wallet-outline" size={21} color="#2563EB" />
            </View>

            <Text style={styles.statValue}>₹{formatMoney(totalEarnings)}</Text>

            <Text style={styles.statLabel}>{t("workerDashboard.earnings")}</Text>
          </View>
        </View>

        {/* NEW REQUESTS */}

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>{t("workerDashboard.newRequests")}</Text>

            <Text style={styles.sectionSubtitle}>
              {t("workerDashboard.customersLooking")}
            </Text>
          </View>

          {pendingRequests.length > 0 && (
            <Pressable onPress={() => setActiveTab("requests")}>
              <Text style={styles.viewAllText}>{t("workerDashboard.viewAll")}</Text>
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

            <Text style={styles.emptyTitle}>{t("workerDashboard.noNewRequests")}</Text>

            <Text style={styles.emptySubtitle}>
              {t("workerDashboard.newRequestsAppear")}
            </Text>
          </View>
        ) : (
          pendingRequests.slice(0, 2).map(renderBookingCard)
        )}

        {/* ACTIVE JOBS */}

        <View
          style={[
            styles.sectionHeader,
            {
              marginTop: 8,
            },
          ]}
        >
          <View>
            <Text style={styles.sectionTitle}>{t("workerDashboard.activeJobs")}</Text>

            <Text style={styles.sectionSubtitle}>
              {t("workerDashboard.upcomingOngoing")}
            </Text>
          </View>
        </View>

        {activeJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="briefcase-outline" size={28} color="#2563EB" />
            </View>

            <Text style={styles.emptyTitle}>{t("workerDashboard.noActiveJobs")}</Text>

            <Text style={styles.emptySubtitle}>
              {t("workerDashboard.acceptedJobsAppear")}
            </Text>
          </View>
        ) : (
          activeJobs.slice(0, 2).map(renderBookingCard)
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
            <Text style={styles.earningInfoTitle}>{t("workerDashboard.securePayments")}</Text>

            <Text style={styles.earningInfoText}>
              {t("workerDashboard.securePaymentsText")}
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t("workerDashboard.bookingRequests")}</Text>

          <Text style={styles.pageSubtitle}>
            {t("workerDashboard.reviewManageRequests")}
          </Text>
        </View>

        <View style={styles.requestCountCard}>
          <View style={styles.requestCountIcon}>
            <Ionicons name="notifications-outline" size={22} color="#2563EB" />
          </View>

          <View style={styles.requestCountContent}>
            <Text style={styles.requestCountTitle}>
              {t("workerDashboard.newRequestsCount", { count: pendingRequests.length })}
            </Text>

            <Text style={styles.requestCountSubtitle}>
              {pendingRequests.some(
                (request) => request.bookingType === "emergency",
              )
                ? t("workerDashboard.emergencyImmediate")
                : t("workerDashboard.respondToGrow")}
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

            <Text style={styles.largeEmptyTitle}>{t("workerDashboard.allCaughtUp")}</Text>

            <Text style={styles.largeEmptySubtitle}>
              {t("workerDashboard.noPendingRequests")}
            </Text>
          </View>
        ) : (
          pendingRequests.map(renderBookingCard)
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
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>{t("workerDashboard.earnings")}</Text>

          <Text style={styles.pageSubtitle}>
            {t("workerDashboard.trackPayments")}
          </Text>
        </View>

        {/* TOTAL */}

        <View style={styles.totalEarningsCard}>
          <View style={styles.totalEarningsIcon}>
            <Ionicons name="wallet-outline" size={27} color="#FFFFFF" />
          </View>

          <Text style={styles.totalEarningsLabel}>{t("workerDashboard.availableEarnings")}</Text>

          <Text style={styles.totalEarningsAmount}>
            ₹{formatMoney(totalEarnings)}
          </Text>

          <Text style={styles.totalEarningsSubtext}>
            {t("workerDashboard.fromPaidJobs", { count: completedPaidJobs.length })}
          </Text>
        </View>

        {/* PENDING */}

        <View style={styles.pendingEarningsCard}>
          <View style={styles.pendingEarningsIcon}>
            <Ionicons name="time-outline" size={23} color="#EA580C" />
          </View>

          <View style={styles.pendingEarningsContent}>
            <Text style={styles.pendingEarningsTitle}>{t("workerDashboard.paymentPending")}</Text>

            <Text style={styles.pendingEarningsAmount}>
              ₹{formatMoney(pendingEarnings)}
            </Text>

            <Text style={styles.pendingEarningsSubtitle}>
              {t("workerDashboard.waitingCustomerPayment")}
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
            <Text style={styles.commissionTitle}>{t("workerDashboard.howEarningsWork")}</Text>

            <Text style={styles.commissionText}>
              {t("workerDashboard.earningsFlow")}
            </Text>

            <Text style={styles.commissionExample}>
              {t("workerDashboard.earningsExample")}
            </Text>
          </View>
        </View>

        {/* PAYMENT HISTORY */}

        <Text style={styles.historyTitle}>{t("workerDashboard.paymentHistory")}</Text>

        {completedPaidJobs.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Ionicons name="receipt-outline" size={28} color="#2563EB" />
            </View>

            <Text style={styles.emptyTitle}>{t("workerDashboard.noPaymentHistory")}</Text>

            <Text style={styles.emptySubtitle}>
              {t("workerDashboard.completedPaymentsAppear")}
            </Text>
          </View>
        ) : (
          completedPaidJobs.map((booking) => (
            <View key={booking.id} style={styles.historyCard}>
              <View style={styles.historyIcon}>
                <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
              </View>

              <View style={styles.historyContent}>
                <Text style={styles.historyService}>{translateSkillName(booking.service)}</Text>

                <Text style={styles.historyCustomer}>
                  {booking.customerName}
                </Text>

                <Text style={styles.historyDate}>{booking.date}</Text>
              </View>

              <View style={styles.historyAmountContainer}>
                <Text style={styles.historyAmount}>
                  +₹{formatMoney(booking.workerEarning)}
                </Text>

                <Text style={styles.paidText}>{t("workerDashboard.paid")}</Text>
              </View>
            </View>
          ))
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
    return (
      [
        address.house,
        address.locality,
        address.city,
        address.state,
        address.pincode,
      ]
        .filter(Boolean)
        .join(", ") || "Service location not available"
    );
  }, [workerBackend]);

  const formatWorkingHours = (hours: any) => {
    if (!Array.isArray(hours) || hours.length === 0) {
      return "Preferred hours not set";
    }
    return hours.map((hour: string) => t(`workerDetails.hours.${hour}`, { defaultValue: hour })).join(", ");
  };

  const formatWorkingDays = (days: any) => {
    if (!Array.isArray(days) || days.length === 0) {
      return t("workerDashboard.workingDaysNotSet");
    }
    return days.map((day: string) => t(`workerDetails.days.${day}`, { defaultValue: day })).join(", ");
  };

  /* =======================================================
     EDIT WORKER PROFILE
  ======================================================= */

  const openWorkerEdit = async () => {
    const backend = workerProfile?.worker_profile || {};
    const skills = Array.isArray(backend?.skills) ? backend.skills : [];
    const primary =
      skills.find((skill: any) => skill.is_primary) || skills[0] || {};
    const currentSubskill = Array.isArray(backend?.subskills)
      ? backend.subskills.find((subskill: any) => subskill.is_primary) ||
        backend.subskills[0]
      : null;

    const address = backend?.service_address || {};
    const location = backend?.location || {};

    setWorkerEditName(workerProfile?.full_name || workerFromRoute?.name || "");
    setWorkerEditPhone(workerProfile?.phone || workerFromRoute?.phone || "");
    setWorkerEditBio(backend?.bio || "");
    setWorkerEditPrimarySkill(primary?.slug || primary?.name || "");
    setWorkerEditSubskillId(
      currentSubskill &&
        String(currentSubskill.skill_id) === String(primary?.id)
        ? currentSubskill.id
        : "",
    );
    setWorkerEditExperience(
      primary?.years_experience != null ? String(primary.years_experience) : "",
    );
    setWorkerEditRadius(
      backend?.service_radius_km != null
        ? String(backend.service_radius_km)
        : "",
    );
    setWorkerEditDays(
      Array.isArray(backend?.working_days)
        ? backend.working_days.join(", ")
        : "",
    );
    setWorkerEditHours(
      Array.isArray(backend?.working_hours)
        ? backend.working_hours.join(", ")
        : "",
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
        (skill: any) => String(skill.id) === String(primarySkillId),
      );
      setWorkerEditAvailableSubskills(
        Array.isArray(primaryRecord?.subskills) ? primaryRecord.subskills : [],
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
        Alert.alert(t("workerDashboard.alerts.locationPermissionTitle"), t("workerDashboard.alerts.locationPermissionMessage"),
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
        Alert.alert(t("workerDashboard.alerts.addressNotFoundTitle"), t("workerDashboard.alerts.addressNotFoundMessage"),
        );
        return;
      }

      const currentAddress = addresses[0];
      setWorkerEditHouse(
        currentAddress.streetNumber || currentAddress.name || "",
      );
      setWorkerEditLocality(
        currentAddress.district || currentAddress.subregion || "",
      );
      setWorkerEditCity(currentAddress.city || currentAddress.subregion || "");
      setWorkerEditState(currentAddress.region || "");
      setWorkerEditPincode(currentAddress.postalCode || "");

      Alert.alert(t("workerDashboard.alerts.locationFoundTitle"), t("workerDashboard.alerts.locationFoundMessage"),
      );
    } catch (error) {
      console.error("Worker address location error:", error);
      Alert.alert(t("workerDashboard.alerts.locationErrorTitle"), t("workerDashboard.alerts.locationErrorMessage"),
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
      Alert.alert(t("workerDashboard.alerts.invalidNameTitle"), t("workerDashboard.alerts.invalidNameMessage"));
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      Alert.alert(t("workerDashboard.alerts.invalidMobileTitle"), t("workerDashboard.alerts.invalidMobileMessage"),
      );
      return;
    }

    if (
      !workerEditHouse.trim() ||
      !workerEditLocality.trim() ||
      !workerEditCity.trim() ||
      !workerEditState.trim() ||
      !/^\d{6}$/.test(pincode)
    ) {
      Alert.alert(t("workerDashboard.alerts.incompleteAddressTitle"), t("workerDashboard.alerts.incompleteAddressMessage"),
      );
      return;
    }

    if (workerEditLatitude === null || workerEditLongitude === null) {
      Alert.alert(t("workerDashboard.alerts.locationRequiredTitle"), t("workerDashboard.alerts.locationRequiredMessage"),
      );
      return;
    }

    const experience = Number(workerEditExperience);
    const radius = Number(workerEditRadius);

    if (
      workerEditExperience.trim() &&
      (!Number.isFinite(experience) || experience < 0 || experience > 60)
    ) {
      Alert.alert(t("workerDashboard.alerts.invalidExperienceTitle"), t("workerDashboard.alerts.invalidExperienceMessage"),
      );
      return;
    }

    if (workerEditRadius.trim() && (!Number.isFinite(radius) || radius <= 0)) {
      Alert.alert(t("workerDashboard.alerts.invalidRadiusTitle"), t("workerDashboard.alerts.invalidRadiusMessage"),
      );
      return;
    }

    const formattedAddress = [
      workerEditHouse.trim(),
      workerEditLocality.trim(),
      workerEditCity.trim(),
      workerEditState.trim(),
      pincode,
    ]
      .filter(Boolean)
      .join(", ");

    // Primary skill is fixed after worker registration. Use the saved
    // primary skill from the backend and never take it from editable input.
    const primarySkillRecord =
      (Array.isArray(workerBackend?.skills) ? workerBackend.skills : []).find(
        (skill: any) => skill.is_primary,
      ) ||
      (Array.isArray(workerBackend?.skills) ? workerBackend.skills[0] : null);

    if (!primarySkillRecord?.id) {
      Alert.alert(t("workerDashboard.alerts.primarySkillUnavailableTitle"), t("workerDashboard.alerts.primarySkillUnavailableMessage"),
      );
      return;
    }

    if (!workerEditSubskillId) {
      Alert.alert(t("workerDashboard.alerts.selectSubskillTitle"), t("workerDashboard.alerts.selectSubskillMessage"),
      );
      return;
    }

    const selectedSubskill = workerEditAvailableSubskills.find(
      (subskill: any) => subskill.id === workerEditSubskillId,
    );

    if (
      workerEditSubskillId &&
      (!selectedSubskill ||
        String(selectedSubskill.skill_id) !== String(primarySkillRecord.id))
    ) {
      Alert.alert(t("workerDashboard.alerts.invalidSubskillTitle"), t("workerDashboard.alerts.invalidSubskillMessage"),
      );
      return;
    }

    const workingDays = workerEditDays
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const workingHours = workerEditHours
      .split(",")
      .map((value) => value.trim())
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
        ...(workerEditRadius.trim() ? { service_radius_km: radius } : {}),
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

      Alert.alert(t("workerDashboard.alerts.profileUpdatedTitle"), t("workerDashboard.alerts.profileUpdatedMessage"),
      );
    } catch (error) {
      console.error("Worker profile update error:", error);
      Alert.alert(
        t("workerDashboard.alerts.updateProfileTitle"),
        error instanceof Error
          ? error.message
          : t("workerDashboard.alerts.updateProfileMessage"),
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
      ? skills
          .map(
            (skill: any) =>
              `${translateSkillName(skill.name)}${skill.years_experience != null ? ` (${skill.years_experience} yrs)` : ""}${skill.is_primary ? ` • ${t("workerDashboard.primary")}` : ""}`,
          )
          .join("\n")
      : "No skills available";

    Alert.alert(
      t("workerDashboard.professionalProfile"),
      `${t("workerDashboard.skillsLabel")}:\n${skillText}\n\n${t("workerDashboard.experienceLabel")}: ${WORKER.yearsExperience != null ? `${WORKER.yearsExperience} ${t("workerDashboard.years")}` : t("workerDashboard.notProvided")}\n\n${t("workerDashboard.descriptionLabel")}:\n${WORKER.bio || t("workerDashboard.noDescription")}`,
    );
  };

  const showServiceArea = () => {
    Alert.alert(
      t("workerDashboard.serviceArea"),
      `${t("workerDashboard.workLocation")}:\n${workerAddressText}\n\n${t("workerDashboard.serviceRadiusLabel")}: ${WORKER.serviceRadiusKm != null ? `${WORKER.serviceRadiusKm} km` : t("workerDashboard.notSet")}\n\n${t("workerDashboard.coordinatesLabel")}: ${workerBackend?.location?.latitude != null && workerBackend?.location?.longitude != null ? `${workerBackend.location.latitude}, ${workerBackend.location.longitude}` : t("common.notAvailable")}`,
    );
  };

  const showAvailability = () => {
    Alert.alert(
      t("workerDashboard.availability"),
      `${t("workerDashboard.workingDays")}:\n${formatWorkingDays(WORKER.workingDays)}\n\n${t("workerDashboard.preferredHours")}:\n${formatWorkingHours(WORKER.workingHours)}`,
    );
  };

  const showVerification = () => {
    const documents = Array.isArray(WORKER.documents) ? WORKER.documents : [];

    if (documents.length === 0) {
      Alert.alert(t("workerDashboard.alerts.verificationTitle"), t("workerDashboard.alerts.noVerificationDocuments"));
      return;
    }

    const buttons = documents.slice(0, 3).map((doc: any) => ({
      text: `View ${doc.title || doc.file_type || "Document"}`,
      onPress: async () => {
        const url = doc.public_url || doc.url;

        if (!url) {
          Alert.alert(t("workerDashboard.alerts.documentUnavailableTitle"), t("workerDashboard.alerts.documentUnavailableMessage"),
          );
          return;
        }

        try {
          const supported = await Linking.canOpenURL(url);

          if (supported) {
            await Linking.openURL(url);
          } else {
            Alert.alert(t("workerDashboard.alerts.unableToOpenDocumentTitle"), t("workerDashboard.alerts.unableToOpenDocumentMessage"),
            );
          }
        } catch (error) {
          console.error("Document open error:", error);
          Alert.alert(t("workerDashboard.alerts.unableToOpenDocumentTitle"), t("workerDashboard.alerts.unableToOpenDocumentMessage"),
          );
        }
      },
    }));

    Alert.alert(
      t("workerDashboard.verificationDocuments"),
      `${t("workerDashboard.documentsOnFile", { count: documents.length })}.\n\n${documents
        .map((doc: any) => `• ${doc.title || doc.file_type || "Document"}`)
        .join("\n")}`,
      buttons,
    );
  };

  const renderProfile = () => {
    return (
      <>
        <LanguageButton />
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.pageHeader}>
            <Text style={styles.pageTitle}>{t("workerDashboard.myProfile")}</Text>

            <Text style={styles.pageSubtitle}>{t("workerDashboard.manageAccount")}</Text>

            <Pressable
              style={styles.profileEditButton}
              onPress={openWorkerEdit}
            >
              <Ionicons name="create-outline" size={18} color="#FFFFFF" />
              <Text style={styles.profileEditButtonText}>{t("workerDashboard.editProfile")}</Text>
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
                <Ionicons name="person" size={38} color="#2563EB" />
              )}
            </View>

            <Text style={styles.profileName}>{WORKER.name}</Text>

            <Text style={styles.profileSkill}>{translateSkillName(WORKER.skill)}</Text>

            <View style={styles.profileRating}>
              <Ionicons name="star" size={16} color="#F59E0B" />

              <Text style={styles.profileRatingText}>
                {WORKER.rating} {t("workerDashboard.rating")}
              </Text>

              <Text style={styles.profileDivider}>•</Text>

              <Text style={styles.profileJobs}>
                {WORKER.completedJobs} {t("workerDashboard.jobsCompleted")}
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
                <Ionicons name="person-outline" size={21} color="#2563EB" />
              </View>

              <View style={styles.profileOptionContent}>
                <Text style={styles.profileOptionTitle}>
                  {t("workerDashboard.professionalProfile")}
                </Text>

                <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                  {translateSkillName(WORKER.skill)} •{" "}
                  {WORKER.yearsExperience != null
                    ? `${WORKER.yearsExperience} years experience`
                    : t("workerDashboard.experienceNotSet")}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.profileOption} onPress={showServiceArea}>
              <View style={styles.profileOptionIcon}>
                <Ionicons name="location-outline" size={21} color="#2563EB" />
              </View>

              <View style={styles.profileOptionContent}>
                <Text style={styles.profileOptionTitle}>{t("workerDashboard.serviceArea")}</Text>

                <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                  {workerAddressText} •{" "}
                  {WORKER.serviceRadiusKm != null
                    ? `${WORKER.serviceRadiusKm} km radius`
                    : t("workerDashboard.radiusNotSet")}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.profileOption} onPress={showAvailability}>
              <View style={styles.profileOptionIcon}>
                <Ionicons name="time-outline" size={21} color="#2563EB" />
              </View>

              <View style={styles.profileOptionContent}>
                <Text style={styles.profileOptionTitle}>{t("workerDashboard.availability")}</Text>

                <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                  {WORKER.workingDays?.length
                    ? `${formatWorkingDays(WORKER.workingDays)}`
                    : t("workerDashboard.workingDaysNotSet")}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color="#9CA3AF" />
            </Pressable>

            <Pressable style={styles.profileOption} onPress={showVerification}>
              <View style={styles.profileOptionIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={21}
                  color="#2563EB"
                />
              </View>

              <View style={styles.profileOptionContent}>
                <Text style={styles.profileOptionTitle}>{t("workerDashboard.verification")}</Text>

                <Text style={styles.profileOptionSubtitle} numberOfLines={2}>
                  {WORKER.documents?.length || 0} {t("workerDashboard.verificationDocumentsOnFile", { count: WORKER.documents?.length || 0 })}
                </Text>
              </View>

              <Ionicons name="chevron-forward" size={19} color="#9CA3AF" />
            </Pressable>
          </View>

          {/* LOGOUT */}

          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#DC2626" />

            <Text style={styles.logoutText}>{t("common.logout")}</Text>
          </Pressable>

          <Text style={styles.profileFooter}>{t("workerDashboard.footer")}</Text>
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
          <SafeAreaView
            style={styles.workerEditScreen}
            edges={["top", "bottom"]}
          >
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

              <Text style={styles.workerEditTitle}>{t("workerDashboard.editProfile")}</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.workerEditContent}
            >
              <Text style={styles.workerEditSectionTitle}>
                {t("common.personalInformation")}
              </Text>

              <Text style={styles.workerEditLabel}>{t("common.fullName")}</Text>
              <TextInput
                style={styles.workerEditInput}
                value={workerEditName}
                onChangeText={setWorkerEditName}
                placeholder={t("common.enterFullName")}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.workerEditLabel}>{t("common.phoneNumber")}</Text>
              <TextInput
                style={styles.workerEditInput}
                value={workerEditPhone}
                onChangeText={setWorkerEditPhone}
                placeholder={t("common.mobilePlaceholder")}
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                maxLength={10}
              />

              <Text style={styles.workerEditLabel}>
                {t("workerDashboard.professionalDescription")}
              </Text>
              <TextInput
                style={[styles.workerEditInput, styles.workerEditTextArea]}
                value={workerEditBio}
                onChangeText={setWorkerEditBio}
                placeholder={t("workerDashboard.describeExperience")}
                placeholderTextColor="#9CA3AF"
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.workerEditSectionTitle}>
                {t("workerDashboard.professionalDetails")}
              </Text>

              <Text style={styles.workerEditLabel}>{t("workerDashboard.primarySkill")}</Text>
              <TextInput
                style={[
                  styles.workerEditInput,
                  { backgroundColor: "#F3F4F6", color: "#6B7280" },
                ]}
                value={translateSkillName(workerEditPrimarySkill)}
                editable={false}
                placeholder={t("workerDashboard.primarySkill")}
                placeholderTextColor="#9CA3AF"
              />
              <Text
                style={{
                  color: "#6B7280",
                  fontSize: 12,
                  marginTop: -6,
                  marginBottom: 12,
                }}
              >
                {t("workerDashboard.primarySkillFixed")}
              </Text>

              <Text style={styles.workerEditLabel}>{t("workerDashboard.subskill")}</Text>
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
                          {translateSubskillName(subskill.name)}
                        </Text>
                        {selected ? (
                          <Ionicons
                            name="checkmark-circle"
                            size={18}
                            color="#7047E8"
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.workerEditSubskillEmpty}>
                  <Text style={styles.workerEditSubskillEmptyText}>
                    {t("workerDashboard.noSubskills")}
                  </Text>
                </View>
              )}

              <Text style={styles.workerEditLabel}>{t("workerDashboard.yearsExperience")}</Text>
              <TextInput
                style={styles.workerEditInput}
                value={workerEditExperience}
                onChangeText={setWorkerEditExperience}
                placeholder={t("workerDashboard.experiencePlaceholder")}
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />

              <Text style={styles.workerEditLabel}>{t("workerDashboard.serviceRadius")}</Text>
              <TextInput
                style={styles.workerEditInput}
                value={workerEditRadius}
                onChangeText={setWorkerEditRadius}
                placeholder={t("workerDashboard.radiusPlaceholder")}
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />

              <Text style={styles.workerEditSectionTitle}>{t("workerDashboard.availability")}</Text>

              <Text style={styles.workerEditLabel}>{t("workerDashboard.workingDays")}</Text>
              <TextInput
                style={styles.workerEditInput}
                value={workerEditDays}
                onChangeText={setWorkerEditDays}
                placeholder={t("workerDashboard.workingDaysPlaceholder")}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.workerEditLabel}>{t("workerDashboard.preferredHours")}</Text>
              <TextInput
                style={styles.workerEditInput}
                value={workerEditHours}
                onChangeText={setWorkerEditHours}
                placeholder={t("workerDashboard.preferredHoursPlaceholder")}
                placeholderTextColor="#9CA3AF"
              />

              <Text style={styles.workerEditSectionTitle}>{t("workerDashboard.serviceAddress")}</Text>

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
                      ? t("workerDashboard.fetchingLocation")
                      : t("workerDashboard.useCurrentLocation")}
                  </Text>
                  <Text style={styles.workerLocationSubtitle}>
                    {t("workerDashboard.autoFillAddress")}
                  </Text>
                </View>
              </Pressable>

              {[
                [
                  t("common.houseLabel"),
                  workerEditHouse,
                  setWorkerEditHouse,
                  t("common.housePlaceholder"),
                ],
                [
                  t("common.streetLabel"),
                  workerEditLocality,
                  setWorkerEditLocality,
                  t("common.streetPlaceholder"),
                ],
                [t("common.city"), workerEditCity, setWorkerEditCity, t("common.enterCity")],
                [t("common.state"), workerEditState, setWorkerEditState, t("common.enterState")],
                [
                  t("common.pinCode"),
                  workerEditPincode,
                  setWorkerEditPincode,
                  t("common.pinPlaceholder"),
                ],
                [
                  t("common.landmarkOptional"),
                  workerEditLandmark,
                  setWorkerEditLandmark,
                  t("common.landmarkPlaceholder"),
                ],
              ].map(([label, value, setter, placeholder]) => (
                <View key={label as string}>
                  <Text style={styles.workerEditLabel}>{label as string}</Text>
                  <TextInput
                    style={styles.workerEditInput}
                    value={value as string}
                    onChangeText={setter as (value: string) => void}
                    placeholder={placeholder as string}
                    placeholderTextColor="#9CA3AF"
                    keyboardType={
                      label === t("common.pinCode") ? "number-pad" : "default"
                    }
                    maxLength={label === t("common.pinCode") ? 6 : undefined}
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
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.workerSaveButtonText}>
                      {t("common.saveChanges")}
                    </Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.workerEditNote}>
                Verification documents are read-only here and cannot be edited
                or replaced from your profile.
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

    const booking = selectedBooking;

    return (
      <Modal
        visible={detailsVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHandle} />

            {/* HEADER */}

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>{t("workerDashboard.bookingDetails")}</Text>

                <Text style={styles.modalSubtitle}>
                  {t("workerDashboard.bookingId")}: {booking.id}
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() => setDetailsVisible(false)}
              >
                <Ionicons name="close" size={21} color="#6B7280" />
              </Pressable>
            </View>

            {/* CUSTOMER */}

            <View style={styles.modalCustomer}>
              <View style={styles.modalCustomerAvatar}>
                <Ionicons name="person-outline" size={27} color="#2563EB" />
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
                <Text style={styles.modalContactText}>{t("workerDashboard.callCustomer")}</Text>
              </Pressable>

              <Pressable
                style={styles.modalContactButton}
                onPress={() => handleOpenCustomerLocation(booking)}
              >
                <Ionicons name="map-outline" size={18} color="#2563EB" />
                <Text style={styles.modalContactText}>{t("workerDashboard.openMaps")}</Text>
              </Pressable>
            </View>

            {/* SERVICE */}

            <View style={styles.modalDetailSection}>
              <Text style={styles.modalDetailLabel}>{t("workerDashboard.service")}</Text>

              <Text style={styles.modalDetailValue}>{translateSkillName(booking.service)}</Text>

              <Text style={styles.modalDetailSubvalue}>
                {booking.serviceDescription}
              </Text>
            </View>

            {booking.bookingType === "emergency" && (
              <View style={styles.modalEmergencyBanner}>
                <Ionicons name="flash" size={20} color="#DC2626" />
                <View style={styles.modalEmergencyContent}>
                  <Text style={styles.modalEmergencyTitle}>
                    {t("workerDashboard.emergencyService")}
                  </Text>
                  <Text style={styles.modalEmergencyText}>
                    {t("workerDashboard.customerImmediate")}
                  </Text>
                </View>
              </View>
            )}

            {/* DATE */}

            {booking.bookingType === "emergency" ? (
              <View style={styles.modalImmediateRow}>
                <Ionicons name="flash-outline" size={19} color="#DC2626" />
                <View>
                  <Text style={styles.detailSmallLabel}>{t("workerDashboard.response")}</Text>
                  <Text style={styles.detailSmallValue}>{t("workerDashboard.immediate")}</Text>
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

                  <Text style={styles.detailSmallLabel}>{t("workerDashboard.date")}</Text>

                  <Text style={styles.detailSmallValue}>{booking.date}</Text>
                </View>

                <View style={styles.modalDetailColumn}>
                  <View style={styles.detailIcon}>
                    <Ionicons name="time-outline" size={19} color="#2563EB" />
                  </View>

                  <Text style={styles.detailSmallLabel}>{t("workerDashboard.time")}</Text>

                  <Text style={styles.detailSmallValue}>{booking.time}</Text>
                </View>
              </View>
            )}

            {/* ADDRESS */}

            <View style={styles.modalDetailSection}>
              <Text style={styles.modalDetailLabel}>{t("workerDashboard.serviceAddress")}</Text>

              <View style={styles.addressRow}>
                <Ionicons name="location-outline" size={19} color="#2563EB" />

                <Text style={styles.addressText}>
                  {booking.address}
                  {typeof booking.latitude === "number" &&
                  typeof booking.longitude === "number"
                    ? `\n\n${t("workerDashboard.mapLocationAvailable")}`
                    : ""}
                </Text>
              </View>
            </View>

            {/* PAYMENT */}

            <View style={styles.paymentBreakdown}>
              <Text style={styles.paymentBreakdownTitle}>{t("workerDashboard.paymentSummary")}</Text>

              <View style={styles.paymentLine}>
                <Text style={styles.paymentLineLabel}>{t("workerDashboard.customerPayment")}</Text>

                <Text style={styles.paymentLineValue}>
                  ₹{formatMoney(booking.amount)}
                </Text>
              </View>

              <View style={styles.paymentLine}>
                <Text style={styles.paymentLineLabel}>{t("workerDashboard.platformCommission")}</Text>

                <Text style={styles.commissionValue}>
                  - ₹{formatMoney(booking.commission)}
                </Text>
              </View>

              <View style={styles.paymentSeparator} />

              <View style={styles.paymentLine}>
                <Text style={styles.finalEarningLabel}>{t("workerDashboard.yourEarning")}</Text>

                <Text style={styles.finalEarningValue}>
                  ₹{formatMoney(booking.workerEarning)}
                </Text>
              </View>
            </View>

            {/* PAYMENT STATUS */}

            {booking.status === "payment_pending" && (
              <View style={styles.modalPaymentPending}>
                <Ionicons name="time-outline" size={19} color="#EA580C" />

                <View style={styles.modalPaymentContent}>
                  <Text style={styles.modalPaymentTitle}>
                    {t("workerDashboard.waitingCustomerPaymentTitle")}
                  </Text>

                  <Text style={styles.modalPaymentText}>
                    The customer will receive a payment request after you
                    complete the work.
                  </Text>
                </View>
              </View>
            )}

            {booking.status === "paid" && (
              <View style={styles.modalPaymentReceived}>
                <Ionicons name="checkmark-circle" size={19} color="#16A34A" />

                <Text style={styles.modalPaymentReceivedText}>
                  {t("workerDashboard.paymentReceived", { amount: formatMoney(booking.workerEarning) })}
                </Text>
              </View>
            )}

            {/* ACTIONS */}

            {booking.status === "pending" && (
              <View style={styles.modalActions}>
                <Pressable
                  style={styles.modalRejectButton}
                  onPress={() => handleRejectBooking(booking)}
                >
                  <Text style={styles.modalRejectText}>{t("workerDashboard.decline")}</Text>
                </Pressable>

                <Pressable
                  style={styles.modalAcceptButton}
                  onPress={() => {
                    handleAcceptBooking(booking);

                    setDetailsVisible(false);
                  }}
                >
                  <Text style={styles.modalAcceptText}>{t("workerDashboard.acceptRequest")}</Text>
                </Pressable>
              </View>
            )}

            {booking.status === "accepted" && (
              <Pressable
                style={styles.modalStartButton}
                onPress={() => {
                  handleStartJob(booking);
                }}
              >
                <Ionicons name="play" size={18} color="#FFFFFF" />

                <Text style={styles.modalStartText}>{t("workerDashboard.startJob")}</Text>
              </Pressable>
            )}

            {booking.status === "started" && (
              <Pressable
                style={styles.modalCompleteButton}
                onPress={() => handleCompleteJob(booking)}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={19}
                  color="#FFFFFF"
                />

                <Text style={styles.modalCompleteText}>
                  {t("workerDashboard.markWorkCompleted")}
                </Text>
              </Pressable>
            )}

            <Pressable
              style={styles.modalCancelButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.modalCancelText}>{t("common.close")}</Text>
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
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />

      <View style={styles.container}>
        {/* CONTENT */}

        <View style={styles.content}>
          {activeTab === "home" && renderHome()}

          {activeTab === "requests" && renderRequests()}

          {activeTab === "earnings" && renderEarnings()}

          {activeTab === "profile" && renderProfile()}
        </View>

        {/* BOTTOM NAVIGATION */}

        <View style={styles.bottomNavigation}>
          {/* HOME */}

          <Pressable
            style={styles.navItem}
            onPress={() => setActiveTab("home")}
          >
            <View
              style={[
                styles.navIcon,
                activeTab === "home" && styles.navIconActive,
              ]}
            >
              <Ionicons
                name={activeTab === "home" ? "home" : "home-outline"}
                size={21}
                color={activeTab === "home" ? "#FFFFFF" : "#777777"}
              />
            </View>

            <Text
              style={[
                styles.navText,
                activeTab === "home" && styles.navTextActive,
              ]}
            >
              Home
            </Text>
          </Pressable>

          {/* REQUESTS */}

          <Pressable
            style={styles.navItem}
            onPress={() => setActiveTab("requests")}
          >
            <View
              style={[
                styles.navIcon,
                activeTab === "requests" && styles.navIconActive,
              ]}
            >
              <Ionicons
                name={
                  activeTab === "requests" ? "calendar" : "calendar-outline"
                }
                size={21}
                color={activeTab === "requests" ? "#FFFFFF" : "#777777"}
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
                activeTab === "requests" && styles.navTextActive,
              ]}
            >
              {t("workerDashboard.requests")}
            </Text>
          </Pressable>

          {/* EARNINGS */}

          <Pressable
            style={styles.navItem}
            onPress={() => setActiveTab("earnings")}
          >
            <View
              style={[
                styles.navIcon,
                activeTab === "earnings" && styles.navIconActive,
              ]}
            >
              <Ionicons
                name={activeTab === "earnings" ? "wallet" : "wallet-outline"}
                size={21}
                color={activeTab === "earnings" ? "#FFFFFF" : "#777777"}
              />
            </View>

            <Text
              style={[
                styles.navText,
                activeTab === "earnings" && styles.navTextActive,
              ]}
            >
              {t("workerDashboard.earnings")}
            </Text>
          </Pressable>

          {/* PROFILE */}

          <Pressable
            style={styles.navItem}
            onPress={() => setActiveTab("profile")}
          >
            <View
              style={[
                styles.navIcon,
                activeTab === "profile" && styles.navIconActive,
              ]}
            >
              <Ionicons
                name={activeTab === "profile" ? "person" : "person-outline"}
                size={21}
                color={activeTab === "profile" ? "#FFFFFF" : "#777777"}
              />
            </View>

            <Text
              style={[
                styles.navText,
                activeTab === "profile" && styles.navTextActive,
              ]}
            >
              {t("navigation.profile")}
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
    backgroundColor: "#F9FAFB",
  },

  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },

  headerLeft: {
    flex: 1,
  },

  welcomeText: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 3,
  },

  workerName: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
  },

  workerSkillRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 7,
    gap: 5,
  },

  skillBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    marginRight: 3,
  },

  skillBadgeText: {
    fontSize: 10.5,
    color: "#2563EB",
    fontWeight: "700",
  },

  ratingText: {
    fontSize: 11.5,
    color: "#6B7280",
    fontWeight: "600",
  },

  notificationButton: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },

  notificationDot: {
    position: "absolute",
    right: 9,
    top: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  /* =======================================================
     AVAILABILITY
  ======================================================= */

  availabilityCard: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    borderRadius: 15,
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },

  availabilityIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },

  availabilityContent: {
    flex: 1,
    marginLeft: 11,
  },

  availabilityTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#15803D",
  },

  availabilitySubtitle: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 2,
  },

  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#22C55E",
    marginRight: 3,
  },

  /* =======================================================
     STATS
  ======================================================= */

  statsRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 23,
  },

  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 11,
  },

  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },

  statValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  statLabel: {
    fontSize: 9.5,
    color: "#6B7280",
    marginTop: 2,
  },

  /* =======================================================
     SECTION
  ======================================================= */

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 11,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  sectionSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 3,
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
    marginBottom: 2,
  },

  /* =======================================================
     BOOKING CARD
  ======================================================= */

  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    marginBottom: 12,
  },

  bookingTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  customerAvatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  customerInfo: {
    flex: 1,
    marginLeft: 10,
  },

  customerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  serviceName: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  statusBadge: {
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 5,
  },

  statusText: {
    fontSize: 9.5,
    fontWeight: "700",
  },

  bookingServiceRow: {
    flexDirection: "row",
    marginTop: 14,
  },

  bookingIconSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  bookingServiceInfo: {
    flex: 1,
    marginLeft: 9,
  },

  bookingServiceTitle: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#374151",
  },

  bookingServiceAddress: {
    fontSize: 10.5,
    color: "#9CA3AF",
    marginTop: 3,
  },

  bookingMetaRow: {
    flexDirection: "row",
    marginTop: 13,
    gap: 18,
  },

  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  metaText: {
    fontSize: 10.5,
    color: "#6B7280",
  },

  /* =======================================================
     MONEY
  ======================================================= */

  moneyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 11,
    padding: 10,
    marginTop: 13,
  },

  moneyLabel: {
    fontSize: 9.5,
    color: "#9CA3AF",
    marginBottom: 2,
  },

  moneyAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },

  workerAmount: {
    fontSize: 15,
    fontWeight: "800",
    color: "#16A34A",
  },

  moneyDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 25,
  },

  /* =======================================================
     PAYMENT
  ======================================================= */

  emergencyRequestBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 12,
    paddingHorizontal: 11,
    paddingVertical: 8,
    marginTop: 11,
  },

  emergencyRequestText: {
    flex: 1,
    marginLeft: 7,
    fontSize: 10,
    fontWeight: "800",
    color: "#DC2626",
  },

  modalEmergencyBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
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
    fontWeight: "800",
    color: "#DC2626",
  },

  modalEmergencyText: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 3,
  },

  modalImmediateRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },

  paymentPendingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7ED",
    borderRadius: 9,
    padding: 9,
    marginTop: 10,
  },

  paymentPendingText: {
    fontSize: 10.5,
    color: "#C2410C",
    fontWeight: "600",
    marginLeft: 6,
  },

  paymentReceivedBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 9,
    padding: 9,
    marginTop: 10,
  },

  paymentReceivedText: {
    fontSize: 10.5,
    color: "#15803D",
    fontWeight: "600",
    marginLeft: 6,
  },

  /* =======================================================
     ACTIONS
  ======================================================= */

  contactActionRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },

  contactButton: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  contactButtonText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  actionRow: {
    flexDirection: "row",
    gap: 9,
    marginTop: 12,
  },

  rejectButton: {
    flex: 1,
    height: 43,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  rejectButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },

  acceptButton: {
    flex: 1.4,
    height: 43,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  acceptButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  startButton: {
    height: 43,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },

  startButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  completeButton: {
    height: 43,
    borderRadius: 10,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    gap: 6,
  },

  completeButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* =======================================================
     EMPTY
  ======================================================= */

  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 22,
    alignItems: "center",
    marginBottom: 15,
  },

  emptyIcon: {
    width: 55,
    height: 55,
    borderRadius: 28,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  emptyTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#374151",
  },

  emptySubtitle: {
    fontSize: 10.5,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 4,
  },

  /* =======================================================
     EARNING INFO
  ======================================================= */

  earningInfoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    marginTop: 3,
  },

  earningInfoIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },

  earningInfoContent: {
    flex: 1,
    marginLeft: 10,
  },

  earningInfoTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#1E40AF",
  },

  earningInfoText: {
    fontSize: 10.5,
    color: "#4B5563",
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
    fontWeight: "800",
    color: "#111827",
  },

  pageSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  /* =======================================================
     REQUEST COUNT
  ======================================================= */

  requestCountCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    marginBottom: 17,
  },

  requestCountIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },

  requestCountContent: {
    flex: 1,
    marginLeft: 10,
  },

  requestCountTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
  },

  requestCountSubtitle: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 3,
  },

  /* =======================================================
     LARGE EMPTY
  ======================================================= */

  largeEmptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 45,
    paddingHorizontal: 25,
    alignItems: "center",
  },

  largeEmptyIcon: {
    width: 75,
    height: 75,
    borderRadius: 38,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },

  largeEmptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#374151",
  },

  largeEmptySubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 17,
    marginTop: 5,
  },

  /* =======================================================
     EARNINGS
  ======================================================= */

  totalEarningsCard: {
    backgroundColor: "#2563EB",
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    marginBottom: 13,
  },

  totalEarningsIcon: {
    width: 51,
    height: 51,
    borderRadius: 26,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 9,
  },

  totalEarningsLabel: {
    fontSize: 11,
    color: "#DBEAFE",
  },

  totalEarningsAmount: {
    fontSize: 32,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 3,
  },

  totalEarningsSubtext: {
    fontSize: 10,
    color: "#DBEAFE",
    marginTop: 2,
  },

  pendingEarningsCard: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "#FED7AA",
    borderRadius: 14,
    padding: 13,
    flexDirection: "row",
    marginBottom: 13,
  },

  pendingEarningsIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#FFEDD5",
    justifyContent: "center",
    alignItems: "center",
  },

  pendingEarningsContent: {
    flex: 1,
    marginLeft: 10,
  },

  pendingEarningsTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#C2410C",
  },

  pendingEarningsAmount: {
    fontSize: 19,
    fontWeight: "800",
    color: "#9A3412",
    marginTop: 2,
  },

  pendingEarningsSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 1,
  },

  commissionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    marginBottom: 20,
  },

  commissionIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  commissionContent: {
    flex: 1,
    marginLeft: 10,
  },

  commissionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },

  commissionText: {
    fontSize: 10.5,
    color: "#6B7280",
    lineHeight: 16,
    marginTop: 3,
  },

  commissionExample: {
    fontSize: 10.5,
    color: "#2563EB",
    lineHeight: 16,
    marginTop: 7,
    fontWeight: "600",
  },

  historyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 10,
  },

  historyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 9,
  },

  historyIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#F0FDF4",
    justifyContent: "center",
    alignItems: "center",
  },

  historyContent: {
    flex: 1,
    marginLeft: 10,
  },

  historyService: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#374151",
  },

  historyCustomer: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 2,
  },

  historyDate: {
    fontSize: 9.5,
    color: "#9CA3AF",
    marginTop: 2,
  },

  historyAmountContainer: {
    alignItems: "flex-end",
  },

  historyAmount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#16A34A",
  },

  paidText: {
    fontSize: 9.5,
    color: "#16A34A",
    marginTop: 2,
  },

  /* =======================================================
     PROFILE
  ======================================================= */

  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    padding: 22,
    marginBottom: 14,
  },

  profileAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },

  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },

  profileSkill: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginTop: 3,
  },

  profileRating: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 5,
  },

  profileRatingText: {
    fontSize: 10.5,
    color: "#6B7280",
  },

  profileDivider: {
    color: "#D1D5DB",
    marginHorizontal: 2,
  },

  profileJobs: {
    fontSize: 10.5,
    color: "#6B7280",
  },

  profileOptions: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    marginBottom: 14,
  },

  profileOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },

  profileOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
  },

  profileOptionContent: {
    flex: 1,
    marginLeft: 10,
  },

  profileOptionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#374151",
  },

  profileOptionSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
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
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
  },

  logoutText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },

  profileFooter: {
    textAlign: "center",
    fontSize: 10,
    color: "#9CA3AF",
    marginTop: 15,
  },

  /* =======================================================
     BOTTOM NAVIGATION
  ======================================================= */

  bottomNavigation: {
    height: 68,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 5,
  },

  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  navIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },

  navIconActive: {
    backgroundColor: "#2563EB",
  },

  navText: {
    fontSize: 9.5,
    color: "#777777",
    marginTop: 2,
    fontWeight: "500",
  },

  navTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  navBadge: {
    position: "absolute",
    right: -2,
    top: -3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },

  navBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "800",
  },

  /* =======================================================
     MODAL
  ======================================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 25,
    maxHeight: "92%",
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 17,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 17,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#111827",
  },

  modalSubtitle: {
    fontSize: 10.5,
    color: "#9CA3AF",
    marginTop: 3,
  },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCustomer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 11,
    marginBottom: 14,
  },

  modalCustomerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCustomerInfo: {
    marginLeft: 11,
  },

  modalCustomerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },

  modalCustomerPhone: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 3,
  },

  modalContactRow: {
    flexDirection: "row",
    gap: 9,
    marginBottom: 14,
  },

  modalContactButton: {
    flex: 1,
    height: 43,
    borderRadius: 11,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#DBEAFE",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  modalContactText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  modalDetailSection: {
    marginBottom: 13,
  },

  modalDetailLabel: {
    fontSize: 10.5,
    color: "#9CA3AF",
    fontWeight: "600",
    marginBottom: 4,
  },

  modalDetailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },

  modalDetailSubvalue: {
    fontSize: 10.5,
    color: "#6B7280",
    marginTop: 2,
  },

  modalTwoColumns: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 13,
  },

  modalDetailColumn: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 11,
    padding: 10,
  },

  detailIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },

  detailSmallLabel: {
    fontSize: 9.5,
    color: "#9CA3AF",
  },

  detailSmallValue: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#374151",
    marginTop: 2,
  },

  addressRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
  },

  addressText: {
    flex: 1,
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
    marginLeft: 7,
  },

  /* =======================================================
     PAYMENT BREAKDOWN
  ======================================================= */

  paymentBreakdown: {
    backgroundColor: "#F8FAFC",
    borderRadius: 13,
    padding: 12,
    marginBottom: 12,
  },

  paymentBreakdownTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#374151",
    marginBottom: 9,
  },

  paymentLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  paymentLineLabel: {
    fontSize: 10.5,
    color: "#6B7280",
  },

  paymentLineValue: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#374151",
  },

  commissionValue: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#DC2626",
  },

  paymentSeparator: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 5,
  },

  finalEarningLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },

  finalEarningValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#16A34A",
  },

  /* =======================================================
     MODAL PAYMENT
  ======================================================= */

  modalPaymentPending: {
    backgroundColor: "#FFF7ED",
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },

  modalPaymentContent: {
    flex: 1,
    marginLeft: 7,
  },

  modalPaymentTitle: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#C2410C",
  },

  modalPaymentText: {
    fontSize: 10,
    color: "#78716C",
    lineHeight: 15,
    marginTop: 2,
  },

  modalPaymentReceived: {
    backgroundColor: "#F0FDF4",
    borderRadius: 11,
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },

  modalPaymentReceivedText: {
    flex: 1,
    fontSize: 10.5,
    color: "#15803D",
    fontWeight: "600",
    marginLeft: 7,
    lineHeight: 15,
  },

  /* =======================================================
     MODAL ACTIONS
  ======================================================= */

  modalActions: {
    flexDirection: "row",
    gap: 9,
  },

  modalRejectButton: {
    flex: 1,
    height: 48,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  modalRejectText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#6B7280",
  },

  modalAcceptButton: {
    flex: 1.5,
    height: 48,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  modalAcceptText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  modalStartButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
  },

  modalStartText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  modalCompleteButton: {
    height: 48,
    borderRadius: 11,
    backgroundColor: "#16A34A",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 7,
    marginBottom: 9,
  },

  modalCompleteText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  modalCancelButton: {
    height: 45,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCancelText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#4B5563",
  },
});
