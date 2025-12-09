import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import CustomInput from '../components/CustomInput';
import FormMessage from '../util/FormMessage';
import { uploadAvatarToStorage } from '../services/profileService';

export default function RegisterScreen() {
  const navigation = useNavigation<any>();
  const { register } = useAuth();
  const { colors } = useTheme();
  const { i18n } = useLanguage();

  // Estados
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [photo, setPhoto] = useState<string | null>(null); // Estado para la foto

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 1. FUNCIÓN PARA SELECCIONAR IMAGEN
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      setError(i18n.t('permissionDenied'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) setPhoto(result.assets[0].uri);
  };

  const handleRegister = async () => {
    setError(null);
    setSuccess(null);

    // Validación básica
    if (!firstName || !lastName || !email || !password) {
      return setError(i18n.t('requiredFields'));
    }

    setLoading(true);
    try {
      // 2. REGISTRO EN SUPABASE (Enviamos metadata para el Trigger SQL)
      // Nota: El trigger creará la fila en 'profiles' con firstName, lastName, etc.
      const { data, error: regError } = await register(email, password, { 
        first_name: firstName, 
        last_name: lastName, 
        phone 
      });

      if (regError) throw regError;

      // 3. LÓGICA DE SUBIDA DE IMAGEN
      if (data.user) {
        if (data.session) {
          // A) Si hay sesión (Auto-confirmación), subimos YA.
          if (photo) {
             await uploadAvatarToStorage(photo, data.user.id);
             // No necesitamos actualizar profiles aquí, el trigger ya creó la fila, 
             // pero idealmente deberíamos hacer un update del avatar_url.
             // Pero para simplificar, dejemos que el login lo maneje o hacerlo aqui si es vital.
          }
          navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } else {
          // B) Si NO hay sesión (Requiere confirmar correo), guardamos foto LOCALMENTE.
          if (photo) {
            await AsyncStorage.setItem(`pending_avatar_${data.user.id}`, photo);
          }
          setSuccess('checkEmailStyled'); // "Revisa tu correo"
        }
      }

    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>{i18n.t('registerTitle')}</Text>

      {/* COMPONENTE DE IMAGEN */}
      <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
        {photo ? (
          <Image source={{ uri: photo }} style={[styles.avatar, { borderColor: colors.border }]} />
        ) : (
          <View style={[styles.avatar, styles.placeholder, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 30, color: colors.textSecondary }}>+</Text>
            <Text style={{ fontSize: 10, color: colors.textSecondary }}>{i18n.t('uploadPhoto')}</Text>
          </View>
        )}
      </TouchableOpacity>

      <CustomInput value={firstName} onChange={setFirstName} placeholder={i18n.t('firstName')} />
      <CustomInput value={lastName} onChange={setLastName} placeholder={i18n.t('lastName')} />
      <CustomInput value={phone} onChange={setPhone} placeholder={i18n.t('phone')} type="number"/>
      <CustomInput value={email} onChange={setEmail} placeholder={i18n.t('email')} type="email" />
      <CustomInput value={password} onChange={setPassword} placeholder={i18n.t('password')} type="password" />

      <FormMessage message={error} type="error" />
      {success && <FormMessage message={i18n.t(success)} type="success" />}

      <TouchableOpacity 
        onPress={handleRegister} 
        style={[styles.btn, { backgroundColor: colors.primary }]} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>{i18n.t('registerBtn')}</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginTop: 20 }}>
        <Text style={{ color: colors.primary }}>{i18n.t('loginBtn')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 26, fontWeight: '700', marginBottom: 20 },
  imageContainer: { marginBottom: 20 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 1 },
  placeholder: { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' },
  btn: { padding: 14, borderRadius: 12, width: '100%', alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 }
});