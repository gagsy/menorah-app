import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Animated, 
  StyleSheet, 
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const logoScale = useRef(new Animated.Value(0.5)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;
  const crossOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false,
        }),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 5,
          tension: 40,
          useNativeDriver: false,
        }),
      ]),
      Animated.timing(textOpacity, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      Animated.timing(progressWidth, {
        toValue: width * 0.6,
        duration: 2000,
        useNativeDriver: false,
      }),
      Animated.timing(crossOpacity, {
        toValue: 0.3,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.delay(800),
    ]).start(() => {
      navigation.replace('Onboarding');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Image 
        source={require('../../assets/images/splash-bg.png')} 
        style={styles.backgroundImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={['rgba(240,230,250,0.3)', 'rgba(232,213,247,0.5)', 'rgba(245,240,250,0.7)']}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.logoContainer,
            { 
              opacity: logoOpacity,
              transform: [{ scale: logoScale }]
            }
          ]}
        >
          <View style={styles.menorahContainer}>
            {[
              Colors.menora.purple,
              Colors.menora.pink,
              Colors.menora.yellow,
              Colors.menora.orange,
              Colors.menora.red,
              Colors.menora.green,
              Colors.menora.blue,
            ].map((color, index) => (
              <View key={index} style={styles.branchContainer}>
                <View style={[styles.branchHead, { backgroundColor: color }]} />
                <View style={[styles.branchBody, { backgroundColor: color }]}>
                  {index === 3 && (
                    <View style={styles.crossOverlay}>
                      <Text style={styles.branchCross}>✝</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          <Text style={styles.logoText}>MENORAH</Text>
          <Text style={styles.logoSubtext}>FAMILY CAMP</Text>
        </Animated.View>

        <Animated.View style={[styles.taglineContainer, { opacity: textOpacity }]}>
          <Text style={styles.tagline}>ONE FAMILY.</Text>
          <Text style={styles.tagline}>MANY COLORS.</Text>
          <Text style={styles.tagline}>ONE KING.</Text>
        </Animated.View>

        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              { width: progressWidth }
            ]} 
          />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    position: 'absolute',
    width,
    height,
  },
  gradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  menorahContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 20,
    height: 100,
  },
  branchContainer: {
    alignItems: 'center',
    marginHorizontal: 4,
  },
  branchHead: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: 4,
  },
  branchBody: {
    width: 20,
    height: 70,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crossOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  branchCross: {
    fontSize: 24,
    color: '#FFF',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 4,
  },
  logoSubtext: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 6,
    marginTop: 4,
  },
  taglineContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 3,
    lineHeight: 24,
  },
  progressContainer: {
    width: width * 0.6,
    height: 4,
    backgroundColor: 'rgba(107, 45, 145, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
});

export default SplashScreen;
