import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '../constants/Colors';

const TabBar = ({ navigation, activeTab = 'Home' }) => {
  const tabs = [
    { icon: '🏠', label: 'Home', screen: 'Home' },
    { icon: '📖', label: 'Word', screen: 'DailyWord' },
    { icon: '🙏', label: 'Prayer', screen: 'Prayer' },
    { icon: '❤️', label: 'Give', screen: 'Donation' },
    { icon: '👤', label: 'Profile', screen: 'Profile' },
  ];

  return (
    <View style={styles.container}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab.label;
        return (
          <TouchableOpacity
            key={index}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.screen)}
          >
            <Text style={[styles.icon, isActive && styles.iconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: Colors.bgWhite,
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0E6FA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 10,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
    marginBottom: 4,
    opacity: 0.5,
  },
  iconActive: {
    opacity: 1,
  },
  label: {
    fontSize: 11,
    color: Colors.textGray,
  },
  labelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default TabBar;
