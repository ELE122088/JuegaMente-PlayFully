import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Focus states
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);

  const router = useRouter();
  const { colors } = useTheme();

  const handleRegister = async () => {
    // 1. Validaciones básicas de campos vacíos
    if (!username.trim() || !password.trim()) {
      if (Platform.OS === 'web') {
        alert('Campos Obligatorios: Por favor, complete todos los campos');
      } else {
        Alert.alert('Campos Obligatorios', 'Por favor, complete todos los campos');
      }
      return;
    }

    // 2. Validación de longitud de usuario (mínimo 4 letras)
    if (username.trim().length < 4) {
      if (Platform.OS === 'web') {
        alert('Usuario Inválido: El nombre de usuario debe tener al menos 4 caracteres');
      } else {
        Alert.alert('Usuario Inválido', 'El nombre de usuario debe tener al menos 4 caracteres');
      }
      return;
    }

    // 3. Validación de longitud de contraseña (mínimo 6 caracteres)
    if (password.trim().length < 6) {
      if (Platform.OS === 'web') {
        alert('Contraseña Débil: La contraseña debe tener al menos 6 caracteres');
      } else {
        Alert.alert('Contraseña Débil', 'La contraseña debe tener al menos 6 caracteres');
      }
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        username: username.trim(),
        password: password.trim(),
        role: 'user',
        isAdmin: false,
      });

      // Registro Exitoso: Mostrar confirmación y mandar al Login
      if (Platform.OS === 'web') {
        alert('¡Registro Exitoso! 🎉\n\nTu cuenta de estudiante ha sido creada correctamente. Ahora puedes iniciar sesión con tus credenciales.');
        router.replace('/login');
      } else {
        Alert.alert(
          '¡Registro Exitoso! 🎉',
          'Tu cuenta de estudiante ha sido creada correctamente. Ahora puedes iniciar sesión con tus credenciales.',
          [
            { 
              text: 'Ir al Inicio de Sesión', 
              onPress: () => router.replace('/login') 
            }
          ]
        );
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Error de conexión con el servidor';
      if (Platform.OS === 'web') {
        alert(`Error de Registro: ${msg}`);
      } else {
        Alert.alert('Error de Registro', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={styles.emoji}>🧠</Text>
        <Text style={[styles.title, { color: colors.text, marginBottom: 2 }]}>JuegaMente</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary, letterSpacing: 1.5, marginBottom: 6 }}>
          ( PLAYFULLY )
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Crea tu cuenta de estudiante para empezar</Text>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Usuario</Text>
          <TextInput
            style={[
              styles.input, 
              { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
              userFocused && { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 6 }
            ]}
            value={username}
            onChangeText={setUsername}
            onFocus={() => setUserFocused(true)}
            onBlur={() => setUserFocused(false)}
            placeholder="Elige un nombre de usuario"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>Contraseña</Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              style={[
                styles.input, 
                { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, paddingRight: 45 },
                passFocused && { borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.15, shadowRadius: 6 }
              ]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setPassFocused(true)}
              onBlur={() => setPassFocused(false)}
              placeholder="Crea una contraseña segura"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
            />
            <TouchableOpacity 
              style={styles.eyeButton} 
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>{showPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary, shadowColor: colors.primary }]} 
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Registrarse</Text>
          )}
        </TouchableOpacity>

        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>¿Ya tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.replace('/login')}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>Inicia sesión aquí</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 10px rgba(0,0,0,0.08)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 5 }),
  },
  emoji: {
    fontSize: 50,
    marginBottom: 10,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    width: '100%',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
    marginTop: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    // Definido dinámicamente
  },
  checkText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  button: {
    padding: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 6px rgba(0,0,0,0.2)' }
      : { shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 4 }),
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerContainer: {
    flexDirection: 'row',
    marginTop: 20,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  passwordWrapper: {
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 10,
  },
});
