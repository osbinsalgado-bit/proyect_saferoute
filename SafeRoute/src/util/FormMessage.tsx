import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';

interface Props {
  message?: any; 
  type?: 'error' | 'success' | 'info';
}

function getTranslationKey(error: any): string | null {
  if (!error) return null;
  
  // Extraer string del objeto error
  let msg = '';
  if (typeof error === 'string') msg = error;
  else if (typeof error === 'object') {
    msg = error.message || error.error_description || error.msg || JSON.stringify(error);
  }

  if (!msg) return null;
  const lowerMsg = msg.toLowerCase();

  // Mapeo de errores técnicos a claves de traducción
  if (lowerMsg.includes('invalid login credentials')) return 'db_invalid_login';
  if (lowerMsg.includes('user already exists') || lowerMsg.includes('duplicate key')) return 'db_user_exists';
  if (lowerMsg.includes('network request failed')) return 'db_connection';
  if (lowerMsg.includes('rate limit')) return 'db_wait';
  if (lowerMsg.includes('permission denied')) return 'db_permission';
  
  // Si es un mensaje personalizado (ej: validación de formulario manual), devolver raw
  return `RAW:${msg}`;
}

export default function FormMessage({ message, type = 'error' }: Props) {
  const { colors } = useTheme();
  const { i18n } = useLanguage();

  const keyOrRaw = getTranslationKey(message);
  if (!keyOrRaw) return null;

  let finalText = '';
  if (keyOrRaw.startsWith('RAW:')) {
    finalText = keyOrRaw.substring(4); // Mostrar tal cual
  } else {
    finalText = i18n.t(keyOrRaw); // Traducir
    if (finalText.includes('missing')) finalText = i18n.t('db_generic'); // Fallback
  }

  // Estilos según el tipo
  let bg = colors.error + '20'; // 20% opacidad
  let txt = colors.error;

  if (type === 'success') {
    bg = colors.success + '20';
    txt = colors.success;
  } else if (type === 'info') {
    bg = colors.primary + '20';
    txt = colors.primary;
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: txt }]}>{finalText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginVertical: 8, padding: 12, borderRadius: 8, width: '100%' },
  text: { fontSize: 13, fontWeight: '500' },
});