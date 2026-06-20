import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Animated, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { DONATION_AMOUNTS } from '../constants/Data';
import GradientButton from '../components/GradientButton';

const { width } = Dimensions.get('window');

const DonationScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [selectedAmount, setSelectedAmount] = useState('Monthly');
  const [selectedValue, setSelectedValue] = useState('₹1,000');

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(progressAnim, {
        toValue: 0.48,
        duration: 1500,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const frequencies = ['One Time', 'Monthly', 'Quarterly'];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Building Project Phase 3</Text>
          <Text style={styles.headerSubtitle}>Help us complete the sanctuary interior</Text>
        </View>

        {/* Progress Card */}
        <Animated.View style={[styles.progressCard, { opacity: fadeAnim }]}>
          <View style={styles.amountRow}>
            <View>
              <Text style={styles.amountLabel}>Raised</Text>
              <Text style={styles.amountValue}>₹6,12,000</Text>
            </View>
            <View style={styles.goalContainer}>
              <Text style={styles.amountLabel}>Goal</Text>
              <Text style={styles.amountValue}>₹12,50,000</Text>
            </View>
          </View>

          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <Animated.View 
                style={[
                  styles.progressFill,
                  { width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  }) }
                ]} 
              />
            </View>
            <Text style={styles.progressPercent}>48%</Text>
          </View>
        </Animated.View>

        {/* Frequency */}
        <Text style={styles.sectionLabel}>Give Frequency</Text>
        <View style={styles.frequencyRow}>
          {frequencies.map((freq) => (
            <TouchableOpacity
              key={freq}
              style={[
                styles.freqButton,
                selectedAmount === freq && styles.freqButtonActive
              ]}
              onPress={() => setSelectedAmount(freq)}
            >
              <Text style={[
                styles.freqText,
                selectedAmount === freq && styles.freqTextActive
              ]}>
                {freq}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount Grid */}
        <Text style={styles.sectionLabel}>Select Amount</Text>
        <View style={styles.amountGrid}>
          {DONATION_AMOUNTS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.amountButton,
                selectedValue === item.amount && styles.amountButtonActive
              ]}
              onPress={() => setSelectedValue(item.amount)}
            >
              <Text style={[
                styles.amountButtonText,
                selectedValue === item.amount && styles.amountButtonTextActive
              ]}>
                {item.amount}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Impact */}
        <Text style={styles.sectionLabel}>Your Impact</Text>
        <View style={styles.impactGrid}>
          {[
            { icon: '📦', amount: '₹500', desc: 'Supplies for a family' },
            { icon: '📚', amount: '₹1,000', desc: 'Supports materials' },
            { icon: '🎁', amount: '₹5,000', desc: 'Helps outreach programs' },
          ].map((item, index) => (
            <View key={index} style={styles.impactCard}>
              <Text style={styles.impactIcon}>{item.icon}</Text>
              <Text style={styles.impactAmount}>{item.amount}</Text>
              <Text style={styles.impactDesc}>{item.desc}</Text>
            </View>
          ))}
        </View>

        {/* Give Now Button */}
        <View style={styles.buttonContainer}>
          <GradientButton
            title="❤️ Give Now"
            onPress={() => {}}
            colors={['#FF7043', '#FF8A65']}
            style={styles.giveButton}
          />
        </View>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {[
          { icon: '🏠', label: 'Home', screen: 'Home' },
          { icon: '📖', label: 'Word', screen: 'DailyWord' },
          { icon: '🙏', label: 'Prayer', screen: 'Prayer' },
          { icon: '❤️', label: 'Give', active: true, screen: 'Donation' },
          { icon: '👤', label: 'Profile', screen: 'Profile' },
        ].map((tab, index) => (
          <TouchableOpacity 
            key={index}
            style={styles.tabItem}
            onPress={() => navigation.navigate(tab.screen)}
          >
            <Text style={[styles.tabIcon, tab.active && styles.tabIconActive]}>
              {tab.icon}
            </Text>
            <Text style={[styles.tabLabel, tab.active && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgLight,
  },
  header: {
    padding: 20,
    paddingTop: 50,
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 24,
    color: Colors.primary,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.textGray,
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: Colors.bgWhite,
    margin: 20,
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.textGray,
    marginBottom: 4,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.primary,
  },
  goalContainer: {
    alignItems: 'flex-end',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  progressPercent: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  frequencyRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
  },
  freqButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  freqButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  freqText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textGray,
  },
  freqTextActive: {
    color: '#FFF',
  },
  amountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    gap: 12,
  },
  amountButton: {
    width: (width - 64) / 3,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: Colors.bgWhite,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  amountButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  amountButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
  },
  amountButtonTextActive: {
    color: '#FFF',
  },
  impactGrid: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 24,
  },
  impactCard: {
    flex: 1,
    backgroundColor: Colors.bgWhite,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  impactIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  impactAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 4,
  },
  impactDesc: {
    fontSize: 11,
    color: Colors.textGray,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  giveButton: {
    width: '100%',
  },
  tabBar: {
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
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
  },
  tabIcon: {
    fontSize: 22,
    marginBottom: 4,
    opacity: 0.5,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: Colors.textGray,
  },
  tabLabelActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

export default DonationScreen;
