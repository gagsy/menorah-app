import React, { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Screens
import SplashScreen       from './src/screens/SplashScreen';
import OnboardingScreen   from './src/screens/OnboardingScreen';
import LoginScreen        from './src/screens/LoginScreen';
import HomeScreen         from './src/screens/HomeScreen';
import DailyWordScreen    from './src/screens/DailyWordScreen';
import PrayerScreen       from './src/screens/PrayerScreen';
import DonationScreen     from './src/screens/DonationScreen';
import ProfileScreen      from './src/screens/ProfileScreen';
import NotificationScreen from './src/screens/NotificationScreen';

// Push notification service
// Remove these 3 lines from App.js:
import {
  registerForPushNotifications,
  addNotificationListeners,
} from './src/services/NotificationService';

// And remove the setupPushNotifications() call inside useEffect
const Stack = createNativeStackNavigator();

// Global navigation ref — lets NotificationService navigate without props
export const navigationRef = React.createRef();

export default function App() {
  const notifCleanupRef = useRef(null);

  useEffect(() => {
    setupPushNotifications();
    return () => {
      // Clean up notification listeners on unmount
      if (notifCleanupRef.current) notifCleanupRef.current();
    };
  }, []);

  const setupPushNotifications = async () => {
    try {
      // Register device and get Expo push token
      await registerForPushNotifications();

      // Listen for notifications while the app is open
      const cleanup = addNotificationListeners(
        // Notification received while app is open (foreground)
        (notification) => {
          console.log('Push received:', notification.request.content.title);
          // Optionally update a badge counter here
        },
        // User tapped a push notification
        (response) => {
          const screen = response.notification.request.content.data?.screen;
          if (screen && navigationRef.current) {
            navigationRef.current.navigate(screen);
          }
        }
      );

      notifCleanupRef.current = cleanup;
    } catch (err) {
      console.log('Push setup error (non-fatal):', err.message);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Splash"         component={SplashScreen}       />
          <Stack.Screen name="Onboarding"     component={OnboardingScreen}   />
          <Stack.Screen name="Login"          component={LoginScreen}        />
          <Stack.Screen name="Home"           component={HomeScreen}         />
          <Stack.Screen name="Word"           component={DailyWordScreen}    />
          <Stack.Screen name="Prayer"         component={PrayerScreen}       />
          <Stack.Screen name="Give"           component={DonationScreen}     />
          <Stack.Screen name="Profile"        component={ProfileScreen}      />
          <Stack.Screen name="Notifications"  component={NotificationScreen} />

          {/* Legacy aliases — keeps old navigation.navigate('DailyWord') calls working */}
          <Stack.Screen name="DailyWord"  component={DailyWordScreen}  />
          <Stack.Screen name="Donation"   component={DonationScreen}   />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}