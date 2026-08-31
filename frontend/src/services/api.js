import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import storage from './storage';

// URL del Backend en la Nube (Render)
export const CLOUD_BACKEND_URL = 'https://juegamente-playfully-1.onrender.com';

// Función para obtener la URL base del backend según el entorno
export const getBaseUrl = () => {
  // 1. En entorno Web (Navegador)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      // Si estamos en desarrollo local en PC (localhost o 127.0.0.1)
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
      }
    }
    // En Vercel / Netlify / Producción Web en la nube
    return CLOUD_BACKEND_URL;
  }

  // 2. En entorno Móvil (Expo Go en red local)
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }

  // 3. En APK de Producción móvil o sin red local
  return CLOUD_BACKEND_URL;
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
