import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { fetchClientProfile, upsertClientProfile, uploadProfileImage } from '../store/clientSlice';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../services/supabaseClient';
import FormMessage from '../util/FormMessage';

export default function ProfileScreen() {
  const dispatch = useAppDispatch();
  const clientData = useAppSelector((state) => state.client);
  const { colors } = useTheme();
  const { i18n } = useLanguage();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Formulario Local
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [tempImageUri, setTempImageUri] = useState<string | null>(null);

  // Mensajes
  const [localError, setLocalError] = useState<any>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // 1. Cargar datos desde Redux
  useEffect(() => {
    setFirstName(clientData.firstName || '');
    setLastName(clientData.lastName || '');
    setPhone(clientData.phone || '');
  }, [clientData]);

  // 2. Obtener datos iniciales al montar pantalla
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.id) {
        if (!clientData.id || clientData.id !== user.id) {
          dispatch(fetchClientProfile(user.id));
        }
      }
    };
    init();
  }, [dispatch, clientData.id]);

  // 3. Seleccionar Imagen
  const pickImage = async () => {
    if (!isEditing) return; // Solo permite cambiar foto si está editando

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a la galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setTempImageUri(result.assets[0].uri);
    }
  };

  // 4. Guardar
  const handleSave = async () => {
    setIsSaving(true);
    setLocalError(null);
    setSuccessMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No hay sesión de usuario');

      // A) Subir Imagen (si hay nueva)
      if (tempImageUri) {
        console.log("Subiendo imagen...", tempImageUri);
        const uploadResult = await dispatch(uploadProfileImage({ userId: user.id, fileUri: tempImageUri }));
        
        // Verificamos si Redux rechazó la acción
        if (uploadProfileImage.rejected.match(uploadResult)) {
          throw new Error(String(uploadResult.payload));
        }
      }

      // B) Guardar Textos
      console.log("Guardando perfil...", { firstName, lastName, phone });
      const updateResult = await dispatch(upsertClientProfile({
        userId: user.id,
        payload: { firstName, lastName, phone }
      }));

      if (upsertClientProfile.rejected.match(updateResult)) {
        throw new Error(String(updateResult.payload));
      }

      setSuccessMsg(i18n.t('profileSaved'));
      setTempImageUri(null);
      setIsEditing(false);

    } catch (err: any) {
      console.error("Error al guardar:", err);
      setLocalError(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFirstName(clientData.firstName || '');
    setLastName(clientData.lastName || '');
    setPhone(clientData.phone || '');
    setTempImageUri(null);
    setLocalError(null);
    setIsEditing(false);
  };

  const currentImage = tempImageUri || clientData.profileImage;

  return (
    <ScrollView contentContainerStyle={[styles.container, { backgroundColor: colors.background }]}>
      
      {/* AVATAR */}
      <View style={styles.header}>
        <TouchableOpacity onPress={pickImage} disabled={!isEditing} style={{ position: 'relative' }}>
          {currentImage ? (
            <Image 
              source={{ uri: currentImage }} 
              style={[styles.avatar, { borderColor: isEditing ? colors.primary : colors.border }]} 
            />
          ) : (
            <View style={[styles.avatar, styles.placeholder, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <Text style={{ fontSize: 40, color: colors.textSecondary }}>
                {firstName ? firstName[0].toUpperCase() : '?'}
              </Text>
            </View>
          )}
          
          {/* Icono de cámara superpuesto si está editando */}
          {isEditing && (
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Text style={{color: 'white', fontSize: 18}}>📷</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={[styles.name, { color: colors.text }]}>
          {firstName} {lastName}
        </Text>
      </View>

      {/* MENSAJES */}
      <FormMessage message={localError} type="error" />
      <FormMessage message={successMsg} type="success" />

      {/* FORMULARIO */}
      <View style={styles.form}>
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('firstName')}</Text>
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            editable={isEditing}
            style={[styles.input, { 
              color: colors.text,
              backgroundColor: isEditing ? colors.inputBackground : 'transparent',
              borderWidth: isEditing ? 1 : 0,
              borderColor: colors.border
            }]}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('lastName')}</Text>
          <TextInput
            value={lastName}
            onChangeText={setLastName}
            editable={isEditing}
            style={[styles.input, { 
              color: colors.text,
              backgroundColor: isEditing ? colors.inputBackground : 'transparent',
              borderWidth: isEditing ? 1 : 0,
              borderColor: colors.border
            }]}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('phone')}</Text>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            editable={isEditing}
            keyboardType="phone-pad"
            style={[styles.input, { 
              color: colors.text,
              backgroundColor: isEditing ? colors.inputBackground : 'transparent',
              borderWidth: isEditing ? 1 : 0,
              borderColor: colors.border
            }]}
          />
        </View>

         <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>{i18n.t('email')}</Text>
          <TextInput
            value={clientData.email || ''}
            editable={false}
            style={[styles.input, { color: colors.textSecondary, opacity: 0.7 }]}
          />
        </View>
      </View>

      {/* BOTONES */}
      <View style={styles.footer}>
        {!isEditing ? (
          <TouchableOpacity 
            onPress={() => setIsEditing(true)} 
            style={[styles.btn, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.btnText, { color: colors.primary }]}>{i18n.t('editProfile')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity 
              onPress={handleCancel} 
              style={[styles.btnSmall, { backgroundColor: colors.error, marginRight: 10 }]}
              disabled={isSaving}
            >
              <Text style={styles.btnText}>{i18n.t('cancel')}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleSave} 
              style={[styles.btnSmall, { backgroundColor: colors.primary }]}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnText}>{i18n.t('saveChanges')}</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20 },
  header: { alignItems: 'center', marginBottom: 20, marginTop: 10 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3 },
  placeholder: { justifyContent: 'center', alignItems: 'center' },
  cameraBadge: { 
    position: 'absolute', bottom: 0, right: 0, 
    width: 36, height: 36, borderRadius: 18, 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: 2, borderColor: 'white' 
  },
  name: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  
  form: { marginTop: 10 },
  inputContainer: { marginBottom: 15 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 5, textTransform: 'uppercase' },
  input: { height: 50, borderRadius: 10, paddingHorizontal: 15, fontSize: 16, justifyContent: 'center' },
  
  footer: { marginTop: 20, marginBottom: 40 },
  btn: { width: '100%', height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  editActions: { flexDirection: 'row', justifyContent: 'space-between' },
  btnSmall: { flex: 1, height: 55, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnText: { fontWeight: 'bold', fontSize: 16, color: 'white' }
});