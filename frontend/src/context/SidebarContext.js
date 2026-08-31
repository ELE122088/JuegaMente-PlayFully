import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import Sidebar from '../components/Sidebar';
import storage from '../services/storage';
import api from '../services/api';
import { identifySocketUser } from '../services/socket';

const SidebarContext = createContext({
  sidebarOpen: false,
  setSidebarOpen: () => {},
  username: '',
  isAdmin: false,
  profileImage: '',
  refreshUser: () => {},
  handleLogout: () => {},
});

export function SidebarProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const router = useRouter();

  const refreshUser = async () => {
    try {
      const storedUser = storage.getItem('username') || '';
      const storedAdmin = storage.getItem('isAdmin') === 'true';
      const storedImage = storage.getItem('profileImage') || '';
      if (storedUser) setUsername(storedUser);
      setIsAdmin(storedAdmin);
      if (storedImage) setProfileImage(storedImage);

      if (storedUser) {
        identifySocketUser({ username: storedUser, isAdmin: storedAdmin });
      }

      // ⚡ Consultar en segundo plano al backend para obtener avatar actualizado de la BD
      const token = storage.getItem('token');
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          if (res.data) {
            if (res.data.username) {
              setUsername(res.data.username);
              storage.setItem('username', res.data.username);
            }
            if (res.data.profileImage !== undefined) {
              setProfileImage(res.data.profileImage || '');
              storage.setItem('profileImage', res.data.profileImage || '');
            }
            if (res.data.isAdmin !== undefined || res.data.role !== undefined) {
              const adminFlag = res.data.isAdmin || res.data.role === 'admin';
              setIsAdmin(adminFlag);
              storage.setItem('isAdmin', String(adminFlag));
            }
          }
        } catch (err) {
          // Fallback silencioso con datos locales
        }
      }
    } catch (e) {
      console.warn('Error al leer storage:', e);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogout = () => {
    const performLogout = () => {
      try {
        storage.removeItem('token');
        storage.removeItem('username');
        storage.removeItem('isAdmin');
        storage.removeItem('profileImage');
        setSidebarOpen(false);
        setUsername('');
        setIsAdmin(false);
        setProfileImage('');
        identifySocketUser({ username: 'Invitado/Anónimo', isAdmin: false });
        router.replace('/login');
      } catch (e) {
        console.error('Error al cerrar sesión:', e);
      }
    };

    if (Platform.OS === 'web') {
      const confirmLog = window.confirm('¿Estás seguro de que deseas cerrar sesión?');
      if (confirmLog) performLogout();
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro de que deseas cerrar sesión?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Cerrar Sesión', style: 'destructive', onPress: performLogout }
        ]
      );
    }
  };

  const handleSetSidebarOpen = (open) => {
    if (open) {
      refreshUser();
    }
    setSidebarOpen(open);
  };

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen: handleSetSidebarOpen,
        username,
        isAdmin,
        profileImage,
        refreshUser,
        handleLogout,
      }}
    >
      {children}
      <Sidebar 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        username={username}
        isAdmin={isAdmin}
        profileImage={profileImage}
        onLogout={handleLogout}
      />
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar debe ser utilizado dentro de un SidebarProvider');
  }
  return context;
}
