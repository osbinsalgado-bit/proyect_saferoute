import React, { useEffect, useState, useLayoutEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { fetchScheduledRoutes, deleteScheduledRoutes } from '../store/clientSlice';

const formatDate = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export default function RoutePlanningScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors } = useTheme();
  const { id: userId, scheduledRoutes, loading } = useAppSelector(state => state.client);

  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        dispatch(fetchScheduledRoutes(userId));
      }
    }, [userId, dispatch])
  );

  // Botón de borrar en el Header nativo
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => {
            if (isDeleteMode && selectedIds.length > 0) handleDelete();
            else { setIsDeleteMode(!isDeleteMode); setSelectedIds([]); }
        }} style={{ marginRight: 15 }}>
          <Ionicons 
             name={isDeleteMode ? (selectedIds.length > 0 ? "trash" : "close-circle") : "trash-outline"} 
             size={24} 
             color={isDeleteMode ? "red" : colors.text} 
          />
        </TouchableOpacity>
      ),
      title: isDeleteMode ? `${selectedIds.length} Borrar` : 'Rutas Programadas'
    });
  }, [navigation, isDeleteMode, selectedIds, colors.text]);

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const handleDelete = () => {
    Alert.alert("Eliminar", "¿Borrar rutas seleccionadas?", [
      { text: "Cancelar" },
      { text: "Borrar", style: "destructive", onPress: async () => {
          await dispatch(deleteScheduledRoutes(selectedIds));
          setIsDeleteMode(false);
          setSelectedIds([]);
      }}
    ]);
  };

  const handleRoutePress = (item: any) => {
    if (isDeleteMode) {
      toggleSelection(item.id);
    } else {
      // Limpiar y Navegar
      setIsDeleteMode(false);
      setSelectedIds([]);
      
      navigation.navigate('Home', {
        startRoute: true,
        origin: { lat: item.origin_lat, lng: item.origin_lng, name: item.origin_text },
        destination: { lat: item.destination_lat, lng: item.destination_lng, name: item.destination_text }
      });
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const isSelected = selectedIds.includes(item.id);
    const isSoon = (new Date(item.scheduled_time).getTime() - new Date().getTime()) < 30 * 60 * 1000;

    return (
      <TouchableOpacity
        style={[styles.card, { backgroundColor: colors.surface }, isSelected && { borderColor: 'red', borderWidth: 1 }]}
        onPress={() => handleRoutePress(item)}
        onLongPress={() => { setIsDeleteMode(true); toggleSelection(item.id); }}
      >
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: isSoon ? '#fce8e6' : '#e6f4ea' }]}>
            <Ionicons name="calendar" size={24} color={isSoon ? '#c5221f' : '#137333'} />
          </View>
          <View style={{flex: 1}}>
            <Text style={[styles.title, { color: colors.text }]}>{item.name}</Text>
            <Text style={{ color: colors.primary, fontWeight: 'bold', fontSize: 13 }}>{formatDate(item.scheduled_time)}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>{item.destination_text}</Text>
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
          <ActivityIndicator size="large" color={colors.primary} style={{marginTop:50}}/>
      ) : (
          <FlatList
            data={scheduledRoutes}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 15 }}
            ListEmptyComponent={<Text style={{textAlign:'center', marginTop:50, color:colors.textSecondary}}>No tienes viajes programados.</Text>}
          />
      )}
      
      {/* Botón flotante para programar NUEVO viaje (Redirige al home) */}
      {!isDeleteMode && (
        <TouchableOpacity 
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => {
            Alert.alert("Nuevo Viaje", "Selecciona el destino en el mapa para programar.", [
              { text: "Ir al Mapa", onPress: () => navigation.navigate('Home') },
              { text: "Cancelar" }
            ]);
          }}
        >
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: { borderRadius: 12, padding: 15, marginBottom: 12, elevation: 2, shadowOpacity: 0.1, shadowOffset: {width:0, height:1} },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  title: { fontSize: 16, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 30, right: 20, width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 6 }
});