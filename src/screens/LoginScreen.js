import React, { useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  Animated, 
  StyleSheet, 
  TouchableOpacity
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../constants/Colors';

const LoginScreen = ({ navigation }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: false,
      }),
    ]).start();
  }, []);

  const SocialButton = ({ icon, title, bgColor, textColor, border }) => (
    <TouchableOpacity 
      activeOpacity={0.8}
      style={[styles.socialButton, { backgroundColor: bgColor, borderWidth: border ? 1 : 0 }]}
    >
      <Text style={styles.socialIcon}>{icon}</Text>
      <Text style={[styles.socialText, { color: textColor }]}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F8F4FC', '#FFFFFF', '#F0E6FA']}
        style={styles.gradient}
      >
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
          <Animated.View style={[styles.logoContainer, { transform: [{ scale: scaleAnim }] }]}>
            <View style={styles.menorahSmall}>
              {[
                Colors.menora.purple,
                Colors.menora.pink,
                Colors.menora.yellow,
                Colors.menora.orange,
                Colors.menora.red,
                Colors.menora.green,
                Colors.menora.blue,
              ].map((color, index) => (
                <View key={index} style={[styles.smallBranch, { backgroundColor: color }]} />
              ))}
            </View>
            <Text style={styles.logoText}>MENORAH</Text>
            <Text style={styles.logoSub}>FAMILY CAMP</Text>
          </Animated.View>

          <Text style={styles.welcome}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your journey</Text>

          <View style={styles.socialContainer}>
            <SocialButton 
              icon="G" 
              title="Continue with Google" 
              bgColor="#FFFFFF" 
              textColor="#333"
              border
            />
            <SocialButton 
              icon="🍎" 
              title="Continue with Apple" 
              bgColor="#000000" 
              textColor="#FFF"
            />

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.or}>or</Text>
              <View style={styles.line} />
            </View>

            <SocialButton 
              icon="📞" 
              title="Continue with Phone" 
              bgColor="#FFFFFF" 
              textColor="#333"
              border
            />
          </View>

          <TouchableOpacity 
            style={styles.guestButton}
            onPress={() => navigation.replace('Home')}
          >
            <Text style={styles.guestText}>Continue as Guest →</Text>
          </TouchableOpacity>
        </Animated.View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  menorahSmall: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
    height: 50,
  },
  smallBranch: {
    width: 8,
    height: 35,
    borderRadius: 4,
    marginHorizontal: 2,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.primary,
    letterSpacing: 3,
  },
  logoSub: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.gold,
    letterSpacing: 4,
    marginTop: 2,
  },
  welcome: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textGray,
    marginBottom: 32,
  },
  socialContainer: {
    width: '100%',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  socialIcon: {
    fontSize: 20,
    marginRight: 12,
    fontWeight: '700',
  },
  socialText: {
    fontSize: 15,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  or: {
    marginHorizontal: 16,
    color: Colors.textGray,
    fontSize: 14,
  },
  guestButton: {
    marginTop: 24,
  },
  guestText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;
