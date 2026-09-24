import React, { useEffect, useMemo, useState } from "react";
import * as Location from "expo-location";
import LanguageButton from "../../components/LanguageButton";
import { useTranslation } from "react-i18next";

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
  View,
  Image,
  Linking,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import RazorpayCheckout from "react-native-razorpay";

import { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RootStackParamList } from "../navigation/AppNavigator";

import {
  logout,
  getCustomerBookings,
  getCustomerProfile,
  updateCustomerProfile,
  createBooking as createBackendBooking,
  createCustomerPayment,
  verifyCustomerPayment,
  getPredictedServicePrice,
  getWorkerLocation,
  getSkillsWithSubskills,
  submitWorkerRating,
} from "../../api";

/* =========================================================
   TYPES
========================================================= */

type Props = NativeStackScreenProps<RootStackParamList, "UserDashboard">;

type Subskill = {
  id: string;
  skill_id: string;
  name: string;
  description?: string | null;
};

type Service = {
  id: string;
  name: string;
  description: string;
  slug?: string | null;
  icon: keyof typeof Ionicons.glyphMap;
  subskills: Subskill[];
  // Retained only for the existing UI/pricing display where a value exists.
  basePrice?: number;
};

type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string | null;
};

type Address = {
  id: string;
  title: string;
  address: string;
  latitude?: number | null;
  longitude?: number | null;
};

type Booking = {
  id: string;
  bookingType?: "normal" | "emergency";
  serviceId: string;
  serviceName: string;
  subskillId?: string | null;
  subskillName?: string | null;
  serviceIcon: keyof typeof Ionicons.glyphMap;
  address: Address;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  createdAt: string;
  worker?: {
    id: string;
    name: string;
    phone?: string | null;
    avatarUrl?: string | null;
    rating?: number | null;
    completedJobs?: number;
    hourlyRate?: number | null;
  } | null;
  customerRating?: number | null;
  price?: {
    estimatedAmount?: number | null;
    finalAmount?: number | null;
    currency?: string;
    workerAmount?: number | null;
    welfareAmount?: number | null;
    platformAmount?: number | null;
    workerSharePercent?: number;
    welfareSharePercent?: number;
    platformSharePercent?: number;
  };
  payment?: {
    id?: string | null;
    amount?: number | null;
    status?: string | null;
  };
};

/* =========================================================
   SERVICE PRESENTATION
========================================================= */

const SERVICE_BASE_PRICES: Record<string, number> = {
  electrician: 800,
  plumber: 650,
  carpenter: 900,
  painter: 1000,
  "domestic-helper": 600,
  caregiver: 800,
  technician: 850,
};

const serviceIconForSlug = (
  slug?: string | null,
  name?: string,
): keyof typeof Ionicons.glyphMap => {
  const key = String(slug || name || "")
    .trim()
    .toLowerCase();

  switch (key) {
    case "electrician":
      return "flash-outline";
    case "plumber":
      return "water-outline";
    case "carpenter":
    case "carpentry":
      return "hammer-outline";
    case "painter":
      return "color-palette-outline";
    case "domestic-helper":
    case "domestic helper":
      return "home-outline";
    case "caregiver":
      return "heart-outline";
    case "driver":
    case "drivers":
      return "car-outline";
    case "gardener":
      return "leaf-outline";
    case "cleaner":
      return "sparkles-outline";
    case "technician":
      return "construct-outline";
    case "ac-technician":
      return "snow-outline";
    default:
      return "construct-outline";
  }
};

/* =========================================================
   USER DASHBOARD
========================================================= */

export default function UserDashboard({ route, navigation }: Props) {
  /* =======================================================
     USER INFORMATION
  ======================================================= */

  /*
     For now these are fallback values.

     Later these will come from the login API / JWT.

     Example backend response:

     {
       "id": "U001",
       "name": "Akhilesh",
       "email": "akhilesh@gmail.com",
       "phone": "9876543210"
     }
  */

  const [user, setUser] = useState<User>({
    id: route.params?.user?.id || "",
    name: route.params?.user?.name || "User",
    email: route.params?.user?.email || "",
    phone: route.params?.user?.phone || "",
    avatarUrl: null,
  });
  const { t, i18n } = useTranslation();

  const translateServiceName = (name: string) => {
    const normalized = name.trim().toLowerCase();
    return t(`workerDetails.skillTranslations.${normalized}`, {
      defaultValue: name,
    });
  };

  const translateServiceDescription = (
    description: string,
    slug?: string | null,
    name?: string,
  ) => {
    const normalized = String(slug || name || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");

    return t(`userDashboard.serviceDescriptions.${normalized}`, {
      defaultValue: description,
    });
  };

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

  const getBookingStatusText = (status: Booking["status"]) =>
    t(`userDashboard.status.${status.toLowerCase()}`, { defaultValue: status });


  /* =======================================================
     UI STATE
  ======================================================= */

  const [search, setSearch] = useState("");

  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [bookingType, setBookingType] = useState<"normal" | "emergency">(
    "normal",
  );

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [selectedSubskill, setSelectedSubskill] = useState<Subskill | null>(
    null,
  );

  const [profileVisible, setProfileVisible] = useState(false);

  // Customer profile editing
  const [customerEditVisible, setCustomerEditVisible] = useState(false);
  const [customerEditSaving, setCustomerEditSaving] = useState(false);
  const [customerEditName, setCustomerEditName] = useState("");
  const [customerEditPhone, setCustomerEditPhone] = useState("");

  const [bookingsVisible, setBookingsVisible] = useState(false);

  const [bookingStep, setBookingStep] = useState(1);

  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [emergencyPrice, setEmergencyPrice] = useState<number | null>(null);
  const [emergencyPriceLoading, setEmergencyPriceLoading] = useState(false);
  const [normalPrice, setNormalPrice] = useState<number | null>(null);
  const [normalPriceLoading, setNormalPriceLoading] = useState(false);
  const [liveWorkerLocations, setLiveWorkerLocations] = useState<
    Record<string, { latitude: number; longitude: number; updatedAt?: string }>
  >({});

  const [bookingSuccess, setBookingSuccess] = useState(false);

  const [latestBookingId, setLatestBookingId] = useState<string | null>(null);

  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [ratingBooking, setRatingBooking] = useState<Booking | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

  // Add/update service address
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressLocationLoading, setAddressLocationLoading] = useState(false);
  const [addressHouse, setAddressHouse] = useState("");
  const [addressLocality, setAddressLocality] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [addressPincode, setAddressPincode] = useState("");
  const [addressLandmark, setAddressLandmark] = useState("");
  const [addressLatitude, setAddressLatitude] = useState<number | null>(null);
  const [addressLongitude, setAddressLongitude] = useState<number | null>(null);

  /* =======================================================
     BOOKING DATA
  ======================================================= */

  const addresses: Address[] = useMemo(() => {
    const profile = customerProfile || {};
    const details = profile.address || profile.address_details || {};
    const formatted =
      details.formatted_address ||
      [
        details.house,
        details.locality,
        details.city,
        details.state,
        details.pincode,
      ]
        .filter(Boolean)
        .join(", ");

    if (formatted || profile.default_address) {
      return [
        {
          id: "default",
          title: "Home",
          address: formatted || profile.default_address,
          latitude: profile?.location?.latitude ?? details?.latitude ?? null,
          longitude: profile?.location?.longitude ?? details?.longitude ?? null,
        },
      ];
    }

    return [];
  }, [customerProfile]);

  const timeSlots = [
    "09:00 AM - 11:00 AM",
    "11:00 AM - 01:00 PM",
    "01:00 PM - 03:00 PM",
    "03:00 PM - 05:00 PM",
    "05:00 PM - 07:00 PM",
    "07:00 PM - 09:00 PM",
  ];

  const availableDates = useMemo(() => {
    const dates: {
      value: string;
      day: string;
      date: number;
      month: string;
    }[] = [];

    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);

      dates.push({
        value: date.toISOString().split("T")[0],
        day: date.toLocaleDateString(i18n.language === "hi" ? "hi-IN" : "en-US", {
          weekday: "short",
        }),
        date: date.getDate(),
        month: date.toLocaleDateString(i18n.language === "hi" ? "hi-IN" : "en-US", {
          month: "short",
        }),
      });
    }

    return dates;
  }, [i18n.language]);

  const formatBackendBooking = (item: any): Booking => {
    const scheduled = item?.scheduled_start_at
      ? new Date(item.scheduled_start_at)
      : null;
    const serviceId = item?.service?.id || item?.service?.slug || "";
    const serviceName = item?.service?.name || "Service";
    const addressText = item?.service_address || "Service address";

    let status: Booking["status"] = "Pending";
    switch (item?.status) {
      case "accepted":
      case "worker_assigned":
      case "in_progress":
        status = "Confirmed";
        break;
      case "completed":
        status = "Completed";
        break;
      case "cancelled":
        status = "Cancelled";
        break;
      default:
        status = "Pending";
    }

    return {
      id: String(item.id),
      bookingType: item?.booking_type === "emergency" ? "emergency" : "normal",
      serviceId,
      serviceName,
      subskillId: item?.subskill?.id || item?.subskill_id || null,
      subskillName: item?.subskill?.name || null,
      serviceIcon: serviceIconForSlug(item?.service?.slug),
      address: {
        id: "backend",
        title: t("userDashboard.serviceAddress"),
        address: addressText,
      },
      date: scheduled ? scheduled.toISOString().split("T")[0] : "",
      time: scheduled
        ? scheduled.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
          })
        : "Not scheduled",
      status,
      createdAt: item?.created_at || new Date().toISOString(),
      worker: item?.worker
        ? {
            id: String(item.worker.id),
            name: item.worker.name || "Assigned professional",
            phone: item.worker.phone || null,
            avatarUrl: item.worker.avatar_url || null,
            rating:
              item.worker.rating !== null && item.worker.rating !== undefined
                ? Number(item.worker.rating)
                : null,
            completedJobs:
              item.worker.completed_jobs !== null &&
              item.worker.completed_jobs !== undefined
                ? Number(item.worker.completed_jobs)
                : 0,
            hourlyRate:
              item.worker.hourly_rate !== null &&
              item.worker.hourly_rate !== undefined
                ? Number(item.worker.hourly_rate)
                : null,
          }
        : null,
      customerRating:
        item?.customer_rating !== null && item?.customer_rating !== undefined
          ? Number(item.customer_rating)
          : null,
      price: item?.price
        ? {
            estimatedAmount:
              item.price.estimated_amount !== null &&
              item.price.estimated_amount !== undefined
                ? Number(item.price.estimated_amount)
                : null,
            finalAmount:
              item.price.final_amount !== null &&
              item.price.final_amount !== undefined
                ? Number(item.price.final_amount)
                : null,
            currency: item.price.currency || "INR",
            workerAmount:
              item.price.worker_amount !== null &&
              item.price.worker_amount !== undefined
                ? Number(item.price.worker_amount)
                : null,
            welfareAmount:
              item.price.welfare_amount !== null &&
              item.price.welfare_amount !== undefined
                ? Number(item.price.welfare_amount)
                : null,
            platformAmount:
              item.price.platform_amount !== null &&
              item.price.platform_amount !== undefined
                ? Number(item.price.platform_amount)
                : null,
            workerSharePercent: Number(item.price.worker_share_percent ?? 80),
            welfareSharePercent: Number(item.price.welfare_share_percent ?? 10),
            platformSharePercent: Number(
              item.price.platform_share_percent ?? 10,
            ),
          }
        : undefined,
      payment: item?.payment
        ? {
            id: item.payment.id || null,
            amount:
              item.payment.amount !== null && item.payment.amount !== undefined
                ? Number(item.payment.amount)
                : null,
            status: item.payment.status || null,
          }
        : undefined,
    };
  };

  const loadDashboardData = async (silent = false) => {
    try {
      if (!silent) setLoadingBookings(true);
      const [profileResponse, bookingResponse] = await Promise.all([
        getCustomerProfile(),
        getCustomerBookings(),
      ]);

      const rawProfile = profileResponse?.profile || {};
      // Backend returns customer-specific data under customer_profile.
      // Normalize it here so the rest of the dashboard can use one shape.
      const profile = {
        ...rawProfile,
        ...(rawProfile?.customer_profile || {}),
      };

      setCustomerProfile(profile);
      setUser((current) => ({
        ...current,
        id: profile?.id || rawProfile?.id || current.id,
        name: rawProfile?.full_name || current.name,
        email: rawProfile?.email || current.email,
        phone: rawProfile?.phone || current.phone,
        avatarUrl: rawProfile?.avatar_url || current.avatarUrl || null,
      }));

      setBookings((bookingResponse?.bookings || []).map(formatBackendBooking));
    } catch (error) {
      console.error("Failed to load customer dashboard:", error);
      if (!silent) {
        Alert.alert(
          t("userDashboard.alerts.loadDashboardTitle"),
          error instanceof Error ? error.message : t("userDashboard.alerts.tryAgain"),
        );
      }
    } finally {
      if (!silent) setLoadingBookings(false);
    }
  };

  useEffect(() => {
    const loadServices = async () => {
      try {
        setLoadingServices(true);
        const rows = await getSkillsWithSubskills();
        const normalized: Service[] = (Array.isArray(rows) ? rows : []).map(
          (skill: any) => ({
            id: String(skill.id),
            name: String(skill.name || "Service"),
            description: String(skill.description || ""),
            slug: skill.slug || null,
            icon: serviceIconForSlug(skill.slug, skill.name),
            subskills: Array.isArray(skill.subskills)
              ? skill.subskills.map((subskill: any) => ({
                  id: String(subskill.id),
                  skill_id: String(subskill.skill_id),
                  name: String(subskill.name || "Subskill"),
                  description: subskill.description ?? null,
                }))
              : [],
            basePrice:
              skill.slug &&
              SERVICE_BASE_PRICES[String(skill.slug).toLowerCase()]
                ? SERVICE_BASE_PRICES[String(skill.slug).toLowerCase()]
                : undefined,
          }),
        );
        setServices(normalized);
      } catch (error) {
        console.error("Failed to load services:", error);
        setServices([]);
        Alert.alert(t("userDashboard.alerts.loadServicesTitle"), t("userDashboard.alerts.tryAgain"));
      } finally {
        setLoadingServices(false);
      }
    };

    loadServices();
  }, []);

  useEffect(() => {
    loadDashboardData();

    const refreshInterval = setInterval(() => {
      loadDashboardData(true);
    }, 5000);

    return () => clearInterval(refreshInterval);
  }, []);

  // Fetch the exact server-side AI price for the selected normal booking.
  // These are the same inputs used by the final booking calculation.
  useEffect(() => {
    if (
      bookingType !== "normal" ||
      !selectedService ||
      !selectedSubskill ||
      !selectedAddress ||
      !selectedDate ||
      !selectedTime
    ) {
      setNormalPrice(null);
      return;
    }

    const addressDetails =
      customerProfile?.address || customerProfile?.address_details || {};

    const latitude = Number(
      selectedAddress?.latitude ??
        customerProfile?.location?.latitude ??
        addressDetails.latitude,
    );
    const longitude = Number(
      selectedAddress?.longitude ??
        customerProfile?.location?.longitude ??
        addressDetails.longitude,
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setNormalPrice(null);
      return;
    }

    const startTime = selectedTime.split(" - ")[0];
    const dateParts = selectedDate.split("-").map(Number);
    const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

    if (
      dateParts.length !== 3 ||
      dateParts.some((part) => Number.isNaN(part)) ||
      !timeMatch
    ) {
      setNormalPrice(null);
      return;
    }

    const [, hourText, minuteText, meridiem] = timeMatch;
    let hours = Number(hourText);
    const minutes = Number(minuteText);

    if (meridiem.toUpperCase() === "AM") {
      if (hours === 12) hours = 0;
    } else if (hours !== 12) {
      hours += 12;
    }

    const scheduledStart = new Date(
      dateParts[0],
      dateParts[1] - 1,
      dateParts[2],
      hours,
      minutes,
      0,
      0,
    );

    if (Number.isNaN(scheduledStart.getTime())) {
      setNormalPrice(null);
      return;
    }

    let cancelled = false;

    const loadNormalPrice = async () => {
      try {
        setNormalPriceLoading(true);

        const result = await getPredictedServicePrice({
          skill_slug: selectedService.slug || selectedService.name,
          subCategory: selectedSubskill.name,
          service_address: selectedAddress.address,
          latitude,
          longitude,
          city: addressDetails?.city || "",
          scheduled_start_at: scheduledStart.toISOString(),
        });

        const price = Number(result?.suggestedPrice ?? result?.estimated_price);

        if (!cancelled && Number.isFinite(price) && price > 0) {
          setNormalPrice(price);
        } else if (!cancelled) {
          setNormalPrice(null);
        }
      } catch (error) {
        console.error("Normal AI price error:", error);
        if (!cancelled) setNormalPrice(null);
      } finally {
        if (!cancelled) setNormalPriceLoading(false);
      }
    };

    loadNormalPrice();

    return () => {
      cancelled = true;
    };
  }, [
    bookingType,
    selectedService?.id,
    selectedSubskill?.id,
    selectedAddress?.id,
    selectedAddress?.address,
    selectedAddress?.latitude,
    selectedAddress?.longitude,
    selectedDate,
    selectedTime,
    customerProfile?.id,
    customerProfile?.address?.city ?? customerProfile?.address_details?.city,
  ]);

  // Fetch the live AI price only for emergency requests.
  useEffect(() => {
    if (bookingType !== "emergency" || !selectedService || !customerProfile) {
      setEmergencyPrice(null);
      return;
    }

    let cancelled = false;

    const loadEmergencyPrice = async () => {
      try {
        setEmergencyPriceLoading(true);

        const address =
          customerProfile?.address || customerProfile?.address_details || {};

        const result = await getPredictedServicePrice({
          skill_slug:
            selectedService?.slug || selectedService?.name || "carpenter",
          city: address?.city || "",
          date: new Date().toISOString().slice(0, 10),
          weather: "Clear",
          events: "Normal day",
        });

        const rawPrice =
          result?.suggestedPrice ??
          result?.estimated_price ??
          result?.estimatedPrice ??
          selectedService?.basePrice ??
          900;
        const price = Number(rawPrice);

        if (!cancelled && Number.isFinite(price) && price > 0) {
          setEmergencyPrice(price);
        }
      } catch (error) {
        console.error("Emergency AI price error:", error);
        if (!cancelled) setEmergencyPrice(null);
      } finally {
        if (!cancelled) setEmergencyPriceLoading(false);
      }
    };

    loadEmergencyPrice();

    return () => {
      cancelled = true;
    };
  }, [
    bookingType,
    selectedService?.id,
    customerProfile?.id,
    customerProfile?.city,
  ]);

  // After an emergency worker accepts, keep fetching that worker's
  // current Redis-backed location so the customer UI stays updated.
  useEffect(() => {
    const activeEmergencyBookings = bookings.filter(
      (booking) =>
        booking.bookingType === "emergency" &&
        booking.worker?.id &&
        booking.status === "Confirmed",
    );

    if (activeEmergencyBookings.length === 0) return;

    let cancelled = false;

    const refreshLocations = async () => {
      for (const booking of activeEmergencyBookings) {
        const workerId = booking.worker?.id;
        if (!workerId) continue;

        try {
          const response = await getWorkerLocation(workerId);
          const location = response?.location || response;

          const latitude = Number(location?.latitude);
          const longitude = Number(location?.longitude);

          if (
            !cancelled &&
            Number.isFinite(latitude) &&
            Number.isFinite(longitude)
          ) {
            setLiveWorkerLocations((current) => ({
              ...current,
              [workerId]: {
                latitude,
                longitude,
                updatedAt: location?.updatedAt,
              },
            }));
          }
        } catch (error) {
          // Location may not exist for the first few seconds after acceptance.
          console.log("Worker location not available yet:", error);
        }
      }
    };

    refreshLocations();
    const interval = setInterval(refreshLocations, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [bookings]);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredServices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return services;
    }

    return services.filter((service) =>
      service.name.toLowerCase().includes(query),
    );
  }, [search, services]);

  /* =======================================================
     SERVICE CLICK
  ======================================================= */

  const handleServicePress = (service: Service) => {
    setSelectedService(service);
    setSelectedSubskill(null);
  };

  /* =======================================================
     EDIT CUSTOMER PROFILE
  ======================================================= */

  const openCustomerEdit = () => {
    setCustomerEditName(user.name || "");
    setCustomerEditPhone(user.phone || "");
    setCustomerEditVisible(true);
  };

  const handleSaveCustomerProfile = async () => {
    const name = customerEditName.trim();
    const phone = customerEditPhone.trim();

    if (name.length < 2) {
      Alert.alert(t("userDashboard.alerts.invalidNameTitle"), t("userDashboard.alerts.invalidNameMessage"));
      return;
    }

    if (!/^\d{10}$/.test(phone)) {
      Alert.alert(t("userDashboard.alerts.invalidMobileTitle"), t("userDashboard.alerts.invalidMobileMessage"));
      return;
    }

    try {
      setCustomerEditSaving(true);
      await updateCustomerProfile({ full_name: name, phone });
      setUser((current) => ({ ...current, name, phone }));
      await loadDashboardData();
      setCustomerEditVisible(false);
      Alert.alert(t("userDashboard.alerts.profileUpdatedTitle"), t("userDashboard.alerts.profileUpdatedMessage"));
    } catch (error) {
      console.error("Customer profile update error:", error);
      Alert.alert(
        t("userDashboard.alerts.updateProfileTitle"),
        error instanceof Error
          ? error.message
          : t("userDashboard.alerts.updateProfileMessage"),
      );
    } finally {
      setCustomerEditSaving(false);
    }
  };

  /* =======================================================
     ADD / UPDATE ADDRESS
  ======================================================= */

  const openAddressModal = () => {
    const profile = customerProfile || {};
    const details = profile?.address || profile?.address_details || {};

    setAddressHouse(details?.house || "");
    setAddressLocality(details?.locality || "");
    setAddressCity(details?.city || "");
    setAddressState(details?.state || "");
    setAddressPincode(details?.pincode || "");
    setAddressLandmark(details?.landmark || "");
    setAddressLatitude(
      profile?.location?.latitude ?? details?.latitude ?? null,
    );
    setAddressLongitude(
      profile?.location?.longitude ?? details?.longitude ?? null,
    );
    setAddressModalVisible(true);
  };

  const handleAddressCurrentLocation = async () => {
    setAddressLocationLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(t("userDashboard.alerts.locationPermissionTitle"), t("userDashboard.alerts.locationPermissionMessage"));
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      setAddressLatitude(latitude);
      setAddressLongitude(longitude);

      const results = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (results.length > 0) {
        const current = results[0];

        setAddressHouse(current.streetNumber || current.name || "");
        setAddressLocality(current.district || current.subregion || "");
        setAddressCity(current.city || current.subregion || "");
        setAddressState(current.region || "");
        setAddressPincode(current.postalCode || "");
      }

      Alert.alert(t("userDashboard.alerts.locationFoundTitle"), t("userDashboard.alerts.locationFoundMessage"));
    } catch (error) {
      console.error("Address location error:", error);
      Alert.alert(t("userDashboard.alerts.locationErrorTitle"), t("userDashboard.alerts.locationErrorMessage"));
    } finally {
      setAddressLocationLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    if (
      !addressHouse.trim() ||
      !addressLocality.trim() ||
      !addressCity.trim() ||
      !addressState.trim() ||
      !addressPincode.trim()
    ) {
      Alert.alert(t("userDashboard.alerts.incompleteAddressTitle"), t("userDashboard.alerts.incompleteAddressMessage"));
      return;
    }

    if (!/^\d{6}$/.test(addressPincode.trim())) {
      Alert.alert(t("userDashboard.alerts.invalidPinTitle"), t("userDashboard.alerts.invalidPinMessage"));
      return;
    }

    if (addressLatitude === null || addressLongitude === null) {
      Alert.alert(t("userDashboard.alerts.locationRequiredTitle"), t("userDashboard.alerts.locationRequiredMessage"));
      return;
    }

    const formattedAddress = [
      addressHouse.trim(),
      addressLocality.trim(),
      addressCity.trim(),
      addressState.trim(),
      addressPincode.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    try {
      setAddressSaving(true);

      await updateCustomerProfile({
        address: {
          house: addressHouse.trim(),
          locality: addressLocality.trim(),
          city: addressCity.trim(),
          state: addressState.trim(),
          pincode: addressPincode.trim(),
          landmark: addressLandmark.trim(),
          formatted_address: formattedAddress,
          latitude: addressLatitude,
          longitude: addressLongitude,
        },
        latitude: addressLatitude,
        longitude: addressLongitude,
      });

      await loadDashboardData();

      setAddressModalVisible(false);

      // Automatically select the newly saved address in the booking flow.
      setSelectedAddress({
        id: "default",
        title: "Home",
        address: formattedAddress,
        latitude: addressLatitude,
        longitude: addressLongitude,
      });

      Alert.alert(t("userDashboard.alerts.addressSavedTitle"), t("userDashboard.alerts.addressSavedMessage"));
    } catch (error) {
      console.error("Failed to save address:", error);
      Alert.alert(
        t("userDashboard.alerts.saveAddressTitle"),
        error instanceof Error
          ? error.message
          : t("userDashboard.alerts.saveAddressMessage"),
      );
    } finally {
      setAddressSaving(false);
    }
  };

  const handlePayNow = async (booking: Booking) => {
    const amount =
      booking.price?.finalAmount ?? booking.price?.estimatedAmount ?? 0;

    if (!booking.id || amount <= 0) {
      Alert.alert(t("userDashboard.alerts.paymentUnavailableTitle"), t("userDashboard.alerts.paymentUnavailableMessage"));
      return;
    }

    if (booking.payment?.status === "paid") {
      Alert.alert(t("userDashboard.alerts.alreadyPaidTitle"), t("userDashboard.alerts.alreadyPaidMessage"));
      return;
    }

    try {
      setPaymentSubmitting(true);

      const paymentResponse = await createCustomerPayment(booking.id);
      const paymentId = paymentResponse?.payment?.id;
      const razorpay = paymentResponse?.razorpay;

      if (
        paymentResponse?.alreadyPaid ||
        paymentResponse?.payment?.status === "paid"
      ) {
        await loadDashboardData();
        Alert.alert(t("userDashboard.alerts.alreadyPaidTitle"), t("userDashboard.alerts.alreadyPaidMessage"));
        return;
      }

      if (!paymentId || !razorpay?.key_id || !razorpay?.order_id) {
        throw new Error("Razorpay payment order could not be created.");
      }

      const checkoutResult = await RazorpayCheckout.open({
        key: String(razorpay.key_id),
        amount: Number(razorpay.amount),
        currency: String(razorpay.currency || "INR"),
        name: "ShramSaathi",
        description: `Payment for ${booking.serviceName || "completed service"}`,
        order_id: String(razorpay.order_id),
        prefill: {
          name: user.name || undefined,
          email: user.email || undefined,
          contact: user.phone || undefined,
        },
        theme: {
          color: "#208AEF",
        },
      });

      await verifyCustomerPayment(String(paymentId), {
        razorpay_order_id: checkoutResult.razorpay_order_id,
        razorpay_payment_id: checkoutResult.razorpay_payment_id,
        razorpay_signature: checkoutResult.razorpay_signature,
      });

      await loadDashboardData();

      Alert.alert(t("userDashboard.alerts.paymentSuccessfulTitle"), t("userDashboard.alerts.paymentSuccessfulMessage", { amount: amount.toFixed(2) }));
    } catch (error: any) {
      console.error("Customer Razorpay payment failed:", error);

      const description =
        error?.description ||
        error?.error?.description ||
        (error instanceof Error
          ? error.message
          : "Unable to complete payment.");

      Alert.alert(t("userDashboard.alerts.paymentFailedTitle"), description);
    } finally {
      setPaymentSubmitting(false);
    }
  };

  /* =======================================================
     BOOK SERVICE
  ======================================================= */

  const handleBookService = () => {
    if (!selectedService) return;

    setBookingStep(1);
    setSelectedAddress(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingType("normal");
    setSelectedSubskill(null);
    setBookingSuccess(false);
  };

  const handleCloseBooking = () => {
    setSelectedService(null);
    setBookingStep(1);
    setSelectedAddress(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingType("normal");
    setSelectedSubskill(null);
    setBookingSuccess(false);
    setLatestBookingId(null);
  };

  const handleNextStep = () => {
    if (bookingStep === 1) {
      if (!selectedService) return;

      if (!selectedSubskill) {
        Alert.alert(t("userDashboard.alerts.selectSubskillTitle"), t("userDashboard.alerts.selectSubskillMessage"));
        return;
      }

      if (!selectedAddress) {
        Alert.alert(t("userDashboard.alerts.selectAddressTitle"), t("userDashboard.alerts.selectAddressMessage"));
        return;
      }

      if (bookingType === "emergency") {
        setBookingStep(4);
        return;
      }
    }

    if (bookingStep === 2 && !selectedDate) {
      Alert.alert(t("userDashboard.alerts.selectDateTitle"), t("userDashboard.alerts.selectDateMessage"));
      return;
    }

    if (bookingStep === 3 && !selectedTime) {
      Alert.alert(t("userDashboard.alerts.selectTimeTitle"), t("userDashboard.alerts.selectTimeMessage"));
      return;
    }

    setBookingStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePreviousStep = () => {
    if (bookingType === "emergency" && bookingStep === 4) {
      setBookingStep(1);
      return;
    }

    setBookingStep((prev) => Math.max(prev - 1, 1));
  };

  const formatBookingDate = (dateValue: string) => {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString(i18n.language === "hi" ? "hi-IN" : "en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const confirmBooking = async () => {
    if (!selectedService || !selectedAddress) {
      return;
    }

    if (!selectedSubskill) {
      Alert.alert(t("userDashboard.alerts.selectSubskillTitle"), t("userDashboard.alerts.selectSubskillMessage"));
      return;
    }

    if (bookingType === "normal" && (!selectedDate || !selectedTime)) {
      Alert.alert(t("userDashboard.alerts.selectScheduleTitle"), t("userDashboard.alerts.selectScheduleMessage"));
      return;
    }

    const addressDetails =
      customerProfile?.address || customerProfile?.address_details || {};

    const latitude = Number(
      selectedAddress?.latitude ??
        customerProfile?.location?.latitude ??
        addressDetails.latitude,
    );

    const longitude = Number(
      selectedAddress?.longitude ??
        customerProfile?.location?.longitude ??
        addressDetails.longitude,
    );

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      Alert.alert(t("userDashboard.alerts.locationRequiredTitle"), t("userDashboard.alerts.validServiceLocationMessage"));
      return;
    }

    let scheduledStart: Date;

    if (bookingType === "emergency") {
      scheduledStart = new Date();
    } else {
      const startTime = selectedTime!.split(" - ")[0];

      const dateParts = selectedDate!.split("-").map(Number);
      const timeMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);

      if (
        dateParts.length !== 3 ||
        dateParts.some((part) => Number.isNaN(part))
      ) {
        Alert.alert(t("userDashboard.alerts.invalidScheduleTitle"), t("userDashboard.alerts.invalidScheduleMessage"));
        return;
      }

      if (!timeMatch) {
        Alert.alert(t("userDashboard.alerts.invalidScheduleTitle"), t("userDashboard.alerts.invalidScheduleMessage"));
        return;
      }

      const [, hourText, minuteText, meridiem] = timeMatch;

      let hours = Number(hourText);
      const minutes = Number(minuteText);

      if (hours < 1 || hours > 12 || minutes < 0 || minutes > 59) {
        Alert.alert(t("userDashboard.alerts.invalidScheduleTitle"), t("userDashboard.alerts.invalidScheduleMessage"));
        return;
      }

      if (meridiem.toUpperCase() === "AM") {
        if (hours === 12) {
          hours = 0;
        }
      } else {
        if (hours !== 12) {
          hours += 12;
        }
      }

      scheduledStart = new Date(
        dateParts[0],
        dateParts[1] - 1,
        dateParts[2],
        hours,
        minutes,
        0,
        0,
      );

      if (Number.isNaN(scheduledStart.getTime())) {
        Alert.alert(t("userDashboard.alerts.invalidScheduleTitle"), t("userDashboard.alerts.invalidScheduleMessage"));
        return;
      }
    }

    const normalPriceValue = Number(normalPrice);

    if (
      bookingType === "normal" &&
      (!Number.isFinite(normalPriceValue) || normalPriceValue <= 0)
    ) {
      Alert.alert(
        t("userDashboard.alerts.priceUnavailableTitle"),
        normalPriceLoading
          ? t("userDashboard.alerts.waitForAiPrice")
          : t("userDashboard.alerts.aiPriceError"),
      );
      return;
    }

    try {
      setBookingSubmitting(true);

      const bookingPrice =
        bookingType === "emergency" ? Number(emergencyPrice) : normalPriceValue;

      if (!Number.isFinite(bookingPrice) || bookingPrice <= 0) {
        Alert.alert(t("userDashboard.alerts.priceUnavailableTitle"), t("userDashboard.alerts.servicePriceError"));
        return;
      }

      const createdBooking = await createBackendBooking({
        skill_id: selectedService.id,
        subskill_id: selectedSubskill.id,
        estimated_amount: bookingPrice,
        booking_type: bookingType,
        service_address: selectedAddress.address,
        latitude,
        longitude,
        scheduled_start_at: scheduledStart.toISOString(),
        city: addressDetails?.city || undefined,
      });

      const createdId =
        createdBooking?.booking?.id || createdBooking?.id || null;

      setLatestBookingId(createdId ? String(createdId) : null);

      await loadDashboardData();

      if (!createdId) {
        const refreshed = bookings[0];
        if (refreshed?.id) {
          setLatestBookingId(refreshed.id);
        }
      }

      setBookingSuccess(true);
      setBookingStep(4);
    } catch (error) {
      console.error("Failed to create booking:", error);
      Alert.alert(
        t("userDashboard.alerts.bookingFailedTitle"),
        error instanceof Error ? error.message : t("userDashboard.alerts.createBookingError"),
      );
    } finally {
      setBookingSubmitting(false);
    }
  };

  /* =======================================================
     WORKER RATING
  ======================================================= */

  const openRatingModal = (booking: Booking) => {
    if (booking.status !== "Completed" || !booking.worker?.id) {
      return;
    }

    if (booking.customerRating) {
      Alert.alert(t("userDashboard.alerts.alreadyRatedTitle"), t("userDashboard.alerts.alreadyRatedMessage"));
      return;
    }

    setRatingBooking(booking);
    setSelectedRating(0);
    setRatingModalVisible(true);
  };

  const closeRatingModal = () => {
    if (ratingSubmitting) return;

    setRatingModalVisible(false);
    setRatingBooking(null);
    setSelectedRating(0);
  };

  const handleSubmitRating = async () => {
    if (!ratingBooking?.id || !ratingBooking.worker?.id) {
      return;
    }

    if (selectedRating < 1 || selectedRating > 5) {
      Alert.alert(t("userDashboard.alerts.selectRatingTitle"), t("userDashboard.alerts.selectRatingMessage"));
      return;
    }

    try {
      setRatingSubmitting(true);

      await submitWorkerRating({
        booking_id: ratingBooking.id,
        rating: selectedRating,
      });

      setRatingModalVisible(false);
      setRatingBooking(null);
      setSelectedRating(0);

      await loadDashboardData();

      Alert.alert(t("userDashboard.alerts.thankYouTitle"), t("userDashboard.alerts.ratingSubmitted"));
    } catch (error) {
      console.error("Failed to submit worker rating:", error);
      Alert.alert(
        t("userDashboard.alerts.ratingFailedTitle"),
        error instanceof Error
          ? error.message
          : t("userDashboard.alerts.ratingFailedMessage"),
      );
    } finally {
      setRatingSubmitting(false);
    }
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    Alert.alert(
      t("common.logout"),
      t("common.logoutConfirm"),

      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },

        {
          text: t("common.logout"),
          style: "destructive",

          onPress: async () => {
            await logout();
            navigation.replace("Login");
          },
        },
      ],
    );
  };

  /* =======================================================
     MAIN SCREEN
  ======================================================= */

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.container}>
        {/* =================================================
            MAIN CONTENT
        ================================================= */}

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.welcome}>{t("userDashboard.welcome")} 👋</Text>

              <Text style={styles.userName} numberOfLines={1}>
                {user.name}
              </Text>
            </View>

            <Pressable
              style={styles.notificationButton}
              onPress={() =>
                Alert.alert(
                  t("userDashboard.notifications.title"),
                  t("userDashboard.notifications.message"),
                )
              }
            >
              <Ionicons
                name="notifications-outline"
                size={23}
                color="#222222"
              />

              <View style={styles.notificationDot} />
            </Pressable>
          </View>

          {/* =================================================
              LOCATION
          ================================================= */}

          <Pressable
            style={styles.locationContainer}
            onPress={() => {
              if (addresses.length === 0) {
                Alert.alert(
                  "Service Location",
                  "No saved service address is available yet.",
                );
                return;
              }

              Alert.alert(
                "Service Location",
                addresses
                  .map((item) => `${item.title}: ${item.address}`)
                  .join("\n\n"),
              );
            }}
          >
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={18} color="#7047E8" />
            </View>

            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>{t("userDashboard.serviceLocation")}</Text>

              <Text style={styles.locationValue} numberOfLines={1}>
                {addresses[0]?.address || t("userDashboard.selectLocation")}
              </Text>
            </View>

            <Ionicons name="chevron-down" size={18} color="#777777" />
          </Pressable>

          {/* =================================================
              SEARCH
          ================================================= */}

          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={22} color="#777777" />

            <TextInput
              style={styles.searchInput}
              placeholder={t("userDashboard.searchPlaceholder")}
              placeholderTextColor="#999999"
              value={search}
              onChangeText={setSearch}
            />

            {search.length > 0 && (
              <Pressable onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={20} color="#999999" />
              </Pressable>
            )}
          </View>

          {/* =================================================
              SERVICES TITLE
          ================================================= */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t("userDashboard.whatDoYouNeed")}</Text>

            <Text style={styles.sectionSubtitle}>
              {t("userDashboard.chooseServiceToStart")}
            </Text>
          </View>

          {/* =================================================
              SERVICE GRID
          ================================================= */}

          <View style={styles.serviceGrid}>
            {filteredServices.map((service) => (
              <Pressable
                key={service.id}
                style={({ pressed }) => [
                  styles.serviceCard,

                  pressed && {
                    transform: [{ scale: 0.97 }],
                    opacity: 0.8,
                  },
                ]}
                onPress={() => handleServicePress(service)}
              >
                <View style={styles.serviceIcon}>
                  <Ionicons name={service.icon} size={29} color="#7047E8" />
                </View>

                <Text style={styles.serviceName}>{translateServiceName(service.name)}</Text>

                <Text style={styles.serviceDescription}>
                  {translateServiceDescription(
                    service.description,
                    service.slug,
                    service.name,
                  )}
                </Text>

                <View style={styles.arrow}>
                  <Ionicons name="arrow-forward" size={15} color="#7047E8" />
                </View>
              </Pressable>
            ))}
          </View>

          {/* =================================================
              ACTIVE BOOKINGS
          ================================================= */}

          <View style={styles.bookingSection}>
            <View style={styles.bookingSectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>{t("userDashboard.yourBookings")}</Text>

                <Text style={styles.sectionSubtitle}>
                  {t("userDashboard.trackRequests")}
                </Text>
              </View>

              {bookings.length > 0 && (
                <Pressable onPress={() => setBookingsVisible(true)}>
                  <Text style={styles.viewAllText}>{t("userDashboard.viewAll")}</Text>
                </Pressable>
              )}
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyBooking}>
                <View style={styles.bookingIcon}>
                  <Ionicons name="calendar-outline" size={27} color="#7047E8" />
                </View>

                <View style={styles.bookingText}>
                  <Text style={styles.bookingTitle}>{t("userDashboard.noActiveBookings")}</Text>

                  <Text style={styles.bookingSubtitle}>
                    {t("userDashboard.upcomingServices")}
                  </Text>
                </View>
              </View>
            ) : (
              bookings.slice(0, 2).map((booking) => (
                <Pressable
                  key={booking.id}
                  style={styles.bookingCard}
                  onPress={() => setBookingsVisible(true)}
                >
                  <View style={styles.bookingServiceIcon}>
                    <Ionicons
                      name={booking.serviceIcon}
                      size={25}
                      color="#7047E8"
                    />
                  </View>

                  <View style={styles.bookingCardContent}>
                    <View style={styles.bookingCardTop}>
                      <Text style={styles.bookingCardTitle}>
                        {translateServiceName(booking.serviceName)}
                      </Text>

                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {getBookingStatusText(booking.status)}
                        </Text>
                      </View>
                    </View>

                    {!!booking.subskillName && (
                      <Text style={styles.bookingCardInfo}>
                        {translateSubskillName(booking.subskillName)}
                      </Text>
                    )}

                    <Text style={styles.bookingCardInfo}>
                      {formatBookingDate(booking.date)}
                    </Text>

                    <Text style={styles.bookingCardInfo}>{booking.time}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#999" />
                </Pressable>
              ))
            )}
          </View>

          {/* =================================================
              TRUST CARD
          ================================================= */}

          <View style={styles.trustCard}>
            <View style={styles.trustIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={27}
                color="#7047E8"
              />
            </View>

            <View style={styles.trustContent}>
              <Text style={styles.trustTitle}>{t("userDashboard.trustedProfessionals")}</Text>

              <Text style={styles.trustDescription}>
                {t("userDashboard.findSkilledWorkers")}
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* =================================================
            BOTTOM NAVIGATION
        ================================================= */}

        <View style={styles.bottomNavigation}>
          {/* HOME */}

          <Pressable style={styles.navItem}>
            <View style={styles.activeNavIcon}>
              <Ionicons name="home" size={20} color="#FFFFFF" />
            </View>

            <Text style={styles.activeNavText}>{t("navigation.home")}</Text>
          </Pressable>

          {/* BOOKINGS */}

          <Pressable
            style={styles.navItem}
            onPress={() => setBookingsVisible(true)}
          >
            <View style={styles.navIcon}>
              <Ionicons name="calendar-outline" size={22} color="#777777" />
            </View>

            <Text style={styles.navText}>{t("navigation.bookings")}</Text>
          </Pressable>

          {/* PROFILE */}

          <Pressable
            style={styles.navItem}
            onPress={() => setProfileVisible(true)}
          >
            <View style={styles.navIcon}>
              <Ionicons name="person-outline" size={22} color="#777777" />
            </View>

            <Text style={styles.navText}>{t("navigation.profile")}</Text>
          </Pressable>
        </View>

        {/* =================================================
            SERVICE BOOKING MODAL
        ================================================= */}

        <Modal
          visible={selectedService !== null}
          transparent
          animationType="slide"
          onRequestClose={handleCloseBooking}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.bookingModal}>
              <View style={styles.modalHandle} />

              <View style={styles.bookingHeader}>
                <Pressable
                  style={styles.modalCircleButton}
                  onPress={() => {
                    if (!bookingSuccess && bookingStep > 1) {
                      handlePreviousStep();
                    } else {
                      handleCloseBooking();
                    }
                  }}
                >
                  <Ionicons
                    name={
                      bookingStep > 1 && !bookingSuccess
                        ? "arrow-back"
                        : "close"
                    }
                    size={21}
                    color="#222222"
                  />
                </Pressable>

                <Text style={styles.bookingModalTitle}>
                  {bookingSuccess
                    ? t("booking.bookingConfirmed")
                    : t("booking.bookService")}
                </Text>

                <View style={{ width: 40 }} />
              </View>

              {!bookingSuccess ? (
                <>
                  <View style={styles.progressRow}>
                    {[1, 2, 3, 4].map((step) => (
                      <View
                        key={step}
                        style={[
                          styles.progressBar,
                          step <= bookingStep && styles.progressBarActive,
                        ]}
                      />
                    ))}
                  </View>

                  {selectedService && (
                    <View style={styles.selectedServiceCompact}>
                      <View style={styles.selectedServiceIcon}>
                        <Ionicons
                          name={selectedService.icon}
                          size={29}
                          color="#7047E8"
                        />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedServiceName}>
                          {translateServiceName(selectedService.name)}
                        </Text>
                        <Text style={styles.selectedServiceDescription}>
                          {translateServiceDescription(
                            selectedService.description,
                            selectedService.slug,
                            selectedService.name,
                          )}
                        </Text>
                      </View>
                    </View>
                  )}

                  {bookingStep === 1 && (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.bookingStepContent}
                    >
                      <Text style={styles.stepTitle}>
                        {t("userDashboard.whereService")}
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        {t("userDashboard.selectAddressForVisit")}
                      </Text>

                      <View style={styles.caregiverSkillSection}>
                        <Text style={styles.bookingOptionLabel}>
                          {t("userDashboard.chooseSubskill")}
                        </Text>
                        <Text style={styles.stepSubtitle}>
                          Select the specific service you need under{" "}
                          {selectedService ? translateSkillName(selectedService.name) : ""}.
                        </Text>

                        {(selectedService?.subskills || []).map((subskill) => (
                          <Pressable
                            key={subskill.id}
                            onPress={() => setSelectedSubskill(subskill)}
                            style={[
                              styles.caregiverSkillCard,
                              selectedSubskill?.id === subskill.id &&
                                styles.caregiverSkillCardSelected,
                            ]}
                          >
                            <View style={styles.caregiverSkillIcon}>
                              <Ionicons
                                name={
                                  selectedService?.icon || "construct-outline"
                                }
                                size={21}
                                color="#7047E8"
                              />
                            </View>

                            <View style={styles.caregiverSkillContent}>
                              <Text style={styles.caregiverSkillName}>
                                {translateSubskillName(subskill.name)}
                              </Text>
                              {!!subskill.description && (
                                <Text style={styles.caregiverSkillDescription}>
                                  {subskill.description}
                                </Text>
                              )}
                            </View>

                            <Ionicons
                              name={
                                selectedSubskill?.id === subskill.id
                                  ? "radio-button-on"
                                  : "radio-button-off"
                              }
                              size={22}
                              color={
                                selectedSubskill?.id === subskill.id
                                  ? "#7047E8"
                                  : "#AAAAAA"
                              }
                            />
                          </Pressable>
                        ))}
                      </View>

                      <Text style={styles.bookingOptionLabel}>
                        {t("userDashboard.serviceType")}
                      </Text>

                      <View style={styles.bookingTypeRow}>
                        <Pressable
                          onPress={() => setBookingType("normal")}
                          style={[
                            styles.bookingTypeCard,
                            bookingType === "normal" &&
                              styles.bookingTypeCardSelected,
                          ]}
                        >
                          <Ionicons
                            name="calendar-outline"
                            size={22}
                            color="#7047E8"
                          />
                          <Text style={styles.bookingTypeTitle}>{t("userDashboard.normal")}</Text>
                          <Text style={styles.bookingTypeDescription}>
                            {t("userDashboard.scheduleDateTime")}
                          </Text>
                        </Pressable>

                        <Pressable
                          onPress={() => setBookingType("emergency")}
                          style={[
                            styles.bookingTypeCard,
                            bookingType === "emergency" &&
                              styles.bookingTypeCardSelected,
                          ]}
                        >
                          <Ionicons
                            name="flash-outline"
                            size={22}
                            color="#7047E8"
                          />
                          <Text style={styles.bookingTypeTitle}>{t("userDashboard.emergency")}</Text>
                          <Text style={styles.bookingTypeDescription}>
                            {t("userDashboard.requestImmediately")}
                          </Text>
                        </Pressable>
                      </View>

                      {addresses.map((address) => (
                        <Pressable
                          key={address.id}
                          onPress={() => setSelectedAddress(address)}
                          style={[
                            styles.addressCard,
                            selectedAddress?.id === address.id &&
                              styles.selectedAddressCard,
                          ]}
                        >
                          <View style={styles.addressIcon}>
                            <Ionicons
                              name={
                                address.title === "Home"
                                  ? "home-outline"
                                  : "location-outline"
                              }
                              size={21}
                              color="#7047E8"
                            />
                          </View>

                          <View style={styles.addressContent}>
                            <Text style={styles.addressTitle}>
                              {address.title}
                            </Text>
                            <Text style={styles.addressText}>
                              {address.address}
                            </Text>
                          </View>

                          <Ionicons
                            name={
                              selectedAddress?.id === address.id
                                ? "radio-button-on"
                                : "radio-button-off"
                            }
                            size={22}
                            color={
                              selectedAddress?.id === address.id
                                ? "#7047E8"
                                : "#AAAAAA"
                            }
                          />
                        </Pressable>
                      ))}

                      <Pressable
                        style={styles.addAddressButton}
                        onPress={openAddressModal}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#7047E8"
                        />
                        <Text style={styles.addAddressText}>
                          {t("userDashboard.addNewAddress")}
                        </Text>
                      </Pressable>
                    </ScrollView>
                  )}

                  {bookingStep === 2 && (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.bookingStepContent}
                    >
                      <Text style={styles.stepTitle}>{t("userDashboard.chooseDate")}</Text>
                      <Text style={styles.stepSubtitle}>
                        {t("userDashboard.selectVisitDate")}
                      </Text>

                      <View style={styles.dateGrid}>
                        {availableDates.map((item) => (
                          <Pressable
                            key={item.value}
                            onPress={() => setSelectedDate(item.value)}
                            style={[
                              styles.dateCard,
                              selectedDate === item.value &&
                                styles.dateCardSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.dateDay,
                                selectedDate === item.value &&
                                  styles.dateTextSelected,
                              ]}
                            >
                              {item.day}
                            </Text>
                            <Text
                              style={[
                                styles.dateNumber,
                                selectedDate === item.value &&
                                  styles.dateTextSelected,
                              ]}
                            >
                              {item.date}
                            </Text>
                            <Text
                              style={[
                                styles.dateMonth,
                                selectedDate === item.value &&
                                  styles.dateTextSelected,
                              ]}
                            >
                              {item.month}
                            </Text>
                          </Pressable>
                        ))}
                      </View>
                    </ScrollView>
                  )}

                  {bookingStep === 3 && (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.bookingStepContent}
                    >
                      <Text style={styles.stepTitle}>{t("userDashboard.chooseTimeSlot")}</Text>
                      <Text style={styles.stepSubtitle}>
                        {t("userDashboard.pickTime")}
                      </Text>

                      {timeSlots.map((slot) => (
                        <Pressable
                          key={slot}
                          onPress={() => setSelectedTime(slot)}
                          style={[
                            styles.timeSlot,
                            selectedTime === slot && styles.timeSlotSelected,
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={21}
                            color={
                              selectedTime === slot ? "#7047E8" : "#666666"
                            }
                          />
                          <Text
                            style={[
                              styles.timeSlotText,
                              selectedTime === slot &&
                                styles.timeSlotTextSelected,
                            ]}
                          >
                            {slot}
                          </Text>
                          <Ionicons
                            name={
                              selectedTime === slot
                                ? "radio-button-on"
                                : "radio-button-off"
                            }
                            size={22}
                            color={
                              selectedTime === slot ? "#7047E8" : "#AAAAAA"
                            }
                          />
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}

                  {bookingStep === 4 && (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.bookingStepContent}
                    >
                      <Text style={styles.stepTitle}>{t("userDashboard.confirmYourBooking")}</Text>
                      <Text style={styles.stepSubtitle}>
                        {t("userDashboard.reviewBooking")}
                      </Text>

                      <View style={styles.summaryCard}>
                        <View style={styles.summaryIcon}>
                          <Ionicons
                            name={selectedService?.icon || "construct-outline"}
                            size={25}
                            color="#7047E8"
                          />
                        </View>
                        <View style={styles.summaryContent}>
                          <Text style={styles.summaryLabel}>{t("userDashboard.service")}</Text>
                          <Text style={styles.summaryValue}>
                            {selectedService ? translateSkillName(selectedService.name) : ""}
                          </Text>
                        </View>
                      </View>

                      {selectedSubskill && (
                        <View style={styles.summaryRow}>
                          <Ionicons
                            name={selectedService?.icon || "construct-outline"}
                            size={21}
                            color="#7047E8"
                          />
                          <View style={styles.summaryRowContent}>
                            <Text style={styles.summaryLabel}>{t("userDashboard.subskill")}</Text>
                            <Text style={styles.summaryValue}>
                              {translateSubskillName(selectedSubskill.name)}
                            </Text>
                          </View>
                        </View>
                      )}

                      <View style={styles.summaryRow}>
                        <Ionicons
                          name="flash-outline"
                          size={21}
                          color="#7047E8"
                        />
                        <View style={styles.summaryRowContent}>
                          <Text style={styles.summaryLabel}>{t("userDashboard.bookingType")}</Text>
                          <Text style={styles.summaryValue}>
                            {bookingType === "emergency"
                              ? "Emergency"
                              : "Normal"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.summaryRow}>
                        <Ionicons
                          name="location-outline"
                          size={21}
                          color="#7047E8"
                        />
                        <View style={styles.summaryRowContent}>
                          <Text style={styles.summaryLabel}>
                            {t("userDashboard.serviceLocation")}
                          </Text>
                          <Text style={styles.summaryValue}>
                            {selectedAddress?.title}
                          </Text>
                          <Text style={styles.summarySmall}>
                            {selectedAddress?.address}
                          </Text>
                        </View>
                      </View>

                      {bookingType === "normal" && (
                        <>
                          <View style={styles.summaryRow}>
                            <Ionicons
                              name="calendar-outline"
                              size={21}
                              color="#7047E8"
                            />
                            <View style={styles.summaryRowContent}>
                              <Text style={styles.summaryLabel}>{t("userDashboard.date")}</Text>
                              <Text style={styles.summaryValue}>
                                {selectedDate
                                  ? formatBookingDate(selectedDate)
                                  : "Not selected"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.summaryRow}>
                            <Ionicons
                              name="time-outline"
                              size={21}
                              color="#7047E8"
                            />
                            <View style={styles.summaryRowContent}>
                              <Text style={styles.summaryLabel}>{t("userDashboard.timeSlot")}</Text>
                              <Text style={styles.summaryValue}>
                                {selectedTime}
                              </Text>
                            </View>
                          </View>
                        </>
                      )}

                      <View style={styles.bookingPriceCard}>
                        <View style={styles.bookingPriceHeader}>
                          <View>
                            <Text style={styles.bookingPriceTitle}>
                              {t("userDashboard.estimatedServiceCost")}
                            </Text>
                            <Text style={styles.bookingPriceSubtitle}>
                              {bookingType === "emergency"
                                ? t("userDashboard.estimatedImmediateCost")
                                : t("userDashboard.selectedTwoHourSlot")}
                            </Text>
                          </View>
                          <Text style={styles.bookingPriceTotal}>
                            {bookingType === "emergency"
                              ? emergencyPrice
                                ? `₹${emergencyPrice.toFixed(0)}`
                                : t("userDashboard.calculating")
                              : normalPriceLoading
                                ? t("userDashboard.calculating")
                                : normalPrice
                                  ? `₹${normalPrice.toFixed(0)}`
                                  : t("userDashboard.calculatedByBackend")}
                          </Text>
                        </View>
                        <View style={styles.bookingPriceLine}>
                          <Text style={styles.bookingPriceLabel}>
                            {t("userDashboard.customerPays")}
                          </Text>
                          <Text style={styles.bookingPriceValue}>
                            {bookingType === "emergency"
                              ? emergencyPrice
                                ? `₹${emergencyPrice.toFixed(0)}`
                                : t("userDashboard.calculating")
                              : normalPriceLoading
                                ? t("userDashboard.calculating")
                                : normalPrice
                                  ? `₹${normalPrice.toFixed(0)}`
                                  : t("userDashboard.calculatedByBackend")}
                          </Text>
                        </View>
                        <View style={styles.bookingPriceLine}>
                          <Text style={styles.bookingPriceLabel}>
                            {t("userDashboard.workerShare")}
                          </Text>
                          <Text style={styles.bookingWorkerValue}>
                            {bookingType === "emergency"
                              ? emergencyPrice
                                ? `₹${(emergencyPrice * 0.8).toFixed(0)}`
                                : t("userDashboard.calculating")
                              : normalPriceLoading
                                ? t("userDashboard.calculating")
                                : normalPrice
                                  ? `₹${(normalPrice * 0.8).toFixed(0)}`
                                  : t("userDashboard.calculatedByBackend")}
                          </Text>
                        </View>
                        <Text style={styles.bookingPriceNote}>
                          {t("userDashboard.priceNote")}
                        </Text>
                      </View>

                      <View style={styles.confirmNotice}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={20}
                          color="#7047E8"
                        />
                        <Text style={styles.confirmNoticeText}>
                          {t("userDashboard.trackBookingStatus")}
                        </Text>
                      </View>
                    </ScrollView>
                  )}

                  <Pressable
                    style={styles.continueButton}
                    onPress={
                      bookingStep === 4 ? confirmBooking : handleNextStep
                    }
                  >
                    <Text style={styles.continueButtonText}>
                      {bookingStep === 4 ? "Confirm Booking" : "Continue"}
                    </Text>
                    <Ionicons
                      name={bookingStep === 4 ? "checkmark" : "arrow-forward"}
                      size={20}
                      color="#FFFFFF"
                    />
                  </Pressable>
                </>
              ) : (
                <View style={styles.successContainer}>
                  <View style={styles.successIcon}>
                    <Ionicons name="checkmark" size={45} color="#FFFFFF" />
                  </View>

                  <Text style={styles.successTitle}>{t("userDashboard.bookingConfirmedBang")}</Text>

                  <Text style={styles.successText}>
                    {bookingType === "emergency"
                      ? `Your ${selectedService ? translateSkillName(selectedService.name) : ""} emergency service has been requested immediately.`
                      : `Your ${selectedService ? translateSkillName(selectedService.name) : ""} service has been successfully booked.`}
                  </Text>

                  <View style={styles.bookingIdCard}>
                    <Text style={styles.bookingIdLabel}>{t("userDashboard.bookingId")}</Text>
                    <Text style={styles.bookingId}>
                      #{latestBookingId || bookings[0]?.id || "Pending"}
                    </Text>
                  </View>

                  <View style={styles.successDetails}>
                    {bookingType === "normal" && (
                      <>
                        <Text style={styles.successDetailText}>
                          {selectedDate ? formatBookingDate(selectedDate) : ""}
                        </Text>
                        <Text style={styles.successDetailText}>
                          {selectedTime}
                        </Text>
                      </>
                    )}
                    <Text style={styles.successDetailText}>
                      {bookingType === "emergency"
                        ? t("userDashboard.emergencyRequest")
                        : t("userDashboard.normalBooking")}
                    </Text>
                    <Text style={styles.successAmountText}>
                      Estimated amount:{" "}
                      {bookingType === "emergency"
                        ? emergencyPrice
                          ? `₹${emergencyPrice.toFixed(0)}`
                          : t("userDashboard.beingCalculated")
                        : normalPrice
                          ? `₹${normalPrice.toFixed(0)}`
                          : t("userDashboard.calculatedByBackend")}
                    </Text>
                    <Text style={styles.successPaymentNote}>
                      {t("userDashboard.paymentAfterCompletion")}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.doneButton}
                    onPress={handleCloseBooking}
                  >
                    <Text style={styles.doneButtonText}>{t("common.done")}</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* =================================================
            BOOKINGS MODAL
        ================================================= */}

        <Modal
          visible={bookingsVisible}
          animationType="slide"
          onRequestClose={() => setBookingsVisible(false)}
        >
          <SafeAreaView style={styles.bookingsScreen}>
            <View style={styles.bookingsHeader}>
              <Pressable
                onPress={() => setBookingsVisible(false)}
                style={styles.headerBackButton}
              >
                <Ionicons name="arrow-back" size={23} color="#222222" />
              </Pressable>

              <Text style={styles.bookingsTitle}>{t("userDashboard.myBookings")}</Text>

              <View style={{ width: 42 }} />
            </View>

            {bookings.length === 0 ? (
              <View style={styles.noBookingsContainer}>
                <View style={styles.noBookingsIcon}>
                  <Ionicons name="calendar-outline" size={43} color="#7047E8" />
                </View>
                <Text style={styles.noBookingsTitle}>{t("userDashboard.noBookingsYet")}</Text>
                <Text style={styles.noBookingsText}>
                  {t("userDashboard.firstBookingHint")}
                </Text>
                <Pressable
                  style={styles.startBookingButton}
                  onPress={() => setBookingsVisible(false)}
                >
                  <Text style={styles.startBookingText}>{t("userDashboard.bookServiceButton")}</Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bookingsContent}
              >
                <Text style={styles.bookingsCount}>
                  {bookings.length}{" "}
                  {bookings.length === 1 ? "booking" : "bookings"}
                </Text>

                {bookings.map((booking) => (
                  <View key={booking.id} style={styles.fullBookingCard}>
                    <View style={styles.fullBookingTop}>
                      <View style={styles.fullBookingIcon}>
                        <Ionicons
                          name={booking.serviceIcon}
                          size={27}
                          color="#7047E8"
                        />
                      </View>

                      <View style={styles.fullBookingTitleArea}>
                        <Text style={styles.fullBookingTitle}>
                          {translateServiceName(booking.serviceName)}
                        </Text>
                        <Text style={styles.fullBookingId}>{booking.id}</Text>
                      </View>

                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {getBookingStatusText(booking.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fullBookingDivider} />

                    {!!booking.subskillName && (
                      <View style={styles.fullBookingRow}>
                        <Ionicons
                          name="construct-outline"
                          size={19}
                          color="#7047E8"
                        />
                        <Text style={styles.fullBookingRowText}>
                          {translateSubskillName(booking.subskillName)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.fullBookingRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={19}
                        color="#7047E8"
                      />
                      <Text style={styles.fullBookingRowText}>
                        {formatBookingDate(booking.date)}
                      </Text>
                    </View>

                    <View style={styles.fullBookingRow}>
                      <Ionicons name="time-outline" size={19} color="#7047E8" />
                      <Text style={styles.fullBookingRowText}>
                        {booking.time}
                      </Text>
                    </View>

                    <View style={styles.fullBookingRow}>
                      <Ionicons
                        name="location-outline"
                        size={19}
                        color="#7047E8"
                      />
                      <Text style={styles.fullBookingRowText}>
                        {booking.address.title === "Home" ? t("navigation.home") : booking.address.title} · {booking.address.address}
                      </Text>
                    </View>

                    {booking.worker && (
                      <View style={styles.customerWorkerCard}>
                        <View style={styles.customerWorkerAvatar}>
                          {booking.worker.avatarUrl ? (
                            <Image
                              source={{ uri: booking.worker.avatarUrl }}
                              style={styles.customerWorkerAvatarImage}
                            />
                          ) : (
                            <Ionicons name="person" size={22} color="#7047E8" />
                          )}
                        </View>
                        <View style={styles.customerWorkerInfo}>
                          <Text style={styles.customerWorkerLabel}>
                            {t("userDashboard.assignedProfessional")}
                          </Text>
                          <Text style={styles.customerWorkerName}>
                            {booking.worker.name}
                          </Text>
                          <View style={styles.customerWorkerMeta}>
                            <Text style={styles.customerWorkerMetaText}>
                              ★ {booking.worker.rating?.toFixed(1) || t("userDashboard.newWorker")}
                            </Text>
                            <Text style={styles.customerWorkerMetaText}>•</Text>
                            <Text style={styles.customerWorkerMetaText}>
                              {booking.worker.completedJobs || 0} {t("userDashboard.jobs")}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}

                    {booking.bookingType === "emergency" &&
                      booking.worker?.id &&
                      liveWorkerLocations[booking.worker.id] && (
                        <Pressable
                          onPress={() => {
                            const location =
                              liveWorkerLocations[booking.worker!.id];

                            const url =
                              `https://www.google.com/maps/search/?api=1&query=` +
                              `${location.latitude},${location.longitude}`;

                            Linking.openURL(url).catch(() =>
                              Alert.alert(
                                t("userDashboard.alerts.unableToOpenMapsTitle"),
                                t("userDashboard.alerts.unableToOpenMapsMessage"),
                              ),
                            );
                          }}
                          style={{
                            marginTop: 10,
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: "#EEF2FF",
                            borderWidth: 1,
                            borderColor: "#C7D2FE",
                          }}
                        >
                          <Text
                            style={{
                              fontWeight: "700",
                              color: "#3730A3",
                            }}
                          >
                            {t("userDashboard.liveWorkerLocation")}
                          </Text>

                          <Text
                            style={{
                              marginTop: 3,
                              color: "#4B5563",
                            }}
                          >
                            {liveWorkerLocations[
                              booking.worker.id
                            ].latitude.toFixed(6)}
                            {", "}
                            {liveWorkerLocations[
                              booking.worker.id
                            ].longitude.toFixed(6)}
                          </Text>

                          <Text
                            style={{
                              marginTop: 4,
                              color: "#2563EB",
                              fontWeight: "600",
                            }}
                          >
                            {t("userDashboard.openMaps")}
                          </Text>
                        </Pressable>
                      )}

                    <View style={styles.customerPaymentCard}>
                      <View style={styles.customerPaymentHeader}>
                        <Text style={styles.customerPaymentTitle}>{t("userDashboard.payment")}</Text>
                        <Text style={styles.customerPaymentTotal}>
                          ₹
                          {(
                            booking.price?.finalAmount ??
                            booking.price?.estimatedAmount ??
                            0
                          ).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.customerPaymentLine}>
                        <Text style={styles.customerPaymentLabel}>
                          {t("userDashboard.customerPays")}
                        </Text>
                        <Text style={styles.customerPaymentValue}>
                          ₹
                          {(
                            booking.price?.finalAmount ??
                            booking.price?.estimatedAmount ??
                            0
                          ).toFixed(2)}
                        </Text>
                      </View>
                      <View style={styles.customerPaymentLine}>
                        <Text style={styles.customerPaymentLabel}>
                          {t("userDashboard.workerReceives")}
                        </Text>
                        <Text style={styles.customerWorkerAmount}>
                          ₹
                          {(
                            booking.price?.workerAmount ??
                            ((booking.price?.finalAmount ??
                              booking.price?.estimatedAmount ??
                              0) *
                              80) /
                              100
                          ).toFixed(2)}
                        </Text>
                      </View>
                      <Text style={styles.customerPaymentNote}>
                        {t("userDashboard.paymentBreakdown")}
                      </Text>

                      {booking.status === "Completed" &&
                        booking.payment?.status !== "paid" && (
                          <Pressable
                            style={styles.payNowButton}
                            onPress={() => handlePayNow(booking)}
                            disabled={paymentSubmitting}
                          >
                            {paymentSubmitting ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Text style={styles.payNowButtonText}>
                                  Pay ₹
                                  {(
                                    booking.price?.finalAmount ??
                                    booking.price?.estimatedAmount ??
                                    0
                                  ).toFixed(0)}
                                </Text>
                                <Ionicons
                                  name="arrow-forward"
                                  size={18}
                                  color="#FFFFFF"
                                />
                              </>
                            )}
                          </Pressable>
                        )}

                      {booking.payment?.status === "paid" && (
                        <View style={styles.paymentPaidRow}>
                          <Ionicons
                            name="checkmark-circle"
                            size={19}
                            color="#16A34A"
                          />
                          <Text style={styles.paymentPaidText}>
                            {t("userDashboard.paymentCompleted")}
                          </Text>
                        </View>
                      )}

                      {booking.status === "Completed" &&
                        booking.worker &&
                        (booking.customerRating ? (
                          <View style={styles.ratingSubmittedRow}>
                            <View style={styles.ratingSubmittedStars}>
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Ionicons
                                  key={star}
                                  name={
                                    star <= booking.customerRating!
                                      ? "star"
                                      : "star-outline"
                                  }
                                  size={16}
                                  color="#F59E0B"
                                />
                              ))}
                            </View>
                            <Text style={styles.ratingSubmittedText}>
                              {t("userDashboard.yourRating")}
                            </Text>
                          </View>
                        ) : (
                          <Pressable
                            style={styles.rateWorkerButton}
                            onPress={() => openRatingModal(booking)}
                          >
                            <Ionicons
                              name="star-outline"
                              size={19}
                              color="#FFFFFF"
                            />
                            <Text style={styles.rateWorkerButtonText}>
                              {t("userDashboard.rateWorker")}
                            </Text>
                          </Pressable>
                        ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* =================================================
            WORKER RATING MODAL
        ================================================= */}

        <Modal
          visible={ratingModalVisible}
          transparent
          animationType="fade"
          onRequestClose={closeRatingModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.ratingModalContainer}>
              <View style={styles.ratingModalHeader}>
                <View>
                  <Text style={styles.ratingModalTitle}>{t("userDashboard.rateYourWorker")}</Text>
                  <Text style={styles.ratingModalSubtitle}>
                    How was your experience with{" "}
                    {ratingBooking?.worker?.name || "the worker"}?
                  </Text>
                </View>
                <Pressable
                  onPress={closeRatingModal}
                  disabled={ratingSubmitting}
                  style={styles.ratingModalClose}
                >
                  <Ionicons name="close" size={22} color="#555555" />
                </Pressable>
              </View>

              <View style={styles.ratingStarsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable
                    key={star}
                    onPress={() => setSelectedRating(star)}
                    disabled={ratingSubmitting}
                    style={styles.ratingStarButton}
                    accessibilityRole="button"
                    accessibilityLabel={`Rate ${star} star${star === 1 ? "" : "s"}`}
                  >
                    <Ionicons
                      name={star <= selectedRating ? "star" : "star-outline"}
                      size={43}
                      color="#F59E0B"
                    />
                  </Pressable>
                ))}
              </View>

              <Text style={styles.ratingSelectedText}>
                {selectedRating === 0
                  ? t("userDashboard.tapStar")
                  : t("userDashboard.starsOutOfFive", { count: selectedRating })}
              </Text>

              <Pressable
                style={[
                  styles.submitRatingButton,
                  (selectedRating === 0 || ratingSubmitting) &&
                    styles.submitRatingButtonDisabled,
                ]}
                onPress={handleSubmitRating}
                disabled={selectedRating === 0 || ratingSubmitting}
              >
                {ratingSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                    <Text style={styles.submitRatingButtonText}>
                      {t("userDashboard.submitRating")}
                    </Text>
                  </>
                )}
              </Pressable>

              <Text style={styles.ratingHint}>
                {t("userDashboard.ratingHelp")}
              </Text>
            </View>
          </View>
        </Modal>

        {/* =================================================
            ADD / UPDATE ADDRESS MODAL
        ================================================= */}

        <Modal
          visible={addressModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!addressSaving) {
              setAddressModalVisible(false);
            }
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.addressModalContainer}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("userDashboard.addServiceAddress")}</Text>

                <Pressable
                  onPress={() => {
                    if (!addressSaving) {
                      setAddressModalVisible(false);
                    }
                  }}
                  disabled={addressSaving}
                >
                  <Ionicons name="close" size={24} color="#222222" />
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 20 }}
              >
                <Text style={styles.addressModalHint}>
                  {t("userDashboard.addressModalHint")}
                </Text>

                <Pressable
                  style={[
                    styles.addressLocationButton,
                    addressLocationLoading &&
                      styles.addressLocationButtonDisabled,
                  ]}
                  onPress={handleAddressCurrentLocation}
                  disabled={addressLocationLoading || addressSaving}
                >
                  {addressLocationLoading ? (
                    <ActivityIndicator size="small" color="#7047E8" />
                  ) : (
                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#7047E8"
                    />
                  )}

                  <View style={{ flex: 1 }}>
                    <Text style={styles.addressLocationTitle}>
                      {addressLocationLoading
                        ? t("userDashboard.fetchingLocation")
                        : t("userDashboard.useCurrentLocation")}
                    </Text>
                    <Text style={styles.addressLocationSubtitle}>
                      {t("userDashboard.autoFillAddress")}
                    </Text>
                  </View>
                </Pressable>

                {[
                  {
                    label: t("common.houseLabel"),
                    value: addressHouse,
                    setter: setAddressHouse,
                    placeholder: t("common.housePlaceholder"),
                    icon: "home-outline" as keyof typeof Ionicons.glyphMap,
                  },
                  {
                    label: t("common.streetLabel"),
                    value: addressLocality,
                    setter: setAddressLocality,
                    placeholder: t("common.streetPlaceholder"),
                    icon: "navigate-outline" as keyof typeof Ionicons.glyphMap,
                  },
                  {
                    label: t("common.city"),
                    value: addressCity,
                    setter: setAddressCity,
                    placeholder: t("common.enterCity"),
                    icon: "business-outline" as keyof typeof Ionicons.glyphMap,
                  },
                  {
                    label: t("common.state"),
                    value: addressState,
                    setter: setAddressState,
                    placeholder: t("common.enterState"),
                    icon: "map-outline" as keyof typeof Ionicons.glyphMap,
                  },
                  {
                    label: t("common.pinCode"),
                    value: addressPincode,
                    setter: setAddressPincode,
                    placeholder: t("common.pinPlaceholder"),
                    icon: "keypad-outline" as keyof typeof Ionicons.glyphMap,
                  },
                  {
                    label: t("common.landmarkOptional"),
                    value: addressLandmark,
                    setter: setAddressLandmark,
                    placeholder: t("common.landmarkPlaceholder"),
                    icon: "flag-outline" as keyof typeof Ionicons.glyphMap,
                  },
                ].map((field) => (
                  <View key={field.label} style={styles.addressInputGroup}>
                    <Text style={styles.addressInputLabel}>{field.label}</Text>

                    <View style={styles.addressInputContainer}>
                      <Ionicons name={field.icon} size={19} color="#9CA3AF" />

                      <TextInput
                        style={styles.addressInput}
                        value={field.value}
                        onChangeText={field.setter}
                        placeholder={field.placeholder}
                        placeholderTextColor="#9CA3AF"
                        keyboardType={
                          field.label === "PIN Code" ? "number-pad" : "default"
                        }
                        maxLength={field.placeholder === t("common.pinPlaceholder") ? 6 : undefined}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                ))}

                <Pressable
                  style={[
                    styles.addressSaveButton,
                    addressSaving && styles.addressSaveButtonDisabled,
                  ]}
                  onPress={handleSaveAddress}
                  disabled={addressSaving}
                >
                  {addressSaving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.addressSaveButtonText}>
                        {t("userDashboard.saveAddress")}
                      </Text>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* =================================================
            PROFILE MODAL
        ================================================= */}

        <Modal
          visible={profileVisible}
          animationType="slide"
          onRequestClose={() => setProfileVisible(false)}
        >
          <SafeAreaView style={styles.profileScreen}>
            <View style={styles.profileHeader}>
              <Pressable onPress={() => setProfileVisible(false)}>
                <Ionicons name="arrow-back" size={24} color="#222222" />
              </Pressable>

              <Text style={styles.profileTitle}>{t("userDashboard.myProfile")}</Text>

              <Pressable
                onPress={openCustomerEdit}
                disabled={customerEditSaving}
              >
                <Ionicons name="create-outline" size={22} color="#7047E8" />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.profileContent}>
              {/* AVATAR */}

              <View style={styles.avatar}>
                {user.avatarUrl ? (
                  <Image
                    source={{ uri: user.avatarUrl }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Ionicons name="person" size={43} color="#7047E8" />
                )}
              </View>

              <Text style={styles.profileName}>{user.name}</Text>

              <Text style={styles.profileEmail}>
                {user.email || t("common.emailNotAvailable")}
              </Text>

              {/* INFORMATION */}

              <Text style={styles.profileSectionTitle}>
                {t("userDashboard.personalInformation")}
              </Text>

              <View style={styles.infoCard}>
                <ProfileRow
                  icon="person-outline"
                  title="Name"
                  value={user.name}
                />

                <View style={styles.divider} />

                <ProfileRow
                  icon="mail-outline"
                  title="Email"
                  value={user.email || t("common.notAvailable")}
                />

                <View style={styles.divider} />

                <ProfileRow
                  icon="call-outline"
                  title="Phone"
                  value={user.phone || t("common.notAvailable")}
                />
              </View>
              <LanguageButton />
              {/* ADDRESS */}

              <Text style={styles.profileSectionTitle}>{t("userDashboard.savedAddresses")}</Text>

              <Pressable
                style={styles.profileOption}
                onPress={() => {
                  if (addresses.length === 0) {
                    Alert.alert(
                      "Addresses",
                      t("userDashboard.noSavedAddress"),
                    );
                    return;
                  }

                  Alert.alert(
                    t("userDashboard.savedAddresses"),
                    addresses
                      .map((item) => `${item.title}:\n${item.address}`)
                      .join("\n\n"),
                  );
                }}
              >
                <View style={styles.optionIcon}>
                  <Ionicons name="location-outline" size={21} color="#7047E8" />
                </View>

                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{t("userDashboard.manageAddresses")}</Text>

                  <Text style={styles.optionSubtitle} numberOfLines={2}>
                    {addresses[0]?.address || t("userDashboard.noSavedServiceAddress")}
                  </Text>
                </View>

                <Ionicons name="chevron-forward" size={19} color="#999999" />
              </Pressable>

              {/* LOGOUT */}

              <Pressable style={styles.logoutButton} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={21} color="#D93636" />

                <Text style={styles.logoutText}>{t("common.logout")}</Text>
              </Pressable>
            </ScrollView>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={customerEditVisible}
          transparent
          animationType="slide"
          onRequestClose={() => {
            if (!customerEditSaving) setCustomerEditVisible(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.customerEditModal}>
              <View style={styles.modalHandle} />

              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{t("userDashboard.editProfile")}</Text>
                <Pressable
                  onPress={() => {
                    if (!customerEditSaving) setCustomerEditVisible(false);
                  }}
                >
                  <Ionicons name="close" size={24} color="#222222" />
                </Pressable>
              </View>

              <Text style={styles.customerEditLabel}>{t("common.fullName")}</Text>
              <View style={styles.customerEditInputContainer}>
                <Ionicons name="person-outline" size={19} color="#9CA3AF" />
                <TextInput
                  style={styles.customerEditInput}
                  value={customerEditName}
                  onChangeText={setCustomerEditName}
                  placeholder={t("common.enterFullName")}
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <Text style={styles.customerEditLabel}>{t("common.phoneNumber")}</Text>
              <View style={styles.customerEditInputContainer}>
                <Ionicons name="call-outline" size={19} color="#9CA3AF" />
                <TextInput
                  style={styles.customerEditInput}
                  value={customerEditPhone}
                  onChangeText={setCustomerEditPhone}
                  placeholder={t("common.mobilePlaceholder")}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>

              <Text style={styles.customerEditLabel}>{t("common.email")}</Text>
              <View
                style={[
                  styles.customerEditInputContainer,
                  styles.customerEditReadonly,
                ]}
              >
                <Ionicons name="mail-outline" size={19} color="#9CA3AF" />
                <Text style={styles.customerEditReadonlyText}>
                  {user.email || t("common.emailNotAvailable")}
                </Text>
              </View>

              <Text style={styles.customerEditHint}>
                {t("userDashboard.emailImmutable")}
              </Text>

              <Pressable
                style={[
                  styles.customerSaveButton,
                  customerEditSaving && styles.customerSaveButtonDisabled,
                ]}
                onPress={handleSaveCustomerProfile}
                disabled={customerEditSaving}
              >
                {customerEditSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name="checkmark-circle-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                    <Text style={styles.customerSaveButtonText}>
                      {t("common.saveChanges")}
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

/* =========================================================
   PROFILE ROW
========================================================= */

function ProfileRow({
  icon,
  title,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={20} color="#7047E8" />
      </View>

      <View style={styles.infoContent}>
        <Text style={styles.infoTitle}>{title}</Text>

        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

/* =========================================================
   STYLES
========================================================= */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 25,
  },

  /* HEADER */

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  headerLeft: {
    flex: 1,
  },

  welcome: {
    fontSize: 13,
    color: "#777777",
    marginBottom: 3,
  },

  userName: {
    fontSize: 23,
    fontWeight: "700",
    color: "#171717",
  },

  notificationButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E3E3E3",
    justifyContent: "center",
    alignItems: "center",
  },

  notificationDot: {
    position: "absolute",
    width: 7,
    height: 7,
    borderRadius: 5,
    backgroundColor: "#7047E8",
    top: 9,
    right: 9,
  },

  /* LOCATION */

  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 17,
  },

  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F0EBFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  locationContent: {
    flex: 1,
  },

  locationLabel: {
    fontSize: 11,
    color: "#888888",
  },

  locationValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222222",
    marginTop: 2,
  },

  /* SEARCH */

  searchContainer: {
    height: 57,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    backgroundColor: "#FAFAFA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 28,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#222222",
    marginLeft: 10,
  },

  /* SECTION */

  sectionHeader: {
    marginBottom: 15,
  },

  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#171717",
  },

  sectionSubtitle: {
    fontSize: 13,
    color: "#777777",
    marginTop: 4,
  },

  /* SERVICES */

  serviceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  serviceCard: {
    width: "48%",
    minHeight: 165,
    backgroundColor: "#F8F7FA",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    borderRadius: 18,
    padding: 15,
    marginBottom: 14,
  },

  serviceIcon: {
    width: 55,
    height: 55,
    borderRadius: 17,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  serviceName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 5,
  },

  serviceDescription: {
    fontSize: 11,
    lineHeight: 16,
    color: "#777777",
    paddingRight: 4,
  },

  arrow: {
    position: "absolute",
    bottom: 13,
    right: 13,
  },

  /* BOOKINGS */

  bookingSection: {
    marginTop: 15,
  },

  emptyBooking: {
    marginTop: 14,
    minHeight: 88,
    borderRadius: 17,
    backgroundColor: "#F8F7FA",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },

  bookingIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  bookingText: {
    flex: 1,
  },

  bookingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  bookingSubtitle: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
    lineHeight: 17,
  },

  /* TRUST */

  trustCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F1FF",
    borderRadius: 18,
    padding: 16,
    marginTop: 18,
  },

  trustIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  trustContent: {
    flex: 1,
  },

  trustTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  trustDescription: {
    fontSize: 12,
    color: "#777777",
    lineHeight: 17,
    marginTop: 4,
  },

  /* BOTTOM NAV */

  bottomNavigation: {
    height: 76,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },

  navItem: {
    width: 90,
    alignItems: "center",
    justifyContent: "center",
  },

  activeNavIcon: {
    width: 38,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#7047E8",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  navIcon: {
    width: 38,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  activeNavText: {
    fontSize: 11,
    color: "#7047E8",
    fontWeight: "600",
  },

  navText: {
    fontSize: 11,
    color: "#777777",
  },

  /* SERVICE MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
  },

  modalHandle: {
    width: 42,
    height: 4,
    borderRadius: 5,
    backgroundColor: "#D5D5D5",
    alignSelf: "center",
    marginBottom: 18,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#171717",
  },

  selectedService: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F7FA",
    borderRadius: 17,
    padding: 14,
    marginBottom: 22,
  },

  selectedServiceIcon: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
  },

  selectedServiceName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222",
  },

  selectedServiceDescription: {
    fontSize: 12,
    color: "#777777",
    marginTop: 4,
  },

  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 8,
  },

  modalInput: {
    height: 53,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 17,
  },

  modalInputText: {
    flex: 1,
    fontSize: 13,
    color: "#777777",
    marginLeft: 10,
  },

  bookButton: {
    height: 55,
    borderRadius: 15,
    backgroundColor: "#7047E8",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 5,
  },

  bookButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  bookingSectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },

  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7047E8",
    marginTop: 4,
  },

  bookingCard: {
    marginTop: 14,
    minHeight: 100,
    borderRadius: 17,
    backgroundColor: "#F8F7FA",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },

  bookingServiceIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  bookingCardContent: {
    flex: 1,
    marginRight: 8,
  },

  bookingCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
  },

  bookingCardTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: "#222222",
  },

  bookingCardInfo: {
    fontSize: 12,
    color: "#777777",
    marginTop: 2,
  },

  statusBadge: {
    backgroundColor: "#EEE8FF",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },

  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7047E8",
  },

  /* BOOKING MODAL */

  addressModalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 25,
    maxHeight: "92%",
  },

  addressModalHint: {
    fontSize: 13,
    lineHeight: 19,
    color: "#777777",
    marginBottom: 16,
  },

  addressLocationButton: {
    minHeight: 64,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "#F8F7FA",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 18,
    gap: 12,
  },

  addressLocationButtonDisabled: {
    opacity: 0.65,
  },

  addressLocationTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  addressLocationSubtitle: {
    fontSize: 12,
    color: "#777777",
    marginTop: 3,
  },

  addressInputGroup: {
    marginBottom: 14,
  },

  addressInputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#222222",
    marginBottom: 7,
  },

  addressInputContainer: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  addressInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#222222",
  },

  addressSaveButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#7047E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    gap: 8,
  },

  addressSaveButtonDisabled: {
    opacity: 0.65,
  },

  addressSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bookingModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 25,
    maxHeight: "94%",
  },

  bookingHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  modalCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F3FA",
    alignItems: "center",
    justifyContent: "center",
  },

  bookingModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#222222",
  },

  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 15,
  },

  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: 4,
    backgroundColor: "#E7E3F0",
  },

  progressBarActive: {
    backgroundColor: "#7047E8",
  },

  selectedServiceCompact: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F7FA",
    borderRadius: 16,
    padding: 11,
    marginBottom: 18,
  },

  bookingStepContent: {
    paddingBottom: 3,
  },

  stepTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 6,
  },

  stepSubtitle: {
    fontSize: 13,
    color: "#777777",
    lineHeight: 19,
    marginBottom: 18,
  },

  addressCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E7E3F0",
    marginBottom: 11,
    backgroundColor: "#FFFFFF",
  },

  selectedAddressCard: {
    borderColor: "#7047E8",
    backgroundColor: "#F7F4FF",
  },

  addressIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  addressContent: {
    flex: 1,
  },

  addressTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 3,
  },

  addressText: {
    fontSize: 12,
    color: "#777777",
    lineHeight: 17,
  },

  bookingOptionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#222222",
    marginBottom: 9,
    marginTop: 2,
  },

  caregiverSkillSection: {
    marginBottom: 16,
  },

  caregiverSkillCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 13,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7E3F0",
    marginBottom: 9,
    backgroundColor: "#FFFFFF",
  },

  caregiverSkillCardSelected: {
    borderColor: "#7047E8",
    backgroundColor: "#F7F4FF",
  },

  caregiverSkillIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F0EBFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },

  caregiverSkillContent: {
    flex: 1,
    marginRight: 8,
  },

  caregiverSkillName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  caregiverSkillDescription: {
    fontSize: 11,
    color: "#777777",
    lineHeight: 16,
    marginTop: 3,
  },

  bookingTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },

  bookingTypeCard: {
    width: "48%",
    minHeight: 112,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#E7E3F0",
    backgroundColor: "#FFFFFF",
    padding: 12,
  },

  bookingTypeCardSelected: {
    borderColor: "#7047E8",
    backgroundColor: "#F7F4FF",
  },

  bookingTypeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
    marginTop: 8,
  },

  bookingTypeDescription: {
    fontSize: 10,
    lineHeight: 15,
    color: "#777777",
    marginTop: 4,
  },

  addAddressButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "#7047E8",
    borderRadius: 14,
    marginTop: 2,
  },

  addAddressText: {
    marginLeft: 7,
    fontSize: 14,
    fontWeight: "600",
    color: "#7047E8",
  },

  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  dateCard: {
    width: "30.5%",
    minHeight: 91,
    borderWidth: 1,
    borderColor: "#E7E3F0",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
  },

  dateCardSelected: {
    backgroundColor: "#7047E8",
    borderColor: "#7047E8",
  },

  dateDay: {
    fontSize: 12,
    color: "#777777",
    marginBottom: 3,
  },

  dateNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: "#222222",
  },

  dateMonth: {
    fontSize: 11,
    color: "#777777",
    marginTop: 2,
  },

  dateTextSelected: {
    color: "#FFFFFF",
  },

  timeSlot: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: "#E7E3F0",
    borderRadius: 15,
    marginBottom: 10,
  },

  timeSlotSelected: {
    borderColor: "#7047E8",
    backgroundColor: "#F7F4FF",
  },

  timeSlotText: {
    flex: 1,
    marginLeft: 11,
    fontSize: 14,
    fontWeight: "600",
    color: "#333333",
  },

  timeSlotTextSelected: {
    color: "#7047E8",
  },

  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    backgroundColor: "#F7F4FF",
    marginBottom: 10,
  },

  summaryIcon: {
    width: 46,
    height: 46,
    borderRadius: 13,
    backgroundColor: "#EDE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  summaryContent: {
    flex: 1,
  },

  summaryRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EEF4",
  },

  summaryRowContent: {
    flex: 1,
    marginLeft: 12,
  },

  summaryLabel: {
    fontSize: 11,
    color: "#888888",
    marginBottom: 3,
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  summarySmall: {
    fontSize: 12,
    color: "#777777",
    marginTop: 3,
    lineHeight: 17,
  },

  confirmNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F1FF",
    borderRadius: 13,
    padding: 12,
    marginTop: 14,
  },

  confirmNoticeText: {
    flex: 1,
    marginLeft: 9,
    fontSize: 11,
    color: "#666666",
    lineHeight: 16,
  },

  continueButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#7047E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 15,
  },

  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginRight: 8,
  },

  successContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },

  successIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: "#7047E8",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  successTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#222222",
    marginBottom: 8,
  },

  successText: {
    textAlign: "center",
    fontSize: 13,
    color: "#777777",
    lineHeight: 20,
    paddingHorizontal: 15,
  },

  bookingIdCard: {
    width: "100%",
    padding: 15,
    backgroundColor: "#F7F4FF",
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
  },

  bookingIdLabel: {
    fontSize: 11,
    color: "#888888",
    marginBottom: 4,
  },

  bookingId: {
    fontSize: 17,
    fontWeight: "700",
    color: "#7047E8",
  },

  successDetails: {
    alignItems: "center",
    marginTop: 14,
  },

  successDetailText: {
    fontSize: 12,
    color: "#666666",
    marginTop: 3,
  },

  doneButton: {
    width: "100%",
    height: 54,
    backgroundColor: "#7047E8",
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  doneButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bookingPriceCard: {
    backgroundColor: "#F7F4FF",
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E8DFFF",
  },

  bookingPriceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  bookingPriceTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  bookingPriceSubtitle: {
    fontSize: 11,
    color: "#777777",
    marginTop: 3,
  },

  bookingPriceTotal: {
    fontSize: 20,
    fontWeight: "800",
    color: "#7047E8",
  },

  bookingPriceLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 5,
  },

  bookingPriceLabel: {
    fontSize: 12,
    color: "#666666",
  },

  bookingPriceValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#222222",
  },

  bookingWorkerValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },

  bookingPriceNote: {
    fontSize: 10,
    color: "#777777",
    lineHeight: 15,
    marginTop: 7,
  },

  successAmountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#7047E8",
    marginTop: 9,
  },

  successPaymentNote: {
    fontSize: 11,
    color: "#777777",
    textAlign: "center",
    marginTop: 5,
    lineHeight: 16,
  },

  customerWorkerCard: {
    marginTop: 13,
    padding: 12,
    borderRadius: 15,
    backgroundColor: "#F7F4FF",
    borderWidth: 1,
    borderColor: "#E8DFFF",
    flexDirection: "row",
    alignItems: "center",
  },

  customerWorkerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    marginRight: 12,
  },

  customerWorkerAvatarImage: {
    width: "100%",
    height: "100%",
  },

  customerWorkerInfo: {
    flex: 1,
  },

  customerWorkerLabel: {
    fontSize: 10,
    color: "#777777",
  },

  customerWorkerName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#222222",
    marginTop: 2,
  },

  customerWorkerMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  customerWorkerMetaText: {
    fontSize: 10,
    color: "#666666",
    marginRight: 6,
  },

  rateWorkerButton: {
    height: 45,
    borderRadius: 13,
    backgroundColor: "#F59E0B",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 8,
  },

  rateWorkerButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  ratingSubmittedRow: {
    marginTop: 10,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 11,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  ratingSubmittedStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },

  ratingSubmittedText: {
    color: "#92400E",
    fontSize: 12,
    fontWeight: "700",
  },

  ratingModalContainer: {
    width: "100%",
    maxWidth: 430,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 20,
    alignSelf: "center",
  },

  ratingModalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  ratingModalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#222222",
  },

  ratingModalSubtitle: {
    marginTop: 5,
    paddingRight: 8,
    fontSize: 13,
    lineHeight: 19,
    color: "#777777",
  },

  ratingModalClose: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 12,
  },

  ratingStarsRow: {
    width: "100%",
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  ratingStarButton: {
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },

  ratingSelectedText: {
    marginTop: 13,
    textAlign: "center",
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
  },

  submitRatingButton: {
    width: "100%",
    height: 50,
    borderRadius: 14,
    marginTop: 22,
    backgroundColor: "#7047E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  submitRatingButtonDisabled: {
    opacity: 0.45,
  },

  submitRatingButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  ratingHint: {
    marginTop: 12,
    textAlign: "center",
    fontSize: 10,
    lineHeight: 15,
    color: "#9CA3AF",
  },

  customerPaymentCard: {
    marginTop: 13,
    padding: 13,
    borderRadius: 15,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E6E6E6",
  },

  customerPaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  customerPaymentTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#222222",
  },

  customerPaymentTotal: {
    fontSize: 17,
    fontWeight: "800",
    color: "#7047E8",
  },

  customerPaymentLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },

  customerPaymentLabel: {
    fontSize: 11,
    color: "#777777",
  },

  customerPaymentValue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#222222",
  },

  customerWorkerAmount: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },

  customerPaymentNote: {
    fontSize: 10,
    color: "#888888",
    marginTop: 5,
  },

  payNowButton: {
    height: 45,
    borderRadius: 13,
    backgroundColor: "#7047E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    gap: 8,
  },

  payNowButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  paymentPaidRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
    paddingVertical: 8,
    borderRadius: 11,
    backgroundColor: "#ECFDF3",
    gap: 7,
  },

  paymentPaidText: {
    color: "#15803D",
    fontSize: 12,
    fontWeight: "700",
  },

  /* BOOKINGS SCREEN */

  bookingsScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  bookingsHeader: {
    height: 62,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerBackButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#F5F3FA",
    alignItems: "center",
    justifyContent: "center",
  },

  bookingsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#171717",
  },

  bookingsContent: {
    padding: 20,
    paddingBottom: 35,
  },

  bookingsCount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#777777",
    marginBottom: 12,
  },

  fullBookingCard: {
    backgroundColor: "#F8F7FA",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    borderRadius: 18,
    padding: 15,
    marginBottom: 13,
  },

  fullBookingTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  fullBookingIcon: {
    width: 52,
    height: 52,
    borderRadius: 15,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },

  fullBookingTitleArea: {
    flex: 1,
  },

  fullBookingTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#222222",
  },

  fullBookingId: {
    fontSize: 11,
    color: "#888888",
    marginTop: 4,
  },

  fullBookingDivider: {
    height: 1,
    backgroundColor: "#E7E7E7",
    marginVertical: 13,
  },

  fullBookingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 9,
  },

  fullBookingRowText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: "#666666",
    lineHeight: 17,
  },

  noBookingsContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  noBookingsIcon: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: "#EEE8FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  noBookingsTitle: {
    fontSize: 21,
    fontWeight: "700",
    color: "#222222",
  },

  noBookingsText: {
    fontSize: 13,
    color: "#777777",
    textAlign: "center",
    lineHeight: 20,
    marginTop: 8,
  },

  startBookingButton: {
    height: 52,
    paddingHorizontal: 25,
    borderRadius: 15,
    backgroundColor: "#7047E8",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },

  startBookingText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  /* PROFILE */

  profileScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  profileHeader: {
    height: 60,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  profileTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#171717",
  },

  profileContent: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 35,
  },

  avatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 12,
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 60,
  },

  profileName: {
    fontSize: 21,
    fontWeight: "700",
    color: "#171717",
    textAlign: "center",
  },

  profileEmail: {
    fontSize: 13,
    color: "#777777",
    textAlign: "center",
    marginTop: 4,
  },

  profileSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#222222",
    marginTop: 28,
    marginBottom: 11,
  },

  infoCard: {
    backgroundColor: "#F8F7FA",
    borderWidth: 1,
    borderColor: "#ECEAEC",
    borderRadius: 17,
    padding: 15,
  },

  infoRow: {
    minHeight: 53,
    flexDirection: "row",
    alignItems: "center",
  },

  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  infoContent: {
    flex: 1,
  },

  infoTitle: {
    fontSize: 11,
    color: "#777777",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#222222",
    marginTop: 3,
  },

  divider: {
    height: 1,
    backgroundColor: "#E7E7E7",
    marginVertical: 7,
  },

  profileOption: {
    minHeight: 70,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "#ECEAEC",
    backgroundColor: "#F8F7FA",
    padding: 13,
    flexDirection: "row",
    alignItems: "center",
  },

  optionIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#EEE8FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  optionContent: {
    flex: 1,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#222222",
  },

  optionSubtitle: {
    fontSize: 11,
    color: "#777777",
    marginTop: 3,
  },

  logoutButton: {
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#F0CACA",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 30,
  },

  logoutText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D93636",
    marginLeft: 8,
  },

  /* CUSTOMER PROFILE EDIT */

  customerEditModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  customerEditLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 7,
    marginTop: 10,
  },
  customerEditInputContainer: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DDDDDD",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },
  customerEditInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#222222",
  },
  customerEditReadonly: {
    backgroundColor: "#F9FAFB",
  },
  customerEditReadonlyText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 13,
    color: "#9CA3AF",
  },
  customerEditHint: {
    fontSize: 10.5,
    color: "#9CA3AF",
    marginTop: 6,
  },
  customerSaveButton: {
    height: 54,
    borderRadius: 15,
    backgroundColor: "#7047E8",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  customerSaveButtonDisabled: {
    opacity: 0.65,
  },
  customerSaveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
