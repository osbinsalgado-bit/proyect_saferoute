import React, { useState } from 'react';
import { 
  View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView, 
  Modal, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext'; // Importamos el hook
import { useAppDispatch } from '../store/hooks';
import { logoutClient } from '../store/clientSlice';

export default function SettingsScreen({ navigation }: any) {
  const { toggleTheme, colors, isDark } = useTheme(); 
  const { language, changeLanguage, t } = useLanguage();
  
  // Extraemos changePassword y logout del AuthContext
  const { logout, changePassword } = useAuth(); 
  
  const dispatch = useAppDispatch();

  // Estados del Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogout = () => {
    Alert.alert(t('logout'), t('logoutConfirm'), [
        { text: t('cancel'), style: 'cancel' },
        { 
            text: t('logout'), 
            style: 'destructive', 
            onPress: () => {
                dispatch(logoutClient());
                logout();
            }
        }
    ]);
  };

  // --- LÓGICA CONECTADA AL AUTH CONTEXT ---
  const handleChangePassword = async () => {
    if (oldPassword.trim().length === 0 || newPassword.trim().length === 0) {
      Alert.alert("Atención", "Completa todos los campos");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Atención", "La nueva contraseña debe tener al menos 6 caracteres");
      return;
    }
    if (oldPassword === newPassword) {
      Alert.alert("Atención", "La nueva contraseña no puede ser igual a la anterior");
      return;
    }

    setLoading(true);

    try {
      // Usamos la función que creamos en AuthContext
      await changePassword(oldPassword, newPassword);
      
      Alert.alert("¡Éxito!", "Contraseña actualizada correctamente");
      closeModal();
    } catch (error: any) {
      Alert.alert("Error", error.message || "No se pudo cambiar la contraseña");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setModalVisible(false);
    setOldPassword('');
    setNewPassword('');
  };

  const LanguageButton = ({ code, label }: { code: 'es' | 'en' | 'fr', label: string }) => (
    <TouchableOpacity 
      onPress={() => changeLanguage(code)}
      style={[
        styles.langBtn, 
        { 
          backgroundColor: language === code ? colors.primary : colors.inputBackground,
          borderColor: language === code ? colors.primary : colors.border
        }
      ]}
    >
      <Text style={{ color: language === code ? 'white' : colors.text, fontWeight: 'bold' }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
        <ScrollView style={styles.container}>
        
        <Text style={[styles.sectionHeader, { color: colors.textSecondary }]}>{t('general') || 'GENERAL'}</Text>
        
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.inputBackground }]}>
                    <Ionicons name="moon" size={20} color={colors.text} />
                </View>
                <Text style={[styles.rowText, { color: colors.text }]}>{t('darkMode') || 'Modo Oscuro'}</Text>
            </View>
            <Switch 
                value={isDark} 
                onValueChange={toggleTheme} 
                thumbColor={isDark ? colors.primary : '#f4f3f4'}
                trackColor={{ false: '#767577', true: colors.secondary }}
            />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 20 }]}>{t('language') || 'IDIOMA'}</Text>
        <View style={[styles.langContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LanguageButton code="es" label="Español" />
            <LanguageButton code="en" label="English" />
            <LanguageButton code="fr" label="Français" />
        </View>

        <Text style={[styles.sectionHeader, { color: colors.textSecondary, marginTop: 20 }]}>{t('security') || 'SEGURIDAD'}</Text>
        
        <TouchableOpacity 
            style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setModalVisible(true)}
        >
            <View style={styles.rowLeft}>
                <View style={[styles.iconBox, { backgroundColor: colors.inputBackground }]}>
                    <Ionicons name="lock-closed" size={20} color={colors.text} />
                </View>
                <Text style={[styles.rowText, { color: colors.text }]}>Cambiar contraseña</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={{ marginTop: 40, marginBottom: 40 }}>
            <TouchableOpacity 
                onPress={handleLogout}
                style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.error }]}
            >
                <Text style={{ color: colors.error, fontWeight: 'bold' }}>{t('logout')}</Text>
            </TouchableOpacity>
        </View>

        </ScrollView>

        {/* MODAL */}
        <Modal
            animationType="slide"
            transparent={true}
            visible={modalVisible}
            onRequestClose={closeModal}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.modalOverlay}
            >
                <View style={[styles.modalContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    
                    <Text style={[styles.modalTitle, { color: colors.text }]}>Cambiar Contraseña</Text>
                    
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Contraseña Actual</Text>
                    <TextInput 
                        style={[styles.input, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.text,
                            borderColor: colors.border 
                        }]}
                        secureTextEntry
                        value={oldPassword}
                        onChangeText={setOldPassword}
                        placeholder="Ingresa tu contraseña actual"
                        placeholderTextColor={colors.textSecondary}
                    />

                    <Text style={[styles.label, { color: colors.textSecondary }]}>Nueva Contraseña</Text>
                    <TextInput 
                        style={[styles.input, { 
                            backgroundColor: colors.inputBackground, 
                            color: colors.text,
                            borderColor: colors.border 
                        }]}
                        secureTextEntry
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Ingresa la nueva contraseña"
                        placeholderTextColor={colors.textSecondary}
                    />

                    <View style={styles.modalButtons}>
                        <TouchableOpacity 
                            style={[styles.modalBtn, { backgroundColor: colors.inputBackground }]}
                            onPress={closeModal}
                        >
                            <Text style={{ color: colors.text }}>Cancelar</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                            onPress={handleChangePassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={{ color: 'white', fontWeight: 'bold' }}>Guardar</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  sectionHeader: { fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginLeft: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 35, height: 35, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  rowText: { fontSize: 16, fontWeight: '500' },
  langContainer: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, borderRadius: 12, borderWidth: 1 },
  langBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, minWidth: 80, alignItems: 'center' },
  logoutButton: { padding: 18, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { width: '85%', padding: 20, borderRadius: 20, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  label: { fontSize: 14, marginBottom: 5, marginLeft: 5 },
  input: { borderRadius: 10, padding: 12, borderWidth: 1, marginBottom: 15 },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: 'center', marginHorizontal: 5 }
});