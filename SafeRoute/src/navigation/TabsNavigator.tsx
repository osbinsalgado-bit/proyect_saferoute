import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../contexts/ThemeContext";
import { getThemeColors } from "../util/theme";

// Importación de Pantallas (según los nombres de tu imagen)
import HomeScreen from "../screens/HomeScreen";
import RoutePlanningScreen from "../screens/RoutePlanningScreen";
import PastRoutesScreen from "../screens/FavoriteRoutesScreen"; 
import ProfileScreen from "../screens/ProfileScreen";
import SettingScreen from "../screens/SettingScreen"; 
import SavedLocations from "../screens/SavedLocationsScreen";

// Definición de tipos para las rutas
export type TabsParamList = {
    Home: undefined;
    RoutePlanning: undefined;
    PastRoutes: undefined;
    Profile: undefined;
    Settings: undefined;
    SavedLocations: undefined;
}

const Tab = createBottomTabNavigator<TabsParamList>();

const TabsNavigator = () => {
  const { theme } = useTheme();
  const colors = getThemeColors(theme);

  return (
    <Tab.Navigator
      screenOptions={{
        // Ocultar la barra de pestañas en todas las pantallas
        tabBarStyle: {
          display: "none",
          backgroundColor: colors.surface || "#ffffff",
          borderTopColor: colors.border,
        },
        // Por defecto mostrar header (se sobrescribe en Home)
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      }}
    >
      {/* 1. Pantalla de Inicio (sin header) */}
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          title: "Inicio",
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />

      {/* 2. Planificación de Rutas (muestra header con título y flecha que vuelve a Home) */}
      <Tab.Screen
        name="RoutePlanning"
        component={RoutePlanningScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Ruta",
          headerLeft: () => (
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.primary || '#007AFF'}
              style={{ marginLeft: 12 }}
              onPress={() => navigation.navigate("Home")}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="map" size={size} color={color} />
          ),
        })}
      />

      {/* 3. Historial de Rutas */}
      <Tab.Screen
        name="PastRoutes"
        component={PastRoutesScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Favoritos",
          headerLeft: () => (
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.primary || '#007AFF'}
              style={{ marginLeft: 12 }}
              onPress={() => navigation.navigate("Home")}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="history" size={size} color={color} />
          ),
        })}
      />

      {/* 4. Perfil de Usuario */}
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Perfil",
          headerLeft: () => (
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.primary || '#007AFF'}
              style={{ marginLeft: 12 }}
              onPress={() => navigation.navigate("Home")}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        })}
      />

      {/* 5. Configuración */}
      <Tab.Screen
        name="Settings"
        component={SettingScreen}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Ajustes",
          headerLeft: () => (
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.primary || '#007AFF'}
              style={{ marginLeft: 12 }}
              onPress={() => navigation.navigate("Home")}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="settings" size={size} color={color} />
          ),
        })}
      />

      {/* 4. rutas programadas */}
      <Tab.Screen
        name="SavedLocations"
        component={SavedLocations}
        options={({ navigation }) => ({
          headerShown: true,
          title: "Rutas Programadas",
          headerLeft: () => (
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={colors.primary || '#007AFF'}
              style={{ marginLeft: 12 }}
              onPress={() => navigation.navigate("Home")}
            />
          ),
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="person" size={size} color={color} />
          ),
        })}
      />
    </Tab.Navigator>
  );
};

export default TabsNavigator;