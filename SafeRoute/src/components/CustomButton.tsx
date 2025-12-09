// src/components/CustomButton.tsx
import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle, TextStyle } from 'react-native';

interface CustomButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary'; // Variante de diseño
  style?: ViewStyle; // Para estilos extra si hace falta
}

const CustomButton = ({ onPress, title, variant = 'primary', style }: CustomButtonProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        variant === 'primary' ? styles.containerPrimary : styles.containerSecondary,
        pressed && styles.pressed, // Efecto visual al presionar
        style
      ]}
    >
      <Text
        style={[
          styles.text,
          variant === 'primary' ? styles.textPrimary : styles.textSecondary,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 15,
    marginVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  // Estilos Variante Primaria (Ej. Login)
  containerPrimary: {
    backgroundColor: '#007AFF', // Azul iOS
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  // Estilos Variante Secundaria (Ej. Registrarse / Cancelar)
  containerSecondary: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF', // Borde azul opcional
    borderWidth: 1,
  },
  text: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  textPrimary: {
    color: 'white',
  },
  textSecondary: {
    color: '#007AFF',
  },
  // Efecto de opacidad al presionar
  pressed: {
    opacity: 0.7,
  },
});

export default CustomButton;