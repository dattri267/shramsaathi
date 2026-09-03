import React, { useEffect, useRef, useState } from 'react';

import {
  Animated,
  Dimensions,
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

import AppLogo from '../../components/AppLogo';
import colors from '../../constants/colors';

const { width, height } = Dimensions.get('window');

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  /*
   * Animation values
   */
  const logoScale = useRef(new Animated.Value(1)).current;

  const logoX = useRef(new Animated.Value(0)).current;

  const logoY = useRef(new Animated.Value(0)).current;

  const contentOpacity = useRef(new Animated.Value(0)).current;

  const contentTranslateY = useRef(
    new Animated.Value(25)
  ).current;

  useEffect(() => {
    /*
     * Logo starts in the center.
     *
     * Then:
     * 1. Shrinks
     * 2. Moves to top-left
     * 3. Login content fades in
     */

    const centerX = width / 2 - 32;

    const targetX = -centerX + 40;

    const centerY = height / 2 - 32;

    const targetY = -centerY + 45;

    Animated.sequence([
      Animated.delay(1500),

      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 0.8,
          duration: 680,
          useNativeDriver: true,
        }),

        Animated.timing(logoX, {
          toValue: targetX,
          duration: 680,
          useNativeDriver: true,
        }),

        Animated.timing(logoY, {
          toValue: targetY,
          duration: 680,
          useNativeDriver: true,
        }),
      ]),

      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 450,
          useNativeDriver: true,
        }),

        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 450,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const handleLogin = () => {
    if (!email || !password) {
      return;
    }

    console.log('Login:', {
      email,
      password,
    });

    // Later:
    // API call → FastAPI backend
  };

  const handleRegister = () => {
    console.log('Navigate to registration');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Animated Logo */}

          <Animated.View
            style={[
              styles.logoContainer,
              {
                transform: [
                  { translateX: logoX },
                  { translateY: logoY },
                  { scale: logoScale },
                ],
              },
            ]}
          >
            <AppLogo size={100} />
          </Animated.View>

          {/* Login Content */}

          <Animated.View
            style={[
              styles.content,
              {
                opacity: contentOpacity,
                transform: [
                  {
                    translateY: contentTranslateY,
                  },
                ],
              },
            ]}
          >
            {/* Heading */}

            <View style={styles.headingContainer}>
              <Text style={styles.title}>
                Login
              </Text>

              <Text style={styles.subtitle}>
                Log in to continue to ShramSaathi
              </Text>
            </View>

            {/* Email */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Email
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail-outline"
                  size={20}
                  color={colors.secondaryText}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={colors.placeholder}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="emailAddress"
                />
              </View>
            </View>

            {/* Password */}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Password
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed-outline"
                  size={20}
                  color={colors.secondaryText}
                  style={styles.inputIcon}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.placeholder}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                />

                <Pressable
                  onPress={() =>
                    setShowPassword(!showPassword)
                  }
                  style={styles.eyeButton}
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
            </View>

            {/* Forgot Password */}

            <Pressable
              style={styles.forgotContainer}
              onPress={() =>
                console.log('Forgot password')
              }
            >
              <Text style={styles.forgotText}>
                Forgot password?
              </Text>
            </Pressable>

            {/* Login Button */}

            <Pressable
              style={[
                styles.loginButton,
                (!email || !password) &&
                  styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!email || !password}
            >
              <Text style={styles.loginButtonText}>
                Log in
              </Text>
            </Pressable>

            {/* Register */}

            <View style={styles.registerContainer}>
              <Text style={styles.registerText}>
                New to ShramSaathi?
              </Text>

              <Pressable onPress={handleRegister}>
                <Text style={styles.registerLink}>
                  Create account
                </Text>
              </Pressable>
            </View>

            {/* Bottom Message */}

            <View style={styles.bottomContainer}>
              {/* <Text style={styles.bottomText}>
                Connecting households with
              </Text>

              <Text style={styles.bottomText}>
                trusted cooperative workers
              </Text> */}
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  keyboardView: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingBottom: 30,
  },

  /*
   * Logo
   */

  logoContainer: {
    position: 'absolute',

    top: '50%',
    left: '50%',

    marginLeft: -32,
    marginTop: -32,

    zIndex: 10,
  },

  /*
   * Main content
   */

  content: {
    flex: 1,
    paddingTop: 160,
  },

  headingContainer: {
    marginBottom: 42,
  },

  title: {
    fontSize: 34,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: -1,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 16,
    color: colors.secondaryText,
    lineHeight: 23,
  },

  /*
   * Inputs
   */

  inputGroup: {
    marginBottom: 20,
  },

  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 9,
  },

  inputContainer: {
    height: 56,

    flexDirection: 'row',
    alignItems: 'center',

    backgroundColor: colors.inputBackground,

    borderWidth: 1,
    borderColor: colors.inputBorder,

    borderRadius: 14,

    paddingHorizontal: 16,
  },

  inputIcon: {
    marginRight: 11,
  },

  input: {
    flex: 1,

    height: '100%',

    fontSize: 16,
    color: colors.text,

    paddingVertical: 0,
  },

  eyeButton: {
    paddingLeft: 10,
    paddingVertical: 8,
  },

  /*
   * Forgot password
   */

  forgotContainer: {
    alignSelf: 'flex-end',
    marginTop: -5,
    marginBottom: 26,
  },

  forgotText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },

  /*
   * Login
   */

  loginButton: {
    height: 56,

    backgroundColor: colors.primary,

    borderRadius: 14,

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 24,
  },

  loginButtonDisabled: {
    backgroundColor: colors.disabled,
  },

  loginButtonText: {
    color: colors.white,

    fontSize: 17,
    fontWeight: '700',
  },

  /*
   * Register
   */

  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',

    gap: 5,
  },

  registerText: {
    fontSize: 14,
    color: colors.secondaryText,
  },

  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  /*
   * Bottom
   */

  bottomContainer: {
    marginTop: 'auto',
    paddingTop: 60,

    alignItems: 'center',
  },

  bottomText: {
    fontSize: 12,
    color: '#999999',
    lineHeight: 18,
  },
});