import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch } from '../store/hooks';
import { logoutClient } from '../store/clientSlice';

export default function SettingsScreen({ navigation }: any) {
  const { toggleTheme, colors, isDark } = useTheme(); 
  const { language, changeLanguage, t } = useLanguage();
  const { logout } = useAuth();
  const dispatch = useAppDispatch();

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
      <Text style={{ 
        color: language === code ? 'white' : colors.text,
        fontWeight: 'bold' 
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      
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
      <TouchableOpacity style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
         <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: colors.inputBackground }]}>
                 <Ionicons name="lock-closed" size={20} color={colors.text} />
            </View>
            <Text style={[styles.rowText, { color: colors.text }]}>Cambiar contraseña</Text>
         </View>
         <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <View style={{ marginTop: 40 }}>
        <TouchableOpacity 
            onPress={handleLogout}
            style={[styles.logoutButton, { backgroundColor: colors.surface, borderColor: colors.error }]}
        >
             <Text style={{ color: colors.error, fontWeight: 'bold' }}>{t('logout')}</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, 
    padding: 20 
  },
  sectionHeader: { 
    fontSize: 13, 
    fontWeight: 'bold', 
    marginBottom: 10, 
    marginLeft: 5 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1, 
    marginBottom: 10 
  },
  rowLeft: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconBox: { 
    width: 35, 
    height: 35, 
    borderRadius: 8, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginRight: 15 
  },
  rowText: { 
    fontSize: 16, 
    fontWeight: '500' 
  },

  langContainer: {
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    padding: 15, 
    borderRadius: 12, 
    borderWidth: 1
  },
  langBtn: {
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    borderWidth: 1, 
    minWidth: 80, 
    alignItems: 'center'
  },
  
  logoutButton: {
    padding: 18, 
    borderRadius: 12, 
    borderWidth: 1, 
    alignItems: 'center', 
    justifyContent: 'center'
  }
});