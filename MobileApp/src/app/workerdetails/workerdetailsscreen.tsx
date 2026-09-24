import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

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
  ActivityIndicator,
  Modal,
} from "react-native";

import Ionicons from "@expo/vector-icons/Ionicons";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import {
  signup,
  updateWorkerProfile,
  uploadWorkerAvatar,
  uploadWorkerDocument,
  getSkillsWithSubskills,
} from "../../api";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/AppNavigator";

type Props = NativeStackScreenProps<RootStackParamList, "WorkerDetails">;

type DocumentType = "identity" | "address" | "work";

type DocumentData = {
  uri: string;
  name: string;
  mimeType?: string;
};

export default function WorkerDetailsScreen({ navigation, route }: Props) {
  const { t } = useTranslation();
  // --------------------------------------------------
  // Personal Information
  // --------------------------------------------------

  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState(route.params?.mobile || "");

  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);

  // --------------------------------------------------
  // Professional Information
  // --------------------------------------------------

  const [primarySkill, setPrimarySkill] = useState("");
  const [primarySubskill, setPrimarySubskill] = useState("");

  type Subskill = {
    id: string;
    skill_id: string;
    name: string;
    description?: string | null;
  };

  type AvailableSkill = {
    id: string;
    name: string;
    slug?: string | null;
    description?: string | null;
    subskills: Subskill[];
  };

  const [availableSkills, setAvailableSkills] = useState<AvailableSkill[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [customSkillModalVisible, setCustomSkillModalVisible] = useState(false);

  const [customSkill, setCustomSkill] = useState("");

  const [additionalSkills, setAdditionalSkills] = useState<string[]>([]);

  const [experience, setExperience] = useState("");

  const [workDescription, setWorkDescription] = useState("");

  // --------------------------------------------------
  // Location
  // --------------------------------------------------

  const [house, setHouse] = useState("");
  const [locality, setLocality] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [landmark, setLandmark] = useState("");

  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const [locationUpdated, setLocationUpdated] = useState(false);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);
  // --------------------------------------------------
  // Service Radius
  // --------------------------------------------------

  const [serviceRadius, setServiceRadius] = useState("5 km");

  // --------------------------------------------------
  // Availability
  // --------------------------------------------------

  const [workingDays, setWorkingDays] = useState<string[]>([]);

  const [workingHours, setWorkingHours] = useState<string[]>([]);

  // --------------------------------------------------
  // Documents
  // --------------------------------------------------

  const [identityDocument, setIdentityDocument] = useState<DocumentData | null>(
    null,
  );

  const [addressDocument, setAddressDocument] = useState<DocumentData | null>(
    null,
  );

  const [workDocument, setWorkDocument] = useState<DocumentData | null>(null);

  const [documentModalVisible, setDocumentModalVisible] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(
    null,
  );

  // --------------------------------------------------
  // Profile Photo
  // --------------------------------------------------

  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  // --------------------------------------------------
  // Skills
  // --------------------------------------------------

  // --------------------------------------------------
  // Skills
  // --------------------------------------------------

  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const hours = ["Morning", "Afternoon", "Evening"];

  const translateServiceName = (name: string) => {
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


  // Load primary services together with their database-backed subskills.
  // Only skills that actually have subskills are returned by this endpoint.
  useEffect(() => {
    const loadSkills = async () => {
      try {
        setLoadingSkills(true);

        const skillsFromBackend = await getSkillsWithSubskills();
        const backendSkills = Array.isArray(skillsFromBackend)
          ? skillsFromBackend
          : [];

        setAvailableSkills(backendSkills);
      } catch (error) {
        console.log("Load Skills Error:", error);

        Alert.alert(
          t("workerDetails.alerts.loadServicesTitle"),
          t("workerDetails.alerts.loadServicesMessage"),
        );

        setAvailableSkills([]);
      } finally {
        setLoadingSkills(false);
      }
    };

    loadSkills();
  }, []);

  // --------------------------------------------------
  // Profile Photo
  // --------------------------------------------------

  const handleProfilePhoto = () => {
    setPhotoModalVisible(true);
  };

  const handleAddCustomSkill = () => {
    const skill = customSkill.trim();

    if (!skill) {
      Alert.alert(t("workerDetails.alerts.skillRequiredTitle"), t("workerDetails.alerts.skillRequiredMessage"));
      return;
    }

    // Prevent duplicate skills
    if (
      additionalSkills.some(
        (item) => item.toLowerCase() === skill.toLowerCase(),
      )
    ) {
      Alert.alert(t("workerDetails.alerts.skillAlreadyAddedTitle"), t("workerDetails.alerts.skillAlreadyAddedMessage"));
      return;
    }

    setAdditionalSkills((current) => [...current, skill]);

    setCustomSkill("");
    setCustomSkillModalVisible(false);
  };
  const handleTakeProfilePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("workerDetails.alerts.cameraPermissionTitle"),
          t("workerDetails.alerts.cameraPermissionMessage"),
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePhoto(result.assets[0].uri);
      }

      setPhotoModalVisible(false);
    } catch (error) {
      console.log("Camera Error:", error);

      Alert.alert(t("workerDetails.alerts.cameraErrorTitle"), t("workerDetails.alerts.cameraErrorMessage"));
    }
  };

  const handleChooseProfilePhoto = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("workerDetails.alerts.photoPermissionTitle"),
          t("workerDetails.alerts.photoPermissionMessage"),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfilePhoto(result.assets[0].uri);
      }

      setPhotoModalVisible(false);
    } catch (error) {
      console.log("Gallery Error:", error);

      Alert.alert(t("workerDetails.alerts.galleryErrorTitle"), t("workerDetails.alerts.galleryErrorMessage"));
    }
  };

  // --------------------------------------------------
  // Location
  // --------------------------------------------------

  const handleUseCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      setLocationUpdated(false);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        setIsGettingLocation(false);

        Alert.alert(
          t("workerDetails.alerts.locationPermissionTitle"),
          t("workerDetails.alerts.locationPermissionMessage"),
        );

        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      setLatitude(latitude);
      setLongitude(longitude);

      console.log("Latitude:", latitude);
      console.log("Longitude:", longitude);

      const addresses = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (addresses.length === 0) {
        setIsGettingLocation(false);

        Alert.alert(
          t("workerDetails.alerts.addressNotFoundTitle"),
          t("workerDetails.alerts.addressNotFoundMessage"),
        );

        return;
      }

      const currentAddress = addresses[0];

      setHouse(currentAddress.streetNumber || currentAddress.name || "");

      setLocality(currentAddress.district || currentAddress.subregion || "");

      setCity(currentAddress.city || currentAddress.subregion || "");

      setState(currentAddress.region || "");

      setPincode(currentAddress.postalCode || "");

      setLocationUpdated(true);
      setIsGettingLocation(false);
    } catch (error) {
      console.log("Location Error:", error);

      setIsGettingLocation(false);

      Alert.alert(
        t("workerDetails.alerts.locationErrorTitle"),
        t("workerDetails.alerts.locationErrorMessage"),
      );
    }
  };

  // --------------------------------------------------
  // Document Modal
  // --------------------------------------------------

  const openDocumentPicker = (type: DocumentType) => {
    setSelectedDocument(type);
    setDocumentModalVisible(true);
  };

  const saveDocument = (document: DocumentData) => {
    if (selectedDocument === "identity") {
      setIdentityDocument(document);
    }

    if (selectedDocument === "address") {
      setAddressDocument(document);
    }

    if (selectedDocument === "work") {
      setWorkDocument(document);
    }

    setDocumentModalVisible(false);
    setSelectedDocument(null);
  };

  const handleDocumentCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("workerDetails.alerts.documentCameraPermissionTitle"),
          t("workerDetails.alerts.documentCameraPermissionMessage"),
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        saveDocument({
          uri: result.assets[0].uri,
          name: "Captured Document",
          mimeType: result.assets[0].mimeType || "image/jpeg",
        });
      }
    } catch (error) {
      console.log("Document Camera Error:", error);

      Alert.alert(t("workerDetails.alerts.cameraErrorTitle"), t("workerDetails.alerts.cameraErrorMessage"));
    }
  };

  const handleDocumentGallery = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        Alert.alert(
          t("workerDetails.alerts.documentPhotoPermissionTitle"),
          t("workerDetails.alerts.documentPhotoPermissionMessage"),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled) {
        saveDocument({
          uri: result.assets[0].uri,
          name: result.assets[0].fileName || "Uploaded Document",
          mimeType: result.assets[0].mimeType || "image/jpeg",
        });
      }
    } catch (error) {
      console.log("Document Gallery Error:", error);

      Alert.alert(t("workerDetails.alerts.galleryErrorTitle"), t("workerDetails.alerts.galleryErrorMessage"));
    }
  };

  // --------------------------------------------------
  // Selection Helpers
  // --------------------------------------------------

  const toggleExtraSkill = (skill: string) => {
    setAdditionalSkills((current) =>
      current.includes(skill)
        ? current.filter((item) => item !== skill)
        : [...current, skill],
    );
  };

  const toggleDay = (day: string) => {
    setWorkingDays((current) =>
      current.includes(day)
        ? current.filter((item) => item !== day)
        : [...current, day],
    );
  };

  const toggleHour = (hour: string) => {
    setWorkingHours((current) =>
      current.includes(hour)
        ? current.filter((item) => item !== hour)
        : [...current, hour],
    );
  };
  const getFileExtension = (fileName: string, mimeType?: string) => {
    const existingExtension = fileName.split(".").pop();

    if (
      existingExtension &&
      existingExtension !== fileName &&
      existingExtension.length <= 5
    ) {
      return existingExtension.toLowerCase();
    }

    if (mimeType === "image/png") {
      return "png";
    }

    if (mimeType === "image/webp") {
      return "webp";
    }

    if (mimeType === "application/pdf") {
      return "pdf";
    }

    return "jpg";
  };

  const uploadWorkerFiles = async () => {
    let avatarUrl: string | null = null;

    /*
     * --------------------------------------------------
     * Profile Photo
     * --------------------------------------------------
     */

    if (profilePhoto) {
      if (
        profilePhoto.startsWith("http://") ||
        profilePhoto.startsWith("https://")
      ) {
        avatarUrl = profilePhoto;
      } else {
        const avatarResult = await uploadWorkerAvatar(
          profilePhoto,
          "worker-profile.jpg",
          "image/jpeg",
        );

        avatarUrl =
  avatarResult?.avatar?.avatar_url ||
  avatarResult?.public_url ||
  avatarResult?.url ||
  avatarResult?.avatar_url ||
  avatarResult?.profile?.avatar_url ||
  avatarResult?.data?.public_url ||
  null;

        if (!avatarUrl) {
          throw new Error(
            "Profile photo was uploaded, but the server did not return a photo URL.",
          );
        }
      }
    }

    /*
     * --------------------------------------------------
     * Documents
     * --------------------------------------------------
     */

    const uploadedDocuments: Array<{
      file_type:
        | "certificate"
        | "work_evidence"
        | "invoice"
        | "identity_proof"
        | "address_proof";
      title: string;
      storage_path: string;
      public_url?: string | null;
    }> = [];

    const documentsToUpload = [
      {
        document: identityDocument,
        fileType: "identity_proof" as const,
        title: "Identity Proof",
      },
      {
        document: addressDocument,
        fileType: "address_proof" as const,
        title: "Address Proof",
      },
      {
        document: workDocument,
        fileType: "work_evidence" as const,
        title: "Skill / Work Proof",
      },
    ];

    for (const item of documentsToUpload) {
      if (!item.document) {
        continue;
      }

      const extension = getFileExtension(
        item.document.name,
        item.document.mimeType,
      );

      const mimeType =
        item.document.mimeType ||
        (extension === "png"
          ? "image/png"
          : extension === "webp"
            ? "image/webp"
            : extension === "pdf"
              ? "application/pdf"
              : "image/jpeg");

      const result = await uploadWorkerDocument({
        uri: item.document.uri,
        fileName: `${item.fileType}-${Date.now()}.${extension}`,
        mimeType,
        fileType: item.fileType,
        title: item.title,
      });

      const uploaded = result?.document || result?.data || result;

      const storagePath = uploaded?.storage_path || uploaded?.storagePath;

      const publicUrl =
        uploaded?.public_url || uploaded?.publicUrl || uploaded?.url || null;

      if (!storagePath) {
        throw new Error(
          `${item.title} was uploaded, but the server did not return a storage path.`,
        );
      }

      uploadedDocuments.push({
        file_type: item.fileType,
        title: item.title,
        storage_path: storagePath,
        public_url: publicUrl,
      });
    }

    return {
      avatarUrl,
      uploadedDocuments,
    };
  };
  // --------------------------------------------------
  // Submit
  // --------------------------------------------------

  const handleCompleteProfile = async () => {
    if (fullName.trim().length < 2) {
      Alert.alert(t("workerDetails.alerts.invalidNameTitle"), t("workerDetails.alerts.invalidNameMessage"));
      return;
    }

    if (!/^\d{10}$/.test(mobile.trim())) {
      Alert.alert(
        t("workerDetails.alerts.invalidMobileTitle"),
        t("workerDetails.alerts.invalidMobileMessage"),
      );
      return;
    }

    if (!primarySkill) {
      Alert.alert(t("workerDetails.alerts.selectSkillTitle"), t("workerDetails.alerts.selectSkillMessage"));
      return;
    }

    if (!primarySubskill) {
      Alert.alert(t("workerDetails.alerts.selectSubskillTitle"), t("workerDetails.alerts.selectSubskillMessage"));
      return;
    }

    const yearsOfExperience = Number(experience);

    if (
      !experience.trim() ||
      !Number.isFinite(yearsOfExperience) ||
      yearsOfExperience < 0 ||
      yearsOfExperience > 60
    ) {
      Alert.alert(
        t("workerDetails.alerts.invalidExperienceTitle"),
        t("workerDetails.alerts.invalidExperienceMessage"),
      );
      return;
    }

    if (
      !house.trim() ||
      !locality.trim() ||
      !city.trim() ||
      !state.trim() ||
      !/^\d{6}$/.test(pincode.trim())
    ) {
      Alert.alert(
        t("workerDetails.alerts.incompleteAddressTitle"),
        t("workerDetails.alerts.incompleteAddressMessage"),
      );
      return;
    }

    if (!identityDocument) {
      Alert.alert(
        t("workerDetails.alerts.identityRequiredTitle"),
        t("workerDetails.alerts.identityRequiredMessage"),
      );
      return;
    }

    if (!addressDocument) {
      Alert.alert(
        t("workerDetails.alerts.addressRequiredTitle"),
        t("workerDetails.alerts.addressRequiredMessage"),
      );
      return;
    }

    if (!workDocument) {
      Alert.alert(
        t("workerDetails.alerts.workRequiredTitle"),
        t("workerDetails.alerts.workRequiredMessage"),
      );
      return;
    }

    if (latitude === null || longitude === null) {
      Alert.alert(
        t("workerDetails.alerts.locationRequiredTitle"),
        t("workerDetails.alerts.locationRequiredMessage"),
      );
      return;
    }

    const radius = parseFloat(serviceRadius);

    if (!Number.isFinite(radius) || radius <= 0) {
      Alert.alert(
        t("workerDetails.alerts.invalidRadiusTitle"),
        t("workerDetails.alerts.invalidRadiusMessage"),
      );
      return;
    }

    if (workingDays.length === 0) {
      Alert.alert(
        t("workerDetails.alerts.availabilityTitle"),
        t("workerDetails.alerts.workingDayMessage"),
      );
      return;
    }

    if (workingHours.length === 0) {
      Alert.alert(
        t("workerDetails.alerts.availabilityTitle"),
        t("workerDetails.alerts.workingHourMessage"),
      );
      return;
    }

    try {
      setSaving(true);

      const serviceAddress = {
        house: house.trim(),
        locality: locality.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        landmark: landmark.trim(),
      };

      // ---------------------------------------------------------
      // 1. Create the worker account and obtain the backend JWT.
      // The registration screen intentionally clears any old token,
      // so the authenticated profile/upload requests below need the
      // newly issued token first.
      // ---------------------------------------------------------
      await signup({
        email: route.params?.email?.trim() || "",
        password: route.params?.password || "",
        phone: mobile.trim(),
        full_name: fullName.trim(),
        role: "worker",
      });

      // ---------------------------------------------------------
      // 2. Upload profile photo + worker documents
      // ---------------------------------------------------------
      const { avatarUrl, uploadedDocuments } = await uploadWorkerFiles();

      // ---------------------------------------------------------
      // 3. Save worker profile with uploaded file URLs
      // ---------------------------------------------------------
      await updateWorkerProfile({
        full_name: fullName.trim(),
        phone: mobile.trim(),

        // Use the Cloudinary URL returned by the upload API.
        // If no profile photo was selected, this remains undefined.
        avatar_url: avatarUrl,

        bio: workDescription.trim(),

        primary_skill: availableSkills.find((skill) => skill.id === primarySkill)?.name,
        primary_skill_id: primarySkill,
        primary_subskill_id: primarySubskill,
        additional_skills: additionalSkills,

        years_experience: yearsOfExperience,
        service_radius_km: radius,

        working_days: workingDays,
        working_hours: workingHours,

        service_address: serviceAddress,

        latitude,
        longitude,

        // Uploaded document metadata returned by backend.
        documents: uploadedDocuments,
      });

      // ---------------------------------------------------------
      // 4. Profile saved successfully
      // ---------------------------------------------------------
      Alert.alert(
        t("workerDetails.alerts.profileCompletedTitle"),
        t("workerDetails.alerts.profileCompletedMessage"),
        [
          {
            text: t("common.continue"),
            onPress: () => {
              navigation.replace("WorkerDashboard", {
                worker: {
                  name: fullName.trim(),
                  phone: mobile.trim(),
                  email: route.params?.email,
                },
              });
            },
          },
        ],
      );
    } catch (error) {
      console.log("Worker Profile Error:", error);

      Alert.alert(
        t("workerDetails.alerts.saveProfileTitle"),
        error instanceof Error
          ? error.message
          : t("workerDetails.alerts.saveProfileMessage"),
      );
    } finally {
      setSaving(false);
    }
  };

  // --------------------------------------------------
  // Document Card
  // --------------------------------------------------

  const renderDocumentCard = (
    type: DocumentType,
    title: string,
    subtitle: string,
    document: DocumentData | null,
    icon: keyof typeof Ionicons.glyphMap,
  ) => {
    return (
      <Pressable
        style={styles.documentCard}
        onPress={() => openDocumentPicker(type)}
      >
        <View style={styles.documentIcon}>
          <Ionicons name={icon} size={24} color="#2563EB" />
        </View>

        <View style={styles.documentInfo}>
          <View style={styles.documentTitleRow}>
            <Text style={styles.documentTitle}>{title}</Text>

            <Text style={styles.requiredText}>{t("common.required")}</Text>
          </View>

          {document ? (
            <View style={styles.uploadedRow}>
              <Ionicons name="checkmark-circle" size={16} color="#16A34A" />

              <Text style={styles.uploadedText} numberOfLines={1}>
                {document.name}
              </Text>
            </View>
          ) : (
            <Text style={styles.documentSubtitle}>{subtitle}</Text>
          )}
        </View>

        <Ionicons
          name={document ? "create-outline" : "chevron-forward"}
          size={20}
          color="#9CA3AF"
        />
      </Pressable>
    );
  };

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}

        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={22} color="#111827" />
          </Pressable>

          <View>
            <Text style={styles.headerTitle}>{t("workerDetails.title")}</Text>

            <Text style={styles.headerSubtitle}>
              {t("workerDetails.subtitle")}
            </Text>
          </View>
        </View>

        {/* ----------------------------------------- */}
        {/* Personal Information */}
        {/* ----------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("workerDetails.personalInfo")}</Text>

          <Text style={styles.sectionDescription}>
            {t("workerDetails.personalInfoDescription")}
          </Text>

          {/* Profile Photo */}

          <View style={styles.profilePhotoSection}>
            <Pressable style={styles.avatar} onPress={handleProfilePhoto}>
              {profilePhoto ? (
                <Image
                  source={{
                    uri: profilePhoto,
                  }}
                  style={styles.avatarImage}
                />
              ) : (
                <Ionicons name="person-outline" size={40} color="#9CA3AF" />
              )}

              <View style={styles.cameraBadge}>
                <Ionicons name="camera" size={15} color="#FFFFFF" />
              </View>
            </Pressable>

            <Text style={styles.photoTitle}>
              {profilePhoto ? t("workerDetails.changePhoto") : t("workerDetails.addProfilePhoto")}
            </Text>

            <Text style={styles.photoSubtitle}>
              {t("workerDetails.photoDescription")}
            </Text>
          </View>

          {/* Name */}

          <Text style={styles.inputLabel}>
            {t("workerDetails.fullName")} <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#9CA3AF" />

            <TextInput
              style={styles.input}
              placeholder={t("workerDetails.placeholders.fullName")}
              placeholderTextColor="#9CA3AF"
              value={fullName}
              onChangeText={setFullName}
            />
          </View>

          {/* Mobile */}

          <Text style={styles.inputLabel}>
            {t("workerDetails.mobileNumber")} <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="call-outline" size={20} color="#9CA3AF" />

            <TextInput
              style={styles.input}
              placeholder={t("workerDetails.placeholders.mobile")}
              placeholderTextColor="#9CA3AF"
              keyboardType="phone-pad"
              maxLength={10}
              value={mobile}
              onChangeText={setMobile}
            />
          </View>
        </View>

        {/* ----------------------------------------- */}
        {/* Professional Information */}
        {/* ----------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("workerDetails.professionalInfo")}</Text>

          <Text style={styles.sectionDescription}>
            {t("workerDetails.professionalInfoDescription")}
          </Text>

          <Text style={styles.inputLabel}>
            {t("workerDetails.primaryService")} <Text style={styles.required}>*</Text>
          </Text>

          <Text style={styles.helperText}>
            {t("workerDetails.primaryServiceHelper")}
          </Text>

          <View style={styles.primaryServiceContainer}>
            {loadingSkills ? (
              <View
                style={{
                  paddingVertical: 20,
                  alignItems: "center",
                }}
              >
                <ActivityIndicator size="small" color="#2563EB" />

                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6B7280",
                  }}
                >
                  {t("skillsTranslations.loadingServices")}
                </Text>
              </View>
            ) : availableSkills.length === 0 ? (
              <View
                style={{
                  paddingVertical: 20,
                  alignItems: "center",
                }}
              >
                <Ionicons
                  name="alert-circle-outline"
                  size={24}
                  color="#DC2626"
                />

                <Text
                  style={{
                    marginTop: 8,
                    fontSize: 12,
                    color: "#6B7280",
                    textAlign: "center",
                  }}
                >
                  {t("workerDetails.noServices")}
                </Text>
              </View>
            ) : (
              availableSkills.map((skill) => {
                const skillName = skill.name;
                const selected = primarySkill === skill.id;

                const iconName =
                  skillName.toLowerCase().includes("electric")
                    ? "flash-outline"
                    : skillName.toLowerCase().includes("plumb")
                      ? "water-outline"
                      : skillName.toLowerCase().includes("carp")
                        ? "hammer-outline"
                        : skillName.toLowerCase().includes("paint")
                          ? "color-palette-outline"
                          : skillName.toLowerCase().includes("clean")
                            ? "sparkles-outline"
                            : skillName.toLowerCase().includes("driver")
                              ? "car-outline"
                              : "construct-outline";

                return (
                  <Pressable
                    key={skill.id}
                    style={[
                      styles.primaryServiceCard,
                      selected && styles.primaryServiceCardSelected,
                    ]}
                    onPress={() => {
                      setPrimarySkill(skill.id);
                      setPrimarySubskill(
                        skill.subskills.length === 1
                          ? skill.subskills[0].id
                          : "",
                      );
                    }}
                  >
                    <View
                      style={[
                        styles.primaryServiceIcon,
                        selected && styles.primaryServiceIconSelected,
                      ]}
                    >
                      <Ionicons
                        name={iconName as keyof typeof Ionicons.glyphMap}
                        size={23}
                        color={selected ? "#2563EB" : "#6B7280"}
                      />
                    </View>

                    <Text
                      style={[
                        styles.primaryServiceText,
                        selected && styles.primaryServiceTextSelected,
                      ]}
                    >
                      {translateServiceName(skillName)}
                    </Text>

                    {selected && (
                      <View style={styles.primaryServiceCheck}>
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      </View>
                    )}
                  </Pressable>
                );
              })
            )}
          </View>

          {primarySkill && (
            <>
              <Text style={styles.inputLabel}>
                {t("workerDetails.subskill")} <Text style={styles.required}>*</Text>
              </Text>

              <Text style={styles.helperText}>
                {t("workerDetails.subskillHelper")}
              </Text>

              <View style={styles.chipContainer}>
                {(availableSkills.find((skill) => skill.id === primarySkill)?.subskills || []).map(
                  (subskill) => {
                    const selected = primarySubskill === subskill.id;

                    return (
                      <Pressable
                        key={subskill.id}
                        style={[
                          styles.skillChip,
                          selected && styles.skillChipSelected,
                        ]}
                        onPress={() => setPrimarySubskill(subskill.id)}
                      >
                        {selected && (
                          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                        )}

                        <Text
                          style={[
                            styles.skillChipText,
                            selected && styles.skillChipTextSelected,
                          ]}
                        >
                          {translateSubskillName(subskill.name)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </>
          )}

          {/* <Text style={styles.inputLabel}>Additional Skills</Text>

          <Text style={styles.helperText}>
            Select other skills you can provide
          </Text>

          <View style={styles.chipContainer}>
            {availableSkills
              .filter((skill) => skill.id !== primarySkill)
              .map((skill) => {
                const skillValue = skill.slug || skill.id;
                const selected = additionalSkills.includes(skillValue);

                return (
                  <Pressable
                    key={skill.id}
                    style={[
                      styles.skillChip,
                      selected && styles.skillChipSelected,
                    ]}
                    onPress={() => toggleExtraSkill(skillValue)}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    )}

                    <Text
                      style={[
                        styles.skillChipText,
                        selected && styles.skillChipTextSelected,
                      ]}
                    >
                      {skill.name}
                    </Text>
                  </Pressable>
                );
              })}
          </View> */}

          <Text style={styles.inputLabel}>
            {t("workerDetails.yearsExperience")} <Text style={styles.required}>*</Text>
          </Text>

          <View style={styles.inputContainer}>
            <Ionicons name="briefcase-outline" size={20} color="#9CA3AF" />

            <TextInput
              style={styles.input}
              placeholder={t("workerDetails.placeholders.experience")}
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              value={experience}
              onChangeText={setExperience}
            />

            <Text style={styles.inputSuffix}>{t("workerDetails.years")}</Text>
          </View>

          <Text style={styles.inputLabel}>{t("workerDetails.aboutWork")}</Text>

          <View style={[styles.inputContainer, styles.textAreaContainer]}>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder={t("workerDetails.placeholders.workDescription")}
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              value={workDescription}
              onChangeText={setWorkDescription}
            />
          </View>
        </View>

        {/* ----------------------------------------- */}
        {/* Work Location */}
        {/* ----------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("workerDetails.workLocation")}</Text>

          <Text style={styles.sectionDescription}>
            {t("workerDetails.workLocationDescription")}
          </Text>

          <Pressable
            style={[
              styles.locationButton,
              locationUpdated && styles.locationButtonSuccess,
            ]}
            onPress={handleUseCurrentLocation}
            disabled={isGettingLocation}
          >
            {isGettingLocation ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : (
              <Ionicons
                name={locationUpdated ? "checkmark-circle" : "location-outline"}
                size={21}
                color={locationUpdated ? "#16A34A" : "#2563EB"}
              />
            )}

            <View style={styles.locationTextContainer}>
              <Text
                style={[
                  styles.locationButtonTitle,
                  locationUpdated && styles.locationSuccessText,
                ]}
              >
                {isGettingLocation
                  ? t("workerDetails.gettingLocation")
                  : locationUpdated
                    ? t("workerDetails.locationUpdated")
                    : t("workerDetails.useCurrentLocation")}
              </Text>

              <Text style={styles.locationButtonSubtitle}>
                {isGettingLocation
                  ? t("workerDetails.locationWait")
                  : locationUpdated
                    ? t("workerDetails.verifyAddress")
                    : t("workerDetails.autoFillAddress")}
              </Text>
            </View>
          </Pressable>

          {/* Address Inputs */}

          <Text style={styles.inputLabel}>{t("workerDetails.houseLabel")}</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="home-outline" size={20} color="#9CA3AF" />

            <TextInput
              style={styles.input}
              placeholder={t("workerDetails.placeholders.house")}
              placeholderTextColor="#9CA3AF"
              value={house}
              onChangeText={setHouse}
            />
          </View>

          <Text style={styles.inputLabel}>{t("workerDetails.streetLabel")}</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="navigate-outline" size={20} color="#9CA3AF" />

            <TextInput
              style={styles.input}
              placeholder={t("workerDetails.placeholders.street")}
              placeholderTextColor="#9CA3AF"
              value={locality}
              onChangeText={setLocality}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>
                {t("workerDetails.city")} <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t("workerDetails.placeholders.city")}
                  placeholderTextColor="#9CA3AF"
                  value={city}
                  onChangeText={setCity}
                />
              </View>
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>
                {t("workerDetails.state")} <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t("workerDetails.placeholders.state")}
                  placeholderTextColor="#9CA3AF"
                  value={state}
                  onChangeText={setState}
                />
              </View>
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>
                {t("workerDetails.pinCode")} <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t("workerDetails.placeholders.pin")}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={setPincode}
                />
              </View>
            </View>

            <View style={styles.halfInput}>
              <Text style={styles.inputLabel}>{t("workerDetails.landmark")}</Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder={t("common.optional")}
                  placeholderTextColor="#9CA3AF"
                  value={landmark}
                  onChangeText={setLandmark}
                />
              </View>
            </View>
          </View>

          {/* Service Radius */}

          <Text style={styles.inputLabel}>{t("workerDetails.serviceRadius")}</Text>

          <Text style={styles.helperText}>
            {t("workerDetails.serviceRadiusHelper")}
          </Text>

          <View style={styles.radiusContainer}>
            {["2 km", "5 km", "10 km", "15 km"].map((radius) => {
              const selected = serviceRadius === radius;

              return (
                <Pressable
                  key={radius}
                  style={[
                    styles.radiusOption,
                    selected && styles.radiusOptionSelected,
                  ]}
                  onPress={() => setServiceRadius(radius)}
                >
                  <Text
                    style={[
                      styles.radiusText,
                      selected && styles.radiusTextSelected,
                    ]}
                  >
                    {radius}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ----------------------------------------- */}
        {/* Availability */}
        {/* ----------------------------------------- */}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("workerDetails.availability")}</Text>

          <Text style={styles.sectionDescription}>
            {t("workerDetails.availabilityDescription")}
          </Text>

          <Text style={styles.inputLabel}>{t("workerDetails.workingDays")}</Text>

          <View style={styles.dayContainer}>
            {days.map((day) => {
              const selected = workingDays.includes(day);

              return (
                <Pressable
                  key={day}
                  style={[
                    styles.dayOption,
                    selected && styles.dayOptionSelected,
                  ]}
                  onPress={() => toggleDay(day)}
                >
                  <Text
                    style={[styles.dayText, selected && styles.dayTextSelected]}
                  >
                    {t(`workerDetails.days.${day}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.inputLabel}>{t("workerDetails.preferredHours")}</Text>

          <View style={styles.hoursContainer}>
            {hours.map((hour) => {
              const selected = workingHours.includes(hour);

              return (
                <Pressable
                  key={hour}
                  style={[
                    styles.hourOption,
                    selected && styles.hourOptionSelected,
                  ]}
                  onPress={() => toggleHour(hour)}
                >
                  <Ionicons
                    name={
                      hour === "Morning"
                        ? "sunny-outline"
                        : hour === "Afternoon"
                          ? "partly-sunny-outline"
                          : "moon-outline"
                    }
                    size={20}
                    color={selected ? "#2563EB" : "#6B7280"}
                  />

                  <Text
                    style={[
                      styles.hourText,
                      selected && styles.hourTextSelected,
                    ]}
                  >
                    {t(`workerDetails.hours.${hour}`)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ----------------------------------------- */}
        {/* Verification Documents */}
        {/* ----------------------------------------- */}

        <View style={styles.section}>
          <View style={styles.verificationHeader}>
            <View style={styles.verificationIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={24}
                color="#2563EB"
              />
            </View>

            <View style={styles.verificationHeaderText}>
              <Text style={styles.sectionTitle}>{t("workerDetails.verificationDocuments")}</Text>

              <Text style={styles.sectionDescription}>
                {t("workerDetails.verificationDescription")}
              </Text>
            </View>
          </View>

          <View style={styles.securityNote}>
            <Ionicons name="lock-closed-outline" size={17} color="#2563EB" />

            <Text style={styles.securityText}>
              {t("workerDetails.securityNote")}
            </Text>
          </View>

          {renderDocumentCard(
            "identity",
            t("workerDetails.documents.identityTitle"),
            t("workerDetails.documents.identitySubtitle"),
            identityDocument,
            "card-outline",
          )}

          {renderDocumentCard(
            "address",
            t("workerDetails.documents.addressTitle"),
            t("workerDetails.documents.addressSubtitle"),
            addressDocument,
            "location-outline",
          )}

          {renderDocumentCard(
            "work",
            t("workerDetails.documents.workTitle"),
            t("workerDetails.documents.workSubtitle"),
            workDocument,
            "briefcase-outline",
          )}

          <Text style={styles.documentFooter}>
            {t("workerDetails.supportedFormats")}
          </Text>
        </View>

        {/* ----------------------------------------- */}
        {/* Declaration */}
        {/* ----------------------------------------- */}

        <View style={styles.declarationCard}>
          <Ionicons
            name="information-circle-outline"
            size={21}
            color="#2563EB"
          />

          <Text style={styles.declarationText}>
            {t("workerDetails.declaration")}
          </Text>
        </View>

        {/* Complete Profile */}

        <Pressable
          style={styles.completeButton}
          onPress={handleCompleteProfile}
          disabled={saving}
        >
          {saving ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" />

              <Text style={styles.completeButtonText}>{t("workerDetails.savingProfile")}</Text>
            </>
          ) : (
            <>
              <Text style={styles.completeButtonText}>{t("workerDetails.completeProfile")}</Text>

              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </>
          )}
        </Pressable>

        <Text style={styles.bottomText}>
          {t("workerDetails.reviewNote")}
        </Text>
      </ScrollView>

      {/* ========================================== */}
      {/* ADD CUSTOM SKILL MODAL */}
      {/* ========================================== */}

      <Modal
        visible={customSkillModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCustomSkill("");
          setCustomSkillModalVisible(false);
        }}
      >
        <KeyboardAvoidingView
          style={styles.customSkillModalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.customSkillModal}>
            <View style={styles.customSkillHeader}>
              <View style={styles.customSkillHeaderText}>
                <Text style={styles.customSkillTitle}>{t("workerDetails.customSkill.title")}</Text>

                <Text style={styles.customSkillSubtitle}>
                  {t("workerDetails.customSkill.subtitle")}
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() => {
                  setCustomSkill("");
                  setCustomSkillModalVisible(false);
                }}
              >
                <Ionicons name="close" size={21} color="#6B7280" />
              </Pressable>
            </View>

            <Text style={styles.customSkillLabel}>{t("workerDetails.customSkill.skillName")}</Text>

            <TextInput
              style={styles.customSkillInput}
              placeholder={t("workerDetails.customSkill.placeholder")}
              placeholderTextColor="#9CA3AF"
              value={customSkill}
              onChangeText={setCustomSkill}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddCustomSkill}
            />

            <View style={styles.customSkillActions}>
              <Pressable
                style={styles.cancelSkillButton}
                onPress={() => {
                  setCustomSkill("");
                  setCustomSkillModalVisible(false);
                }}
              >
                <Text style={styles.cancelSkillText}>{t("common.cancel")}</Text>
              </Pressable>

              <Pressable
                style={styles.addSkillButton}
                onPress={handleAddCustomSkill}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />

                <Text style={styles.addSkillButtonText}>{t("workerDetails.customSkill.addSkill")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ========================================== */}
      {/* PROFILE PHOTO MODAL */}
      {/* ========================================== */}

      <Modal
        visible={photoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {profilePhoto ? t("workerDetails.changeProfilePhoto") : t("workerDetails.addProfilePhoto")}
                </Text>

                <Text style={styles.modalSubtitle}>
                  {t("workerDetails.choosePhoto")}
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() => setPhotoModalVisible(false)}
              >
                <Ionicons name="close" size={21} color="#6B7280" />
              </Pressable>
            </View>

            <View style={styles.modalOptions}>
              <Pressable
                style={styles.modalOption}
                onPress={handleTakeProfilePhoto}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="camera-outline" size={28} color="#2563EB" />
                </View>

                <Text style={styles.modalOptionTitle}>{t("common.takePhoto")}</Text>

                <Text style={styles.modalOptionSubtitle}>{t("common.useCameraShort")}</Text>
              </Pressable>

              <Pressable
                style={styles.modalOption}
                onPress={handleChooseProfilePhoto}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="images-outline" size={28} color="#2563EB" />
                </View>

                <Text style={styles.modalOptionTitle}>{t("common.chooseFromDevice")}</Text>

                <Text style={styles.modalOptionSubtitle}>
                  {t("common.selectFromPhotos")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.cancelButton}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* ========================================== */}
      {/* DOCUMENT MODAL */}
      {/* ========================================== */}

      <Modal
        visible={documentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setDocumentModalVisible(false);
          setSelectedDocument(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.bottomSheet}>
            <View style={styles.modalHandle} />

            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderText}>
                <Text style={styles.modalTitle}>{t("workerDetails.uploadDocument")}</Text>

                <Text style={styles.modalSubtitle}>
                  {t("workerDetails.uploadDocumentSubtitle")}
                </Text>
              </View>

              <Pressable
                style={styles.modalClose}
                onPress={() => {
                  setDocumentModalVisible(false);
                  setSelectedDocument(null);
                }}
              >
                <Ionicons name="close" size={21} color="#6B7280" />
              </Pressable>
            </View>

            <View style={styles.modalOptions}>
              <Pressable
                style={styles.modalOption}
                onPress={handleDocumentCamera}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="camera-outline" size={28} color="#2563EB" />
                </View>

                <Text style={styles.modalOptionTitle}>{t("common.takePhoto")}</Text>

                <Text style={styles.modalOptionSubtitle}>
                  {t("workerDetails.captureDocument")}
                </Text>
              </Pressable>

              <Pressable
                style={styles.modalOption}
                onPress={handleDocumentGallery}
              >
                <View style={styles.modalOptionIcon}>
                  <Ionicons name="document-outline" size={28} color="#2563EB" />
                </View>

                <Text style={styles.modalOptionTitle}>{t("common.chooseFromDevice")}</Text>

                <Text style={styles.modalOptionSubtitle}>
                  {t("workerDetails.selectExistingImage")}
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setDocumentModalVisible(false);
                setSelectedDocument(null);
              }}
            >
              <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 40,
  },

  // Header

  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 13,
    color: "#6B7280",
  },

  // Progress

  progressContainer: {
    marginBottom: 25,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  progressText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  progressPercentage: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 3,
  },

  // Section

  section: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  sectionDescription: {
    fontSize: 12.5,
    color: "#6B7280",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },

  // Profile photo

  profilePhotoSection: {
    alignItems: "center",
    marginBottom: 22,
  },

  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },

  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 44,
  },

  cameraBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 29,
    height: 29,
    borderRadius: 15,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFFFFF",
  },

  photoTitle: {
    marginTop: 9,
    fontSize: 14,
    fontWeight: "600",
    color: "#2563EB",
  },

  photoSubtitle: {
    marginTop: 3,
    fontSize: 11.5,
    color: "#9CA3AF",
    textAlign: "center",
  },

  // Inputs

  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 7,
    marginTop: 13,
  },

  required: {
    color: "#EF4444",
  },

  requiredText: {
    fontSize: 9,
    color: "#DC2626",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    overflow: "hidden",
    textTransform: "uppercase",
    fontWeight: "700",
  },

  inputContainer: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
  },

  input: {
    flex: 1,
    fontSize: 14,
    color: "#111827",
    marginLeft: 9,
    paddingVertical: 11,
  },

  inputSuffix: {
    fontSize: 13,
    color: "#6B7280",
    marginLeft: 5,
  },

  textAreaContainer: {
    alignItems: "flex-start",
    minHeight: 105,
  },

  textArea: {
    width: "100%",
    marginLeft: 0,
    minHeight: 90,
  },

  helperText: {
    fontSize: 11.5,
    color: "#9CA3AF",
    marginTop: -3,
    marginBottom: 7,
  },

  // Skills

  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  skillChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
  },

  skillChipSelected: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },

  skillChipText: {
    fontSize: 12,
    color: "#4B5563",
  },

  skillChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  primaryServiceContainer: {
    gap: 10,
    marginTop: 4,
  },

  primaryServiceCard: {
    minHeight: 64,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },

  primaryServiceCardSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
    borderWidth: 1.5,
  },

  primaryServiceIcon: {
    width: 42,
    height: 42,
    borderRadius: 11,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },

  primaryServiceIconSelected: {
    backgroundColor: "#DBEAFE",
  },

  primaryServiceText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },

  primaryServiceTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },

  primaryServiceCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    justifyContent: "center",
    alignItems: "center",
  },

  addSkillChip: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#93C5FD",
    borderStyle: "dashed",
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#F8FBFF",
  },

  addSkillIcon: {
    width: 19,
    height: 19,
    borderRadius: 10,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },

  addSkillText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },

  // Rows

  row: {
    flexDirection: "row",
    gap: 10,
  },

  halfInput: {
    flex: 1,
  },

  // Location

  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
    padding: 13,
    marginBottom: 5,
  },

  locationButtonSuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },

  locationTextContainer: {
    flex: 1,
    marginLeft: 11,
  },

  locationButtonTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  locationSuccessText: {
    color: "#15803D",
  },

  locationButtonSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },

  // Radius

  radiusContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },

  radiusOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
  },

  radiusOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },

  radiusText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },

  radiusTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // Availability

  dayContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 5,
  },

  dayOption: {
    flex: 1,
    height: 40,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },

  dayOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },

  dayText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },

  dayTextSelected: {
    color: "#2563EB",
    fontWeight: "700",
  },

  hoursContainer: {
    gap: 8,
  },

  hourOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  hourOptionSelected: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },

  hourText: {
    fontSize: 13,
    color: "#4B5563",
    marginLeft: 10,
  },

  hourTextSelected: {
    color: "#2563EB",
    fontWeight: "600",
  },

  // Verification

  verificationHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  verificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  verificationHeaderText: {
    flex: 1,
  },

  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderRadius: 9,
    padding: 10,
    marginBottom: 13,
  },

  securityText: {
    flex: 1,
    fontSize: 11,
    color: "#64748B",
    marginLeft: 8,
    lineHeight: 16,
  },

  documentCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    marginBottom: 9,
  },

  documentIcon: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  documentInfo: {
    flex: 1,
  },

  documentTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  documentTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },

  documentSubtitle: {
    fontSize: 10.5,
    color: "#9CA3AF",
    marginTop: 3,
    lineHeight: 15,
  },

  uploadedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  uploadedText: {
    flex: 1,
    fontSize: 10.5,
    color: "#16A34A",
    marginLeft: 5,
  },

  documentFooter: {
    fontSize: 10.5,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 3,
  },

  // Declaration

  declarationCard: {
    flexDirection: "row",
    backgroundColor: "#EFF6FF",
    borderRadius: 12,
    padding: 13,
    marginBottom: 16,
  },

  declarationText: {
    flex: 1,
    fontSize: 11.5,
    color: "#4B5563",
    marginLeft: 9,
    lineHeight: 17,
  },

  // Complete button

  completeButton: {
    height: 54,
    borderRadius: 13,
    backgroundColor: "#000000",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 9,
  },

  completeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },

  bottomText: {
    fontSize: 10.5,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 11,
    lineHeight: 16,
  },

  // Custom Skill Modal

  customSkillModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  customSkillModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  customSkillHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  customSkillHeaderText: {
    flex: 1,
    paddingRight: 12,
  },

  customSkillTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  customSkillSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  customSkillLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },

  customSkillInput: {
    height: 50,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 14,
    color: "#111827",
    backgroundColor: "#FFFFFF",
  },

  customSkillActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },

  cancelSkillButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },

  cancelSkillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },

  addSkillButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },

  addSkillButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Modal

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },

  bottomSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },

  modalHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 20,
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalHeaderText: {
    flex: 1,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },

  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },

  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },

  modalOptions: {
    flexDirection: "row",
    gap: 10,
  },

  modalOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 10,
    alignItems: "center",
  },

  modalOptionIcon: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },

  modalOptionTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },

  modalOptionSubtitle: {
    fontSize: 10,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 3,
  },

  cancelButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 13,
  },

  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
  },
});
