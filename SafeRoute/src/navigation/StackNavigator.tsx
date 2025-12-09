import React, { useEffect, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import TabsNavigator from './TabsNavigator';

// Pantallas de Autenticación
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';

// Splash
import SplashScreenAnimated from '../screens/SplashScreenAnimated';

 // Definimos los tipos de navegación
export type RootStackParamList = {
  Splash: undefined;
  // Grupo Auth
  Login: undefined;
  Register: undefined;
  // Grupo App (Cuando entra, va directo a los Tabs)
  Home: undefined; 
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// Duración del splash controlada por el Stack (ms)
const SPLASH_DURATION = 1500;

const StackNavigator = () => {
  const { user } = useAuth();

  // Controla cuándo se muestra el splash (al iniciar y después del login)
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const prevUserRef = useRef<typeof user | null>(user);

  // Splash inicial al montar la app
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
    return () => clearTimeout(t);
  }, []);

  // Cuando user cambia de falsy -> truthy (login), mostramos el splash otra vez
  useEffect(() => {
    const prevUser = prevUserRef.current;
    if (!prevUser && user) {
      setShowSplash(true);
      const t = setTimeout(() => setShowSplash(false), SPLASH_DURATION);
      return () => clearTimeout(t);
    }
    prevUserRef.current = user;
  }, [user]);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {showSplash ? (
        // Mostrar splash mientras showSplash === true
        <Stack.Screen name="Splash" component={SplashScreenAnimated} />
      ) : user ? (
        // Usuario autenticado -> mostrar la App (Tabs)
        <Stack.Screen name="Home" component={TabsNavigator} />
      ) : (
        // Usuario no autenticado -> Login / Register
        <>
          <Stack.Screen 
            name="Login" 
            component={LoginScreen} 
            options={{ animation: 'fade' }}
          />
          <Stack.Screen 
            name="Register" 
            component={RegisterScreen}
            options={{ presentation: 'card' }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default StackNavigator;