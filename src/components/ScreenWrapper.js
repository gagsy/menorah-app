import React from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { Colors } from '../constants/Colors';

const ScreenWrapper = ({ children, style, noPadding }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.content, !noPadding && styles.padding, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgLight,
  },
  content: {
    flex: 1,
  },
  padding: {
    paddingHorizontal: 20,
  },
});

export default ScreenWrapper;
