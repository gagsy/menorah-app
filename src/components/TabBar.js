import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Platform, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../constants/Colors';

const TABS = [
  { name: 'Home',    screen: 'Home',    icon: '🏠' },
  { name: 'Word',    screen: 'Word',    icon: '📖' },
  { name: 'Prayer',  screen: 'Prayer',  icon: '🙏' },
  { name: 'Give',    screen: 'Give',    icon: '❤️' },
  { name: 'Profile', screen: 'Profile', icon: '👤' },
];

const TabBar = ({ navigation, activeTab }) => {
  // Get safe area insets — accounts for Android gesture bar + iOS home indicator
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container,
      {
        // Add bottom padding for Android navigation bar
        paddingBottom: Math.max(insets.bottom, 8)
      }
    ]}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab.name;
        return (
          <TouchableOpacity
            key={tab.name}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.screen)}
            activeOpacity={0.7}>
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.name}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0E9F8',
    paddingTop: 10,
    paddingHorizontal: 8,
    shadowColor: '#6E3FA3',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingBottom: 4,
    position: 'relative',
  },
  icon:        { fontSize: 22, marginBottom: 3 },
  iconActive:  { transform: [{ scale: 1.1 }] },
  label:       { fontSize: 10, color: '#9CA3AF', fontWeight: '500' },
  labelActive: { color: Colors.primary, fontWeight: '700' },
  activeDot: {
    position: 'absolute',
    top: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
});

export default TabBar;