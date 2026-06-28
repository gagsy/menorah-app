import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  Image,
  Animated, 
  StyleSheet, 
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthService from '../services/AuthService';

const LoginScreen = ({ navigation }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  const [isLoading,   setIsLoading]   = useState(false);
  const [loadingText, setLoadingText] = useState('');

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '778141841150-18povujgoiq6m5i78t7v3nllf92aitbc.apps.googleusercontent.com',
      offlineAccess: true,
    });

    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: false }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 6, tension: 40, useNativeDriver: false }),
    ]).start();
  }, []);

  // ── Helper: save user profile to AsyncStorage ──────────────────────────
  const saveUserProfile = async (userData) => {
    try {
      await AsyncStorage.setItem('user_profile', JSON.stringify(userData));
    } catch (e) {
      console.log('Error saving user profile:', e);
    }
  };

  // ── Google Login ───────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      setLoadingText('Connecting to Google...');

      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      // Support both old and new SDK response shapes
      const userData = response?.data?.user || response?.user || {};
      const idToken  = response?.data?.idToken || response?.idToken;

      // ── Save user profile so ProfileScreen can read it ──────────────
      await saveUserProfile({
        name:     userData.name     || userData.givenName || 'Google User',
        email:    userData.email    || '',
        photo:    userData.photo    || userData.photoURL  || null,
        provider: 'google',
      });

      // If no idToken yet, try getTokens() as fallback
      let finalToken = idToken;
      if (!finalToken) {
        setLoadingText('Getting auth token...');
        const tokens = await GoogleSignin.getTokens();
        finalToken = tokens?.idToken;
      }

      if (!finalToken) {
        Alert.alert('Login Failed', 'Could not get authentication token. Check webClientId.');
        return;
      }

      setLoadingText('Verifying with server...');
      const result = await AuthService.loginWithGoogle(finalToken);

      if (result.success) {
        setLoadingText('Welcome!');
        navigation.replace('Home');
      } else {
        Alert.alert('Login Failed', result.error || 'Something went wrong');
      }

    } catch (error) {
      console.log('Google Login Error:', error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // User cancelled — no alert needed
      } else if (error.code === statusCodes.IN_PROGRESS) {
        Alert.alert('Please wait', 'Sign in is already in progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        Alert.alert('Error', 'Google Play Services not available on this device');
      } else {
        Alert.alert('Login Error', error.message || 'Failed to sign in with Google');
      }
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  // ── Guest Login ────────────────────────────────────────────────────────
  const handleGuestLogin = async () => {
    try {
      setIsLoading(true);
      setLoadingText('Creating guest session...');

      const deviceId = Device.deviceId || Device.modelId || `guest_${Date.now()}`;

      // Save guest profile so ProfileScreen shows something meaningful
      await saveUserProfile({
        name:     'Guest User',
        email:    '',
        photo:    null,
        provider: 'guest',
        deviceId,
      });

      const result = await AuthService.loginAsGuest(deviceId);

      if (result.success) {
        navigation.replace('Home');
      } else {
        Alert.alert('Error', result.error || 'Failed to continue as guest');
      }
    } catch (error) {
      console.log('Guest Login Error:', error);
      // Even if AuthService fails, allow guest access
      navigation.replace('Home');
    } finally {
      setIsLoading(false);
      setLoadingText('');
    }
  };

  const handleAppleLogin = () =>
    Alert.alert('Coming Soon', 'Apple Sign-In will be available soon!');

  const handlePhoneLogin = () =>
    Alert.alert('Coming Soon', 'Phone registration will be available soon!');

  const SocialButton = ({ icon, title, bgColor, textColor, border, onPress }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[
        styles.socialButton,
        { backgroundColor: bgColor, borderWidth: border ? 1 : 0 },
        isLoading && { opacity: 0.7 },
      ]}
      onPress={onPress}
      disabled={isLoading}
    >
      {isLoading && loadingText ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <>
          <Text style={styles.socialIcon}>{icon}</Text>
          <Text style={[styles.socialText, { color: textColor }]}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#F8F4FC', '#FFFFFF', '#F0E6FA']} style={styles.gradient}>
        <Animated.View
          style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
            <Image
              source={require('../../assets/images/login-logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </Animated.View>

          <Text style={styles.welcome}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          {/* Show loading text below subtitle while loading */}
          {isLoading && loadingText ? (
            <Text style={styles.loadingText}>{loadingText}</Text>
          ) : null}

          <View style={styles.socialContainer}>
            <SocialButton
              icon="G"
              title="Continue with Google"
              bgColor="#FFFFFF"
              textColor="#333"
              border
              onPress={handleGoogleLogin}
            />
            <SocialButton
              icon="🍎"
              title="Continue with Apple"
              bgColor="#000000"
              textColor="#FFF"
              onPress={handleAppleLogin}
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>or</Text>
              <View style={styles.line} />
            </View>

            <SocialButton
              icon="📞"
              title="Continue with Phone"
              bgColor="#FFFFFF"
              textColor="#333"
              border
              onPress={handlePhoneLogin}
            />
          </View>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleGuestLogin}
            disabled={isLoading}
          >
            <Text style={styles.guestText}>
              {isLoading ? 'Please wait...' : 'Continue as Guest →'}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container:       { flex: 1 },
  gradient:        { flex: 1 },
  content:         { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  logoContainer:   { alignItems: 'center', marginBottom: 40 },
  logoImage:       { width: 180, height: 180 },
  welcome:         { fontSize: 28, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  subtitle:        { fontSize: 14, color: Colors.textGray, marginBottom: 8 },
  loadingText:     { fontSize: 13, color: Colors.primary, marginBottom: 16, fontWeight: '600' },
  socialContainer: { width: '100%', gap: 12 },
  socialButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16,
    borderColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  socialIcon:  { fontSize: 20, marginRight: 12, fontWeight: '700' },
  socialText:  { fontSize: 15, fontWeight: '600' },
  divider:     { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line:        { flex: 1, height: 1, backgroundColor: '#E5E7EB' },
  or:          { marginHorizontal: 16, color: Colors.textGray, fontSize: 14 },
  guestButton: { marginTop: 24 },
  guestText:   { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});

export default LoginScreen;