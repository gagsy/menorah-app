import React, { useRef, useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Animated, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { PRAYER_DATA } from '../constants/Data';
import TabBar from '../components/TabBar';

const PrayerScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [prayers, setPrayers] = useState(PRAYER_DATA);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, []);

  const togglePrayed = (id) => {
    setPrayers(prev => prev.map(p => 
      p.id === id ? { ...p, prayed: !p.prayed } : p
    ));
  };

  const filters = ['All', 'Urgent', 'Mission', 'Family'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Prayer Wall</Text>
        <TouchableOpacity>
          <Text style={styles.filterIcon}>🔽</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContainer}
      >
        {filters.map((f, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.filterChip,
              filter === f && styles.filterChipActive
            ]}
            onPress={() => setFilter(f)}
          >
            <Text style={[
              styles.filterText,
              filter === f && styles.filterTextActive
            ]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {prayers.map((prayer, index) => (
          <Animated.View 
            key={prayer.id}
            style={[
              styles.prayerCard,
              { 
                opacity: fadeAnim,
                transform: [{ translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20 * (index + 1), 0]
                })}]
              }
            ]}
          >
            <View style={styles.prayerHeader}>
              <View style={[styles.tag, { backgroundColor: prayer.tagColor + '20' }]}>
                <Text style={[styles.tagText, { color: prayer.tagColor }]}>
                  {prayer.tag}
                </Text>
              </View>
            </View>

            <Text style={styles.prayerTitle}>{prayer.title}</Text>
            <Text style={styles.prayerDesc}>{prayer.description}</Text>

            <View style={styles.prayerFooter}>
              <View style={styles.prayerCount}>
                <Text style={styles.countIcon}>👥</Text>
                <Text style={styles.countText}>{prayer.count} praying</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.prayButton,
                  prayer.prayed && styles.prayedButton
                ]}
                onPress={() => togglePrayed(prayer.id)}
              >
                <Text style={[
                  styles.prayButtonText,
                  prayer.prayed && styles.prayedButtonText
                ]}>
                  {prayer.prayed ? 'Prayed ✓' : 'Pray'}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        ))}

        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.ctaBanner}
        >
          <View>
            <Text style={styles.ctaTitle}>Let's keep praying together!</Text>
            <Text style={styles.ctaSubtitle}>Your prayers make a difference.</Text>
          </View>
          <Text style={styles.ctaIcon}>❤️</Text>
        </LinearGradient>
      </ScrollView>

      <TabBar navigation={navigation} activeTab="Prayer" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 50,
  },
  backIcon: {
    fontSize: 24,
    color: Colors.primary,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  filterIcon: {
    fontSize: 20,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.bgWhite,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textGray,
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
  },
  prayerCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  prayerHeader: {
    marginBottom: 12,
  },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
  },
  prayerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textDark,
    marginBottom: 6,
  },
  prayerDesc: {
    fontSize: 13,
    color: Colors.textGray,
    lineHeight: 20,
    marginBottom: 16,
  },
  prayerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  prayerCount: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  countIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  countText: {
    fontSize: 13,
    color: Colors.textGray,
  },
  prayButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 12,
  },
  prayedButton: {
    backgroundColor: '#D1FAE5',
  },
  prayButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
  prayedButtonText: {
    color: Colors.success,
  },
  ctaBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginTop: 8,
  },
  ctaTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  ctaSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 13,
  },
  ctaIcon: {
    fontSize: 32,
  },
});

export default PrayerScreen;
