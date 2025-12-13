import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
  Alert,
  TextInput,
  FlatList,
  ActivityIndicator,
  Modal,
  Dimensions,
  Platform,
  Keyboard
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import polyline from '@mapbox/polyline';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import debounce from 'lodash/debounce';

import { useTheme } from '../contexts/ThemeContext';
import { useAppSelector, useAppDispatch } from '../store/hooks';
import { GOOGLE_MAPS_API_KEY_ENV } from '@env';

import CustomInput from '../components/CustomInput'; 
import { updateHomeLocation, verifyPassword, saveFavoriteRoute, scheduleRoute, fetchFavoriteRoutes, fetchScheduledRoutes } from '../store/clientSlice';
import { scheduleTripNotification, registerForPushNotificationsAsync } from '../services/notificationService';

import { mapStyleDark, mapStyleLight } from '../components/mapStyles';

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.015;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

type ViewMode = 'IDLE' | 'PREVIEW' | 'NAVIGATING';
type TransportMode = 'driving' | 'transit' | 'walking';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();

  const styles = useMemo(() => createStyles(colors), [colors]);

  const { id: userId } = useAppSelector((state) => state.client);
  const client = useAppSelector((state) => state.client);
  const mapRef = useRef<MapView>(null);
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // --- ESTADOS ---
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [routeCoords, setRouteCoords] = useState<any[]>([]);
  const [routeInfo, setRouteInfo] = useState<{ distance: string, duration: string } | null>(null);
  
  const [viewMode, setViewMode] = useState<ViewMode>('IDLE');
  const [transportMode, setTransportMode] = useState<TransportMode>('driving');

  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleName, setScheduleName] = useState('');
  const [scheduleDate, setScheduleDate] = useState(new Date());
  
  const [showIOSDatePicker, setShowIOSDatePicker] = useState(false);

  const [showHomePassModal, setShowHomePassModal] = useState(false);
  const [homePassword, setHomePassword] = useState('');
  const [pendingHomeData, setPendingHomeData] = useState<{address: string, lat: number, lng: number} | null>(null);

  // INICIALIZACIÓN
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      
      let location = await Location.getCurrentPositionAsync({});
      const current = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: LATITUDE_DELTA,
        longitudeDelta: LONGITUDE_DELTA,
      };
      setCurrentLocation(current);
      registerForPushNotificationsAsync();
    })();
    return () => { if (locationSubscription.current) locationSubscription.current.remove(); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userId) {
        dispatch(fetchFavoriteRoutes(userId));
        dispatch(fetchScheduledRoutes(userId));
      }
    }, [userId, dispatch])
  );

  useEffect(() => {
    if (route.params?.startRoute && route.params?.destination) {
       const { destination: destParams } = route.params;
       handleNewDestination(destParams.lat, destParams.lng, destParams.name);
       setQuery('');
       navigation.setParams({ startRoute: undefined });
    }
  }, [route.params]);

  const fetchPlaces = useCallback(debounce(async (text: string) => {
    if (!text || text.length < 2 || !GOOGLE_MAPS_API_KEY_ENV) {
        setSuggestions([]);
        return;
    }
    setLoadingSuggestions(true);
    try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY_ENV}&language=es&components=country:hn`; 
        const res = await fetch(url);
        const json = await res.json();
        if (json.status === 'OK') setSuggestions(json.predictions);
        else setSuggestions([]);
    } catch (e) { console.error(e); } 
    finally { setLoadingSuggestions(false); }
  }, 600), []);

  useEffect(() => { fetchPlaces(query); }, [query]);

  const handleSelectSuggestion = async (placeId: string, desc: string) => {
      Keyboard.dismiss();
      setSuggestions([]);
      setQuery(''); 
      setLoadingSuggestions(true);
      try {
          const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY_ENV}`;
          const res = await fetch(url);
          const json = await res.json();
          if (json.result?.geometry?.location) {
              const { lat, lng } = json.result.geometry.location;
              handleNewDestination(lat, lng, desc);
          }
      } catch (e) { Alert.alert("Error", "No se pudo obtener la ubicación"); }
      finally { setLoadingSuggestions(false); }
  };

  const handleNewDestination = (lat: number, lng: number, desc: string) => {
    setDestination({ latitude: lat, longitude: lng, description: desc });
    setViewMode('PREVIEW');
    fetchDirections(lat, lng, transportMode);
  };

  const fetchDirections = async (destLat: number, destLng: number, mode: TransportMode) => {
    if (!currentLocation || !GOOGLE_MAPS_API_KEY_ENV) return;
    try {
      const originStr = `${currentLocation.latitude},${currentLocation.longitude}`;
      const destStr = `${destLat},${destLng}`;
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originStr}&destination=${destStr}&key=${GOOGLE_MAPS_API_KEY_ENV}&mode=${mode}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (json.routes.length) {
        const points = polyline.decode(json.routes[0].overview_polyline.points);
        const coords = points.map((p) => ({ latitude: p[0], longitude: p[1] }));
        setRouteCoords(coords);
        const leg = json.routes[0].legs[0];
        setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
        mapRef.current?.fitToCoordinates(coords, { edgePadding: { top: 120, right: 50, bottom: 350, left: 50 }, animated: true });
      }
    } catch (error) { console.error(error); }
  };

  const startNavigation = async () => {
    setViewMode('NAVIGATING');
    locationSubscription.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 2000, distanceInterval: 5 },
        (loc) => {
            const { latitude, longitude, heading } = loc.coords;
            const newRegion = { latitude, longitude, latitudeDelta: 0.002, longitudeDelta: 0.002 };
            setCurrentLocation(newRegion);
            mapRef.current?.animateCamera({ center: newRegion, zoom: 19, pitch: 60, heading: heading || 0 });
            
            if (destination && routeInfo) {
                const R = 6371; 
                const dLat = (destination.latitude - latitude) * (Math.PI/180);
                const dLon = (destination.longitude - longitude) * (Math.PI/180);
                const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(latitude*(Math.PI/180)) * Math.cos(destination.latitude*(Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                const distKm = R * c;
                let speed = transportMode === 'driving' ? 40 : transportMode === 'transit' ? 30 : 5;
                const timeMins = Math.ceil((distKm / speed) * 60);
                setRouteInfo({ distance: `${distKm.toFixed(1)} km`, duration: `${timeMins} min` });
            }
        }
    );
  };

  const stopNavigation = () => {
      if (locationSubscription.current) locationSubscription.current.remove();
      resetMap();
  };

  const resetMap = () => {
    setViewMode('IDLE');
    setDestination(null);
    setRouteCoords([]);
    setQuery('');
    setRouteInfo(null);
    if(currentLocation) mapRef.current?.animateToRegion({ ...currentLocation, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA });
  };

  // --- MANEJO DE FECHA Y HORA (FIX ANDROID) ---
  const handleDatePress = () => {
    if (Platform.OS === 'android') {
        // 1. Abrir FECHA
        DateTimePickerAndroid.open({
            value: scheduleDate,
            mode: 'date',
            onChange: (event, date) => {
                if (event.type === 'set' && date) {
                    // 2. Abrir HORA inmediatamente después
                    DateTimePickerAndroid.open({
                        value: date, 
                        mode: 'time',
                        is24Hour: false,
                        onChange: (eventTime, time) => {
                            if (eventTime.type === 'set' && time) {
                                setScheduleDate(time);
                            }
                        }
                    });
                }
            },
        });
    } else {
        // iOS
        setShowIOSDatePicker(true);
    }
  };

  const onIOSDateChange = (event: any, selectedDate?: Date) => {
      if (selectedDate) setScheduleDate(selectedDate);
  };

  const confirmSaveFavorite = async () => {
      if(!saveName) return Alert.alert("Atención", "Escribe un nombre");
      if(!client.id || !destination) return;
      await dispatch(saveFavoriteRoute({
          userId: client.id,
          name: saveName,
          origin: { lat: currentLocation.latitude, lng: currentLocation.longitude, address: "Mi Ubicación" },
          destination: { lat: destination.latitude, lng: destination.longitude, address: destination.description }
      }));
      setShowSaveModal(false); setSaveName('');
      Alert.alert("Guardado", "Ruta añadida a favoritos");
  };

  const confirmSchedule = async () => {
      if(!scheduleName) return Alert.alert("Atención", "Escribe un nombre");
      if(!client.id || !destination) return;
      await dispatch(scheduleRoute({
          userId: client.id,
          name: scheduleName,
          date: scheduleDate.toISOString(),
          origin: { lat: currentLocation.latitude, lng: currentLocation.longitude, address: "Mi Ubicación" },
          destination: { lat: destination.latitude, lng: destination.longitude, address: destination.description },
          mode: transportMode
      }));
      await scheduleTripNotification(scheduleName, scheduleDate);
      setShowScheduleModal(false); setScheduleName('');
      Alert.alert("Programado", "Viaje agendado correctamente.");
  };

  const handleHomePress = () => {
    if (client.homeAddress && client.homeLatitude !== null && client.homeLongitude !== null) {
        setQuery('Casa');
        handleNewDestination(client.homeLatitude, client.homeLongitude, client.homeAddress);
    } else {
        Alert.alert("Sin Casa", "Configura tu hogar en el menú de ruta.");
    }
  };

  const handleSetHomePress = () => {
    if (!destination) return;
    setPendingHomeData({ address: destination.description, lat: destination.latitude, lng: destination.longitude });
    setHomePassword('');
    setShowHomePassModal(true);
  };

  const confirmUpdateHome = async () => {
    if (!homePassword) return Alert.alert("Error", "Ingresa contraseña");
    if (!client.email || !client.id || !pendingHomeData) return;
    try {
        const res = await dispatch(verifyPassword({ email: client.email, password: homePassword }));
        if (verifyPassword.fulfilled.match(res)) {
            await dispatch(updateHomeLocation({ userId: client.id, ...pendingHomeData }));
            setShowHomePassModal(false); setPendingHomeData(null); setHomePassword('');
            Alert.alert("Éxito", "Hogar actualizado.");
        } else {
            Alert.alert("Error", "Contraseña incorrecta");
        }
    } catch (e) { Alert.alert("Error", "Error al verificar."); }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFillObject}
        initialRegion={currentLocation}
        customMapStyle={isDark ? mapStyleDark : mapStyleLight}
        showsUserLocation={viewMode !== 'NAVIGATING'}
        showsMyLocationButton={false} 
        toolbarEnabled={false} 
        onLongPress={(e) => handleNewDestination(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, "Punto marcado")}
      >
        {destination && <Marker coordinate={destination} title={destination.description} pinColor="red" />}
        {routeCoords.length > 0 && <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#4285F4" />}
        {viewMode === 'NAVIGATING' && currentLocation && (
            <Marker coordinate={currentLocation} anchor={{x:0.5, y:0.5}}>
                <View style={styles.vehicleMarker}>
                    <Ionicons name={transportMode === 'transit' ? 'bus' : transportMode === 'walking' ? 'walk' : 'car'} size={24} color="white" />
                </View>
            </Marker>
        )}
      </MapView>

      {/* TOP */}
      {viewMode !== 'NAVIGATING' && (
      <View style={styles.topContainer}>
        <TouchableOpacity style={styles.profileButton} onPress={() => navigation.navigate('Profile')}>
          {client.profileImage ? (
            <Image source={{ uri: client.profileImage }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="person" size={24} color={colors.textSecondary} />
          )}
        </TouchableOpacity>

        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textSecondary} style={{ marginRight: 8 }} />
          <TextInput
            placeholder="¿A dónde vas?"
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={(text) => { setQuery(text); if(text.length===0) setSuggestions([]); }}
            style={styles.searchText}
          />
          {loadingSuggestions && <ActivityIndicator size="small" color={colors.primary} style={{marginRight:5}}/>}
          <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Sugerencias */}
      {suggestions.length > 0 && viewMode !== 'NAVIGATING' && (
        <View style={styles.suggestionsBox}>
            <FlatList
                data={suggestions}
                keyExtractor={(item) => item.place_id}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                <TouchableOpacity style={styles.suggestionItem} onPress={() => handleSelectSuggestion(item.place_id, item.description)}>
                    <Ionicons name="location-sharp" size={16} color={colors.textSecondary} style={{marginRight:10}} />
                    <Text style={{color: colors.text, flex:1}} numberOfLines={1}>{item.description}</Text>
                </TouchableOpacity>
                )}
            />
        </View>
      )}

      {/* FAB LOCATE */}
      <TouchableOpacity 
        style={[styles.fabLocate, { bottom: viewMode === 'IDLE' ? 140 : 320 }]} 
        onPress={() => { if(currentLocation) mapRef.current?.animateToRegion({...currentLocation, latitudeDelta: LATITUDE_DELTA, longitudeDelta: LONGITUDE_DELTA}); }}>
        <Ionicons name="locate" size={24} color={colors.primary} />
      </TouchableOpacity>

      {/* IDLE MENU */}
      {viewMode === 'IDLE' && (
        <View style={styles.bottomContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 10 }}>
                <TouchableOpacity style={styles.bottomChip} onPress={() => navigation.navigate('FavoriteRoutes')}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1e2b4d' : '#e8f0fe' }]}>
                        <Ionicons name="bookmark" size={22} color="#1a73e8" />
                    </View>
                    <Text style={styles.chipText}>Favoritos</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomChip} onPress={() => navigation.navigate('RoutePlanning')}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? '#4a2c2a' : '#fce8e6' }]}>
                        <Ionicons name="map" size={22} color="#ea4335" />
                    </View>
                    <Text style={styles.chipText}>Rutas</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.bottomChipHouse} onPress={handleHomePress}>
                    <View style={[styles.iconCircle, { backgroundColor: isDark ? '#1e3b26' : '#e6f4ea', marginRight: 0 }]}>
                        <Ionicons name="home" size={22} color="#34a853" />
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
      )}

      {/* PREVIEW MENU */}
      {viewMode === 'PREVIEW' && (
        <View style={styles.previewSheet}>
            <View style={styles.sheetHeader}>
                <View style={{flex:1}}>
                    <Text style={{fontSize: 26, fontWeight: 'bold', color: colors.primary}}>{routeInfo?.duration || '...'}</Text>
                    <Text style={{color: colors.textSecondary}} numberOfLines={1}>{destination?.description}</Text>
                </View>
                <TouchableOpacity onPress={resetMap}>
                    <Ionicons name="close-circle" size={30} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.transportSelector}>
                {['driving', 'transit', 'walking'].map((mode: any) => (
                    <TouchableOpacity 
                        key={mode} 
                        style={[styles.modeBtn, transportMode === mode && {backgroundColor: colors.primary+'20', borderColor: colors.primary}]}
                        onPress={() => { setTransportMode(mode); if(destination) fetchDirections(destination.latitude, destination.longitude, mode); }}
                    >
                        <Ionicons name={mode === 'driving' ? 'car' : mode === 'transit' ? 'bus' : 'walk'} size={24} color={transportMode === mode ? colors.primary : colors.textSecondary} />
                        <Text style={{fontSize:10, color: transportMode === mode ? colors.primary : colors.textSecondary}}>
                            {mode === 'driving' ? 'Auto' : mode === 'transit' ? 'Bus' : 'Pie'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowSaveModal(true)}>
                    <Ionicons name="heart-outline" size={20} color={colors.text} />
                    <Text style={{marginLeft:5, color:colors.text, fontSize: 12}}>Guardar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={() => setShowScheduleModal(true)}>
                    <Ionicons name="calendar-outline" size={20} color={colors.text} />
                    <Text style={{marginLeft:5, color:colors.text, fontSize: 12}}>Programar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryBtn} onPress={handleSetHomePress}>
                    <Ionicons name="home-outline" size={20} color={colors.text} />
                    <Text style={{marginLeft:5, color:colors.text, fontSize: 12}}>Hogar</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={startNavigation}>
                <Ionicons name="navigate" size={20} color="white" />
                <Text style={{marginLeft:5, color:'white', fontWeight:'bold', fontSize:16}}>INICIAR RUTA</Text>
            </TouchableOpacity>
        </View>
      )}

      {/* NAV PANEL */}
      {viewMode === 'NAVIGATING' && (
          <View style={styles.navPanel}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                   <View style={styles.navIconBox}>
                       <Ionicons name="arrow-up" size={30} color="white" />
                   </View>
                   <View style={{marginLeft:15}}>
                       <Text style={{fontSize:22, fontWeight:'bold', color:colors.text}}>{routeInfo?.duration}</Text>
                       <Text style={{color:colors.textSecondary}}>{routeInfo?.distance} restante</Text>
                   </View>
              </View>
              <TouchableOpacity onPress={stopNavigation} style={styles.exitBtn}>
                  <Text style={{color:'white', fontWeight:'bold'}}>SALIR</Text>
              </TouchableOpacity>
          </View>
      )}

      <Modal visible={showSaveModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Guardar Ruta</Text>
                <TextInput 
                    placeholder="Nombre (ej. Trabajo)"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.modalInput}
                    value={saveName}
                    onChangeText={setSaveName}
                />
                <View style={styles.modalFooter}>
                    <TouchableOpacity onPress={()=>setShowSaveModal(false)}><Text style={{color:'red', marginRight:20}}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={confirmSaveFavorite}><Text style={{color:colors.primary, fontWeight:'bold'}}>Guardar</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* MODAL PROGRAMAR (FIXED) */}
      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Programar Viaje</Text>
                <Text style={{color:colors.textSecondary, marginBottom:5}}>Nombre:</Text>
                <TextInput 
                    placeholder="Ej. Viaje a la playa"
                    placeholderTextColor={colors.textSecondary}
                    style={styles.modalInput}
                    value={scheduleName}
                    onChangeText={setScheduleName}
                />
                <Text style={{color:colors.textSecondary, marginBottom:5, marginTop:10}}>Fecha y Hora:</Text>
                
                {/* Botón que dispara el flujo seguro en Android */}
                <TouchableOpacity onPress={handleDatePress} style={[styles.modalInput, {justifyContent:'center'}]}>
                    <Text style={{color:colors.text}}>
                        {scheduleDate.toLocaleDateString()} - {scheduleDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                    </Text>
                </TouchableOpacity>

                {/* SOLO PARA IOS */}
                {showIOSDatePicker && Platform.OS === 'ios' && (
                    <View style={styles.datePickerContainer}>
                        <DateTimePicker
                            value={scheduleDate}
                            mode="datetime"
                            is24Hour={false}
                            display="spinner"
                            themeVariant={isDark ? 'dark' : 'light'} 
                            textColor={colors.text}
                            onChange={onIOSDateChange}
                            style={{ height: 120, width: '100%' }}
                        />
                        <TouchableOpacity onPress={()=>setShowIOSDatePicker(false)} style={{alignItems:'center', marginBottom:10}}>
                            <Text style={{color:colors.primary, fontWeight:'bold'}}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.modalFooter}>
                    <TouchableOpacity onPress={()=>setShowScheduleModal(false)}><Text style={{color:'red', marginRight:20}}>Cancelar</Text></TouchableOpacity>
                    <TouchableOpacity onPress={confirmSchedule}><Text style={{color:colors.primary, fontWeight:'bold'}}>Programar</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      <Modal visible={showHomePassModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Confirmar Cambio</Text>
                <Text style={{color:colors.textSecondary, marginBottom:15}}>Ingresa contraseña:</Text>
                <CustomInput
                    value={homePassword}
                    onChange={setHomePassword}
                    placeholder="Contraseña"
                    type="password"
                    icon="lock"
                    containerStyle={{marginBottom: 10}}
                />
                <View style={styles.modalFooter}>
                    <TouchableOpacity onPress={()=>{setShowHomePassModal(false); setHomePassword('');}}>
                        <Text style={{color:'red', marginRight:20}}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={confirmUpdateHome}>
                        <Text style={{color:colors.primary, fontWeight:'bold'}}>Confirmar</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    topContainer: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 30 },
    profileButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.surface, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5, overflow: 'hidden' },
    avatarImage: { width: '100%', height: '100%', resizeMode: 'cover' },
    searchBar: { flex: 1, marginLeft: 15, height: 50, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, backgroundColor: colors.surface, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 3.84, elevation: 5 },
    searchText: { flex: 1, fontSize: 16, paddingVertical: 8, color: colors.text },
    suggestionsBox: { position: 'absolute', top: 110, left: 35, right: 20, borderRadius: 10, maxHeight: 200, elevation: 10, zIndex: 40, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: {width:0, height:2} },
    suggestionItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 0.5, borderBottomColor: colors.border || '#ccc' },
    fabLocate: { position: 'absolute', right: 20, width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', elevation: 5, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.2 },
    bottomContainer: { position: 'absolute', bottom: 40, left: 0, right: 0, zIndex: 10 },
    bottomChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, marginRight: 15, height: 55, minWidth: 100, backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 4 },
    bottomChipHouse: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 28, width: 56, height: 56, backgroundColor: colors.surface, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 4 },
    iconCircle: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    chipText: { fontWeight: '600', fontSize: 14, color: colors.text },
    previewSheet: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, elevation: 20, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.2 },
    sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    transportSelector: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
    modeBtn: { width: 60, height: 50, borderRadius: 12, borderWidth: 1, borderColor: 'transparent', justifyContent: 'center', alignItems: 'center' },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10, borderRadius: 25, borderWidth: 1, borderColor: colors.border, flex: 1, justifyContent: 'center' },
    primaryBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, width: '100%', justifyContent: 'center', backgroundColor: colors.primary, marginTop: 10 },
    navPanel: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 130, borderTopLeftRadius: 20, borderTopRightRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, elevation: 20, backgroundColor: colors.surface },
    navIconBox: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#34a853', justifyContent: 'center', alignItems: 'center' },
    exitBtn: { backgroundColor: '#d93025', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
    vehicleMarker: { backgroundColor: '#1a73e8', padding: 8, borderRadius: 20, elevation: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '85%', padding: 20, borderRadius: 15, elevation: 5, backgroundColor: colors.surface },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: colors.text },
    modalInput: { borderWidth: 1, borderRadius: 10, padding: 12, width: '100%', marginBottom: 10, height: 50, color: colors.text, borderColor: colors.border },
    modalFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 15 },
    datePickerContainer: { height: 120, overflow: 'hidden', justifyContent: 'center', marginVertical: 10 },
  } as any);
}