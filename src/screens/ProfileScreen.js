import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  Animated, 
  StyleSheet, 
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';
import { PROFILE_MENU } from '../constants/Data';
import TabBar from '../components/TabBar';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

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
    ]).start();
  }, []);

  const StatItem = ({ value, label }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header with Background */}
        <View style={styles.headerContainer}>
          <Image 
            source={require('../../assets/images/profile-bg.png')} 
            style={styles.headerBg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(107,45,145,0.8)', 'rgba(155,89,182,0.9)']}
            style={styles.headerGradient}
          >
            {/* Top Bar */}
            <View style={styles.topBar}>
              <TouchableOpacity>
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
              <TouchableOpacity>
                <Text style={styles.shareIcon}>↗️</Text>
              </TouchableOpacity>
            </View>

            {/* Avatar */}
            <Animated.View 
              style={[
                styles.avatarContainer,
                { opacity: fadeAnim, transform: [{ scale: 0.9 }] }
              ]}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>GS</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Text style={styles.editIcon}>✏️</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Name & Email */}
            <Text style={styles.name}>Gagan Sharma</Text>
            <Text style={styles.email}>gagan@example.com</Text>

            {/* Stats */}
            <View style={styles.statsRow}>
              <StatItem value="12" label="Day Streak" />
              <StatItem value="28" label="Devotions" />
              <StatItem value="₹12,500" label="Given" />
              <StatItem value="8" label="Events" />
            </View>
          </LinearGradient>
        </View>

        {/* Menu Items */}
        <Animated.View 
          style={[
            styles.menuContainer,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          {PROFILE_MENU.map((item, index) => (
            <TouchableOpacity 
              key={index}
              style={styles.menuItem}
              onPress={() => {
                if (item.screen === 'Login') {
                  navigation.replace('Login');
                } else {
                  navigation.navigate(item.screen);
                }
              }}
            >
              <View style={styles.menuLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <Text style={styles.menuTitle}>{item.title}</Text>
              </View>
              <Text style={styles.menuArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </Animated.View>
      </ScrollView>

      <TabBar navigation={navigation} activeTab="Profile" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgLight,
  },
  headerContainer: {
    height: 380,
    overflow: 'hidden',
  },
  headerBg: {
    position: 'absolute',
    width,
    height: 380,
  },
  headerGradient: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  menuIcon: {
    fontSize: 24,
    color: '#FFF',
  },
  shareIcon: {
    fontSize: 20,
    color: '#FFF',
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: width / 2 - 50,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  editIcon: {
    fontSize: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFF',
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  menuContainer: {
    backgroundColor: Colors.bgWhite,
    borderRadius: 20,
    margin: 20,
    marginTop: -30,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6FA',
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: 16,
    width: 24,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textDark,
  },
  menuArrow: {
    fontSize: 20,
    color: Colors.textGray,
  },
});

export default ProfileScreen;
