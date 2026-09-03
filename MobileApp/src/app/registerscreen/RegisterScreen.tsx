import React, { useState } from 'react';
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../constants/colors';

type Role = 'customer' | 'worker';

export default function RegisterScreen() {
  const [role, setRole] = useState<Role>('customer');

  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [rePassword, setRePassword] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);

  const [focusedInput, setFocusedInput] = useState<string | null>(null);

  const handleRegister = () => {
    if (!email || !mobile || !password || !rePassword) {
      return;
    }

    if (password !== rePassword) {
      return;
    }

    console.log('Registering as:', role);
    console.log({
      email,
      mobile,
      password,
    });
  };

  const inputStyle = (inputName: string) => [
    styles.inputContainer,
    focusedInput === inputName && styles.inputContainerFocused,
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable style={styles.backButton}>
              <Ionicons
                name="arrow-back"
                size={23}
                color={colors.text}
              />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Join the ShramSaathi community
              </Text>
            </View>
          </View>

          {/* Role Selection */}
          <View style={styles.roleSection}>
            <Text style={styles.sectionLabel}>Register as</Text>

            <View style={styles.roleSwitcher}>
              {/* Sliding background */}
              <Animated.View
                style={[
                  styles.roleSlider,
                  role === 'worker'
                    ? styles.roleSliderWorker
                    : styles.roleSliderCustomer,
                ]}
              />

              <Pressable
                style={styles.roleOption}
                onPress={() => setRole('customer')}
              >
                <Ionicons
                  name="person-outline"
                  size={19}
                  color={
                    role === 'customer'
                      ? colors.white
                      : colors.secondaryText
                  }
                />

                <Text
                  style={[
                    styles.roleText,
                    role === 'customer' && styles.roleTextActive,
                  ]}
                >
                  Customer
                </Text>
              </Pressable>

              <Pressable
                style={styles.roleOption}
                onPress={() => setRole('worker')}
              >
                <Ionicons
                  name="construct-outline"
                  size={19}
                  color={
                    role === 'worker'
                      ? colors.white
                      : colors.secondaryText
                  }
                />

                <Text
                  style={[
                    styles.roleText,
                    role === 'worker' && styles.roleTextActive,
                  ]}
                >
                  Worker
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Role Description */}
          <View style={styles.roleDescription}>
            <View style={styles.descriptionIcon}>
              <Ionicons
                name={
                  role === 'customer'
                    ? 'home-outline'
                    : 'briefcase-outline'
                }
                size={20}
                color={colors.primary}
              />
            </View>

            <View style={styles.descriptionContent}>
              <Text style={styles.descriptionTitle}>
                {role === 'customer'
                  ? 'Create a Customer Account'
                  : 'Join as a Cooperative Worker'}
              </Text>

              <Text style={styles.descriptionText}>
                {role === 'customer'
                  ? 'Book trusted services from verified cooperative workers.'
                  : 'Offer your skills and connect with households in your community.'}
              </Text>
            </View>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Email */}
            <Text style={styles.inputLabel}>Email address</Text>

            <View style={inputStyle('email')}>
              <Ionicons
                name="mail-outline"
                size={21}
                color={
                  focusedInput === 'email'
                    ? colors.primary
                    : colors.secondaryText
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor={colors.placeholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() => setFocusedInput('email')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Mobile */}
            <Text style={styles.inputLabel}>Mobile number</Text>

            <View style={inputStyle('mobile')}>
              <Ionicons
                name="call-outline"
                size={21}
                color={
                  focusedInput === 'mobile'
                    ? colors.primary
                    : colors.secondaryText
                }
              />

              <Text style={styles.countryCode}>+91</Text>

              <TextInput
                style={styles.input}
                placeholder="Enter your mobile number"
                placeholderTextColor={colors.placeholder}
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                maxLength={10}
                onFocus={() => setFocusedInput('mobile')}
                onBlur={() => setFocusedInput(null)}
              />
            </View>

            {/* Password */}
            <Text style={styles.inputLabel}>Password</Text>

            <View style={inputStyle('password')}>
              <Ionicons
                name="lock-closed-outline"
                size={21}
                color={
                  focusedInput === 'password'
                    ? colors.primary
                    : colors.secondaryText
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Create a password"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedInput('password')}
                onBlur={() => setFocusedInput(null)}
              />

              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={10}
              >
                <Ionicons
                  name={
                    showPassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={21}
                  color={colors.secondaryText}
                />
              </Pressable>
            </View>

            {/* Re-enter Password */}
            <Text style={styles.inputLabel}>Confirm password</Text>

            <View style={inputStyle('rePassword')}>
              <Ionicons
                name="shield-checkmark-outline"
                size={21}
                color={
                  focusedInput === 'rePassword'
                    ? colors.primary
                    : colors.secondaryText
                }
              />

              <TextInput
                style={styles.input}
                placeholder="Re-enter your password"
                placeholderTextColor={colors.placeholder}
                value={rePassword}
                onChangeText={setRePassword}
                secureTextEntry={!showRePassword}
                autoCapitalize="none"
                onFocus={() => setFocusedInput('rePassword')}
                onBlur={() => setFocusedInput(null)}
              />

              <Pressable
                onPress={() => setShowRePassword(!showRePassword)}
                hitSlop={10}
              >
                <Ionicons
                  name={
                    showRePassword
                      ? 'eye-outline'
                      : 'eye-off-outline'
                  }
                  size={21}
                  color={colors.secondaryText}
                />
              </Pressable>
            </View>

            {/* Password mismatch */}
            {rePassword.length > 0 &&
              password !== rePassword && (
                <View style={styles.errorRow}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={16}
                    color="#D9534F"
                  />

                  <Text style={styles.errorText}>
                    Passwords do not match
                  </Text>
                </View>
              )}

            {/* Register Button */}
            <Pressable
              style={({ pressed }) => [
                styles.registerButton,
                pressed && styles.buttonPressed,
                (!email ||
                  !mobile ||
                  !password ||
                  !rePassword ||
                  password !== rePassword) &&
                  styles.buttonDisabled,
              ]}
              onPress={handleRegister}
              disabled={
                !email ||
                !mobile ||
                !password ||
                !rePassword ||
                password !== rePassword
              }
            >
              <Text style={styles.registerButtonText}>
                Create {role === 'customer' ? 'Customer' : 'Worker'} Account
              </Text>

              <Ionicons
                name="arrow-forward"
                size={21}
                color={colors.white}
              />
            </Pressable>
          </View>

          {/* Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>
              Already have an account?
            </Text>

            <Pressable>
              <Text style={styles.loginLink}>Login</Text>
            </Pressable>
          </View>

          {/* Bottom Message */}
          <View style={styles.bottomMessage}>
            <Ionicons
              name="people-outline"
              size={18}
              color={colors.primary}
            />

            <Text style={styles.bottomMessageText}>
              Building stronger communities through cooperative services
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 18,
    paddingBottom: 30,
  },

  /* Header */

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.inputBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 30,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
  },

  subtitle: {
    fontSize: 14,
    color: colors.secondaryText,
    marginTop: 4,
  },

  /* Role */

  roleSection: {
    marginBottom: 18,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 10,
  },

  roleSwitcher: {
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
    position: 'relative',
    overflow: 'hidden',
    padding: 4,
  },

  roleSlider: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '50%',
    borderRadius: 12,
    backgroundColor: colors.primary,
  },

  roleSliderCustomer: {
    left: 4,
  },

  roleSliderWorker: {
    right: 4,
  },

  roleOption: {
    flex: 1,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 2,
  },

  roleText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondaryText,
  },

  roleTextActive: {
    color: colors.white,
  },

  /* Role Description */

  roleDescription: {
    flexDirection: 'row',
    backgroundColor: colors.inputBackground,
    borderRadius: 16,
    padding: 15,
    marginBottom: 24,
  },

  descriptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  descriptionContent: {
    flex: 1,
  },

  descriptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },

  descriptionText: {
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.secondaryText,
  },

  /* Form */

  form: {
    width: '100%',
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    marginTop: 4,
  },

  inputContainer: {
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.inputBackground,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  inputContainerFocused: {
    borderColor: colors.primary,
  },

  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    marginLeft: 11,
  },

  countryCode: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 10,
    marginRight: 2,
  },

  /* Error */

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: -8,
    marginBottom: 12,
  },

  errorText: {
    color: '#D9534F',
    fontSize: 12,
    marginLeft: 5,
  },

  /* Button */

  registerButton: {
    height: 56,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 8,
    gap: 10,
  },

  registerButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },

  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },

  buttonDisabled: {
    backgroundColor: colors.disabled,
  },

  /* Login */

  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },

  loginText: {
    fontSize: 13.5,
    color: colors.secondaryText,
  },

  loginLink: {
    fontSize: 13.5,
    fontWeight: '800',
    color: colors.primary,
    marginLeft: 5,
  },

  /* Bottom */

  bottomMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
    paddingHorizontal: 10,
  },

  bottomMessageText: {
    fontSize: 11.5,
    color: colors.secondaryText,
    marginLeft: 7,
    textAlign: 'center',
    flex: 1,
  },
});
