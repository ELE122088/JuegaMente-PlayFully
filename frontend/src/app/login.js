import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../services/api';
import storage from '../services/storage';
import { identifySocketUser } from '../services/socket';
import { useTheme } from '../context/ThemeContext';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Referencia al campo de contraseña para salto con Enter
  const passwordRef = useRef(null);
  
  // Estados de foco
  const [userFocused, setUserFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  
  // Estados de errores de validación
  const [errors, setErrors] = useState({ username: '', password: '' });
  const [generalError, setGeneralError] = useState('');
  
  const router = useRouter();
  const { colors } = useTheme();

  // Validación local de campos
  const validateForm = () => {
    let isValid = true;
    const newErrors = { username: '', password: '' };
    setGeneralError('');

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    // 1. Validar campo Usuario
    if (!cleanUsername) {
      newErrors.username = 'El nombre de usuario es obligatorio';
      isValid = false;
    } else if (cleanUsername.length < 4) {
      newErrors.username = 'El usuario debe tener al menos 4 caracteres';
      isValid = false;
    }

    // 2. Validar campo Contraseña
    if (!cleanPassword) {
      newErrors.password = 'La contraseña es obligatoria';
      isValid = false;
    } else if (cleanPassword.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleLogin = async () => {
    // Ejecutar validaciones locales antes de enviar la petición
    if (!validateForm()) {
      const firstError = errors.username || errors.password || 'Por favor, revise los campos marcados en rojo';
      if (Platform.OS === 'web') {
        // En web se muestra el error inline y banner
      } else {
        Alert.alert('Datos Incompletos', 'Por favor, revise los campos en rojo antes de continuar.');
      }
      return;
    }

    setLoading(true);
    setGeneralError('');

    try {
      const response = await api.post('/auth/login', {
        username: username.trim(),
        password: password.trim(),
      });

      // Guardar token e info en storage universal (Web y Móvil)
      storage.setItem('token', response.data.token);
      storage.setItem('username', response.data.username);
      storage.setItem('isAdmin', String(response.data.isAdmin));
      storage.setItem('isSuperAdmin', String(response.data.isSuperAdmin || false));
      storage.setItem('profileImage', response.data.profileImage || '');

      // ⚡ Identificar socket inmediatamente en el servidor
      identifySocketUser({
        username: response.data.username,
        isAdmin: response.data.isAdmin,
      });

      // Redirigir al inicio
      router.replace('/');
    } catch (error) {
      const msg = error.response?.data?.message || 'Error de conexión con el servidor';
      setGeneralError(msg);
      if (Platform.OS === 'web') {
        // Mostramos el banner general visible
      } else {
        Alert.alert('Error de Inicio de Sesión', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Image 
          source={require('../../assets/images/megamind_login.png')} 
          style={styles.mascotImage}
          resizeMode="contain"
        />
        <Text style={[styles.title, { color: colors.text, marginBottom: 2 }]}>JuegaMente</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.primary, letterSpacing: 1.5, marginBottom: 6 }}>
          ( PLAYFULLY )
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Inicia sesión para jugar y evaluar</Text>

        {/* Banner de error general del servidor o credenciales */}
        {generalError ? (
          <View style={styles.generalErrorBanner}>
            <Text style={styles.generalErrorText}>⚠️ {generalError}</Text>
          </View>
        ) : null}

        {/* Campo Usuario */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Usuario <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            style={[
              styles.input, 
              { 
                backgroundColor: colors.inputBg, 
                borderColor: errors.username ? '#EF4444' : colors.border, 
                color: colors.text 
              },
              userFocused && !errors.username && { 
                borderColor: colors.primary, 
                shadowColor: colors.primary, 
                shadowOpacity: 0.15, 
                shadowRadius: 6 
              }
            ]}
            value={username}
            onChangeText={(text) => {
              setUsername(text);
              if (errors.username) setErrors(prev => ({ ...prev, username: '' }));
              if (generalError) setGeneralError('');
            }}
            onFocus={() => setUserFocused(true)}
            onBlur={() => {
              setUserFocused(false);
              if (!username.trim()) {
                setErrors(prev => ({ ...prev, username: 'El nombre de usuario es obligatorio' }));
              } else if (username.trim().length < 4) {
                setErrors(prev => ({ ...prev, username: 'Mínimo 4 caracteres' }));
              }
            }}
            placeholder="Introduce tu usuario (mín. 4 letras)"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            {...(Platform.OS === 'web' ? {
              onKeyDown: (e) => {
                if (e.key === 'Enter') {
                  passwordRef.current?.focus();
                }
              }
            } : {})}
          />
          {errors.username ? (
            <Text style={styles.errorHelperText}>⚠️ {errors.username}</Text>
          ) : null}
        </View>

        {/* Campo Contraseña */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: colors.text }]}>
            Contraseña <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <View style={styles.passwordWrapper}>
            <TextInput
              ref={passwordRef}
              style={[
                styles.input, 
                { 
                  backgroundColor: colors.inputBg, 
                  borderColor: errors.password ? '#EF4444' : colors.border, 
                  color: colors.text, 
                  paddingRight: 45 
                },
                passFocused && !errors.password && { 
                  borderColor: colors.primary, 
                  shadowColor: colors.primary, 
                  shadowOpacity: 0.15, 
                  shadowRadius: 6 
                }
              ]}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                if (generalError) setGeneralError('');
              }}
              onFocus={() => setPassFocused(true)}
              onBlur={() => {
                setPassFocused(false);
                if (!password.trim()) {
                  setErrors(prev => ({ ...prev, password: 'La contraseña es obligatoria' }));
                } else if (password.trim().length < 6) {
                  setErrors(prev => ({ ...prev, password: 'Mínimo 6 caracteres' }));
                }
              }}
              placeholder="Introduce tu contraseña (mín. 6 caracteres)"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              returnKeyType="go"
              onSubmitEditing={handleLogin}
              {...(Platform.OS === 'web' ? {
                onKeyDown: (e) => {
                  if (e.key === 'Enter') {
                    handleLogin();
                  }
                }
              } : {})}
            />
            <TouchableOpacity 
              style={styles.eyeButton} 
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 18, color: colors.textSecondary }}>{showPassword ? '👁️' : '🙈'}</Text>
            </TouchableOpacity>
          </View>
          {errors.password ? (
            <Text style={styles.errorHelperText}>⚠️ {errors.password}</Text>
          ) : null}
        </View>

        {/* Botón de Iniciar Sesión */}
        <TouchableOpacity 
          style={[styles.button, { backgroundColor: colors.primary, shadowColor: colors.primary }]} 
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>

        {/* Enlace a Registro */}
        <View style={styles.registerContainer}>
          <Text style={[styles.registerText, { color: colors.textSecondary }]}>¿No tienes una cuenta? </Text>
          <TouchableOpacity onPress={() => router.replace('/register')}>
            <Text style={[styles.registerLink, { color: colors.primary }]}>Regístrate aquí</Text>
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
  mascotImage: {
    width: 110,
    height: 110,
    borderRadius: 24,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 6px 16px rgba(108,99,255,0.25)' }
      : { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 6 }),
  },
  title: {
    fontSize: Platform.OS === 'web' ? 28 : 24,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  generalErrorBanner: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 16,
    alignItems: 'center',
  },
  generalErrorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
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
    fontSize: 15,
    width: '100%',
  },
  errorHelperText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 2,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
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
