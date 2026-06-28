import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Image, 
  Animated, 
  StyleSheet, 
  Dimensions 
} from 'react-native';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const progressWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Fade in the whole screen
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: false,
      }),
      // Animate progress bar
      Animated.timing(progressWidth, {
        toValue: width * 0.6,
        duration: 2500,
        useNativeDriver: false,
      }),
      // Hold for a moment
      Animated.delay(500),
    ]).start(() => {
      navigation.replace('Onboarding');
    });
  }, []);

  return (
    <View style={styles.container}>
      {/* Full screen background with logo + text baked in */}
      <Animated.Image 
        source={require('../../assets/images/splash-bg.png')} 
        style={[
          styles.backgroundImage,
          { opacity: fadeAnim }
        ]}
        resizeMode="cover"
      />

      {/* Loading indicator at bottom */}
      <Animated.View 
        style={[
          styles.loadingContainer,
          { opacity: fadeAnim }
        ]}
      >
        <View style={styles.progressContainer}>
          <Animated.View 
            style={[
              styles.progressBar,
              { width: progressWidth }
            ]} 
          />
        </View>
        <Text style={styles.loadingText}>Loading...</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8D5F7',
  },
  backgroundImage: {
    position: 'absolute',
    width,
    height,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressContainer: {
    width: width * 0.5,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    letterSpacing: 1,
  },
});

export default SplashScreen;