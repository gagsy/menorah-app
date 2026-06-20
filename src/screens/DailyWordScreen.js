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

const DailyWordScreen = ({ navigation }) => {
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

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <View style={styles.headerLeft}>
            <Text style={styles.headerIcon}>📖</Text>
            <View>
              <Text style={styles.headerTitle}>Today's Word</Text>
              <Text style={styles.headerDate}>May 17, 2025</Text>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>Streak 12 🔥</Text>
          </View>
        </Animated.View>

        <Animated.View 
          style={[
            styles.verseCard,
            { opacity: fadeAnim, transform: [{ scale: 0.95 }] }
          ]}
        >
          <Image 
            source={require('../../assets/images/devotion-bg.png')} 
            style={styles.verseImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['rgba(123,63,160,0.9)', 'rgba(155,89,182,0.95)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.verseGradient}
          >
            <Text style={styles.quoteIcon}>❝</Text>
            <Text style={styles.verseText}>
              "The Lord is close to the brokenhearted and saves those who are crushed in spirit."
            </Text>
            <Text style={styles.verseRef}>Psalm 34:18</Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.actionsRow}>
          {[
            { icon: '📖', label: 'Read' },
            { icon: '🎧', label: 'Listen' },
            { icon: '💭', label: 'Reflect' },
            { icon: '🔗', label: 'Share' },
          ].map((action, index) => (
            <TouchableOpacity key={index} style={styles.actionButton}>
              <Text style={styles.actionIcon}>{action.icon}</Text>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Animated.View 
          style={[
            styles.reflectionCard,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Text style={styles.reflectionTitle}>Daily Reflection</Text>
          <Text style={styles.reflectionText}>
            Take a moment to reflect on today's verse and how it speaks to your heart.
          </Text>
        </Animated.View>

        <TouchableOpacity style={styles.fab}>
          <Text style={styles.fabIcon}>✏️</Text>
        </TouchableOpacity>
      </ScrollView>

      <TabBar navigation={navigation} activeTab="Word" />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.textDark,
  },
  headerDate: {
    fontSize: 13,
    color: Colors.textGray,
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  streakText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D97706',
  },
  verseCard: {
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  verseImage: {
    width: '100%',
    height: 320,
    position: 'absolute',
  },
  verseGradient: {
    padding: 28,
    minHeight: 320,
    justifyContent: 'center',
  },
  quoteIcon: {
    fontSize: 40,
    color: 'rgba(255,255,255,0.3)',
    marginBottom: 8,
  },
  verseText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    lineHeight: 34,
    marginBottom: 20,
  },
  verseRef: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 13,
    color: Colors.textGray,
    fontWeight: '500',
  },
  reflectionCard: {
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
  reflectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  reflectionText: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 100,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  fabIcon: {
    fontSize: 24,
  },
});

export default DailyWordScreen;
