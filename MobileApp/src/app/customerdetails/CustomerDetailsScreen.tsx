import React, { useState } from 'react';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import type {
  NativeStackScreenProps,
} from '@react-navigation/native-stack';

import type {
  RootStackParamList,
} from '../navigation/AppNavigator';

type Props = NativeStackScreenProps<
  RootStackParamList,
  'CustomerDetails'
>;

export default function CustomerDetailsScreen({
  navigation,
  route,
}: Props) {
  const [fullName, setFullName] = useState('');

  const [mobile, setMobile] = useState(
    route.params?.mobile || ''
  );

  const [profilePhoto, setProfilePhoto] =
    useState<string | null>(null);

  const [house, setHouse] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  const handleContinue = () => {
    if (
      !fullName.trim() ||
      !mobile.trim() ||
      !house.trim() ||
      !locality.trim() ||
      !city.trim() ||
      !state.trim() ||
      !pincode.trim()
    ) {
      Alert.alert(
        'Incomplete Details',
        'Please fill in all required fields.'
      );

      return;
    }

    if (mobile.length !== 10) {
      Alert.alert(
        'Invalid Mobile Number',
        'Please enter a valid 10-digit mobile number.'
      );

      return;
    }

    if (pincode.length !== 6) {
      Alert.alert(
        'Invalid PIN Code',
        'Please enter a valid 6-digit PIN code.'
      );

      return;
    }

    const customerDetails = {
      name: fullName.trim(),

      phone: mobile.trim(),

      email: route.params?.email,

      profilePhoto,

      address: {
        house: house.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
      },
    };

    console.log(
      'Customer Details:',
      customerDetails
    );

    navigation.replace('UserDashboard', {
      user: {
        name: fullName.trim(),
        email: route.params?.email,
        phone: mobile.trim(),
      },
    });
  };

const handleUseCurrentLocation = async () => {
  try {
    // Request location permission
    const { status } =
      await Location.requestForegroundPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'ShramSaathi needs your location to automatically fill your service address.'
      );
      return;
    }

    // Show loading message
    Alert.alert(
      'Getting Location',
      'Please wait while we fetch your current address.'
    );

    // Get current GPS position
    const location =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

    const { latitude, longitude } = location.coords;

    console.log('Latitude:', latitude);
    console.log('Longitude:', longitude);

    // Convert coordinates into address
    const address = await Location.reverseGeocodeAsync({
      latitude,
      longitude,
    });

    if (address.length === 0) {
      Alert.alert(
        'Address Not Found',
        'We could not determine your address. Please enter it manually.'
      );
      return;
    }

    const currentAddress = address[0];

    console.log('Current Address:', currentAddress);

    // Fill the form
    setHouse(
  currentAddress.streetNumber ||
  currentAddress.name ||
  ''
);

setLocality(
  currentAddress.district ||
  currentAddress.subregion ||
  ''
);

setCity(
  currentAddress.city ||
  currentAddress.subregion ||
  ''
);

setState(
  currentAddress.region ||
  ''
);

setPincode(
  currentAddress.postalCode ||
  ''
);

    Alert.alert(
      'Location Found',
      'Your address has been filled automatically. Please verify the details before continuing.'
    );

  } catch (error) {
    console.log('Location Error:', error);

    Alert.alert(
      'Location Error',
      'Unable to fetch your current address. Please check your GPS and try again, or enter the address manually.'
    );
  }
};

const handleAddPhoto = () => {
  Alert.alert(
    profilePhoto ? 'Change Profile Photo' : 'Add Profile Photo',
    'Choose an option',
    [
      {
        text: 'Take Photo',
        onPress: handleTakePhoto,
      },
      {
        text: 'Choose from Device',
        onPress: handleChoosePhoto,
      },
      {
        text: 'Cancel',
        style: 'cancel',
      },
    ]
  );
};
const handleTakePhoto = async () => {
  try {
    const permission =
      await ImagePicker.requestCameraPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Camera Permission Required',
        'ShramSaathi needs camera access to take your profile photo.'
      );
      return;
    }

    const result =
      await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  } catch (error) {
    console.log('Camera Error:', error);

    Alert.alert(
      'Camera Error',
      'Unable to open the camera.'
    );
  }
};


const handleChoosePhoto = async () => {
  try {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert(
        'Photo Permission Required',
        'ShramSaathi needs access to your photos so you can select a profile picture.'
      );
      return;
    }

    const result =
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

    if (!result.canceled) {
      setProfilePhoto(result.assets[0].uri);
    }
  } catch (error) {
    console.log('Gallery Error:', error);

    Alert.alert(
      'Gallery Error',
      'Unable to open your photos.'
    );
  }
};

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios'
          ? 'padding'
          : undefined
      }
    >
      <ScrollView
        contentContainerStyle={
          styles.scrollContent
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* HEADER */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons
              name="arrow-back"
              size={23}
              color="#111827"
            />
          </Pressable>

          <View>
            <Text style={styles.headerTitle}>
              Personal Details
            </Text>

            <Text style={styles.headerSubtitle}>
              Complete your ShramSaathi profile
            </Text>
          </View>
        </View>

        {/* PERSONAL INFORMATION */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Personal Information
          </Text>

          <Text
            style={styles.sectionDescription}
          >
            This information will be used for
            your ShramSaathi profile.
          </Text>

          {/* PROFILE PHOTO */}

          <View
            style={styles.photoContainer}
          >
           <View style={styles.avatar}>
  {profilePhoto ? (
    <Image
      source={{ uri: profilePhoto }}
      style={styles.avatarImage}
    />
  ) : (
    <Ionicons
      name="person-outline"
      size={36}
      color="#9CA3AF"
    />
  )}
</View>

            <Pressable
              style={styles.photoButton}
              onPress={handleAddPhoto}
            >
              <Ionicons
                name="camera-outline"
                size={17}
                color="#2563EB"
              />

             <Text style={styles.photoButtonText}>
  {profilePhoto ? 'Change Photo' : 'Add Photo'}
</Text>
            </Pressable>

            <Text style={styles.optionalText}>
              Optional
            </Text>
          </View>

          {/* FULL NAME */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Full Name{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="person-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor="#9CA3AF"
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* MOBILE NUMBER */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mobile Number{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="call-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                placeholderTextColor="#9CA3AF"
                value={mobile}
                onChangeText={(text) =>
                  setMobile(
                    text.replace(
                      /[^0-9]/g,
                      ''
                    )
                  )
                }
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
          </View>
        </View>

        {/* SERVICE ADDRESS */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Service Address
          </Text>

          <Text
            style={styles.sectionDescription}
          >
            Where should our service professional
            reach you?
          </Text>

          {/* CURRENT LOCATION */}

          <Pressable
            style={styles.locationButton}
            onPress={
              handleUseCurrentLocation
            }
          >
            <View
              style={styles.locationIcon}
            >
              <Ionicons
                name="location-outline"
                size={21}
                color="#2563EB"
              />
            </View>

            <View
              style={
                styles.locationTextContainer
              }
            >
              <Text
                style={styles.locationTitle}
              >
                Use Current Location
              </Text>

              <Text
                style={styles.locationSubtitle}
              >
                Automatically detect your address
              </Text>
            </View>

            <Ionicons
              name="chevron-forward"
              size={20}
              color="#9CA3AF"
            />
          </Pressable>

          {/* HOUSE / FLAT */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              House / Flat / Building{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="home-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="House no., flat no., building"
                placeholderTextColor="#9CA3AF"
                value={house}
                onChangeText={setHouse}
              />
            </View>
          </View>

          {/* STREET / LOCALITY */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Street / Locality{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="navigate-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Street, colony, locality"
                placeholderTextColor="#9CA3AF"
                value={locality}
                onChangeText={setLocality}
              />
            </View>
          </View>

          {/* CITY */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              City{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="business-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter city"
                placeholderTextColor="#9CA3AF"
                value={city}
                onChangeText={setCity}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* STATE */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              State{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="map-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Enter state"
                placeholderTextColor="#9CA3AF"
                value={state}
                onChangeText={setState}
                autoCapitalize="words"
              />
            </View>
          </View>

          {/* PIN CODE */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              PIN Code{' '}
              <Text style={styles.required}>
                *
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="location-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="6-digit PIN code"
                placeholderTextColor="#9CA3AF"
                value={pincode}
                onChangeText={(text) =>
                  setPincode(
                    text.replace(
                      /[^0-9]/g,
                      ''
                    )
                  )
                }
                keyboardType="number-pad"
                maxLength={6}
              />
            </View>
          </View>

          {/* LANDMARK */}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Landmark
              <Text
                style={
                  styles.optionalLabel
                }
              >
                {' '}
                (Optional)
              </Text>
            </Text>

            <View
              style={styles.inputContainer}
            >
              <Ionicons
                name="flag-outline"
                size={20}
                color="#9CA3AF"
              />

              <TextInput
                style={styles.input}
                placeholder="Nearby landmark"
                placeholderTextColor="#9CA3AF"
                value={landmark}
                onChangeText={setLandmark}
              />
            </View>
          </View>
        </View>

        {/* CONTINUE */}

        <Pressable
          style={styles.continueButton}
          onPress={handleContinue}
        >
          <Text
            style={styles.continueText}
          >
            Continue
          </Text>

          <Ionicons
            name="arrow-forward"
            size={20}
            color="#FFFFFF"
          />
        </Pressable>

        <Text style={styles.bottomText}>
          You can update these details later
          from your profile.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 55,
    paddingBottom: 35,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },

  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 3,
  },

  progressContainer: {
    marginBottom: 30,
  },

  progressTrack: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },

  progressFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 10,
  },
  avatar: {
  width: 86,
  height: 86,
  borderRadius: 43,
  backgroundColor: '#F3F4F6',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 10,
},
avatarImage: {
  width: '100%',
  height: '100%',
  borderRadius: 43,
},

  progressText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 7,
    textAlign: 'right',
  },

  section: {
    marginBottom: 28,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: '#111827',
  },

  sectionDescription: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 5,
    marginBottom: 20,
    lineHeight: 19,
  },

  photoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },


  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  photoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },

  optionalText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 3,
  },

  inputGroup: {
    marginBottom: 17,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  required: {
    color: '#EF4444',
  },

  optionalLabel: {
    fontWeight: '400',
    color: '#9CA3AF',
  },

  inputContainer: {
    height: 52,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    marginLeft: 11,
  },

  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 13,
    marginBottom: 20,
  },

  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  locationTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },

  locationSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },

  continueButton: {
    height: 54,
    backgroundColor: '#000000',
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    marginTop: 5,
  },

  continueText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  bottomText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 13,
  },
});