import React, { useEffect, useMemo, useState } from 'react';
import { View, TextInput, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';

interface ValidationRules {
  required?: boolean;
  minLength?: number;
  email?: boolean;
  number?: boolean;
  matchWith?: string;
  matchMessage?: string;
}

interface CustomInputProps {
  value: string;
  onChange: (text: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'password' | 'number';
  editable?: boolean;
  icon?: string;
  validateRules?: ValidationRules;
  onValidate?: (error: string | null) => void;
  containerStyle?: ViewStyle;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function CustomInput({
  value,
  onChange,
  placeholder = '',
  type = 'text',
  editable = true,
  icon,
  validateRules,
  onValidate,
  containerStyle,
}: CustomInputProps) {
  const { i18n } = useLanguage();
  const { colors } = useTheme();
  const [isSecureText, setIsSecureText] = useState(type === 'password');
  const [error, setError] = useState<string | null>(null);

  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    if (error) setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const runValidation = () => {
    if (!validateRules) {
      setError(null);
      onValidate && onValidate(null);
      return null;
    }
    const v = (value ?? '').trim();
    if (validateRules.required && v.length === 0) {
      const msg = i18n.t('fieldRequired') || 'Campo obligatorio';
      setError(msg);
      onValidate && onValidate(msg);
      return msg;
    }
    if (validateRules.email && v.length > 0 && !emailRegex.test(v)) {
      const msg = i18n.t('invalidEmail') || 'Correo inválido';
      setError(msg);
      onValidate && onValidate(msg);
      return msg;
    }
    if (validateRules.number && v.length > 0 && isNaN(Number(v))) {
      const msg = i18n.t('invalidFormat') || 'Valor numérico inválido';
      setError(msg);
      onValidate && onValidate(msg);
      return msg;
    }
    if (validateRules.minLength && v.length > 0 && v.length < (validateRules.minLength ?? 0)) {
      const msg =
        validateRules.minLength === 6
          ? i18n.t('weakPassword') || `Mínimo ${validateRules.minLength} caracteres`
          : i18n.t('tooShortPassword') || `Mínimo ${validateRules.minLength} caracteres`;
      setError(msg);
      onValidate && onValidate(msg);
      return msg;
    }
    if (validateRules.matchWith !== undefined && v !== (validateRules.matchWith ?? '')) {
      const msg = validateRules.matchMessage ?? (i18n.t('passwordsDontMatch') || 'No coincide');
      setError(msg);
      onValidate && onValidate(msg);
      return msg;
    }

    setError(null);
    onValidate && onValidate(null);
    return null;
  };

  const keyboardType = type === 'email' ? 'email-address' : type === 'number' ? 'numeric' : 'default';

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <View style={[styles.inputContainer, error && styles.inputError, !editable && styles.inputDisabledContainer]}>
        {icon ? <MaterialIcons name={icon as any} size={20} color={styles.iconColor.color} style={{ marginRight: 8 }} /> : null}
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={styles.placeholderColor.color}
          value={value}
          onChangeText={onChange}
          onBlur={runValidation}
          secureTextEntry={isSecureText}
          style={[styles.input, !editable && styles.inputDisabled]}
          editable={editable}
          keyboardType={keyboardType as any}
          autoCapitalize="none"
        />
        {type === 'password' && (
          <TouchableOpacity onPress={() => setIsSecureText((s) => !s)} style={styles.eye} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name={isSecureText ? 'eye' : 'eye-off'} size={22} color={styles.iconColor.color} />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function createStyles(colors: any) {
  return StyleSheet.create({
    wrapper: { width: '100%', marginVertical: 6 },
    inputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBackground ?? '#FFFFFF',
      borderRadius: 8,
      paddingHorizontal: 10,
      borderWidth: 1,
      borderColor: colors.border ?? '#D1D5DB',
      minHeight: 48,
    },
    input: {
      flex: 1,
      paddingVertical: 12,
      paddingHorizontal: 6,
      fontSize: 16,
      color: colors.text ?? '#111827',
    },
    inputDisabled: { color: colors.textSecondary ?? '#9CA3AF' },
    inputDisabledContainer: { opacity: 0.8 },
    inputError: { borderColor: colors.error ?? '#EF4444' },
    eye: { padding: 8 },
    errorText: { color: colors.error ?? '#EF4444', marginTop: 6, fontSize: 13 },
    iconColor: { color: colors.text ?? '#111827' },
    placeholderColor: { color: colors.textSecondary ?? '#6B7280' },
  } as any);
}