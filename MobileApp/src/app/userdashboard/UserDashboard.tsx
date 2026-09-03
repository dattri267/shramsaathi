import React, { useMemo, useState } from "react";

import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";

import {
  NativeStackScreenProps,
} from "@react-navigation/native-stack";

import {
  RootStackParamList,
} from "../navigation/AppNavigator";


/* =========================================================
   TYPES
========================================================= */

type Props = NativeStackScreenProps<
  RootStackParamList,
  "UserDashboard"
>;


type Service = {
  id: string;
  name: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};


type User = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

type Address = {
  id: string;
  title: string;
  address: string;
};

type Booking = {
  id: string;
  serviceId: string;
  serviceName: string;
  serviceIcon: keyof typeof Ionicons.glyphMap;
  address: Address;
  date: string;
  time: string;
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  createdAt: string;
};


/* =========================================================
   SERVICES
========================================================= */

const SERVICES: Service[] = [

  {
    id: "electrician",
    name: "Electrician",
    description: "Electrical repairs & installation",
    icon: "flash-outline",
  },

  {
    id: "plumber",
    name: "Plumber",
    description: "Plumbing repairs & fittings",
    icon: "water-outline",
  },

  {
    id: "carpenter",
    name: "Carpenter",
    description: "Furniture & woodwork",
    icon: "hammer-outline",
  },

  {
    id: "painter",
    name: "Painter",
    description: "Painting & wall services",
    icon: "color-palette-outline",
  },

  {
    id: "domestic-helper",
    name: "Domestic Helper",
    description: "Household assistance",
    icon: "home-outline",
  },

  {
    id: "caregiver",
    name: "Caregiver",
    description: "Care & personal assistance",
    icon: "heart-outline",
  },

  {
    id: "technician",
    name: "Technician",
    description: "Appliance & technical repairs",
    icon: "construct-outline",
  },

];


/* =========================================================
   BACKEND
========================================================= */

/*
|--------------------------------------------------------------------------
| FASTAPI BASE URL
|--------------------------------------------------------------------------
|
| Replace this later with your actual backend URL.
|
| Example:
|
| const API_BASE_URL = "http://192.168.1.5:8000";
|
| Do NOT use localhost when testing through Expo Go on
| a physical phone.
|
*/

const API_BASE_URL = "YOUR_FASTAPI_URL";


/* =========================================================
   USER DASHBOARD
========================================================= */

export default function UserDashboard({
  route,
  navigation,
}: Props) {


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

  const [user] = useState<User>({
    id: route.params?.user?.id || "",
    name: route.params?.user?.name || "User",
    email: route.params?.user?.email || "",
    phone: route.params?.user?.phone || "",
  });


  /* =======================================================
     UI STATE
  ======================================================= */

  const [search, setSearch] = useState("");

  const [selectedService, setSelectedService] =
    useState<Service | null>(null);

  const [profileVisible, setProfileVisible] =
    useState(false);

  const [bookingsVisible, setBookingsVisible] =
    useState(false);

  const [bookingStep, setBookingStep] = useState(1);

  const [selectedAddress, setSelectedAddress] =
    useState<Address | null>(null);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [selectedTime, setSelectedTime] =
    useState<string | null>(null);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [bookingSuccess, setBookingSuccess] =
    useState(false);


  /* =======================================================
     BOOKING DATA
  ======================================================= */

  // Temporary frontend addresses. These will come from FastAPI later.
  const addresses: Address[] = [
    {
      id: "home",
      title: "Home",
      address: "Saved home address",
    },
    {
      id: "pg",
      title: "PG / Current Location",
      address: "Saved current service location",
    },
  ];

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
        day: date.toLocaleDateString("en-US", {
          weekday: "short",
        }),
        date: date.getDate(),
        month: date.toLocaleDateString("en-US", {
          month: "short",
        }),
      });
    }

    return dates;
  }, []);

  /* =======================================================
     SEARCH
  ======================================================= */

  const filteredServices = useMemo(() => {

    const query = search.trim().toLowerCase();

    if (!query) {
      return SERVICES;
    }

    return SERVICES.filter(service =>
      service.name.toLowerCase().includes(query)
    );

  }, [search]);


  /* =======================================================
     SERVICE CLICK
  ======================================================= */

  const handleServicePress = (service: Service) => {

    setSelectedService(service);

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
    setBookingSuccess(false);
  };

  const handleCloseBooking = () => {
    setSelectedService(null);
    setBookingStep(1);
    setSelectedAddress(null);
    setSelectedDate(null);
    setSelectedTime(null);
    setBookingSuccess(false);
  };

  const handleNextStep = () => {
    if (bookingStep === 1 && !selectedAddress) {
      Alert.alert("Select Address", "Please select a service address.");
      return;
    }

    if (bookingStep === 2 && !selectedDate) {
      Alert.alert("Select Date", "Please select a preferred date.");
      return;
    }

    if (bookingStep === 3 && !selectedTime) {
      Alert.alert("Select Time", "Please select a time slot.");
      return;
    }

    setBookingStep(prev => Math.min(prev + 1, 4));
  };

  const handlePreviousStep = () => {
    setBookingStep(prev => Math.max(prev - 1, 1));
  };

  const formatBookingDate = (dateValue: string) => {
    const date = new Date(`${dateValue}T00:00:00`);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const confirmBooking = async () => {
    if (
      !selectedService ||
      !selectedAddress ||
      !selectedDate ||
      !selectedTime
    ) {
      return;
    }

    const newBooking: Booking = {
      id: `BK-${Date.now()}`,
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      serviceIcon: selectedService.icon,
      address: selectedAddress,
      date: selectedDate,
      time: selectedTime,
      status: "Confirmed",
      createdAt: new Date().toISOString(),
    };

    /*
     * ========================================================
     * FUTURE FASTAPI INTEGRATION
     * ========================================================
     *
     * POST `${API_BASE_URL}/api/bookings`
     *
     * {
     *   user_id: user.id,
     *   service_id: selectedService.id,
     *   address_id: selectedAddress.id,
     *   date: selectedDate,
     *   time: selectedTime
     * }
     *
     * The backend should return the real booking ID/status.
     */

    setBookings(prev => [newBooking, ...prev]);
    setBookingSuccess(true);
    setBookingStep(4);
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {

    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",

      [
        {
          text: "Cancel",
          style: "cancel",
        },

        {
          text: "Logout",
          style: "destructive",

          onPress: () => {

            /*
               Later:

               await AsyncStorage.removeItem("token");

               Then:

               navigation.replace("Login");
            */

            navigation.replace("Login");

          },
        },

      ]
    );

  };


  /* =======================================================
     MAIN SCREEN
  ======================================================= */

  return (

    <SafeAreaView
      style={styles.safeArea}
      edges={["top", "bottom"]}
    >

      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
      />


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

              <Text style={styles.welcome}>
                Welcome back 👋
              </Text>

              <Text
                style={styles.userName}
                numberOfLines={1}
              >
                {user.name}
              </Text>

            </View>


            <Pressable
              style={styles.notificationButton}
              onPress={() =>
                Alert.alert(
                  "Notifications",
                  "Your notifications will appear here."
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
            onPress={() =>
              Alert.alert(
                "Service Location",
                "Your saved addresses will appear here."
              )
            }
          >

            <View style={styles.locationIcon}>

              <Ionicons
                name="location"
                size={18}
                color="#7047E8"
              />

            </View>


            <View style={styles.locationContent}>

              <Text style={styles.locationLabel}>
                Service location
              </Text>

              <Text style={styles.locationValue}>
                Select your location
              </Text>

            </View>


            <Ionicons
              name="chevron-down"
              size={18}
              color="#777777"
            />

          </Pressable>


          {/* =================================================
              SEARCH
          ================================================= */}

          <View style={styles.searchContainer}>

            <Ionicons
              name="search-outline"
              size={22}
              color="#777777"
            />


            <TextInput
              style={styles.searchInput}
              placeholder="What service do you need?"
              placeholderTextColor="#999999"
              value={search}
              onChangeText={setSearch}
            />


            {search.length > 0 && (

              <Pressable
                onPress={() => setSearch("")}
              >

                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#999999"
                />

              </Pressable>

            )}

          </View>


          {/* =================================================
              SERVICES TITLE
          ================================================= */}

          <View style={styles.sectionHeader}>

            <Text style={styles.sectionTitle}>
              What do you need?
            </Text>

            <Text style={styles.sectionSubtitle}>
              Choose a service to get started
            </Text>

          </View>


          {/* =================================================
              SERVICE GRID
          ================================================= */}

          <View style={styles.serviceGrid}>

            {filteredServices.map(service => (

              <Pressable
                key={service.id}
                style={({ pressed }) => [

                  styles.serviceCard,

                  pressed && {
                    transform: [{ scale: 0.97 }],
                    opacity: 0.8,
                  },

                ]}

                onPress={() =>
                  handleServicePress(service)
                }
              >

                <View style={styles.serviceIcon}>

                  <Ionicons
                    name={service.icon}
                    size={29}
                    color="#7047E8"
                  />

                </View>


                <Text style={styles.serviceName}>
                  {service.name}
                </Text>


                <Text style={styles.serviceDescription}>
                  {service.description}
                </Text>


                <View style={styles.arrow}>

                  <Ionicons
                    name="arrow-forward"
                    size={15}
                    color="#7047E8"
                  />

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
                <Text style={styles.sectionTitle}>
                  Your bookings
                </Text>

                <Text style={styles.sectionSubtitle}>
                  Track your service requests
                </Text>
              </View>

              {bookings.length > 0 && (
                <Pressable
                  onPress={() => setBookingsVisible(true)}
                >
                  <Text style={styles.viewAllText}>
                    View all
                  </Text>
                </Pressable>
              )}
            </View>

            {bookings.length === 0 ? (
              <View style={styles.emptyBooking}>
                <View style={styles.bookingIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={27}
                    color="#7047E8"
                  />
                </View>

                <View style={styles.bookingText}>
                  <Text style={styles.bookingTitle}>
                    No active bookings
                  </Text>

                  <Text style={styles.bookingSubtitle}>
                    Your upcoming services will appear here.
                  </Text>
                </View>
              </View>
            ) : (
              bookings.slice(0, 2).map(booking => (
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
                        {booking.serviceName}
                      </Text>

                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.bookingCardInfo}>
                      {formatBookingDate(booking.date)}
                    </Text>

                    <Text style={styles.bookingCardInfo}>
                      {booking.time}
                    </Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color="#999"
                  />
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

              <Text style={styles.trustTitle}>
                Trusted professionals
              </Text>

              <Text style={styles.trustDescription}>
                Find skilled workers for your everyday needs.
              </Text>

            </View>

          </View>


        </ScrollView>


        {/* =================================================
            BOTTOM NAVIGATION
        ================================================= */}

        <View style={styles.bottomNavigation}>


          {/* HOME */}

          <Pressable
            style={styles.navItem}
          >

            <View style={styles.activeNavIcon}>

              <Ionicons
                name="home"
                size={20}
                color="#FFFFFF"
              />

            </View>

            <Text style={styles.activeNavText}>
              Home
            </Text>

          </Pressable>


          {/* BOOKINGS */}

          <Pressable
            style={styles.navItem}
            onPress={() => setBookingsVisible(true)}
          >

            <View style={styles.navIcon}>

              <Ionicons
                name="calendar-outline"
                size={22}
                color="#777777"
              />

            </View>

            <Text style={styles.navText}>
              Bookings
            </Text>

          </Pressable>


          {/* PROFILE */}

          <Pressable
            style={styles.navItem}
            onPress={() => setProfileVisible(true)}
          >

            <View style={styles.navIcon}>

              <Ionicons
                name="person-outline"
                size={22}
                color="#777777"
              />

            </View>

            <Text style={styles.navText}>
              Profile
            </Text>

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
                    name={bookingStep > 1 && !bookingSuccess ? "arrow-back" : "close"}
                    size={21}
                    color="#222222"
                  />
                </Pressable>

                <Text style={styles.bookingModalTitle}>
                  {bookingSuccess ? "Booking Confirmed" : "Book a service"}
                </Text>

                <View style={{ width: 40 }} />
              </View>

              {!bookingSuccess ? (
                <>
                  <View style={styles.progressRow}>
                    {[1, 2, 3, 4].map(step => (
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
                          {selectedService.name}
                        </Text>
                        <Text style={styles.selectedServiceDescription}>
                          {selectedService.description}
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
                        Where do you need the service?
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        Select the address where the professional should visit.
                      </Text>

                      {addresses.map(address => (
                        <Pressable
                          key={address.id}
                          onPress={() => setSelectedAddress(address)}
                          style={[
                            styles.addressCard,
                            selectedAddress?.id === address.id && styles.selectedAddressCard,
                          ]}
                        >
                          <View style={styles.addressIcon}>
                            <Ionicons
                              name={address.title === "Home" ? "home-outline" : "location-outline"}
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
                            name={selectedAddress?.id === address.id ? "radio-button-on" : "radio-button-off"}
                            size={22}
                            color={selectedAddress?.id === address.id ? "#7047E8" : "#AAAAAA"}
                          />
                        </Pressable>
                      ))}

                      <Pressable
                        style={styles.addAddressButton}
                        onPress={() =>
                          Alert.alert(
                            "Add Address",
                            "Address management will be connected to your profile and FastAPI backend."
                          )
                        }
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={20}
                          color="#7047E8"
                        />
                        <Text style={styles.addAddressText}>
                          Add new address
                        </Text>
                      </Pressable>
                    </ScrollView>
                  )}

                  {bookingStep === 2 && (
                    <ScrollView
                      showsVerticalScrollIndicator={false}
                      contentContainerStyle={styles.bookingStepContent}
                    >
                      <Text style={styles.stepTitle}>
                        Choose a date
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        Select when you want the professional to visit.
                      </Text>

                      <View style={styles.dateGrid}>
                        {availableDates.map(item => (
                          <Pressable
                            key={item.value}
                            onPress={() => setSelectedDate(item.value)}
                            style={[
                              styles.dateCard,
                              selectedDate === item.value && styles.dateCardSelected,
                            ]}
                          >
                            <Text style={[
                              styles.dateDay,
                              selectedDate === item.value && styles.dateTextSelected,
                            ]}>
                              {item.day}
                            </Text>
                            <Text style={[
                              styles.dateNumber,
                              selectedDate === item.value && styles.dateTextSelected,
                            ]}>
                              {item.date}
                            </Text>
                            <Text style={[
                              styles.dateMonth,
                              selectedDate === item.value && styles.dateTextSelected,
                            ]}>
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
                      <Text style={styles.stepTitle}>
                        Choose a time slot
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        Pick a convenient time for your service.
                      </Text>

                      {timeSlots.map(slot => (
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
                            color={selectedTime === slot ? "#7047E8" : "#666666"}
                          />
                          <Text style={[
                            styles.timeSlotText,
                            selectedTime === slot && styles.timeSlotTextSelected,
                          ]}>
                            {slot}
                          </Text>
                          <Ionicons
                            name={selectedTime === slot ? "radio-button-on" : "radio-button-off"}
                            size={22}
                            color={selectedTime === slot ? "#7047E8" : "#AAAAAA"}
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
                      <Text style={styles.stepTitle}>
                        Confirm your booking
                      </Text>
                      <Text style={styles.stepSubtitle}>
                        Review the details before confirming your service.
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
                          <Text style={styles.summaryLabel}>Service</Text>
                          <Text style={styles.summaryValue}>
                            {selectedService?.name}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.summaryRow}>
                        <Ionicons name="location-outline" size={21} color="#7047E8" />
                        <View style={styles.summaryRowContent}>
                          <Text style={styles.summaryLabel}>Service location</Text>
                          <Text style={styles.summaryValue}>
                            {selectedAddress?.title}
                          </Text>
                          <Text style={styles.summarySmall}>
                            {selectedAddress?.address}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.summaryRow}>
                        <Ionicons name="calendar-outline" size={21} color="#7047E8" />
                        <View style={styles.summaryRowContent}>
                          <Text style={styles.summaryLabel}>Date</Text>
                          <Text style={styles.summaryValue}>
                            {selectedDate ? formatBookingDate(selectedDate) : "Not selected"}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.summaryRow}>
                        <Ionicons name="time-outline" size={21} color="#7047E8" />
                        <View style={styles.summaryRowContent}>
                          <Text style={styles.summaryLabel}>Time slot</Text>
                          <Text style={styles.summaryValue}>
                            {selectedTime}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.confirmNotice}>
                        <Ionicons
                          name="shield-checkmark-outline"
                          size={20}
                          color="#7047E8"
                        />
                        <Text style={styles.confirmNoticeText}>
                          You can track the booking status from the Bookings section.
                        </Text>
                      </View>
                    </ScrollView>
                  )}

                  <Pressable
                    style={styles.continueButton}
                    onPress={bookingStep === 4 ? confirmBooking : handleNextStep}
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

                  <Text style={styles.successTitle}>
                    Booking Confirmed!
                  </Text>

                  <Text style={styles.successText}>
                    Your {selectedService?.name} service has been successfully booked.
                  </Text>

                  <View style={styles.bookingIdCard}>
                    <Text style={styles.bookingIdLabel}>Booking ID</Text>
                    <Text style={styles.bookingId}>
                      #{bookings[0]?.id}
                    </Text>
                  </View>

                  <View style={styles.successDetails}>
                    <Text style={styles.successDetailText}>
                      {selectedDate ? formatBookingDate(selectedDate) : ""}
                    </Text>
                    <Text style={styles.successDetailText}>
                      {selectedTime}
                    </Text>
                  </View>

                  <Pressable
                    style={styles.doneButton}
                    onPress={handleCloseBooking}
                  >
                    <Text style={styles.doneButtonText}>
                      Done
                    </Text>
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

              <Text style={styles.bookingsTitle}>
                My Bookings
              </Text>

              <View style={{ width: 42 }} />
            </View>

            {bookings.length === 0 ? (
              <View style={styles.noBookingsContainer}>
                <View style={styles.noBookingsIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={43}
                    color="#7047E8"
                  />
                </View>
                <Text style={styles.noBookingsTitle}>
                  No bookings yet
                </Text>
                <Text style={styles.noBookingsText}>
                  Choose a service from the home screen to create your first booking.
                </Text>
                <Pressable
                  style={styles.startBookingButton}
                  onPress={() => setBookingsVisible(false)}
                >
                  <Text style={styles.startBookingText}>
                    Book a Service
                  </Text>
                </Pressable>
              </View>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.bookingsContent}
              >
                <Text style={styles.bookingsCount}>
                  {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
                </Text>

                {bookings.map(booking => (
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
                          {booking.serviceName}
                        </Text>
                        <Text style={styles.fullBookingId}>
                          {booking.id}
                        </Text>
                      </View>

                      <View style={styles.statusBadge}>
                        <Text style={styles.statusBadgeText}>
                          {booking.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.fullBookingDivider} />

                    <View style={styles.fullBookingRow}>
                      <Ionicons name="calendar-outline" size={19} color="#7047E8" />
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
                      <Ionicons name="location-outline" size={19} color="#7047E8" />
                      <Text style={styles.fullBookingRowText}>
                        {booking.address.title} · {booking.address.address}
                      </Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* =================================================
            PROFILE MODAL
        ================================================= */}

        <Modal
          visible={profileVisible}
          animationType="slide"
          onRequestClose={() =>
            setProfileVisible(false)
          }
        >

          <SafeAreaView style={styles.profileScreen}>

            <View style={styles.profileHeader}>

              <Pressable
                onPress={() =>
                  setProfileVisible(false)
                }
              >

                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="#222222"
                />

              </Pressable>


              <Text style={styles.profileTitle}>
                My Profile
              </Text>


              <View style={{ width: 24 }} />

            </View>


            <ScrollView
              contentContainerStyle={styles.profileContent}
            >


              {/* AVATAR */}

              <View style={styles.avatar}>

                <Ionicons
                  name="person"
                  size={43}
                  color="#7047E8"
                />

              </View>


              <Text style={styles.profileName}>
                {user.name}
              </Text>


              <Text style={styles.profileEmail}>
                {user.email || "Email not available"}
              </Text>


              {/* INFORMATION */}

              <Text style={styles.profileSectionTitle}>
                Personal Information
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
                  value={user.email || "Not available"}
                />

                <View style={styles.divider} />

                <ProfileRow
                  icon="call-outline"
                  title="Phone"
                  value={user.phone || "Not available"}
                />

              </View>


              {/* ADDRESS */}

              <Text style={styles.profileSectionTitle}>
                Saved Addresses
              </Text>


              <Pressable
                style={styles.profileOption}
                onPress={() =>
                  Alert.alert(
                    "Addresses",
                    "Saved addresses will be connected to the backend here."
                  )
                }
              >

                <View style={styles.optionIcon}>

                  <Ionicons
                    name="location-outline"
                    size={21}
                    color="#7047E8"
                  />

                </View>


                <View style={styles.optionContent}>

                  <Text style={styles.optionTitle}>
                    Manage Addresses
                  </Text>

                  <Text style={styles.optionSubtitle}>
                    Add or edit your service locations
                  </Text>

                </View>


                <Ionicons
                  name="chevron-forward"
                  size={19}
                  color="#999999"
                />

              </Pressable>


              {/* LOGOUT */}

              <Pressable
                style={styles.logoutButton}
                onPress={handleLogout}
              >

                <Ionicons
                  name="log-out-outline"
                  size={21}
                  color="#D93636"
                />

                <Text style={styles.logoutText}>
                  Logout
                </Text>

              </Pressable>


            </ScrollView>

          </SafeAreaView>

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

        <Ionicons
          name={icon}
          size={20}
          color="#7047E8"
        />

      </View>


      <View style={styles.infoContent}>

        <Text style={styles.infoTitle}>
          {title}
        </Text>

        <Text style={styles.infoValue}>
          {value}
        </Text>

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

});