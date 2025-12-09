import React, { useEffect, useState, useRef } from 'react';
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
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppSelector, useAppDispatch } from '../store/hooks'; 
import { updateHomeLocation } from '../store/clientSlice'; // Acción corregida
import { supabase } from '../services/supabaseClient';
import { GOOGLE_MAPS_API_KEY_ENV } from '@env';

import MapView, { PROVIDER_GOOGLE, Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import * as polyline from '@mapbox/polyline'; // Importación corregida

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();
  const { i18n, t } = useLanguage();

  const client = useAppSelector((state) => state.client);

  // Estados del Mapa
  const [mapReady, setMapReady] = useState(false);
  const [region, setRegion] = useState({
    latitude: -34.6037,
    longitude: -58.3816,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  });
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  
  // Buscador
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<any>>([]);
  const debounceRef = useRef<number | null>(null);

  // --- Lógica de Selección de Casa / Ruta ---
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number, address?: string} | null>(null);
  const [showBottomModal, setShowBottomModal] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [showSaveRouteInput, setShowSaveRouteInput] = useState(false);
  
  // Inputs del Modal
  const [password, setPassword] = useState('');
  const [routeName, setRouteName] = useState('');
  const [routeInfo, setRouteInfo] = useState<{distance: string, duration: string, points: any[]} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Permisos y carga inicial
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
          setCurrentLocation(loc);
          setRegion({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
        }
      } catch (e) {
        console.log("Error obteniendo ubicación", e);
      }
    })();
  }, []);

  // Buscador de Google Places
  useEffect(() => {
    if (!query) {
      setSuggestions([]); 
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPlaceSuggestions(query), 500) as unknown as number;
  }, [query]);

  const fetchPlaceSuggestions = async (input: string) => {
    if (!GOOGLE_MAPS_API_KEY_ENV) return;
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY_ENV}&language=es`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.status === 'OK') setSuggestions(json.predictions);
    } catch (e) { console.log(e); }
  };

  const handleSelectSuggestion = async (placeId: string, description: string) => {
    setSuggestions([]);
    setQuery(description);
    
    // Obtener coordenadas
    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${GOOGLE_MAPS_API_KEY_ENV}`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.result?.geometry?.location) {
        const { lat, lng } = json.result.geometry.location;
        const newLoc = { lat, lng, address: description };
        
        setSelectedLocation(newLoc);
        setRegion(r => ({ ...r, latitude: lat, longitude: lng }));
        
        // Si no tiene casa configurada, abrir modal para ofrecer la opción
        if (!client.homeAddress) {
            setShowBottomModal(true);
            setShowPasswordInput(false);
            setShowSaveRouteInput(false);
            setRouteInfo(null);
        } else {
            // Si ya tiene casa, navegar directamente a planificación de ruta
            navigation.navigate('RoutePlanning', { destination: newLoc });
        }
      }
    } catch (e) { console.log(e); }
  };

  // --- LÓGICA PRINCIPAL DEL BOTÓN HOME ---
  const handleHomePress = () => {
    // Verificamos las 3 variables para evitar el error de Typescript
    if (client.homeAddress && client.homeLatitude && client.homeLongitude) {
      // YA TIENE CASA: Navegar
      Alert.alert(t('navigating') || 'Navegando', t('calculating') || 'Calculando ruta a casa...');
      
      fetchRouteData(
        { lat: client.homeLatitude, lng: client.homeLongitude }, 
        currentLocation ? { lat: currentLocation.coords.latitude, lng: currentLocation.coords.longitude } : undefined
      );
    } else {
      // NO TIENE CASA: Abrir modo configuración
      Alert.alert(
        t('setHomeTitle') || 'Configurar Casa', 
        t('setHomeDesc') || 'Busca tu dirección o toca un punto en el mapa.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Buscar en Mapa', onPress: () => {
             // Centrar en ubicación actual para que el usuario elija
             if (currentLocation) {
                 setRegion(r => ({...r, latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude}));
             }
          }},
        ]
      );
    }
  };

  // Al tocar el mapa para seleccionar punto manual
  const handleMapPress = async (e: any) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    
    let address = "Ubicación seleccionada";
    // Geocoding inverso
    try {
        if(GOOGLE_MAPS_API_KEY_ENV) {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY_ENV}`);
            const json = await res.json();
            if(json.results?.[0]) address = json.results[0].formatted_address;
        }
    } catch(err) {}

    setSelectedLocation({ lat: latitude, lng: longitude, address });
    
    // Abrir Modal
    setShowBottomModal(true);
    // Resetear estados internos del modal
    setShowPasswordInput(false);
    setShowSaveRouteInput(false);
    setRouteInfo(null);
  };

  // --- ACCIONES DEL MODAL ---

  // 1. Iniciar Ruta (Visualización Polyline)
  const handleStartRoute = async () => {
    if (!selectedLocation || !currentLocation) return;
    
    await fetchRouteData(selectedLocation, { 
        lat: currentLocation.coords.latitude, 
        lng: currentLocation.coords.longitude 
    });
  };

  const fetchRouteData = async (dest: {lat: number, lng: number}, origin?: {lat: number, lng: number}) => {
    if (!origin || !GOOGLE_MAPS_API_KEY_ENV) return;
    setIsProcessing(true);
    try {
        const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&key=${GOOGLE_MAPS_API_KEY_ENV}&mode=driving`;
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.routes.length) {
            const points = polyline.decode(json.routes[0].overview_polyline.points);
            const coords = points.map((point: any) => ({ latitude: point[0], longitude: point[1] }));
            const leg = json.routes[0].legs[0];
            
            setRouteInfo({
                distance: leg.distance.text,
                duration: leg.duration.text,
                points: coords
            });
            setShowBottomModal(true); // Re-abrir modal para mostrar info
        }
    } catch (e) {
        Alert.alert("Error", "No se pudo calcular la ruta");
    } finally {
        setIsProcessing(false);
    }
  };

  // 2. Guardar como Casa (Requiere contraseña)
  const handleSelectAsHome = () => {
    setShowPasswordInput(true);
    setShowSaveRouteInput(false);
  };

  const confirmSaveHome = async () => {
    if (!password || !selectedLocation || !client.id) return;
    setIsProcessing(true);

    try {
        // Verificar contraseña
        const { error: authError } = await supabase.auth.signInWithPassword({
            email: client.email,
            password: password
        });

        if (authError) {
            Alert.alert("Error", t('errorPassword') || "Contraseña incorrecta");
            setIsProcessing(false);
            return;
        }

        // Si es válida, guardar en DB via Redux
        await dispatch(updateHomeLocation({
            userId: client.id,
            address: selectedLocation.address || "Mi Casa",
            lat: selectedLocation.lat,
            lng: selectedLocation.lng
        })).unwrap();

        Alert.alert("Éxito", "Casa configurada correctamente");
        setShowBottomModal(false);
        setPassword('');
        setSelectedLocation(null);

    } catch (error) {
        Alert.alert("Error", "No se pudo guardar la configuración");
    } finally {
        setIsProcessing(false);
    }
  };

  // 3. Guardar Ruta en Favoritos
  const handleSaveRoutePress = () => {
    // Si aún no hemos calculado la ruta, calcularla primero
    if (!routeInfo && selectedLocation && currentLocation) {
        handleStartRoute().then(() => setShowSaveRouteInput(true));
    } else {
        setShowSaveRouteInput(true);
    }
    setShowPasswordInput(false);
  };

  const confirmSaveRoute = async () => {
    if (!routeName || !selectedLocation || !client.id) return;
    setIsProcessing(true);

    try {
        const { error } = await supabase.from('favorite_routes').insert({
            user_id: client.id,
            name: routeName,
            destination_text: selectedLocation.address,
            destination_lat: selectedLocation.lat,
            destination_lng: selectedLocation.lng,
            origin_lat: currentLocation?.coords.latitude,
            origin_lng: currentLocation?.coords.longitude,
        });

        if (error) throw error;
        Alert.alert("Éxito", t('routeSaved') || "Ruta guardada en favoritos");
        setShowBottomModal(false);
        setRouteName('');
    } catch (e) {
        Alert.alert("Error", "No se pudo guardar la ruta");
    } finally {
        setIsProcessing(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Top Bar (Perfil y Buscador) */}
      <View style={styles.topContainer}>
        <TouchableOpacity style={[styles.profileButton, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('Profile')}>
           {client.profileImage ? (
             <Image source={{ uri: client.profileImage }} style={styles.avatarImage} />
           ) : (
             <Ionicons name="person" size={24} color={colors.textSecondary} />
           )}
        </TouchableOpacity>

        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            placeholder={t('searchPlaceholder') || 'Buscar destino...'}
            placeholderTextColor={colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            style={[styles.searchText, { color: colors.text }]}
          />
        </View>
      </View>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
          <View style={[styles.suggestionsContainer, { backgroundColor: colors.surface }]}>
            <FlatList
                data={suggestions}
                keyExtractor={item => item.place_id}
                renderItem={({item}) => (
                    <TouchableOpacity style={styles.suggestionRow} onPress={() => handleSelectSuggestion(item.place_id, item.description)}>
                        <Text style={{color: colors.text}}>{item.description}</Text>
                    </TouchableOpacity>
                )}
                keyboardShouldPersistTaps="handled"
            />
          </View>
      )}

      {/* MAPA */}
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={region}
        onMapReady={() => setMapReady(true)}
        showsUserLocation={true}
        onPress={handleMapPress}
      >
        {selectedLocation && (
            <Marker coordinate={{ latitude: selectedLocation.lat, longitude: selectedLocation.lng }} pinColor="red" />
        )}
        {/* Marcador de Casa si existe */}
        {client.homeLatitude && client.homeLongitude && (
            <Marker 
                coordinate={{ latitude: client.homeLatitude, longitude: client.homeLongitude }} 
                title="Casa"
                pinColor="green"
            >
               <Ionicons name="home" size={30} color="#34a853" />
            </Marker>
        )}
        {/* Dibujar ruta si existe */}
        {routeInfo && routeInfo.points && (
            <Polyline coordinates={routeInfo.points} strokeWidth={4} strokeColor="#3498db" />
        )}
      </MapView>

      {/* Botones Inferiores Flotantes (Chips) */}
      <View style={styles.bottomContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <TouchableOpacity style={[styles.bottomChip, { backgroundColor: colors.surface }]} onPress={() => navigation.navigate('PastRoutes')}>
             <Ionicons name="bookmark" size={20} color="#1a73e8" style={{marginRight: 8}} />
             <Text style={{color: colors.text}}>Favoritos</Text>
          </TouchableOpacity>
          
          {/* Botón Home: Cambia de color si ya está configurado */}
          <TouchableOpacity style={[styles.bottomChipHouse, { backgroundColor: client.homeAddress ? colors.surface : '#e6f4ea' }]} onPress={handleHomePress}>
             <Ionicons name="home" size={22} color={client.homeAddress ? "#34a853" : "#1e8e3e"} />
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Botón flotante para centrar mapa */}
      <TouchableOpacity style={[styles.fabLocate, { backgroundColor: colors.primary }]} onPress={() => {
          if(currentLocation) setRegion(r => ({...r, latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude}));
      }}>
        <Ionicons name="locate" size={26} color="white" />
      </TouchableOpacity>


      {/* --- MODAL INFERIOR PERSONALIZADO --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showBottomModal}
        onRequestClose={() => setShowBottomModal(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.modalOverlay}>
            <TouchableOpacity style={styles.modalDismissArea} onPress={() => setShowBottomModal(false)} />
            
            <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
                {/* Indicador visual */}
                <View style={{alignSelf: 'center', width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, marginBottom: 15}} />
                
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {selectedLocation?.address?.substring(0, 50) || "Punto Seleccionado"}
                </Text>
                
                {/* Información de Ruta calculada */}
                {routeInfo && (
                    <View style={styles.routeInfoBox}>
                        <Text style={styles.routeInfoText}>⏱ {routeInfo.duration}   📏 {routeInfo.distance}</Text>
                    </View>
                )}

                {/* BOTONES PRINCIPALES (Visible si no hay sub-menu activo) */}
                {!showPasswordInput && !showSaveRouteInput && (
                    <View style={styles.actionButtonsRow}>
                        {/* Botón: Seleccionar como Casa */}
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e6f4ea' }]} onPress={handleSelectAsHome}>
                            <Ionicons name="home" size={24} color="#34a853" />
                            <Text style={styles.actionBtnText}>Es mi Casa</Text>
                        </TouchableOpacity>

                        {/* Botón: Iniciar Ruta */}
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#e8f0fe' }]} onPress={handleStartRoute}>
                            <Ionicons name="navigate" size={24} color="#1a73e8" />
                            <Text style={styles.actionBtnText}>{t('startRoute') || "Ruta"}</Text>
                        </TouchableOpacity>

                        {/* Botón: Guardar Favorito */}
                        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fce8e6' }]} onPress={handleSaveRoutePress}>
                            <Ionicons name="heart" size={24} color="#ea4335" />
                            <Text style={styles.actionBtnText}>{t('save') || "Guardar"}</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* SUB-MENU: CONTRASEÑA PARA CASA */}
                {showPasswordInput && (
                    <View style={styles.hiddenMenu}>
                        <Text style={{color: colors.text, marginBottom: 10}}>{t('enterPassword') || "Confirmar contraseña"}:</Text>
                        <TextInput 
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            placeholder={t('passwordPlaceholder') || "Contraseña"}
                            placeholderTextColor={colors.textSecondary}
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                        <View style={styles.rowRight}>
                            <TouchableOpacity onPress={() => setShowPasswordInput(false)}>
                                <Text style={{color: colors.textSecondary, marginRight: 20}}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={confirmSaveHome} disabled={isProcessing}>
                                {isProcessing ? <ActivityIndicator color="#fff"/> : <Text style={{color: '#fff'}}>Confirmar Casa</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* SUB-MENU: NOMBRE PARA GUARDAR RUTA */}
                {showSaveRouteInput && (
                    <View style={styles.hiddenMenu}>
                        <Text style={{color: colors.text, marginBottom: 10}}>{t('nameRoute') || "Nombre de la ruta"}:</Text>
                        <TextInput 
                            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
                            placeholder="Ej: Trabajo, Gimnasio..."
                            placeholderTextColor={colors.textSecondary}
                            value={routeName}
                            onChangeText={setRouteName}
                        />
                        <View style={styles.rowRight}>
                            <TouchableOpacity onPress={() => setShowSaveRouteInput(false)}>
                                <Text style={{color: colors.textSecondary, marginRight: 20}}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.primaryBtn} onPress={confirmSaveRoute} disabled={isProcessing}>
                                {isProcessing ? <ActivityIndicator color="#fff"/> : <Text style={{color: '#fff'}}>Guardar Favorito</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

            </View>
        </KeyboardAvoidingView>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  
  // Top bar styles
  topContainer: { position: 'absolute', top: 50, left: 20, right: 20, flexDirection: 'row', zIndex: 10 },
  profileButton: { width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  avatarImage: { width: '100%', height: '100%', borderRadius: 22.5 },
  searchBar: { flex: 1, marginLeft: 15, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, elevation: 5 },
  searchText: { flex: 1, fontSize: 16, padding: 8 },

  suggestionsContainer: { position: 'absolute', top: 105, left: 20, right: 20, zIndex: 20, borderRadius: 10, padding: 5, elevation: 6 },
  suggestionRow: { padding: 12, borderBottomWidth: 0.5, borderBottomColor: '#ccc' },

  bottomContainer: { position: 'absolute', bottom: 40, left: 0, right: 0 },
  scrollContent: { paddingHorizontal: 20 },
  bottomChip: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 20, marginRight: 15, height: 50, elevation: 4, minWidth: 100 },
  bottomChipHouse: { padding: 10, borderRadius: 25, width: 50, height: 50, justifyContent: 'center', alignItems: 'center', elevation: 4 },

  fabLocate: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 45,
    height: 45,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },

  // MODAL STYLES
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.3)' },
  modalDismissArea: { flex: 1 },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40, minHeight: 250, shadowColor: "#000", shadowOffset: {width: 0, height: -2}, shadowOpacity: 0.2, elevation: 20 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  
  actionButtonsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 10 },
  actionBtn: { alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 12, width: 90, height: 80 },
  actionBtnText: { fontSize: 12, marginTop: 8, fontWeight: '600', color: '#555' },
  
  hiddenMenu: { marginTop: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 15 },
  rowRight: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  primaryBtn: { backgroundColor: '#3498db', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },

  routeInfoBox: { backgroundColor: '#333', padding: 10, borderRadius: 8, marginBottom: 15, alignItems: 'center' },
  routeInfoText: { color: '#fff', fontWeight: 'bold' }
});