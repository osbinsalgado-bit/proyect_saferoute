import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage'; // Importante
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAppDispatch } from '../store/hooks';
import { fetchClientProfile, uploadProfileImage } from '../store/clientSlice';
import CustomInput from '../components/CustomInput';
import FormMessage from '../util/FormMessage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const { login } = useAuth();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { i18n } = useLanguage();
  const dispatch = useAppDispatch();

  const handleLogin = async () => {
    setError(null);
    if (!email || !password) return setError(i18n.t('requiredFields'));

    setLoading(true);
    try {
      // 1. LOGIN
      const { data, error: loginError } = await login(email, password);
      if (loginError) throw loginError;

      const userId = data.user?.id;

      if (userId) {
        // 2. CHECK FOTO PENDIENTE (Recuperación de registro)
        const pendingKey = `pending_avatar_${userId}`;
        const pendingUri = await AsyncStorage.getItem(pendingKey);

        if (pendingUri) {
          // Si hay foto pendiente, la subimos ahora que tenemos sesión
          // Usamos 'await' para asegurar que se suba antes de traer el perfil
          await dispatch(uploadProfileImage({ userId, fileUri: pendingUri }));
          await AsyncStorage.removeItem(pendingKey); // Limpiamos
        }

        // 3. CARGAR PERFIL (Redux)
        // Esto llenará firstName, lastName, etc. en la app
        await dispatch(fetchClientProfile(userId));
      }

      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>{i18n.t('loginTitle')}</Text>

        <CustomInput value={email} onChange={setEmail} placeholder={i18n.t('email')} type="email" />
        <CustomInput value={password} onChange={setPassword} placeholder={i18n.t('password')} type="password" />

        <FormMessage message={error} type="error" />

        <TouchableOpacity 
          style={[styles.btn, { backgroundColor: colors.primary }]} 
          onPress={handleLogin} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white"/> : <Text style={styles.btnText}>{i18n.t('loginBtn')}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ marginTop: 20 }}>
          <Text style={{ color: colors.primary, textAlign: 'center' }}>{i18n.t('registerLink')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  card: { padding: 30, borderRadius: 20, borderWidth: 1 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  btn: { padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});