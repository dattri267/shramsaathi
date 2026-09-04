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
  Modal,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';

import {
  updateCustomerProfile,
  uploadCustomerAvatar,
} from '../../api';

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
  const [photoModalVisible, setPhotoModalVisible] =
  useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const [house, setHouse] = useState('');
  const [locality, setLocality] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [landmark, setLandmark] = useState('');

  const handleContinue = async () => {
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

    if (latitude === null || longitude === null) {
      Alert.alert(
        'Location Required',
        'Please use your current location before continuing so the service address can be used for bookings.'
      );
      return;
    }

    try {
      setSaving(true);

      let avatarUrl: string | null = null;

      if (profilePhoto) {
        const avatarResult = await uploadCustomerAvatar(
          profilePhoto,
          'customer-profile.jpg',
          'image/jpeg'
        );

        avatarUrl =
          avatarResult?.avatar?.avatar_url ||
          avatarResult?.avatar_url ||
          avatarResult?.public_url ||
          avatarResult?.url ||
          null;

        if (!avatarUrl) {
          throw new Error(
            'Profile photo was uploaded, but the server did not return a photo URL.'
          );
        }
      }

      const address = {
        house: house.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
        latitude,
        longitude,
      };

      await updateCustomerProfile({
        full_name: fullName.trim(),
        phone: mobile.trim(),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        address,
        latitude,
        longitude,
      });

      navigation.replace('UserDashboard', {
        user: {
          name: fullName.trim(),
          email: route.params?.email,
          phone: mobile.trim(),
        },
      });
    } catch (error) {
      console.error('Customer profile save error:', error);
      Alert.alert(
        'Unable to Save Profile',
        error instanceof Error
          ? error.message
          : 'Something went wrong while saving your profile.'
      );
    } finally {
      setSaving(false);
    }
  };

const handleUseCurrentLocation = async () => {
  setLocationLoading(true);
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

    // Get current GPS position
    const location =
      await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

    const { latitude, longitude } = location.coords;

    setLatitude(latitude);
    setLongitude(longitude);

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
  } finally {
    setLocationLoading(false);
  }
};

const handleAddPhoto = () => {
  setPhotoModalVisible(true);
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
  setPhotoModalVisible(false);
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
  setPhotoModalVisible(false);
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
  style={[
    styles.locationButton,
    locationLoading && styles.locationButtonDisabled,
  ]}
  onPress={handleUseCurrentLocation}
  disabled={locationLoading}
>
  <View style={styles.locationIcon}>
    {locationLoading ? (
      <ActivityIndicator
        size="small"
        color="#2563EB"
      />
    ) : (
      <Ionicons
        name="location-outline"
        size={21}
        color="#2563EB"
      />
    )}
  </View>

  <View style={styles.locationTextContainer}>
    <Text style={styles.locationTitle}>
      {locationLoading
        ? 'Fetching Location...'
        : 'Use Current Location'}
    </Text>

    <Text style={styles.locationSubtitle}>
      {locationLoading
        ? 'Please wait while we detect your address'
        : 'Automatically detect your address'}
    </Text>
  </View>

  {!locationLoading && (
    <Ionicons
      name="chevron-forward"
      size={20}
      color="#9CA3AF"
    />
  )}
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
      <Modal
  visible={photoModalVisible}
  transparent
  animationType="slide"
  onRequestClose={() => setPhotoModalVisible(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.photoBottomSheet}>

      {/* Handle */}
      <View style={styles.sheetHandle} />

      {/* Header */}
      <View style={styles.sheetHeader}>
        <View style={styles.sheetHeaderText}>
          <Text style={styles.sheetTitle}>
            {profilePhoto
              ? 'Change Profile Photo'
              : 'Add Profile Photo'}
          </Text>

          <Text style={styles.sheetSubtitle}>
            Choose how you want to add your photo
          </Text>
        </View>

        <Pressable
          style={styles.sheetCloseButton}
          onPress={() => setPhotoModalVisible(false)}
        >
          <Ionicons
            name="close"
            size={21}
            color="#6B7280"
          />
        </Pressable>
      </View>

      {/* Take Photo */}
      <Pressable
        style={styles.photoOption}
        onPress={handleTakePhoto}
      >
        <View style={styles.photoOptionIcon}>
          <Ionicons
            name="camera-outline"
            size={25}
            color="#2563EB"
          />
        </View>

        <View style={styles.photoOptionText}>
          <Text style={styles.photoOptionTitle}>
            Take Photo
          </Text>

          <Text style={styles.photoOptionSubtitle}>
            Use your camera to take a new photo
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#9CA3AF"
        />
      </Pressable>

      {/* Choose From Device */}
      <Pressable
        style={styles.photoOption}
        onPress={handleChoosePhoto}
      >
        <View style={styles.photoOptionIcon}>
          <Ionicons
            name="images-outline"
            size={25}
            color="#2563EB"
          />
        </View>

        <View style={styles.photoOptionText}>
          <Text style={styles.photoOptionTitle}>
            Choose from Device
          </Text>

          <Text style={styles.photoOptionSubtitle}>
            Select a photo from your gallery
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color="#9CA3AF"
        />
      </Pressable>

      {/* Cancel */}
      <Pressable
        style={styles.sheetCancelButton}
        onPress={() => setPhotoModalVisible(false)}
      >
        <Text style={styles.sheetCancelText}>
          Cancel
        </Text>
      </Pressable>

    </View>
  </View>
</Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0, 0, 0, 0.45)',
  justifyContent: 'flex-end',
},

photoBottomSheet: {
  backgroundColor: '#FFFFFF',
  borderTopLeftRadius: 25,
  borderTopRightRadius: 25,
  paddingHorizontal: 20,
  paddingTop: 10,
  paddingBottom: 28,
},

sheetHandle: {
  width: 42,
  height: 4,
  borderRadius: 10,
  backgroundColor: '#D1D5DB',
  alignSelf: 'center',
  marginBottom: 18,
},

sheetHeader: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  marginBottom: 20,
},

sheetHeaderText: {
  flex: 1,
  paddingRight: 12,
},

sheetTitle: {
  fontSize: 18,
  fontWeight: '700',
  color: '#111827',
},

sheetSubtitle: {
  fontSize: 12,
  color: '#6B7280',
  marginTop: 4,
},

sheetCloseButton: {
  width: 34,
  height: 34,
  borderRadius: 17,
  backgroundColor: '#F3F4F6',
  justifyContent: 'center',
  alignItems: 'center',
},
locationButtonDisabled: {
  opacity: 0.7,
},

photoOption: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: 13,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 14,
  marginBottom: 10,
  backgroundColor: '#FFFFFF',
},

photoOptionIcon: {
  width: 46,
  height: 46,
  borderRadius: 12,
  backgroundColor: '#EFF6FF',
  justifyContent: 'center',
  alignItems: 'center',
},

photoOptionText: {
  flex: 1,
  marginLeft: 12,
},

photoOptionTitle: {
  fontSize: 14,
  fontWeight: '600',
  color: '#111827',
},

photoOptionSubtitle: {
  fontSize: 11,
  color: '#9CA3AF',
  marginTop: 3,
},

sheetCancelButton: {
  height: 48,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  justifyContent: 'center',
  alignItems: 'center',
  marginTop: 6,
},

sheetCancelText: {
  fontSize: 14,
  fontWeight: '600',
  color: '#4B5563',
},
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