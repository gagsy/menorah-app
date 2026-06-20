import { Animated, Easing } from 'react-native';

export const fadeIn = (value, duration = 500, delay = 0) => {
  return Animated.timing(value, {
    toValue: 1,
    duration,
    delay,
    useNativeDriver: false,
    easing: Easing.ease,
  });
};

export const fadeOut = (value, duration = 300) => {
  return Animated.timing(value, {
    toValue: 0,
    duration,
    useNativeDriver: false,
    easing: Easing.ease,
  });
};

export const slideUp = (value, toValue = 0, duration = 600, delay = 0) => {
  return Animated.timing(value, {
    toValue,
    duration,
    delay,
    useNativeDriver: false,
    easing: Easing.out(Easing.cubic),
  });
};

export const scaleIn = (value, toValue = 1, duration = 400, delay = 0) => {
  return Animated.spring(value, {
    toValue,
    friction: 6,
    tension: 40,
    delay,
    useNativeDriver: false,
  });
};

export const staggerFadeIn = (animations, staggerDelay = 100, baseDelay = 0) => {
  return Animated.stagger(
    staggerDelay,
    animations.map((anim, index) => 
      fadeIn(anim, 500, baseDelay + index * staggerDelay)
    )
  );
};

export const pulse = (value) => {
  return Animated.sequence([
    Animated.timing(value, {
      toValue: 1.05,
      duration: 150,
      useNativeDriver: false,
    }),
    Animated.timing(value, {
      toValue: 1,
      duration: 150,
      useNativeDriver: false,
    }),
  ]);
};

export const progressBar = (value, toValue, duration = 1500) => {
  return Animated.timing(value, {
    toValue,
    duration,
    useNativeDriver: false,
    easing: Easing.inOut(Easing.cubic),
  });
};
