import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Animated, 
  StyleSheet, 
  TouchableOpacity,
  Dimensions,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import TabBar from '../components/TabBar';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const QuickAction = ({ icon, title, color, onPress }) => (
    <TouchableOpacity 
      style={[styles.quickAction, { backgroundColor: color + '15' }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.quickIcon, { color }]}>{icon}</Text>
      <Text style={[styles.quickText, { color }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View>
            <Text style={styles.greeting}>Shalom, Gagan! 👋</Text>
            <Text style={styles.welcome}>Welcome to the Family Gathering</Text>
          </View>
          <TouchableOpacity 
            style={styles.bellButton}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Text style={styles.bellIcon}>🔔</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>4</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View 
          style={[
            styles.missionCard,
            { 
              opacity: fadeAnim, 
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <Image 
            source={require('../../assets/images/home-mission.png')} 
            style={styles.missionImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(107,45,145,0.7)', 'rgba(155,89,182,0.8)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.missionGradient}
          >
            <Text style={styles.missionLabel}>OUR MISSION</Text>
            <Text style={styles.missionTitle}>To Reach Urban{'\n'}Broken Families</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity>
            <Text style={styles.viewAll}>View All</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickGrid}>
          <QuickAction 
            icon="🙏" 
            title="Prayer" 
            color={Colors.primary}
            onPress={() => navigation.navigate('Prayer')}
          />
          <QuickAction 
            icon="📖" 
            title="Daily Word" 
            color={Colors.gold}
            onPress={() => navigation.navigate('DailyWord')}
          />
          <QuickAction 
            icon="❤️" 
            title="Give" 
            color={Colors.menora.red}
            onPress={() => navigation.navigate('Donation')}
          />
          <QuickAction 
            icon="🔔" 
            title="Updates" 
            color={Colors.menora.blue}
            onPress={() => navigation.navigate('Notifications')}
          />
        </View>

        <Animated.View 
          style={[
            styles.studyCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.studyLabel}>Weekly Bible Study</Text>
          <Text style={styles.studyTitle}>Restoring the Foundations:{'\n'}Healing Broken Homes</Text>
          <View style={styles.progressRow}>
            <Text style={styles.progressText}>Week 2 of 4</Text>
            <Text style={styles.progressPercent}>60%</Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: '60%' }]} />
          </View>
          <View style={styles.studyButtons}>
            <TouchableOpacity style={styles.studyButton}>
              <Text style={styles.studyButtonText}>Open Study</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.studyButton, styles.studyButtonOutline]}>
              <Text style={[styles.studyButtonText, { color: Colors.primary }]}>Download Guide</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>

      <TabBar navigation={navigation} activeTab="Home" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgLight,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    marginTop: 10,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.textDark,
  },
  welcome: {
    fontSize: 13,
    color: Colors.textGray,
    marginTop: 4,
  },
  bellButton: {
    padding: 8,
    position: 'relative',
  },
  bellIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  missionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  missionImage: {
    width: '100%',
    height: 180,
    position: 'absolute',
  },
  missionGradient: {
    padding: 24,
    minHeight: 180,
    justifyContent: 'center',
  },
  missionLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  missionTitle: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 32,
    width: '70%',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
  },
  viewAll: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickAction: {
    width: (width - 52) / 2,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickText: {
    fontSize: 14,
    fontWeight: '600',
  },
  studyCard: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  studyLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    letterSpacing: 1,
    marginBottom: 8,
  },
  studyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textDark,
    lineHeight: 26,
    marginBottom: 16,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 13,
    color: Colors.textGray,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  studyButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  studyButton: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  studyButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  studyButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HomeScreen;