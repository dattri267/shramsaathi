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

  const handleBookService = async () => {

    if (!selectedService) {
      return;
    }


    /*
    |--------------------------------------------------------------------------
    | REAL BACKEND INTEGRATION
    |--------------------------------------------------------------------------
    |
    | Later connect this with your FastAPI endpoint.
    |
    | Example:
    |
    | POST /api/bookings
    |
    | Body:
    |
    | {
    |   "user_id": user.id,
    |   "service_id": selectedService.id,
    |   "address_id": "...",
    |   "date": "...",
    |   "time": "..."
    | }
    |
    */


    try {

      /*
      const response = await fetch(
        `${API_BASE_URL}/api/bookings`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",

            Authorization: `Bearer ${TOKEN}`,
          },

          body: JSON.stringify({
            user_id: user.id,
            service_id: selectedService.id,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Booking failed");
      }

      const data = await response.json();

      console.log("Booking created:", data);
      */


      Alert.alert(
        "Service Selected",
        `${selectedService.name} booking will be connected to the backend here.`
      );


      setSelectedService(null);

    }

    catch (error) {

      console.log("Booking error:", error);

      Alert.alert(
        "Error",
        "Unable to book the service."
      );

    }

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

            <View>

              <Text style={styles.sectionTitle}>
                Your bookings
              </Text>

              <Text style={styles.sectionSubtitle}>
                Track your service requests
              </Text>

            </View>


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
            onPress={() =>
              Alert.alert(
                "Bookings",
                "Bookings navigation will be connected here."
              )
            }
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
          onRequestClose={() =>
            setSelectedService(null)
          }
        >

          <View style={styles.modalOverlay}>

            <View style={styles.modalContainer}>


              <View style={styles.modalHandle} />


              <View style={styles.modalHeader}>

                <Text style={styles.modalTitle}>
                  Book a service
                </Text>


                <Pressable
                  onPress={() =>
                    setSelectedService(null)
                  }
                >

                  <Ionicons
                    name="close"
                    size={24}
                    color="#222222"
                  />

                </Pressable>

              </View>


              {selectedService && (

                <>

                  <View style={styles.selectedService}>

                    <View style={styles.selectedServiceIcon}>

                      <Ionicons
                        name={selectedService.icon}
                        size={32}
                        color="#7047E8"
                      />

                    </View>


                    <View>

                      <Text style={styles.selectedServiceName}>
                        {selectedService.name}
                      </Text>

                      <Text style={styles.selectedServiceDescription}>
                        {selectedService.description}
                      </Text>

                    </View>

                  </View>


                  <Text style={styles.modalLabel}>
                    Service location
                  </Text>


                  <Pressable
                    style={styles.modalInput}
                  >

                    <Ionicons
                      name="location-outline"
                      size={20}
                      color="#7047E8"
                    />

                    <Text style={styles.modalInputText}>
                      Select address
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#999999"
                    />

                  </Pressable>


                  <Text style={styles.modalLabel}>
                    Preferred date & time
                  </Text>


                  <Pressable
                    style={styles.modalInput}
                  >

                    <Ionicons
                      name="calendar-outline"
                      size={20}
                      color="#7047E8"
                    />

                    <Text style={styles.modalInputText}>
                      Select date and time
                    </Text>

                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color="#999999"
                    />

                  </Pressable>


                  <Pressable
                    style={styles.bookButton}
                    onPress={handleBookService}
                  >

                    <Text style={styles.bookButtonText}>
                      Book {selectedService.name}
                    </Text>

                  </Pressable>

                </>

              )}

            </View>

          </View>

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