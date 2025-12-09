
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Image } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const SplashScreenAnimated = () => {

  const { colors } = useTheme();
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { 
        toValue: 1, 
        duration: 800, 
        useNativeDriver: true 
      }),
      Animated.spring(scaleAnim, { 
        toValue: 1, 
        friction: 6, 
        useNativeDriver: true 
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors?.background || '#fff' }]}>
      <Animated.View 
        style={{ 
            opacity: fadeAnim, 
            transform: [{ scale: scaleAnim }], 
            alignItems: 'center' 
        }}
      >
        <Image 
          source={require('../../assets/icon_app.png')} 
          style={{ width: 150, height: 150, resizeMode: 'contain' }} 
        />
        <Text style={[styles.title, { color: colors?.text || '#000' }]}>SafeRoute</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  title: { 
    fontSize: 32,
    fontWeight: 'bold', 
    marginTop: 20 
  },
});

export default SplashScreenAnimated;
