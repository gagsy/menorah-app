/**
 * NotificationService.js
 * Place this file at: src/services/NotificationService.js
 *
 * Setup: npx expo install expo-notifications expo-device
 * If expo-notifications is not installed yet, the functions below
 * degrade gracefully so the app still runs.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const WP_BASE = 'https://menorahedu.in/wp-json/menorah/v1';

let Notifications = null;
let Device = null;

// Lazy-load so the app doesn't crash if expo-notifications isn't installed yet
try {
  Notifications = require('expo-notifications');
  Device        = require('expo-device');
} catch (_) {
  console.log('expo-notifications not installed. Run: npx expo install expo-notifications expo-device');
}

// How notifications appear while the app is open
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge:  true,
    }),
  });
}

// ── Register device for push notifications ────────────────────────────────────
export async function registerForPushNotifications() {
  if (!Notifications || !Device) return null;
  if (!Device.isDevice)          return null; // simulators can't get push tokens

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: 'a05db0b5-cca0-4bc0-b662-375b324213e0',
    });
    const token = tokenData.data;

    // Only register with WordPress if token changed
    const stored = await AsyncStorage.getItem('push_token');
    if (stored !== token) {
      await AsyncStorage.setItem('push_token', token);
      await registerTokenWithWordPress(token);
    }

    // Android notification channel
    if (Device.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name:             'Menorah Notifications',
        importance:       Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor:       '#6E3FA3',
      });
    }

    return token;
  } catch (err) {
    console.log('Push token error:', err.message);
    return null;
  }
}

// ── Register token with WordPress backend ─────────────────────────────────────
async function registerTokenWithWordPress(token) {
  try {
    const authToken = await AsyncStorage.getItem('auth_token');
    const profile   = await AsyncStorage.getItem('user_profile');
    const user      = profile ? JSON.parse(profile) : {};

    await fetch(WP_BASE + '/push/register', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}),
      },
      body: JSON.stringify({
        push_token:  token,
        device_type: (Device && Device.OS) ? Device.OS : 'android',
        user_name:   user.name  || 'Anonymous',
        user_email:  user.email || '',
      }),
    });
  } catch (_) {
    // Silent fail — will retry next launch
  }
}

// ── Fetch in-app notifications from WordPress ─────────────────────────────────
export async function fetchNotifications() {
  try {
    const authToken = await AsyncStorage.getItem('auth_token');
    const res = await fetch(WP_BASE + '/notifications', {
      headers: authToken ? { Authorization: 'Bearer ' + authToken } : {},
    });
    const data = await res.json();
    if (res.ok && Array.isArray(data.notifications)) return data.notifications;
    throw new Error('bad response');
  } catch (_) {
    // Static fallback until plugin is active
    return [
      { id: 1, type: 'event',        title: 'Weekly Bible Study',       message: 'Join us this Friday at 7 PM for "Restoring the Foundations" Week 3.', time: '2 hours ago', read: false, icon: '📖', color: '#7B3FA0' },
      { id: 2, type: 'prayer',       title: 'Prayer Request Update',    message: 'Mission Trip to Nepal — 312 people are now praying!',                 time: '5 hours ago', read: false, icon: '🙏', color: '#059669' },
      { id: 3, type: 'donation',     title: 'Thank You for Your Gift!', message: 'Your donation of ₹1,000 will help complete the sanctuary interior.',  time: '1 day ago',   read: true,  icon: '❤️', color: '#DC2626' },
      { id: 4, type: 'announcement', title: 'New Sermon Available',     message: '"Light to the Nations" — latest message is now live.',                 time: '2 days ago',  read: true,  icon: '🔔', color: '#D97706' },
    ];
  }
}

// ── Mark a single notification as read ───────────────────────────────────────
export async function markNotificationRead(id) {
  try {
    const authToken = await AsyncStorage.getItem('auth_token');
    await fetch(WP_BASE + '/notification/' + id + '/read', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}),
      },
    });
  } catch (_) {}
}

// ── Mark all notifications as read ───────────────────────────────────────────
export async function markAllNotificationsRead() {
  try {
    const authToken = await AsyncStorage.getItem('auth_token');
    await fetch(WP_BASE + '/notifications/read-all', {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: 'Bearer ' + authToken } : {}),
      },
    });
  } catch (_) {}
}

// ── Listen for push notifications ────────────────────────────────────────────
export function addNotificationListeners(onReceive, onTap) {
  if (!Notifications) {
    // Return a no-op cleanup if expo-notifications isn't installed
    return () => {};
  }
  const receiveListener = Notifications.addNotificationReceivedListener(onReceive);
  const tapListener     = Notifications.addNotificationResponseReceivedListener(onTap);
  return () => {
    receiveListener.remove();
    tapListener.remove();
  };
}