import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Platform } from 'react-native';
import Sidebar from '../components/Sidebar';
import storage from '../services/storage';

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

  const refreshUser = () => {
    try {
      const storedUser = storage.getItem('username') || '';
      const storedAdmin = storage.getItem('isAdmin') === 'true';
      const storedImage = storage.getItem('profileImage') || '';
      setUsername(storedUser);
      setIsAdmin(storedAdmin);
      setProfileImage(storedImage);
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

  return (
    <SidebarContext.Provider
      value={{
        sidebarOpen,
        setSidebarOpen,
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
