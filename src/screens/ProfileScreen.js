import React, { useRef, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Animated, StyleSheet,
  TouchableOpacity, Image, Dimensions, Alert, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { PROFILE_MENU } from '../constants/Data';
import TabBar from '../components/TabBar';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  const [userName,   setUserName]   = useState('Loading...');
  const [userEmail,  setUserEmail]  = useState('');
  const [userAvatar, setUserAvatar] = useState(null);
  const [initials,   setInitials]   = useState('?');
  const [isGuest,    setIsGuest]    = useState(false);

  useEffect(() => {
    loadUserData();
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 600, useNativeDriver: false }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
    ]).start();
  }, []);

  // ── Read profile saved by LoginScreen ─────────────────────────────────
  const loadUserData = async () => {
    try {
      const stored = await AsyncStorage.getItem('user_profile');
      if (stored) {
        const user = JSON.parse(stored);
        const name  = user.name  || user.displayName || 'Guest User';
        const email = user.email || '';
        const photo = user.photo || user.photoURL    || null;
        const guest = user.provider === 'guest';

        setUserName(name);
        setUserEmail(email);
        setUserAvatar(photo);
        setIsGuest(guest);

        const parts = name.trim().split(' ');
        const ini = parts.length >= 2
          ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
          : name.slice(0, 2).toUpperCase();
        setInitials(ini);
      } else {
        setUserName('Guest User');
        setInitials('G');
        setIsGuest(true);
      }
    } catch (e) {
      console.log('Error loading user data:', e);
      setUserName('Guest User');
      setInitials('G');
    }
  };

  // ── Logout — fixed: no isSignedIn() call ──────────────────────────────
  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              // signOut() works regardless of current state in newer SDK
              await GoogleSignin.signOut();
            } catch (e) {
              // Ignore — user may have been a guest or Google session already expired
            }
            try {
              await AsyncStorage.multiRemove(['user_profile', 'auth_token']);
            } catch (e) {
              console.log('Error clearing storage:', e);
            }
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const StatItem = ({ value, label }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* ── Header ── */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={['#4B1876', '#6E3FA3', '#9468C9']}
            style={styles.headerGradient}
          >
            {/* Status bar safe space */}
            <View style={{ height: Platform.OS === 'android' ? StatusBar.currentHeight + 8 : 44 }} />

            {/* Top bar */}
            <View style={styles.topBar}>
              <Text style={styles.topTitle}>Profile</Text>
              {!isGuest && (
                <TouchableOpacity onPress={() => Alert.alert('Share', 'Coming soon!')}>
                  <Text style={styles.shareIcon}>↗️</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Avatar */}
            <Animated.View style={[styles.avatarContainer, { opacity: fadeAnim }]}>
              {userAvatar ? (
                <Image source={{ uri: userAvatar }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials}</Text>
                </View>
              )}
              {!isGuest && (
                <TouchableOpacity style={styles.editButton}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
            </Animated.View>

            {/* Name */}
            <Text style={styles.name}>{userName}</Text>

            {/* Email — only shown for Google users */}
            {userEmail ? (
              <Text style={styles.email}>{userEmail}</Text>
            ) : isGuest ? (
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.signInPrompt}>Sign in to sync your data →</Text>
              </TouchableOpacity>
            ) : null}

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatItem value="12"      label="Day Streak" />
              <StatItem value="28"      label="Devotions"  />
              <StatItem value="₹12,500" label="Given"      />
              <StatItem value="8"       label="Events"     />
            </View>
          </LinearGradient>
        </View>

        {/* ── Menu ── */}
        <Animated.View
          style={[
            styles.menuContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {PROFILE_MENU
            .filter(item => item.screen !== 'Login')
            .map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => navigation.navigate(item.screen)}
              >
                <View style={styles.menuLeft}>
                  <Text style={styles.menuItemIcon}>{item.icon}</Text>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                </View>
                <Text style={styles.menuArrow}>›</Text>
              </TouchableOpacity>
            ))}

          {/* Sign Out */}
          <TouchableOpacity
            style={[styles.menuItem, styles.logoutItem]}
            onPress={handleLogout}
          >
            <View style={styles.menuLeft}>
              <Text style={styles.menuItemIcon}>🚪</Text>
              <Text style={[styles.menuTitle, styles.logoutText]}>
                {isGuest ? 'Sign In / Create Account' : 'Sign Out'}
              </Text>
            </View>
            <Text style={[styles.menuArrow, { color: '#E2532A' }]}>›</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 20 }} />
      </ScrollView>

      <TabBar navigation={navigation} activeTab="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5FC',
  },
  headerContainer: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  shareIcon: {
    fontSize: 20,
    color: '#FFF',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '800',
    color: '#6E3FA3',
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: width / 2 - 54,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D8A153',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editIcon: { fontSize: 12 },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  email: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  signInPrompt: {
    fontSize: 13,
    color: '#F2C572',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  statItem:  { alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    margin: 20,
    marginTop: -20,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6FA',
  },
  logoutItem:   { borderBottomWidth: 0, marginTop: 4 },
  menuLeft:     { flexDirection: 'row', alignItems: 'center' },
  menuItemIcon: { fontSize: 20, marginRight: 16, width: 26 },
  menuTitle:    { fontSize: 15, fontWeight: '600', color: '#241E1A' },
  logoutText:   { color: '#E2532A' },
  menuArrow:    { fontSize: 20, color: '#A39A8C' },
});

export default ProfileScreen;