import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchFavoriteRoutes, deleteFavoriteRoutes } from '../store/clientSlice';

export default function FavoriteRoutesScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  
  const { id: userId, favoriteRoutes, loading } = useAppSelector(state => state.client);
  
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        dispatch(fetchFavoriteRoutes(userId));
      }
    }, [userId, dispatch])
  );

  // Configurar el botón de borrar en el Header Nativo (Opcional, pero recomendado)
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => {
            if (isDeleteMode && selectedIds.length > 0) handleDeleteConfirm();
            else { setIsDeleteMode(!isDeleteMode); setSelectedIds([]); }
        }} style={{ marginRight: 15 }}>
          <Ionicons 
            name={isDeleteMode ? (selectedIds.length > 0 ? "trash" : "close-circle") : "trash-outline"} 
            size={24} 
            color={isDeleteMode ? "red" : colors.text} 
          />
        </TouchableOpacity>
      ),
      title: isDeleteMode ? `${selectedIds.length} Seleccionados` : 'Mis Favoritos'
    });
  }, [navigation, isDeleteMode, selectedIds, colors.text]);

  const toggleSelection = (routeId: string) => {
    if (selectedIds.includes(routeId)) {
      setSelectedIds(selectedIds.filter(id => id !== routeId));
    } else {
      setSelectedIds([...selectedIds, routeId]);
    }
  };

  const handleRoutePress = (route: any) => {
    if (isDeleteMode) {
      toggleSelection(route.id);
    } else {
      // Limpiamos selección por si acaso
      setIsDeleteMode(false);
      setSelectedIds([]);
      
      // Navegar al Home
      navigation.navigate('Home', {
        startRoute: true,
        origin: { lat: route.origin_lat, lng: route.origin_lng, name: route.origin_text },
        destination: { lat: route.destination_lat, lng: route.destination_lng, name: route.destination_text }
      });
    }
  };

  const handleDeleteConfirm = () => {
    Alert.alert(
      "Eliminar Rutas",
      `¿Borrar ${selectedIds.length} rutas?`,
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Borrar", 
          style: "destructive", 
          onPress: async () => {
            await dispatch(deleteFavoriteRoutes(selectedIds));
            setIsDeleteMode(false);
            setSelectedIds([]);
          }
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }, isSelected && { borderColor: 'red', borderWidth: 1 }]}
        onPress={() => handleRoutePress(item)}
        onLongPress={() => { setIsDeleteMode(true); toggleSelection(item.id); }}
        activeOpacity={0.7}
      >
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: '#e8f0fe' }]}>
            <Ionicons name="heart" size={24} color="#1a73e8" />
          </View>
          <View style={{flex:1}}>
            <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
            <Text style={{color: colors.textSecondary, fontSize: 12}} numberOfLines={1}>{item.destination_text}</Text>
          </View>
          {isDeleteMode && (
            <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "red" : colors.textSecondary} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={favoriteRoutes}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', marginTop: 50, color: colors.textSecondary }}>No tienes favoritos aún.</Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 12, padding: 15, marginBottom: 10, elevation: 2, shadowOpacity: 0.1, shadowOffset: {width:0, height:1} },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
});