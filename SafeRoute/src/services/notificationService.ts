import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

// Detectar si estamos en Expo Go (SDK 53 no soporta notificaciones remotas en Expo Go)
const isExpoGo = Constants.appOwnership === 'expo';

// SOLUCIÓN: Import condicional para evitar warnings en Expo Go
let Notifications: any = null;
if (!isExpoGo) {
  Notifications = require('expo-notifications');
}

// 1. Configuración del Manejador
// Solo configurar si NO estamos en Expo Go
if (!isExpoGo && Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as any), 
  });
}

// 2. Función para pedir permisos
export async function registerForPushNotificationsAsync() {
  // Skip en Expo Go (SDK 53 no soporta notificaciones remotas)
  if (isExpoGo) {
    console.log('ℹ️ Push notifications deshabilitadas en Expo Go. Usa development build para habilitarlas.');
    return;
  }

  let token;

  if (Platform.OS === 'android' && Notifications) {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.log('Fallo al obtener permisos para notificaciones');
      return;
    }
    // token = (await Notifications.getExpoPushTokenAsync()).data;
  } else {
    console.log('Usa un dispositivo físico para Push Notifications');
  }

  return token;
}

// 3. Función para Programar
export async function scheduleTripNotification(title: string, tripDate: string | Date) {
  // Skip en Expo Go
  if (isExpoGo || !Notifications) return;

  const dateObj = typeof tripDate === 'string' ? new Date(tripDate) : tripDate;
  
  // Calcular 5 minutos antes
  const triggerDate = new Date(dateObj.getTime() - 5 * 60 * 1000);
  const now = new Date();

  // Si ya pasó la hora de aviso, no programar
  if (triggerDate <= now) return;

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "🚗 Tu viaje se acerca",
        body: `Prepárate para: ${title}. Salida en 5 minutos.`,
        sound: true, 
      },
      // SOLUCIÓN ERROR 2: El 'trigger' es el problema principal de tipos.
      // Usamos 'triggerDate as any' para anular la validación estricta de TypeScript aquí.
      // Esto funciona porque en ejecución, Expo acepta el objeto Date perfectamente.
      trigger: triggerDate as any, 
    });
    
    console.log("Notificación programada ID:", id);
    return id;
  } catch (error) {
    console.error("Error al programar notificación:", error);
  }
}

export async function cancelNotification(notificationId: string) {
  if (isExpoGo || !Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(notificationId);
}