import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import storage from './storage';

// Función para obtener la URL base del backend local
export const getBaseUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://localhost:5000';
  }

  // Expo Go sabe la IP de la computadora mediante hostUri (ej. "192.168.1.15:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }

  // Fallback para emulador Android
  return 'http://10.0.2.2:5000';
};

export const BASE_URL = getBaseUrl();
const API_URL = `${BASE_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para inyectar el token JWT en cada request
api.interceptors.request.use(
  (config) => {
    // Asegurar baseURL actualizada
    config.baseURL = `${getBaseUrl()}/api`;
    const token = storage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPUESTA: redirigir al login si el token expiró (401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpiar sesión completa
      storage.removeItem('token');
      storage.removeItem('username');
      storage.removeItem('isAdmin');
      storage.removeItem('profileImage');
    }
    return Promise.reject(error);
  }
);

export default api;
