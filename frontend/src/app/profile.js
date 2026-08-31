import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView, Alert, Platform, Image, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import api, { BASE_URL } from '../services/api';
import { getSocket } from '../services/socket';
import storage from '../services/storage';
import Header from '../components/Header';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

// Helper para sombras compatibles web/mobile sin advertencias
const createShadow = (color = '#000', offsetY = 2, opacity = 0.08, radius = 4, elevation = 3) => {
  if (Platform.OS === 'web') {
    const r = parseInt(color.slice(1, 3), 16) || 0;
    const g = parseInt(color.slice(3, 5), 16) || 0;
    const b = parseInt(color.slice(5, 7), 16) || 0;
    return {
      boxShadow: `0px ${offsetY}px ${radius}px rgba(${r},${g},${b},${opacity})`,
    };
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: offsetY },
    shadowOpacity: Math.min(1, opacity * 2.5),
    shadowRadius: radius,
    elevation,
  };
};

export const InteractiveActionBtn = ({
  style,
  accentColor = '#6C63FF',
  onPress,
  disabled = false,
  children,
  activeOpacity = 0.75,
  ...props
}) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <TouchableOpacity
      style={[
        style,
        Platform.OS === 'web' && {
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease, opacity 0.2s ease',
          cursor: disabled ? 'default' : 'pointer',
        },
        isActive && !disabled && {
          transform: [{ translateY: -2 }],
          borderColor: accentColor,
          ...createShadow(accentColor, 4, 0.35, 10, 6),
        },
      ]}
      onPress={onPress}
      onPressIn={() => !disabled && setIsActive(true)}
      onPressOut={() => !disabled && setIsActive(false)}
      disabled={disabled}
      activeOpacity={activeOpacity}
      {...(Platform.OS === 'web' && !disabled
        ? {
            onMouseEnter: () => setIsActive(true),
            onMouseLeave: () => setIsActive(false),
          }
        : {})}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export const PRESET_AVATARS = [
  {
    id: 'megamind_baby_gamer',
    name: 'Bebé Gamer',
    desc: 'Bebé con audífonos',
    badge: '👶',
    localSource: require('../../assets/images/avatars/avatar_megamind_baby_gamer.png'),
    serverPath: '/uploads/avatars/avatar_megamind_baby_gamer.png',
  },
  {
    id: 'megamind_baby_elegante',
    name: 'Bebé con Capa',
    desc: 'Traje negro y picos',
    badge: '🖤',
    localSource: require('../../assets/images/avatars/avatar_megamind_baby_elegante.png'),
    serverPath: '/uploads/avatars/avatar_megamind_baby_elegante.png',
  },
  {
    id: 'megamind_baby_travieso',
    name: 'Bebé Travieso',
    desc: 'Guiño de genio',
    badge: '⚡',
    localSource: require('../../assets/images/avatars/avatar_megamind_baby_travieso.png'),
    serverPath: '/uploads/avatars/avatar_megamind_baby_travieso.png',
  },
  {
    id: 'megamind_college',
    name: 'Universitario',
    desc: 'Chaqueta colegial JM',
    badge: '🎓',
    localSource: require('../../assets/images/avatars/avatar_megamind_college.png'),
    serverPath: '/uploads/avatars/avatar_megamind_college.png',
  },
  {
    id: 'megamind_sabio',
    name: 'Científico',
    desc: 'Átomo de ciencia',
    badge: '🔬',
    localSource: require('../../assets/images/avatars/avatar_megamind_sabio.png'),
    serverPath: '/uploads/avatars/avatar_megamind_sabio.png',
  },
  {
    id: 'megamind_graduado',
    name: 'Campeón Nº 1',
    desc: 'Birrete y copa dorada',
    badge: '🏆',
    localSource: require('../../assets/images/avatars/avatar_megamind_graduado.png'),
    serverPath: '/uploads/avatars/avatar_megamind_graduado.png',
  },
  {
    id: 'cerebrito_gamer',
    name: 'Cerebrito JM',
    desc: 'Mente estelar',
    badge: '🧠',
    localSource: require('../../assets/images/avatars/avatar_cerebrito_gamer.png'),
    serverPath: '/uploads/avatars/avatar_cerebrito_gamer.png',
  },
  {
    id: 'control_neon',
    name: 'Mando Neón',
    desc: 'Circuito cerebral',
    badge: '🎮',
    localSource: require('../../assets/images/avatars/avatar_control_neon.png'),
    serverPath: '/uploads/avatars/avatar_control_neon.png',
  },
];

export const AVAILABLE_THEMES = [
  { id: 'light', name: 'Claro', emoji: '☀️', color: '#5B52E0', bgPreview: '#EAECEF' },
  { id: 'dark', name: 'Oscuro', emoji: '🌙', color: '#6366F1', bgPreview: '#1A1D24' },
  { id: 'neon', name: 'Neón', emoji: '🌌', color: '#06B6D4', bgPreview: '#111322' },
  { id: 'midnight', name: 'Medianoche', emoji: '🏛️', color: '#38BDF8', bgPreview: '#0F172A' },
  { id: 'emerald', name: 'Esmeralda', emoji: '🍃', color: '#15803D', bgPreview: '#DFEBE3' },
  { id: 'sunset', name: 'Atardecer', emoji: '🌅', color: '#EA580C', bgPreview: '#F3E8DE' },
  { id: 'sakura', name: 'Sakura', emoji: '🌸', color: '#BE185D', bgPreview: '#F2E4EC' },
  { id: 'ocean', name: 'Océano', emoji: '🌊', color: '#0EA5E9', bgPreview: '#0C1929' },
  { id: 'gold', name: 'Dorado', emoji: '👑', color: '#D97706', bgPreview: '#1C1917' },
  { id: 'cyber', name: 'Púrpura', emoji: '🍇', color: '#8B5CF6', bgPreview: '#1E1B2E' },
];

export const getAvatarSource = (profileImage) => {
  if (!profileImage) return null;
  const match = PRESET_AVATARS.find((a) => a.serverPath === profileImage || a.id === profileImage);
  if (match) return match.localSource;
  if (profileImage.startsWith('http://') || profileImage.startsWith('https://') || profileImage.startsWith('data:')) {
    return { uri: profileImage };
  }
  return { uri: `${BASE_URL}${profileImage}` };
};

export default function ProfileScreen() {
  // ⚡ Inicialización instantánea con datos en caché para carga a 0ms
  const [profile, setProfile] = useState(() => {
    try {
      const cached = storage.getItem('cached_profile');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    const username = storage.getItem('username') || '';
    const isAdmin = storage.getItem('isAdmin') === 'true';
    const profileImage = storage.getItem('profileImage') || '';
    return username ? { username, isAdmin, profileImage, history: [] } : null;
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = storage.getItem('cached_profile');
      if (cached) return false;
      const username = storage.getItem('username');
      if (username) return false;
    } catch (e) {}
    return true;
  });

  // Detalle de partida seleccionada
  const [selectedGame, setSelectedGame] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Estados de Ranking en Tiempo Real para el Perfil
  const [rankingModalVisible, setRankingModalVisible] = useState(false);
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [selectedRankingCat, setSelectedRankingCat] = useState(null);
  const [liveRankingBadge, setLiveRankingBadge] = useState(false);

  const rankingModalVisibleRef = useRef(rankingModalVisible);
  const selectedRankingCatRef = useRef(selectedRankingCat);

  useEffect(() => {
    rankingModalVisibleRef.current = rankingModalVisible;
    selectedRankingCatRef.current = selectedRankingCat;
  }, [rankingModalVisible, selectedRankingCat]);

  const router = useRouter();
  const { theme, colors, setTheme } = useTheme();
  const { refreshUser } = useSidebar();
  // Estado para Navegación por Pestañas Superiores (Opción 1 Seleccionada)
  const [activeProfileTab, setActiveProfileTab] = useState('history'); // 'history' | 'performance' | 'achievements' | 'settings'
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);

  // Estados para Galería de Avatares Prediseñados
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false);
  const [avatarUpdating, setAvatarUpdating] = useState(false);

  // Estados para Cambiar Contraseña
  const [isPasswordExpanded, setIsPasswordExpanded] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Estados para Editar Perfil (Nombre de Usuario)
  const [isProfileEditExpanded, setIsProfileEditExpanded] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [profileEditLoading, setProfileEditLoading] = useState(false);

  // Referencia y controlador de desplazamiento horizontal para la Vitrina de Logros
  const achievementsScrollRef = useRef(null);
  const historyPillsScrollRef = useRef(null);
  const [isHeaderHovered, setIsHeaderHovered] = useState(false);
  const [isStripHovered, setIsStripHovered] = useState(false);
  const [isAchieveHovered, setIsAchieveHovered] = useState(false);
  const [isPerfHovered, setIsPerfHovered] = useState(false);
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  const handleScrollAchievements = (direction) => {
    if (achievementsScrollRef.current) {
      if (Platform.OS === 'web') {
        const domNode = achievementsScrollRef.current?.getScrollableNode
          ? achievementsScrollRef.current.getScrollableNode()
          : achievementsScrollRef.current;
        if (domNode && typeof domNode.scrollBy === 'function') {
          domNode.scrollBy({ left: direction * 280, behavior: 'smooth' });
          return;
        }
      }
      if (achievementsScrollRef.current.scrollTo) {
        achievementsScrollRef.current.scrollTo({
          x: direction > 0 ? 320 : 0,
          animated: true,
        });
      }
    }
  };

  // Helper para formatear fecha y hora completa con minutero y segundero
  const formatDateTimeWithSeconds = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    const seconds = pad(d.getSeconds());
    return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    fetchProfile(false); // Carga en segundo plano sin bloquear pantalla

    // ⚡ Escuchar actualizaciones de ranking en tiempo real vía WebSockets
    try {
      const socket = getSocket();

      const handleLiveRanking = async (data) => {
        const isVisible = rankingModalVisibleRef.current;
        const currentCat = selectedRankingCatRef.current;

        if (isVisible && currentCat) {
          if (!data?.categoryId || data.categoryId === currentCat._id || data.categoryName === currentCat.name) {
            try {
              if (currentCat._id) {
                const res = await api.get(`/categories/${currentCat._id}/ranking`);
                setRankingData(res.data);
              }
              setLiveRankingBadge(true);
              setTimeout(() => setLiveRankingBadge(false), 4000);
            } catch (err) {
              console.error('Error al actualizar ranking en vivo en perfil:', err);
            }
          }
        }
      };

      socket.on('ranking:updated', handleLiveRanking);

      return () => {
        socket.off('ranking:updated', handleLiveRanking);
      };
    } catch (err) {
      console.warn('No se pudo conectar socket en perfil:', err);
    }
  }, []);

  const handleOpenCategoryRanking = async (categoryId, categoryName) => {
    setRankingModalVisible(true);
    setSelectedRankingCat({ _id: categoryId, name: categoryName });

    // ⚡ Carga instantánea de ranking en caché a 0ms
    if (categoryId) {
      try {
        const cachedRank = storage.getItem(`cached_ranking_${categoryId}`);
        if (cachedRank) {
          setRankingData(JSON.parse(cachedRank));
          setRankingLoading(false);
        } else {
          setRankingLoading(true);
        }
      } catch (e) {
        setRankingLoading(true);
      }
    } else {
      setRankingLoading(true);
    }

    try {
      if (categoryId) {
        const res = await api.get(`/categories/${categoryId}/ranking`);
        setRankingData(res.data);
        setSelectedRankingCat(res.data.category || { _id: categoryId, name: categoryName });
        try {
          storage.setItem(`cached_ranking_${categoryId}`, JSON.stringify(res.data));
        } catch (e) {}
      } else {
        const catsRes = await api.get('/categories');
        const match = catsRes.data?.find(c => c.name === categoryName);
        if (match) {
          const res = await api.get(`/categories/${match._id}/ranking`);
          setRankingData(res.data);
          setSelectedRankingCat(match);
          try {
            storage.setItem(`cached_ranking_${match._id}`, JSON.stringify(res.data));
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error('Error al abrir ranking desde perfil:', err);
      if (!rankingData) {
        Alert.alert('Aviso', 'No se pudo cargar el ranking en este momento');
      }
    } finally {
      setRankingLoading(false);
    }
  };

  const fetchProfile = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await api.get('/auth/profile');
      setProfile(response.data);
      try {
        storage.setItem('cached_profile', JSON.stringify(response.data));
      } catch (e) {}
    } catch (error) {
      console.error('Error al cargar perfil:', error);
    } finally {
      if (showLoading) setLoading(false);
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const msg = 'Se requiere permiso para acceder a la galería para cambiar la foto de perfil.';
        if (Platform.OS === 'web') {
          alert(msg);
        } else {
          Alert.alert('Permiso requerido', msg);
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions ? ImagePicker.MediaTypeOptions.Images : 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await handleUploadImage(selectedImage.uri);
      }
    } catch (pickerError) {
      console.error('Error al seleccionar imagen:', pickerError);
      if (Platform.OS === 'web') {
        alert('Error al abrir la galería de imágenes.');
      } else {
        Alert.alert('Error', 'Error al abrir la galería de imágenes.');
      }
    }
  };

  const handleUploadImage = async (uri) => {
    setLoading(true);
    try {
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        const file = new File([blob], `avatar-${profile?.username || 'user'}.jpg`, { type: blob.type || 'image/jpeg' });
        formData.append('profileImage', file);
      } else {
        formData.append('profileImage', {
          uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
          name: `avatar-${profile?.username || 'user'}.jpg`,
          type: 'image/jpeg',
        });
      }

      const response = await api.post('/auth/profile/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProfile(prev => {
        const updated = {
          ...prev,
          profileImage: response.data.profileImage,
        };
        try {
          storage.setItem('cached_profile', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      storage.setItem('profileImage', response.data.profileImage);
      refreshUser();

      const successMsg = '¡Foto de perfil actualizada con éxito!';
      if (Platform.OS === 'web') {
        alert(successMsg);
      } else {
        Alert.alert('Éxito', successMsg);
      }
    } catch (uploadError) {
      console.error('Error al subir la imagen:', uploadError);
      const errMsg = uploadError.response?.data?.message || 'Hubo un problema al subir la foto de perfil.';
      if (Platform.OS === 'web') {
        alert(errMsg);
      } else {
        Alert.alert('Error', errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPresetAvatar = async (serverPath) => {
    if (serverPath === profile?.profileImage) return;

    setAvatarUpdating(true);

    // ⚡ Actualización optimista instantánea (0ms)
    setProfile((prev) => {
      const updated = {
        ...prev,
        profileImage: serverPath,
      };
      try {
        storage.setItem('cached_profile', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    storage.setItem('profileImage', serverPath);
    refreshUser();

    try {
      await api.put('/auth/profile', {
        profileImage: serverPath,
      });

      const successMsg = '¡Avatar de Megamente actualizado con éxito! 🧠✨';
      if (Platform.OS === 'web') alert(successMsg);
      else Alert.alert('Avatar de Megamente', successMsg);
    } catch (err) {
      console.error('Error al actualizar avatar:', err);
      const msg = err.response?.data?.message || 'No se pudo guardar el avatar';
      if (Platform.OS === 'web') alert(`Error: ${msg}`);
      else Alert.alert('Error', msg);
    } finally {
      setAvatarUpdating(false);
    }
  };

  const handleLogout = () => {
    const performLogout = () => {
      try {
        storage.removeItem('token');
        storage.removeItem('username');
        storage.removeItem('isAdmin');
        storage.removeItem('profileImage');
        refreshUser();
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

  const handleChangePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim()) {
      const msg = 'Por favor completa todos los campos de contraseña';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (newPassword.length < 4) {
      const msg = 'La nueva contraseña debe tener al menos 4 caracteres';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'La nueva contraseña y la confirmación no coinciden';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    setPassLoading(true);
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });

      const msg = response.data.message || '¡Contraseña actualizada correctamente!';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Éxito', msg);

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsPasswordExpanded(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al cambiar la contraseña';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setPassLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    const cleanName = editUsername.trim();
    if (!cleanName) {
      const msg = 'El nombre de usuario no puede estar vacío';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (cleanName.length < 4) {
      const msg = 'El nombre de usuario debe tener al menos 4 caracteres';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
      return;
    }

    if (cleanName === profile?.username) {
      setIsProfileEditExpanded(false);
      return;
    }

    setProfileEditLoading(true);
    try {
      const response = await api.put('/auth/profile', {
        username: cleanName,
      });

      setProfile((prev) => {
        const updated = {
          ...prev,
          username: response.data.username,
        };
        try {
          storage.setItem('cached_profile', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      storage.setItem('username', response.data.username);
      if (response.data.token) {
        storage.setItem('token', response.data.token);
      }
      refreshUser();

      const msg = '¡Nombre de usuario actualizado con éxito!';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Éxito', msg);

      setIsProfileEditExpanded(false);
    } catch (err) {
      const msg = err.response?.data?.message || 'Error al actualizar el nombre de usuario';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Error', msg);
    } finally {
      setProfileEditLoading(false);
    }
  };

  const [historyFilter, setHistoryFilter] = useState('all'); // 'all', 'perfect', 'passed', o nombre de materia

  const getStats = () => {
    if (!profile || !profile.history || profile.history.length === 0) {
      return { total: 0, average: 0, bestScore: 0, passed: 0, failed: 0 };
    }
    const total = profile.history.length;
    const sumPercentages = profile.history.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
    const average = Math.round(sumPercentages / total);
    const bestScore = Math.max(...profile.history.map((h) => h.percentage || 0));
    const passed = profile.history.filter((h) => (h.percentage || 0) >= 60).length;
    const failed = total - passed;
    return { total, average, bestScore, passed, failed };
  };

  const { total, average, bestScore, passed, failed } = getStats();

  // Obtener materias únicas presentes en el historial
  const getUniqueHistoryCategories = () => {
    if (!profile?.history) return [];
    const map = new Map();
    profile.history.forEach((item) => {
      const name = item.categoryName || 'Materia';
      if (!map.has(name)) {
        map.set(name, {
          name,
          count: 1,
          icon: item.categoryIcon || '📚',
        });
      } else {
        map.get(name).count += 1;
      }
    });
    return Array.from(map.values());
  };

  const uniqueHistoryCategories = getUniqueHistoryCategories();
  const perfectGamesCount = (profile?.history || []).filter((h) => h.percentage === 100).length;
  const passedGamesCount = (profile?.history || []).filter((h) => h.percentage >= 60).length;
  const failedGamesCount = (profile?.history || []).filter((h) => (h.percentage || 0) < 60).length;

  // Calcular análisis y desglose de rendimiento por materia
  const getSubjectPerformance = () => {
    if (!profile?.history || profile.history.length === 0) return [];

    const subjectMap = new Map();
    profile.history.forEach((h) => {
      const name = h.categoryName || 'Materia';
      const score = Number(h.score || 0);
      const total = Number(h.total || 0);
      const percentage = Number(h.percentage || 0);
      const icon = h.categoryIcon || '📚';
      const categoryId = h.categoryId || h.category;

      if (!subjectMap.has(name)) {
        subjectMap.set(name, {
          name,
          categoryId,
          icon,
          attempts: 1,
          totalScore: score,
          totalQuestions: total,
          sumPercentages: percentage,
          bestScore: percentage,
        });
      } else {
        const item = subjectMap.get(name);
        item.attempts += 1;
        item.totalScore += score;
        item.totalQuestions += total;
        item.sumPercentages += percentage;
        item.bestScore = Math.max(item.bestScore, percentage);
      }
    });

    return Array.from(subjectMap.values())
      .map((item) => {
        const avg = Math.round(item.sumPercentages / item.attempts);
        let statusLabel = '⚡ Buen Nivel';
        let statusColor = '#3B82F6';
        let statusBg = '#3B82F618';
        let barColor = '#3B82F6';

        if (avg >= 85) {
          statusLabel = '🌟 Dominada';
          statusColor = '#10B981';
          statusBg = '#10B98118';
          barColor = '#10B981';
        } else if (avg >= 70) {
          statusLabel = '⚡ Buen Nivel';
          statusColor = '#3B82F6';
          statusBg = '#3B82F618';
          barColor = '#3B82F6';
        } else if (avg >= 60) {
          statusLabel = '📘 Aprobada';
          statusColor = '#F59E0B';
          statusBg = '#F59E0B18';
          barColor = '#F59E0B';
        } else {
          statusLabel = '⚠️ Reforzar';
          statusColor = '#EF4444';
          statusBg = '#EF444418';
          barColor = '#EF4444';
        }

        return {
          ...item,
          average: avg,
          statusLabel,
          statusColor,
          statusBg,
          barColor,
        };
      })
      .sort((a, b) => b.average - a.average);
  };

  const subjectPerformance = getSubjectPerformance();
  const topSubject = subjectPerformance.length > 0 ? subjectPerformance[0] : null;
  const lowestSubject = subjectPerformance.length > 1 ? subjectPerformance[subjectPerformance.length - 1] : null;

  // Calcular logros e insignias desbloqueadas
  const getAchievements = () => {
    const history = profile?.history || [];
    const totalGames = history.length;
    const perfectGames = history.filter((h) => h.percentage === 100).length;

    // Calcular racha máxima de partidas consecutivas aprobadas
    let currentStreak = 0;
    let maxStreak = 0;
    const sortedChronological = [...history].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedChronological.forEach((h) => {
      if ((h.percentage || 0) >= 60) {
        currentStreak += 1;
        if (currentStreak > maxStreak) maxStreak = currentStreak;
      } else {
        currentStreak = 0;
      }
    });

    // Contar materias distintas aprobadas (>=60%)
    const passedSubjectSet = new Set(
      history.filter((h) => (h.percentage || 0) >= 60).map((h) => h.categoryName || 'Materia')
    );
    const passedSubjectCount = passedSubjectSet.size;

    // Partida con vidas intactas (3 vidas y nota >= 80%)
    const hasFullLivesWin = history.some((h) => (h.lives === 3 || h.lives === undefined) && (h.percentage || 0) >= 80);

    const achievementsList = [
      {
        id: 'perfect_sniper',
        icon: '🎯',
        name: 'Francotirador 100%',
        desc: 'Completa al menos 1 partida con 100% de efectividad.',
        current: perfectGames,
        target: 1,
        unlocked: perfectGames >= 1,
        color: '#8B5CF6',
        badge: '👑 Épico',
      },
      {
        id: 'streak_fire',
        icon: '🔥',
        name: 'Racha Imparable',
        desc: 'Alcanza una racha de 3 partidas seguidas aprobadas.',
        current: Math.min(maxStreak, 3),
        target: 3,
        unlocked: maxStreak >= 3,
        color: '#F59E0B',
        badge: '⚡ Racha',
      },
      {
        id: 'megamind_brain',
        icon: '🧠',
        name: 'Cerebro Titánico',
        desc: 'Completa 5 partidas en total demostrando constancia.',
        current: Math.min(totalGames, 5),
        target: 5,
        unlocked: totalGames >= 5,
        color: '#3B82F6',
        badge: '🤖 Genio',
      },
      {
        id: 'multidisciplinary',
        icon: '📚',
        name: 'Mente Políglota',
        desc: 'Aprueba al menos 3 materias o categorías diferentes.',
        current: Math.min(passedSubjectCount, 3),
        target: 3,
        unlocked: passedSubjectCount >= 3,
        color: '#10B981',
        badge: '🎓 Académico',
      },
      {
        id: 'untouchable',
        icon: '🛡️',
        name: 'Superviviente Intocable',
        desc: 'Gana una partida con excelente nota sin perder vidas.',
        current: hasFullLivesWin ? 1 : 0,
        target: 1,
        unlocked: hasFullLivesWin,
        color: '#EC4899',
        badge: '❤️ Campeón',
      },
      {
        id: 'golden_legend',
        icon: '🏆',
        name: 'Leyenda de Metro City',
        desc: 'Mantén un promedio general de 85% o más con 3+ partidas.',
        current: totalGames >= 3 && average >= 85 ? 1 : 0,
        target: 1,
        unlocked: totalGames >= 3 && average >= 85,
        color: '#EAB308',
        badge: '🌟 Oro',
      },
    ];

    const unlockedCount = achievementsList.filter((a) => a.unlocked).length;
    return { achievementsList, unlockedCount, totalCount: achievementsList.length };
  };

  const { achievementsList, unlockedCount, totalCount } = getAchievements();

  const getFilteredHistory = () => {
    if (!profile?.history) return [];
    if (historyFilter === 'all') return profile.history;
    if (historyFilter === 'perfect') return profile.history.filter((h) => h.percentage === 100);
    if (historyFilter === 'passed') return profile.history.filter((h) => h.percentage >= 60);
    if (historyFilter === 'failed') return profile.history.filter((h) => (h.percentage || 0) < 60);
    return profile.history.filter((h) => h.categoryName === historyFilter);
  };

  const filteredHistory = getFilteredHistory();

  const handleShowGameDetail = (game) => {
    setSelectedGame(game);
    setModalVisible(true);
  };

  const handleDeleteHistory = async (scoreId, event) => {
    event.stopPropagation(); // Evitar abrir el modal al tocar el botón de eliminar

    const performDelete = async () => {
      // ⚡ Actualización optimista instantánea (0ms de retraso visual)
      setProfile(prev => {
        if (!prev) return prev;
        const updatedHistory = (prev.history || []).filter(h => h._id !== scoreId);
        const updatedProfile = { ...prev, history: updatedHistory };
        try {
          storage.setItem('cached_profile', JSON.stringify(updatedProfile));
        } catch (e) {}
        return updatedProfile;
      });

      try {
        await api.delete(`/auth/history/${scoreId}`);
        fetchProfile(false); // Sincronización silenciosa en segundo plano
      } catch (error) {
        fetchProfile(false); // Revertir en caso de error
        const msg = error.response?.data?.message || 'No se pudo eliminar el registro';
        if (Platform.OS === 'web') {
          alert(`Error: ${msg}`);
        } else {
          Alert.alert('Error', msg);
        }
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm('¿Estás seguro de que deseas eliminar esta partida de tu historial? Esta acción no se puede deshacer.');
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        'Eliminar Registro',
        '¿Estás seguro de que deseas eliminar esta partida de tu historial?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const handleClearAllHistory = async () => {
    if (!profile?.history || profile.history.length === 0) return;

    const performClearAll = async () => {
      const backupHistory = profile.history;

      // ⚡ Actualización optimista instantánea a 0ms
      setProfile((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, history: [] };
        try {
          storage.setItem('cached_profile', JSON.stringify(updated));
        } catch (e) {}
        return updated;
      });

      try {
        await api.delete('/auth/history');
        fetchProfile(false); // Sincronizar en segundo plano
        const successMsg = '¡Tu historial de partidas ha sido vaciado por completo!';
        if (Platform.OS === 'web') alert(successMsg);
        else Alert.alert('Historial Vaciado', successMsg);
      } catch (error) {
        // Revertir en caso de error
        setProfile((prev) => ({ ...prev, history: backupHistory }));
        const msg = error.response?.data?.message || 'No se pudo vaciar el historial';
        if (Platform.OS === 'web') alert(`Error: ${msg}`);
        else Alert.alert('Error', msg);
      }
    };

    const confirmMsg = `¿Estás seguro de que deseas vaciar TODO tu historial (${profile.history.length} partidas)? Esta acción eliminará permanentemente tus notas registradas.`;

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMsg)) {
        performClearAll();
      }
    } else {
      Alert.alert(
        'Vaciar Todo el Historial',
        confirmMsg,
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Vaciar Todo', style: 'destructive', onPress: performClearAll },
        ]
      );
    }
  };

  function HistoryCardItem({ item, colors, onShowDetail, onOpenRanking, onDelete }) {
    const [isHovered, setIsHovered] = useState(false);

    const isGood = item.percentage >= 80;
    const isRegular = item.percentage >= 60 && item.percentage < 80;

    let medalEmoji = '⚠️';
    let statusText = 'Requiere Repaso';
    let statusColor = '#EF4444';
    let statusBg = '#EF444415';

    if (item.percentage === 100) {
      medalEmoji = '👑';
      statusText = 'Puntaje Perfecto';
      statusColor = '#8B5CF6';
      statusBg = '#8B5CF618';
    } else if (isGood) {
      medalEmoji = '🥇';
      statusText = 'Excelente';
      statusColor = '#10B981';
      statusBg = '#10B98118';
    } else if (isRegular) {
      medalEmoji = '🥈';
      statusText = 'Aprobado';
      statusColor = '#D97706';
      statusBg = '#F59E0B18';
    }

    const formattedDate = new Date(item.date).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <TouchableOpacity
        style={[
          styles.historyGamifiedCard,
          {
            backgroundColor: colors.card,
            borderColor: isHovered ? statusColor : colors.border,
            borderLeftColor: statusColor,
            transform: isHovered ? [{ translateY: -3 }] : [{ translateY: 0 }],
            ...(isHovered
              ? createShadow(statusColor, 6, 0.22, 14, 6)
              : createShadow('#000', 1, 0.04, 3, 2)),
          },
          Platform.OS === 'web' && {
            transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease',
            cursor: 'pointer',
          },
        ]}
        onPress={() => onShowDetail(item)}
        onPressIn={() => setIsHovered(true)}
        onPressOut={() => setIsHovered(false)}
        activeOpacity={0.75}
        {...(Platform.OS === 'web'
          ? {
              onMouseEnter: () => setIsHovered(true),
              onMouseLeave: () => setIsHovered(false),
            }
          : {})}
      >
        {/* Icono / Medalla */}
        <View
          style={[
            styles.historyIconContainer,
            {
              backgroundColor: statusBg,
              borderColor: `${statusColor}35`,
            },
          ]}
        >
          <Text style={styles.historyIcon}>{medalEmoji}</Text>
        </View>

        {/* Información Central */}
        <View style={styles.historyInfoContainer}>
          {/* Título de la Materia y Nota */}
          <View style={styles.historyTitleRow}>
            <Text
              style={[
                styles.historyTitle,
                {
                  color: colors.text,
                  fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
                },
              ]}
              numberOfLines={1}
            >
              {item.categoryName}
            </Text>

            <View style={[styles.historyScoreBadge, { backgroundColor: statusBg, borderColor: `${statusColor}40` }]}>
              <Text style={[styles.historyScoreVal, { color: statusColor }]}>{item.percentage}%</Text>
            </View>
          </View>

          {/* Fila 2: Fecha y Badges */}
          <View style={styles.historyMetaRow}>
            <Text style={[styles.historyDate, { color: colors.textSecondary }]}>
              📅 {formattedDate}
            </Text>
            <View style={styles.historyBadgesGroup}>
              {/* Puntos obtenidos */}
              <View style={[styles.historyBadge, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
                <Text style={[styles.historyBadgeText, { color: statusColor }]}>
                  🎯 {item.score}/{item.total} pts
                </Text>
              </View>

              {/* Estado */}
              <View style={[styles.historyBadge, { backgroundColor: statusBg, borderColor: `${statusColor}30` }]}>
                <Text style={[styles.historyBadgeText, { color: statusColor }]}>
                  {statusText}
                </Text>
              </View>
            </View>
          </View>

          {/* Fila 3: Botones de Acción (Espaciados y totalmente visibles) */}
          <View style={styles.historyActionGroup}>
            <InteractiveActionBtn
              style={[
                styles.historyActionBtn,
                { backgroundColor: '#F59E0B18', borderColor: '#F59E0B55' },
              ]}
              accentColor="#F59E0B"
              onPress={(e) => {
                e?.stopPropagation?.();
                onOpenRanking(item.category, item.categoryName);
              }}
              title="Ver Ranking de esta Materia"
            >
              <Text style={[styles.historyActionBtnText, { color: '#D97706' }]}>🏆 Ranking</Text>
            </InteractiveActionBtn>

            <InteractiveActionBtn
              style={[
                styles.historyDeleteBtn,
                { backgroundColor: '#EF444415', borderColor: '#EF444444' },
              ]}
              accentColor="#EF4444"
              onPress={(e) => {
                e?.stopPropagation?.();
                onDelete(item._id, e);
              }}
              title="Eliminar partida"
            >
              <Text style={styles.historyDeleteBtnText}>🗑️</Text>
            </InteractiveActionBtn>
          </View>
        </View>

        {/* Flecha o Botón Circular Detalle a la Derecha */}
        <View
          style={[
            styles.historyArrowCircle,
            {
              backgroundColor: isHovered ? statusColor : `${statusColor}15`,
              borderColor: `${statusColor}40`,
              transform: isHovered ? [{ scale: 1.08 }] : [{ scale: 1 }],
            },
            Platform.OS === 'web' && {
              transition: 'all 0.2s ease',
            },
          ]}
        >
          <Text style={[styles.historyArrowIcon, { color: isHovered ? '#FFFFFF' : statusColor }]}>
            ➜
          </Text>
        </View>
      </TouchableOpacity>
    );
  }

  const renderHistoryItem = ({ item }) => (
    <HistoryCardItem
      item={item}
      colors={colors}
      onShowDetail={handleShowGameDetail}
      onOpenRanking={handleOpenCategoryRanking}
      onDelete={handleDeleteHistory}
    />
  );

  if (loading && !profile) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={activeProfileTab === 'history' ? filteredHistory : []}
        keyExtractor={(item, index) => item._id || index.toString()}
        renderItem={renderHistoryItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Cabecera de Perfil Definitiva: Tarjeta Flotante Redondeada (Opción 2) */}
            <View style={[styles.profileSlimHeaderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Botón de Retorno Estilo iOS Nativo ‹ volver */}
              <TouchableOpacity
                style={styles.iosBackBtn}
                onPress={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/');
                }}
                activeOpacity={0.6}
              >
                <Text style={[styles.iosBackChevron, { color: colors.primary }]}>‹</Text>
                <Text style={[styles.iosBackText, { color: colors.primary }]}>volver</Text>
              </TouchableOpacity>

              {/* Avatar circular (Toca para cambiar foto o avatar) */}
              <TouchableOpacity
                style={[styles.slimAvatar, { backgroundColor: colors.primary }]}
                onPress={() => setIsAvatarExpanded(!isAvatarExpanded)}
                activeOpacity={0.8}
              >
                {profile?.profileImage ? (
                  <Image
                    source={getAvatarSource(profile.profileImage)}
                    style={styles.slimAvatarImg}
                  />
                ) : (
                  <Text style={[styles.slimAvatarTxt, { color: colors.primaryText }]}>
                    {profile?.username?.substring(0, 2).toUpperCase()}
                  </Text>
                )}
                <View style={[styles.slimAvatarBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={{ fontSize: 9 }}>🎭</Text>
                </View>
              </TouchableOpacity>

              {/* Nombre de Usuario + Insignia de Rol en la misma fila */}
              <View style={styles.slimUserInfo}>
                <Text style={[styles.slimUsername, { color: colors.text }]} numberOfLines={1}>
                  {profile?.username}
                </Text>
                <View style={[styles.slimRoleBadge, { backgroundColor: (profile?.role === 'admin' || profile?.isAdmin) ? '#F59E0B20' : `${colors.primary}20` }]}>
                  <Text style={[styles.slimRoleText, { color: (profile?.role === 'admin' || profile?.isAdmin) ? '#D97706' : colors.primary }]} numberOfLines={1}>
                    {profile?.role === 'admin' || profile?.isAdmin ? '👑 Administrador' : '🎓 Estudiante'}
                  </Text>
                </View>
              </View>
            </View>

            {/* =========================================================
                TIRA RESUMEN: ESTADÍSTICA MENTAL (5 KPIs SIEMPRE VISIBLES)
            ========================================================= */}
            <View style={styles.stripSectionHeader}>
              <Text style={[styles.stripSectionTitle, { color: colors.textSecondary }]}>
                🧠 ESTADÍSTICA MENTAL
              </Text>
            </View>

            <View style={[styles.stripContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* 1. Partidas */}
              <TouchableOpacity
                style={styles.stripCol}
                onPress={() => {
                  setHistoryFilter('all');
                  setActiveProfileTab('history');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.stripIcon}>🎮</Text>
                <Text style={[styles.stripVal, { color: colors.text }]}>{total}</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Partidas</Text>
              </TouchableOpacity>

              <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />

              {/* 2. Promedio */}
              <View style={styles.stripCol}>
                <Text style={styles.stripIcon}>{average >= 60 ? '🎯' : '📉'}</Text>
                <Text style={[styles.stripVal, { color: average >= 60 ? '#10B981' : '#EF4444' }]}>
                  {average}%
                </Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Promedio</Text>
              </View>

              <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />

              {/* 3. Mejor Récord */}
              <TouchableOpacity
                style={styles.stripCol}
                onPress={() => {
                  if (perfectGamesCount > 0) {
                    setHistoryFilter('perfect');
                    setActiveProfileTab('history');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.stripIcon}>🏆</Text>
                <Text style={[styles.stripVal, { color: '#F59E0B' }]}>{bestScore}%</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Récord</Text>
              </TouchableOpacity>

              <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />

              {/* 4. Aprobadas */}
              <TouchableOpacity
                style={styles.stripCol}
                onPress={() => {
                  setHistoryFilter('passed');
                  setActiveProfileTab('history');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.stripIcon}>✅</Text>
                <Text style={[styles.stripVal, { color: '#10B981' }]}>{passed}</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Aprobadas</Text>
              </TouchableOpacity>

              <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />

              {/* 5. Reprobadas */}
              <TouchableOpacity
                style={styles.stripCol}
                onPress={() => {
                  if (failedGamesCount > 0) {
                    setHistoryFilter('failed');
                    setActiveProfileTab('history');
                  }
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.stripIcon}>❌</Text>
                <Text style={[styles.stripVal, { color: '#EF4444' }]}>{failed}</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Reprobadas</Text>
              </TouchableOpacity>
            </View>

            {/* =========================================================
                OPCIÓN 1: SISTEMA DE PESTAÑAS SUPERIORES (TABS MODERNOS)
            ========================================================= */}
            <View style={[styles.profileTabBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* Pestaña 1: 🎮 Historial */}
              <InteractiveActionBtn
                style={[
                  styles.profileTabItem,
                  activeProfileTab === 'history' && [styles.profileTabItemActive, { backgroundColor: colors.primary }],
                ]}
                accentColor={colors.primary}
                onPress={() => setActiveProfileTab('history')}
              >
                <View style={styles.tabIconWrapper}>
                  <Text style={styles.profileTabEmoji}>🎮</Text>
                  {profile?.history && profile.history.length > 0 && (
                    <View
                      style={[
                        styles.profileTabFloatingBadge,
                        {
                          backgroundColor:
                            activeProfileTab === 'history' ? colors.primaryText : colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileTabFloatingBadgeText,
                          { color: activeProfileTab === 'history' ? colors.primary : colors.primaryText },
                        ]}
                      >
                        {profile.history.length}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.profileTabTitle,
                    { color: activeProfileTab === 'history' ? colors.primaryText : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Historial
                </Text>
              </InteractiveActionBtn>

              {/* Pestaña 2: 📊 Rendimiento */}
              <InteractiveActionBtn
                style={[
                  styles.profileTabItem,
                  activeProfileTab === 'performance' && [styles.profileTabItemActive, { backgroundColor: colors.primary }],
                ]}
                accentColor={colors.primary}
                onPress={() => setActiveProfileTab('performance')}
              >
                <View style={styles.tabIconWrapper}>
                  <Text style={styles.profileTabEmoji}>📊</Text>
                </View>
                <Text
                  style={[
                    styles.profileTabTitle,
                    { color: activeProfileTab === 'performance' ? colors.primaryText : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Rendimiento
                </Text>
              </InteractiveActionBtn>

              {/* Pestaña 3: 🏆 Logros */}
              <InteractiveActionBtn
                style={[
                  styles.profileTabItem,
                  activeProfileTab === 'achievements' && [styles.profileTabItemActive, { backgroundColor: colors.primary }],
                ]}
                accentColor="#10B981"
                onPress={() => setActiveProfileTab('achievements')}
              >
                <View style={styles.tabIconWrapper}>
                  <Text style={styles.profileTabEmoji}>🏆</Text>
                  {unlockedCount > 0 && (
                    <View
                      style={[
                        styles.profileTabFloatingBadge,
                        {
                          backgroundColor:
                            activeProfileTab === 'achievements' ? colors.primaryText : '#10B981',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.profileTabFloatingBadgeText,
                          { color: activeProfileTab === 'achievements' ? colors.primary : '#FFFFFF' },
                        ]}
                      >
                        {unlockedCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.profileTabTitle,
                    { color: activeProfileTab === 'achievements' ? colors.primaryText : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Logros
                </Text>
              </InteractiveActionBtn>

              {/* Pestaña 4: ⚙️ Ajustes */}
              <InteractiveActionBtn
                style={[
                  styles.profileTabItem,
                  activeProfileTab === 'settings' && [styles.profileTabItemActive, { backgroundColor: colors.primary }],
                ]}
                accentColor={colors.primary}
                onPress={() => setActiveProfileTab('settings')}
              >
                <View style={styles.tabIconWrapper}>
                  <Text style={styles.profileTabEmoji}>⚙️</Text>
                </View>
                <Text
                  style={[
                    styles.profileTabTitle,
                    { color: activeProfileTab === 'settings' ? colors.primaryText : colors.textSecondary },
                  ]}
                  numberOfLines={1}
                >
                  Ajustes
                </Text>
              </InteractiveActionBtn>
            </View>

            {/* =========================================================
                CONTENIDO DINÁMICO SEGÚN LA PESTAÑA SELECCIONADA
            ========================================================= */}

            {/* MÓDULO 1: 🏆 LOGROS E INSIGNIAS */}
            {activeProfileTab === 'achievements' && (
              <View
                style={[styles.achievementsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                {...(Platform.OS === 'web'
                  ? {
                      onMouseEnter: () => setIsAchieveHovered(true),
                      onMouseLeave: () => setIsAchieveHovered(false),
                    }
                  : {})}
              >
                <View style={styles.achievementsHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={[styles.achieveIconCircle, { backgroundColor: '#F59E0B18' }]}>
                      <Text style={styles.achieveHeaderIcon}>🏆</Text>
                    </View>
                    <View>
                      <Text style={[styles.achieveTitle, { color: colors.text }]}>
                        Vitrina de Logros e Insignias
                      </Text>
                      <Text style={[styles.achieveSubtitle, { color: colors.textSecondary }]}>
                        Desbloquea trofeos jugando y mejorando tus notas
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.achieveCounterBadge, { backgroundColor: unlockedCount > 0 ? '#10B98118' : `${colors.primary}18` }]}>
                    <Text style={[styles.achieveCounterText, { color: unlockedCount > 0 ? '#10B981' : colors.primary }]}>
                      {unlockedCount} / {totalCount}
                    </Text>
                  </View>
                </View>

                {/* Barra de progreso global de logros */}
                <View style={[styles.achieveGlobalProgressTrack, { backgroundColor: colors.border }]}>
                  <View
                    style={[
                      styles.achieveGlobalProgressFill,
                      {
                        width: `${Math.max(6, Math.round((unlockedCount / totalCount) * 100))}%`,
                        backgroundColor: unlockedCount === totalCount ? '#F59E0B' : colors.primary,
                      },
                    ]}
                  />
                </View>

                {/* Contenedor del Carrusel con Flechas Flotantes Inteligentes (Solo en Web) */}
                <View style={styles.achieveHoverWrapper}>
                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={[
                        styles.achieveHoverArrow,
                        styles.achieveHoverArrowLeft,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.primary,
                          opacity: isAchieveHovered ? 1 : 0,
                          transform: [
                            { translateY: -19 },
                            { scale: isAchieveHovered ? 1 : 0.85 },
                          ],
                        },
                      ]}
                      onPress={() => handleScrollAchievements(-1)}
                      activeOpacity={0.8}
                      accessibilityLabel="Deslizar a la izquierda"
                    >
                      <Text style={[styles.achieveHoverArrowText, { color: colors.primary }]}>‹</Text>
                    </TouchableOpacity>
                  )}

                  {/* Carrusel Deslizable Horizontal de Tarjetas de Logro */}
                  <ScrollView
                    ref={achievementsScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.achieveScrollContent}
                    style={Platform.OS === 'web' ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } : undefined}
                    {...(Platform.OS === 'web'
                      ? {
                          onWheel: (e) => {
                            if (e.deltaY !== 0) {
                              const domNode = achievementsScrollRef.current?.getScrollableNode
                                ? achievementsScrollRef.current.getScrollableNode()
                                : achievementsScrollRef.current;
                              if (domNode) {
                                domNode.scrollLeft += e.deltaY;
                              }
                            }
                          },
                        }
                      : {})}
                  >
                    {achievementsList.map((ach) => {
                      const progressPct = Math.min(100, Math.round((ach.current / ach.target) * 100));
                      return (
                        <View
                          key={ach.id}
                          style={[
                            styles.achieveItemCard,
                            {
                              backgroundColor: ach.unlocked ? `${ach.color}10` : colors.background,
                              borderColor: ach.unlocked ? `${ach.color}55` : colors.border,
                              borderLeftColor: ach.unlocked ? ach.color : colors.border,
                            },
                          ]}
                        >
                          <View style={styles.achieveTopRow}>
                            <View style={[styles.achieveBadgePill, { backgroundColor: ach.unlocked ? `${ach.color}25` : colors.border }]}>
                              <Text style={[styles.achieveBadgePillText, { color: ach.unlocked ? ach.color : colors.textSecondary }]}>
                                {ach.badge}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 13 }}>
                              {ach.unlocked ? '✨' : '🔒'}
                            </Text>
                          </View>

                          <View style={[styles.achieveItemIconWrapper, { backgroundColor: ach.unlocked ? `${ach.color}20` : `${colors.border}55` }]}>
                            <Text style={[styles.achieveItemIcon, !ach.unlocked && { opacity: 0.5 }]}>
                              {ach.icon}
                            </Text>
                          </View>

                          <Text style={[styles.achieveItemName, { color: colors.text }]} numberOfLines={1}>
                            {ach.name}
                          </Text>
                          <Text style={[styles.achieveItemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                            {ach.desc}
                          </Text>

                          <View style={styles.achieveMiniProgressContainer}>
                            <View style={[styles.achieveMiniTrack, { backgroundColor: colors.border }]}>
                              <View
                                style={[
                                  styles.achieveMiniFill,
                                  {
                                    width: `${ach.unlocked ? 100 : Math.max(8, progressPct)}%`,
                                    backgroundColor: ach.unlocked ? ach.color : colors.primary,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[styles.achieveMiniProgressText, { color: ach.unlocked ? ach.color : colors.textSecondary }]}>
                              {ach.unlocked ? '✓ Desbloqueado' : `${ach.current} / ${ach.target}`}
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </ScrollView>

                  {Platform.OS === 'web' && (
                    <TouchableOpacity
                      style={[
                        styles.achieveHoverArrow,
                        styles.achieveHoverArrowRight,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.primary,
                          opacity: isAchieveHovered ? 1 : 0,
                          transform: [
                            { translateY: -19 },
                            { scale: isAchieveHovered ? 1 : 0.85 },
                          ],
                        },
                      ]}
                      onPress={() => handleScrollAchievements(1)}
                      activeOpacity={0.8}
                      accessibilityLabel="Deslizar a la derecha"
                    >
                      <Text style={[styles.achieveHoverArrowText, { color: colors.primary }]}>›</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* MÓDULO 2: 📊 RENDIMIENTO POR MATERIA */}
            {activeProfileTab === 'performance' && (
              profile?.history && profile.history.length > 0 ? (
                <View style={[styles.subjectPerformanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.subjectPerfHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={[styles.subjectPerfHeaderIconCircle, { backgroundColor: `${colors.primary}18` }]}>
                        <Text style={styles.subjectPerfHeaderIcon}>📊</Text>
                      </View>
                      <View>
                        <Text style={[styles.subjectPerfTitle, { color: colors.text }]}>
                          Rendimiento por Materia
                        </Text>
                        <Text style={[styles.subjectPerfSubtitle, { color: colors.textSecondary }]}>
                          Toca una materia para ver sus partidas en el Historial
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.subjectCountBadge, { backgroundColor: `${colors.primary}18` }]}>
                      <Text style={[styles.subjectCountBadgeText, { color: colors.primary }]}>
                        {subjectPerformance.length} {subjectPerformance.length === 1 ? 'materia' : 'materias'}
                      </Text>
                    </View>
                  </View>

                  {/* Banner de Fortalezas */}
                  {topSubject && (
                    <View
                      style={[
                        styles.insightBanner,
                        {
                          backgroundColor: topSubject.average >= 75 ? '#10B98112' : `${colors.primary}12`,
                          borderColor: topSubject.average >= 75 ? '#10B98133' : `${colors.primary}33`,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 16 }}>
                        {topSubject.average >= 85 ? '🌟' : '💡'}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.insightText, { color: colors.text }]}>
                          {topSubject.average >= 85 ? (
                            <>¡Tu fuerte principal es <Text style={{ fontWeight: '800', color: '#10B981' }}>{topSubject.name}</Text> con <Text style={{ fontWeight: '800' }}>{topSubject.average}%</Text> de promedio!</>
                          ) : (
                            <>Mayor efectividad actual en <Text style={{ fontWeight: '800', color: colors.primary }}>{topSubject.name}</Text> ({topSubject.average}%).</>
                          )}
                          {lowestSubject && lowestSubject.average < 60 && (
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                              {` • `}
                              <Text style={{ fontWeight: '700', color: '#EF4444' }}>💡 Sugerencia:</Text>
                              {` Practica más en `}
                              <Text style={{ fontWeight: '700', color: colors.text }}>{lowestSubject.name}</Text>
                              {` (${lowestSubject.average}%) para subir tu promedio.`}
                            </Text>
                          )}
                        </Text>
                      </View>
                    </View>
                  )}

                  {/* Lista de Barras */}
                  <View style={styles.subjectBarsContainer}>
                    {subjectPerformance.map((subj) => {
                      return (
                        <InteractiveActionBtn
                          key={subj.name}
                          style={[
                            styles.subjectBarItem,
                            { backgroundColor: colors.background, borderColor: colors.border },
                          ]}
                          accentColor={subj.barColor}
                          onPress={() => {
                            setHistoryFilter(subj.name);
                            setActiveProfileTab('history');
                          }}
                        >
                          <View style={styles.subjectBarHeaderRow}>
                            <View style={styles.subjectNameWrapper}>
                              <Text style={styles.subjectIconEmoji}>{subj.icon}</Text>
                              <Text style={[styles.subjectItemName, { color: colors.text }]} numberOfLines={1}>
                                {subj.name}
                              </Text>
                            </View>

                            <View style={[styles.subjectStatusPill, { backgroundColor: subj.statusBg }]}>
                              <Text style={[styles.subjectStatusPillText, { color: subj.statusColor }]}>
                                {subj.statusLabel}
                              </Text>
                            </View>
                          </View>

                          <View style={[styles.subjectProgressTrack, { backgroundColor: colors.border }]}>
                            <View
                              style={[
                                styles.subjectProgressFill,
                                {
                                  width: `${Math.min(Math.max(subj.average, 8), 100)}%`,
                                  backgroundColor: subj.barColor,
                                },
                              ]}
                            />
                          </View>

                          <View style={styles.subjectMetricsRow}>
                            <Text style={[styles.subjectMetricAvg, { color: subj.statusColor }]}>
                              Promedio: <Text style={{ fontWeight: '800' }}>{subj.average}%</Text>
                            </Text>
                            <Text style={[styles.subjectMetricDetails, { color: colors.textSecondary }]}>
                              🏆 Récord: {subj.bestScore}% • 🎮 {subj.attempts} {subj.attempts === 1 ? 'partida' : 'partidas'} • {subj.totalScore}/{subj.totalQuestions} pts
                            </Text>
                          </View>
                        </InteractiveActionBtn>
                      );
                    })}
                  </View>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={{ fontSize: 36, marginBottom: 6 }}>📊</Text>
                  <Text style={[styles.emptyText, { color: colors.text }]}>Sin materias jugadas todavía</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Juega una partida para que aparezca tu análisis de materias aquí.</Text>
                </View>
              )
            )}

            {/* MÓDULO 3: ⚙️ CONFIGURACIÓN Y CUENTA */}
            {activeProfileTab === 'settings' && (
              <View style={[styles.settingsUnifiedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.settingsCardHeader}>
                  <Text style={[styles.settingsCardTitle, { color: colors.textSecondary }]}>⚙️ CONFIGURACIÓN Y CUENTA</Text>
                </View>

                {/* 1. Avatar */}
                <InteractiveActionBtn
                  onPress={() => setIsAvatarExpanded(!isAvatarExpanded)}
                  style={[styles.settingsRow, isAvatarExpanded && { backgroundColor: `${colors.primary}08` }]}
                  accentColor="#8B5CF6"
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconCircle, { backgroundColor: '#8B5CF618' }]}>
                      <Text style={styles.settingsRowIcon}>🎭</Text>
                    </View>
                    <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Avatar de Megamente</Text>
                  </View>
                  <View style={styles.settingsRowRight}>
                    <Text style={[styles.settingsRowValue, { color: colors.primary }]}>
                      {profile?.profileImage ? 'Elegir / Cambiar' : 'Predeterminado'}
                    </Text>
                    <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                      {isAvatarExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </InteractiveActionBtn>

                {isAvatarExpanded && (
                  <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                    <InteractiveActionBtn
                      style={[styles.uploadGalleryBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}44` }]}
                      accentColor={colors.primary}
                      onPress={handlePickImage}
                    >
                      <Text style={styles.uploadGalleryBtnIcon}>📷</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.uploadGalleryBtnTitle, { color: colors.text }]}>
                          Subir Foto Propia
                        </Text>
                        <Text style={[styles.uploadGalleryBtnSub, { color: colors.textSecondary }]}>
                          Elige una imagen desde tu galería o cámara
                        </Text>
                      </View>
                      <Text style={[styles.uploadGalleryBtnArrow, { color: colors.primary }]}>›</Text>
                    </InteractiveActionBtn>

                    <Text style={[styles.avatarGallerySectionTitle, { color: colors.textSecondary }]}>
                      O elige uno de nuestros 8 avatares exclusivos de Megamente:
                    </Text>

                    <View style={styles.avatarGrid}>
                      {PRESET_AVATARS.map((av) => {
                        const isSelected = profile?.profileImage === av.serverPath || profile?.profileImage === av.id;
                        return (
                          <InteractiveActionBtn
                            key={av.id}
                            style={[
                              styles.avatarCard,
                              { backgroundColor: colors.background, borderColor: colors.border },
                              isSelected && { borderColor: colors.primary, borderWidth: 2, backgroundColor: `${colors.primary}18` },
                            ]}
                            accentColor={colors.primary}
                            onPress={() => handleSelectPresetAvatar(av.serverPath)}
                            disabled={avatarUpdating}
                          >
                            <Image source={av.localSource} style={styles.avatarCardImg} />
                            <Text style={[styles.avatarCardName, { color: colors.text }]} numberOfLines={1}>
                              {av.name}
                            </Text>
                            <Text style={[styles.avatarCardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                              {av.desc}
                            </Text>
                            {isSelected && (
                              <View style={[styles.avatarSelectedCheck, { backgroundColor: colors.primary }]}>
                                <Text style={styles.avatarSelectedCheckText}>✓</Text>
                              </View>
                            )}
                          </InteractiveActionBtn>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

                {/* 2. Temas */}
                <InteractiveActionBtn
                  onPress={() => setIsThemeExpanded(!isThemeExpanded)}
                  style={[styles.settingsRow, isThemeExpanded && { backgroundColor: `${colors.primary}08` }]}
                  accentColor={colors.primary}
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconCircle, { backgroundColor: `${colors.primary}18` }]}>
                      <Text style={styles.settingsRowIcon}>🎨</Text>
                    </View>
                    <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Tema Visual</Text>
                  </View>
                  <View style={styles.settingsRowRight}>
                    <Text style={[styles.settingsRowValue, { color: colors.primary }]}>
                      {AVAILABLE_THEMES.find(t => t.id === theme)?.name || 'Cyber Dark'}
                    </Text>
                    <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                      {isThemeExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </InteractiveActionBtn>

                {isThemeExpanded && (
                  <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                    <View style={styles.themeOptionsGrid}>
                      {AVAILABLE_THEMES.map((item) => {
                        const isSelected = theme === item.id;
                        return (
                          <InteractiveActionBtn
                            key={item.id}
                            style={[
                              styles.themeOption,
                              { backgroundColor: colors.background, borderColor: colors.border },
                              isSelected && [styles.themeOptionActive, { borderColor: item.color, borderWidth: 1.5, backgroundColor: `${item.color}15` }]
                            ]}
                            accentColor={item.color}
                            onPress={() => setTheme(item.id)}
                          >
                            <Text style={styles.themeEmoji}>{item.emoji}</Text>
                            <Text style={[styles.themeText, { color: isSelected ? item.color : colors.text, fontWeight: isSelected ? '700' : '500' }]}>
                              {item.name}
                            </Text>
                          </InteractiveActionBtn>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

                {/* 3. Nombre */}
                <InteractiveActionBtn
                  onPress={() => {
                    if (!isProfileEditExpanded) {
                      setEditUsername(profile?.username || '');
                    }
                    setIsProfileEditExpanded(!isProfileEditExpanded);
                  }}
                  style={[styles.settingsRow, isProfileEditExpanded && { backgroundColor: `${colors.primary}08` }]}
                  accentColor="#10B981"
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconCircle, { backgroundColor: '#10B98118' }]}>
                      <Text style={styles.settingsRowIcon}>✏️</Text>
                    </View>
                    <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Nombre de Usuario</Text>
                  </View>
                  <View style={styles.settingsRowRight}>
                    <Text style={[styles.settingsRowValue, { color: colors.primary }]} numberOfLines={1}>
                      {profile?.username}
                    </Text>
                    <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                      {isProfileEditExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </InteractiveActionBtn>

                {isProfileEditExpanded && (
                  <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                    <View style={styles.passwordFormContainer}>
                      <Text style={[styles.passInputLabel, { color: colors.text }]}>Nuevo Nombre de Usuario</Text>
                      <View style={[styles.passInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.passInput, { color: colors.text }]}
                          placeholder="Mínimo 4 caracteres"
                          placeholderTextColor={colors.textSecondary}
                          value={editUsername}
                          onChangeText={setEditUsername}
                          autoCapitalize="none"
                          autoCorrect={false}
                          maxLength={30}
                        />
                      </View>
                      <InteractiveActionBtn
                        style={[styles.savePassBtn, { backgroundColor: colors.primary }]}
                        accentColor={colors.primary}
                        onPress={handleUpdateProfile}
                        disabled={profileEditLoading}
                      >
                        {profileEditLoading ? (
                          <ActivityIndicator color={colors.primaryText} size="small" />
                        ) : (
                          <Text style={[styles.savePassBtnText, { color: colors.primaryText }]}>
                            Guardar Nombre
                          </Text>
                        )}
                      </InteractiveActionBtn>
                    </View>
                  </View>
                )}

                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

                {/* 4. Contraseña */}
                <InteractiveActionBtn
                  onPress={() => setIsPasswordExpanded(!isPasswordExpanded)}
                  style={[styles.settingsRow, isPasswordExpanded && { backgroundColor: `${colors.primary}08` }]}
                  accentColor="#F59E0B"
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconCircle, { backgroundColor: '#F59E0B18' }]}>
                      <Text style={styles.settingsRowIcon}>🔒</Text>
                    </View>
                    <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Cambiar Contraseña</Text>
                  </View>
                  <View style={styles.settingsRowRight}>
                    <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                      {isPasswordExpanded ? '▲' : '▼'}
                    </Text>
                  </View>
                </InteractiveActionBtn>

                {isPasswordExpanded && (
                  <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                    <View style={styles.passwordFormContainer}>
                      <Text style={[styles.passInputLabel, { color: colors.text }]}>Contraseña Actual</Text>
                      <View style={[styles.passInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.passInput, { color: colors.text }]}
                          placeholder="Ingresa tu clave actual"
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry={!showCurrentPass}
                          value={currentPassword}
                          onChangeText={setCurrentPassword}
                        />
                        <InteractiveActionBtn onPress={() => setShowCurrentPass(!showCurrentPass)} style={styles.eyeBtn} accentColor={colors.primary}>
                          <Text style={{ fontSize: 13 }}>{showCurrentPass ? '👁️' : '🙈'}</Text>
                        </InteractiveActionBtn>
                      </View>

                      <Text style={[styles.passInputLabel, { color: colors.text }]}>Nueva Contraseña</Text>
                      <View style={[styles.passInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.passInput, { color: colors.text }]}
                          placeholder="Nueva contraseña (mín. 4 caracteres)"
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry={!showNewPass}
                          value={newPassword}
                          onChangeText={setNewPassword}
                        />
                        <InteractiveActionBtn onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn} accentColor={colors.primary}>
                          <Text style={{ fontSize: 13 }}>{showNewPass ? '👁️' : '🙈'}</Text>
                        </InteractiveActionBtn>
                      </View>

                      <Text style={[styles.passInputLabel, { color: colors.text }]}>Confirmar Nueva Contraseña</Text>
                      <View style={[styles.passInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
                        <TextInput
                          style={[styles.passInput, { color: colors.text }]}
                          placeholder="Repite la nueva clave"
                          placeholderTextColor={colors.textSecondary}
                          secureTextEntry={!showNewPass}
                          value={confirmPassword}
                          onChangeText={setConfirmPassword}
                        />
                      </View>

                      <InteractiveActionBtn
                        style={[styles.savePassBtn, { backgroundColor: colors.primary }]}
                        accentColor={colors.primary}
                        onPress={handleChangePassword}
                        disabled={passLoading}
                      >
                        {passLoading ? (
                          <ActivityIndicator color={colors.primaryText} size="small" />
                        ) : (
                          <Text style={[styles.savePassBtnText, { color: colors.primaryText }]}>
                            Guardar Nueva Contraseña
                          </Text>
                        )}
                      </InteractiveActionBtn>
                    </View>
                  </View>
                )}

                <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

                {/* 5. Cerrar Sesión */}
                <InteractiveActionBtn
                  onPress={handleLogout}
                  style={styles.settingsRow}
                  accentColor="#EF4444"
                >
                  <View style={styles.settingsRowLeft}>
                    <View style={[styles.settingsIconCircle, { backgroundColor: '#EF444418' }]}>
                      <Text style={styles.settingsRowIcon}>🚪</Text>
                    </View>
                    <Text style={[styles.settingsRowLabel, { color: '#EF4444' }]}>Cerrar Sesión</Text>
                  </View>
                  <View style={styles.settingsRowRight}>
                    <Text style={[styles.settingsChevron, { color: '#EF4444' }]}>›</Text>
                  </View>
                </InteractiveActionBtn>
              </View>
            )}

            {/* MÓDULO 4: 🎮 HISTORIAL DE PARTIDAS Y FILTROS */}
            {activeProfileTab === 'history' && (
              <>
                <View style={styles.historySectionHeaderRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 0, marginBottom: 0 }]}>
                      Partidas Jugadas
                    </Text>
                    {profile?.history && profile.history.length > 0 && (
                      <View style={[styles.historyCountBadge, { backgroundColor: `${colors.primary}20` }]}>
                        <Text style={[styles.historyCountBadgeText, { color: colors.primary }]}>
                          {filteredHistory.length}
                          {filteredHistory.length !== profile.history.length ? ` / ${profile.history.length}` : ''}
                        </Text>
                      </View>
                    )}
                  </View>

                  {profile?.history && profile.history.length > 0 && (
                    <InteractiveActionBtn
                      style={[styles.clearAllHistoryBtn, { backgroundColor: '#EF444415', borderColor: '#EF444438' }]}
                      accentColor="#EF4444"
                      onPress={handleClearAllHistory}
                    >
                      <Text style={styles.clearAllHistoryBtnText}>🧹 Vaciar Todo</Text>
                    </InteractiveActionBtn>
                  )}
                </View>

                {profile?.history && profile.history.length > 0 && (
                  <View style={styles.historyPillsContainer}>
                    <ScrollView
                      ref={historyPillsScrollRef}
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.historyPillsContent}
                      style={Platform.OS === 'web' ? { overflowX: 'auto', WebkitOverflowScrolling: 'touch' } : undefined}
                      {...(Platform.OS === 'web'
                        ? {
                            onWheel: (e) => {
                              if (e.deltaY !== 0) {
                                const domNode = historyPillsScrollRef.current?.getScrollableNode
                                  ? historyPillsScrollRef.current.getScrollableNode()
                                  : historyPillsScrollRef.current;
                                if (domNode) {
                                  domNode.scrollLeft += e.deltaY;
                                }
                              }
                            },
                          }
                        : {})}
                    >
                      {/* Píldora: Todas */}
                      <InteractiveActionBtn
                        style={[
                          styles.historyFilterPill,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          historyFilter === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        accentColor={colors.primary}
                        onPress={() => setHistoryFilter('all')}
                      >
                        <Text
                          style={[
                            styles.historyFilterPillText,
                            { color: historyFilter === 'all' ? colors.primaryText : colors.text },
                          ]}
                        >
                          🌟 Todas ({profile.history.length})
                        </Text>
                      </InteractiveActionBtn>

                      {/* Píldora: 100% Perfectas */}
                      {perfectGamesCount > 0 && (
                        <InteractiveActionBtn
                          style={[
                            styles.historyFilterPill,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            historyFilter === 'perfect' && { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
                          ]}
                          accentColor="#8B5CF6"
                          onPress={() => setHistoryFilter('perfect')}
                        >
                          <Text
                            style={[
                              styles.historyFilterPillText,
                              { color: historyFilter === 'perfect' ? '#FFFFFF' : colors.text },
                            ]}
                          >
                            👑 100% ({perfectGamesCount})
                          </Text>
                        </InteractiveActionBtn>
                      )}

                      {/* Píldora: Aprobadas */}
                      {passedGamesCount > 0 && (
                        <InteractiveActionBtn
                          style={[
                            styles.historyFilterPill,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            historyFilter === 'passed' && { backgroundColor: '#10B981', borderColor: '#10B981' },
                          ]}
                          accentColor="#10B981"
                          onPress={() => setHistoryFilter('passed')}
                        >
                          <Text
                            style={[
                              styles.historyFilterPillText,
                              { color: historyFilter === 'passed' ? '#FFFFFF' : colors.text },
                            ]}
                          >
                            ✅ Aprobadas ({passedGamesCount})
                          </Text>
                        </InteractiveActionBtn>
                      )}

                      {/* Píldora: Reprobadas */}
                      {failedGamesCount > 0 && (
                        <InteractiveActionBtn
                          style={[
                            styles.historyFilterPill,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            historyFilter === 'failed' && { backgroundColor: '#EF4444', borderColor: '#EF4444' },
                          ]}
                          accentColor="#EF4444"
                          onPress={() => setHistoryFilter('failed')}
                        >
                          <Text
                            style={[
                              styles.historyFilterPillText,
                              { color: historyFilter === 'failed' ? '#FFFFFF' : colors.text },
                            ]}
                          >
                            ❌ Reprobadas ({failedGamesCount})
                          </Text>
                        </InteractiveActionBtn>
                      )}

                      {/* Píldoras por materia */}
                      {uniqueHistoryCategories.map((cat) => {
                        const isSelected = historyFilter === cat.name;
                        return (
                          <InteractiveActionBtn
                            key={cat.name}
                            style={[
                              styles.historyFilterPill,
                              { backgroundColor: colors.card, borderColor: colors.border },
                              isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                            ]}
                            accentColor={colors.primary}
                            onPress={() => setHistoryFilter(cat.name)}
                          >
                            <Text
                              style={[
                                styles.historyFilterPillText,
                                { color: isSelected ? colors.primaryText : colors.text },
                              ]}
                            >
                              {cat.icon} {cat.name} ({cat.count})
                            </Text>
                          </InteractiveActionBtn>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          activeProfileTab === 'history' ? (
            profile?.history && profile.history.length > 0 ? (
              <View style={styles.emptyFilterState}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>🔍</Text>
                <Text style={[styles.emptyFilterTitle, { color: colors.text }]}>
                  No hay partidas con este filtro
                </Text>
                <Text style={[styles.emptyFilterSub, { color: colors.textSecondary }]}>
                  Prueba seleccionando otra categoría o restablece el filtro.
                </Text>
                <TouchableOpacity
                  style={[styles.resetFilterBtn, { backgroundColor: `${colors.primary}18`, borderColor: colors.primary }]}
                  onPress={() => setHistoryFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.resetFilterBtnText, { color: colors.primary }]}>
                    🌟 Ver Todas las Partidas ({profile.history.length})
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Image
                  source={require('../../assets/images/empty_history_illustration1_1787436082611.jpg')}
                  style={styles.emptyIllustration}
                  resizeMode="contain"
                />
                <Text style={[styles.emptyText, { color: colors.text }]}>Aún no has jugado ninguna partida</Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Las puntuaciones que guardes aparecerán aquí.</Text>
              </View>
            )
          ) : null
        }
      />

      {/* Modal para ver detalles del cuestionario */}
      <Modal visible={modalVisible} animationType="slide" transparent={true} onRequestClose={() => setModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Detalles de la Partida</Text>
            <Text style={[styles.modalCategory, { color: colors.primary }]}>{selectedGame?.categoryName}</Text>

            <Text style={[styles.modalDate, { color: colors.textSecondary }]}>
              {selectedGame && new Date(selectedGame.date).toLocaleDateString('es-ES', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Text>

            <View style={[styles.modalStats, { backgroundColor: colors.background }]}>
              <Text style={[styles.modalStatText, { color: colors.text }]}>
                Aciertos: <Text style={{ fontWeight: 'bold' }}>{selectedGame?.score}/{selectedGame?.total}</Text> ({selectedGame?.percentage}%)
              </Text>
              <Text style={[styles.modalStatText, { marginTop: 4, color: colors.text }]}>
                Vidas restantes:{' '}
                {selectedGame?.lives !== undefined ? (
                  selectedGame.lives === 0
                    ? '💔 0 Vidas (Game Over)'
                    : `${'❤️'.repeat(Math.max(0, selectedGame.lives))}`
                ) : 'N/A'}
              </Text>
            </View>

            <ScrollView 
              style={styles.questionsScroll} 
              contentContainerStyle={{ paddingBottom: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {selectedGame?.questions && selectedGame.questions.length > 0 ? (
                selectedGame.questions.map((q, qIndex) => {
                  const isCorrect = q.userAnswer === q.correctAnswer;
                  return (
                    <View key={qIndex} style={[styles.questionCard, { backgroundColor: colors.card, borderColor: isCorrect ? '#C3E6CB' : '#F5C6CB' }]}>
                      <View style={styles.qHeader}>
                        <Text style={[styles.qNumber, { color: colors.textSecondary }]}>Pregunta {qIndex + 1}</Text>
                        <Text style={[styles.qBadge, isCorrect ? styles.qBadgeCorrect : styles.qBadgeWrong]}>
                          {q.userAnswer === -1 ? '⏱️ Tiempo Expirado' : isCorrect ? '✓ Correcta' : '✗ Incorrecta'}
                        </Text>
                      </View>
                      <Text style={[styles.qText, { color: colors.text }]}>{q.text}</Text>
                      <View style={styles.qOptionsContainer}>
                        {q.options && q.options.map((opt, oIndex) => {
                          const isCorrectOption = oIndex === q.correctAnswer;
                          const isUserAnswer = oIndex === q.userAnswer;

                          let optStyle = [styles.qOption, { backgroundColor: colors.background, borderColor: colors.border }];
                          let optTextStyle = [styles.qOptionText, { color: colors.text }];

                          if (isCorrectOption) {
                            optStyle.push(styles.qOptCorrectBg);
                            optTextStyle.push(styles.qOptCorrectText);
                          } else if (isUserAnswer && !isCorrectOption) {
                            optStyle.push(styles.qOptWrongBg);
                            optTextStyle.push(styles.qOptWrongText);
                          }

                          return (
                            <View key={oIndex} style={optStyle}>
                              <Text style={optTextStyle}>
                                {String.fromCharCode(65 + oIndex)}. {opt}
                                {isCorrectOption ? ' ✓' : ''}
                                {isUserAnswer && !isCorrectOption ? ' ✗' : ''}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={[styles.noDetailText, { color: colors.textSecondary }]}>No hay detalles de preguntas guardados para esta partida anterior.</Text>
              )}
            </ScrollView>

            <InteractiveActionBtn 
              style={[styles.rankingButton, { backgroundColor: '#F59E0B', marginBottom: 10, marginTop: 4 }]} 
              accentColor="#F59E0B"
              onPress={() => {
                setModalVisible(false);
                handleOpenCategoryRanking(selectedGame?.category, selectedGame?.categoryName);
              }}
            >
              <Text style={styles.rankingButtonText}>
                🏆 Ver Tabla de Posiciones / Ranking de esta Materia
              </Text>
            </InteractiveActionBtn>

            <InteractiveActionBtn 
              style={[styles.closeModalBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]} 
              accentColor={colors.textSecondary}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.closeModalBtnText, { color: colors.text }]}>Cerrar Detalles</Text>
            </InteractiveActionBtn>
          </View>
        </View>
      </Modal>

      {/* 🏆 Modal de Ranking en Tiempo Real para la Materia Seleccionada */}
      <Modal
        visible={rankingModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRankingModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.rankingModalCard, { backgroundColor: colors.card }]}>
            
            {/* Cabecera del Ranking */}
            <View style={styles.rankingHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.rankingTitle, { color: colors.text }]}>
                    🏆 Tabla de Posiciones
                  </Text>
                  <View style={styles.liveTagBadge}>
                    <Text style={styles.liveTagDot}>🟢</Text>
                    <Text style={styles.liveTagText}>En Vivo</Text>
                  </View>
                </View>
                <Text style={[styles.rankingCategorySubtitle, { color: colors.primary }]}>
                  {selectedRankingCat?.name || rankingData?.category?.name || 'Materia'}
                </Text>
              </View>

              <InteractiveActionBtn
                style={[styles.rankingCloseBtn, { backgroundColor: colors.inputBg }]}
                accentColor={colors.textSecondary}
                onPress={() => setRankingModalVisible(false)}
              >
                <Text style={[styles.rankingCloseBtnText, { color: colors.text }]}>✕</Text>
              </InteractiveActionBtn>
            </View>

            {/* Notificación de actualización en tiempo real */}
            {liveRankingBadge && (
              <View style={styles.liveAlertBadge}>
                <Text style={styles.liveAlertText}>⚡ ¡Ranking actualizado en tiempo real!</Text>
              </View>
            )}

            {/* Contenido del Ranking */}
            {rankingLoading && (!rankingData?.ranking || rankingData.ranking.length === 0) ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13 }}>
                  Cargando posiciones oficiales...
                </Text>
              </View>
            ) : rankingData?.ranking && rankingData.ranking.length > 0 ? (
              <FlatList
                data={rankingData.ranking}
                keyExtractor={(item, index) => item._id || String(index)}
                style={{ maxHeight: 380, width: '100%', marginTop: 8 }}
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  let medal = item.medal || (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`);
                  const isMe = profile?.username && item.username && item.username.toLowerCase() === profile.username.toLowerCase();
                  const isPassed = item.percentage >= 60;

                  return (
                    <View
                      style={[
                        styles.rankingRow,
                        {
                          backgroundColor: isMe ? `${colors.primary}18` : colors.background,
                          borderColor: isMe ? colors.primary : colors.border,
                          borderWidth: isMe ? 1.5 : 1,
                        }
                      ]}
                    >
                      <Text style={styles.rankingMedal}>{medal}</Text>

                      <View style={styles.rankingStudentInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.rankingStudentName, { color: colors.text, fontWeight: isMe ? '800' : '600' }]} numberOfLines={1}>
                            {item.username || 'Estudiante'}
                          </Text>
                          {isMe && (
                            <View style={[styles.meBadge, { backgroundColor: colors.primary }]}>
                              <Text style={[styles.meBadgeText, { color: colors.primaryText }]}>Tú</Text>
                            </View>
                          )}
                          {item.perfectCount > 1 && (
                            <View style={{ backgroundColor: '#F59E0B20', borderColor: '#F59E0B', borderWidth: 1, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#D97706' }}>🔥 {item.perfectCount}x 100%</Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.rankingDate, { color: colors.textSecondary }]}>
                          ⏱️ {formatDateTimeWithSeconds(item.date)} • {item.score}/{item.total} pts
                        </Text>
                      </View>

                      <View style={styles.rankingScoreBadge}>
                        <Text style={[styles.rankingPercentage, { color: isPassed ? '#4ECDC4' : '#FF6B6B' }]}>
                          {item.percentage}%
                        </Text>
                        <Text style={styles.rankingLives}>
                          {item.lives > 0 ? '❤️'.repeat(Math.min(item.lives, 5)) : '💔'}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            ) : (
              <View style={{ paddingVertical: 35, alignItems: 'center' }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🏁</Text>
                <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>
                  Sin posiciones registradas
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                  Sé el primero en rendir una evaluación en esta materia para liderar el ranking.
                </Text>
              </View>
            )}

            {/* Botón de Salir del Ranking */}
            <InteractiveActionBtn
              style={[styles.closeModalBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              accentColor={colors.primary}
              onPress={() => setRankingModalVisible(false)}
            >
              <Text style={[styles.closeModalBtnText, { color: colors.primaryText }]}>Entendido</Text>
            </InteractiveActionBtn>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingBottom: 40,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
    paddingTop: Platform.OS === 'web' ? 12 : 6,
  },
  profileSlimHeaderCard: {
    marginHorizontal: 16,
    marginTop: Platform.OS === 'web' ? 6 : 44,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.05)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 2 }),
  },
  iosBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 4,
    gap: 2,
  },
  iosBackChevron: {
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
  },
  iosBackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  slimAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.12)' }
      : { elevation: 2 }),
  },
  slimAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  slimAvatarTxt: {
    fontSize: 17,
    fontWeight: '800',
  },
  slimAvatarBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slimUserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  slimUsername: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  slimRoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  slimRoleText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  avatarContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  username: {
    fontSize: 24,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  // Estilos de la Barra de Pestañas Superiores (Ultra-Responsive Móvil + Web)
  profileTabBar: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 3,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 3,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  profileTabItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 2,
    borderRadius: 10,
    gap: 2,
    minWidth: 0,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none', transition: 'all 0.15s ease' } : {}),
  },
  profileTabItemActive: {
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.12)' }
      : { elevation: 2 }),
  },
  tabIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabEmoji: {
    fontSize: 16,
  },
  profileTabTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  profileTabFloatingBadge: {
    position: 'absolute',
    top: -5,
    right: -10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 8,
    minWidth: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileTabFloatingBadgeText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  // Tarjeta Unificada de Configuración (Estilo iOS)
  settingsUnifiedCard: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 8,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }
      : { elevation: 2 }),
  },
  settingsCardHeader: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  settingsCardTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  settingsIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowIcon: {
    fontSize: 15,
  },
  settingsRowLabel: {
    fontSize: 13.5,
    fontWeight: '700',
  },
  settingsRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  settingsRowValue: {
    fontSize: 12,
    fontWeight: '600',
    maxWidth: 130,
  },
  settingsChevron: {
    fontSize: 10,
    fontWeight: '800',
  },
  settingsDivider: {
    height: 1,
    marginHorizontal: 14,
  },
  expandedContentWrapper: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  themeOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  themeOption: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'transparent',
    gap: 8,
  },
  themeOptionActive: {
    elevation: 1,
  },
  themeEmoji: {
    fontSize: 18,
  },
  themeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Estilos de Galería de Avatares
  uploadGalleryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  uploadGalleryBtnIcon: {
    fontSize: 22,
  },
  uploadGalleryBtnTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  uploadGalleryBtnSub: {
    fontSize: 11,
  },
  uploadGalleryBtnArrow: {
    fontSize: 20,
    fontWeight: '700',
    paddingRight: 4,
  },
  avatarGallerySectionTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    marginBottom: 10,
  },
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  avatarCard: {
    width: '23%',
    minWidth: 70,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarCardImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginBottom: 6,
  },
  avatarCardName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  avatarCardDesc: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 1,
  },
  avatarSelectedCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSelectedCheckText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  // Estilos de Tira Horizontal: Estadística Mental (5 KPIs)
  stripSectionHeader: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stripSectionTitle: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  stripContainer: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  stripCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  stripIcon: {
    fontSize: 13.5,
    marginBottom: 1,
  },
  stripVal: {
    fontSize: 13,
    fontWeight: '800',
  },
  stripLbl: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  stripDivider: {
    width: 1,
    height: 20,
  },
  // Estilos de Vitrina de Logros e Insignias (Propuesta 1)
  achievementsCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }
      : { elevation: 2 }),
  },
  achievementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achieveIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achieveHeaderIcon: {
    fontSize: 16,
  },
  achieveTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  achieveSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  achieveCounterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  achieveCounterText: {
    fontSize: 11,
    fontWeight: '800',
  },
  achieveHoverWrapper: {
    position: 'relative',
    width: '100%',
    marginVertical: 2,
  },
  achieveHoverArrow: {
    position: 'absolute',
    top: '50%',
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    ...(Platform.OS === 'web'
      ? {
          boxShadow: '0px 4px 14px rgba(0,0,0,0.22)',
          cursor: 'pointer',
          userSelect: 'none',
          backdropFilter: 'blur(10px)',
          transition: 'opacity 0.22s ease, transform 0.22s ease, box-shadow 0.22s ease',
        }
      : {
          elevation: 8,
        }),
  },
  achieveHoverArrowLeft: {
    left: -10,
  },
  achieveHoverArrowRight: {
    right: -10,
  },
  achieveHoverArrowText: {
    fontSize: 24,
    fontWeight: '900',
    marginTop: -2,
  },
  achieveGlobalProgressTrack: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  achieveGlobalProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  achieveScrollContent: {
    gap: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  achieveItemCard: {
    width: 155,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    gap: 6,
    justifyContent: 'space-between',
  },
  achieveTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  achieveBadgePill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  achieveBadgePillText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  achieveItemIconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 2,
  },
  achieveItemIcon: {
    fontSize: 22,
  },
  achieveItemName: {
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  achieveItemDesc: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 13,
    minHeight: 26,
  },
  achieveMiniProgressContainer: {
    gap: 3,
    marginTop: 2,
  },
  achieveMiniTrack: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  achieveMiniFill: {
    height: '100%',
    borderRadius: 2,
  },
  achieveMiniProgressText: {
    fontSize: 9.5,
    fontWeight: '700',
    textAlign: 'center',
  },
  // Estilos de Rendimiento por Materia (Propuesta 2)
  subjectPerformanceCard: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.05)' }
      : { elevation: 2 }),
  },
  subjectPerfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectPerfHeaderIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectPerfHeaderIcon: {
    fontSize: 16,
  },
  subjectPerfTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  subjectPerfSubtitle: {
    fontSize: 10.5,
    marginTop: 1,
  },
  subjectCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  subjectCountBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  insightBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  insightText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  subjectBarsContainer: {
    gap: 8,
  },
  subjectBarItem: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  subjectBarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjectNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  subjectIconEmoji: {
    fontSize: 16,
  },
  subjectItemName: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  subjectStatusPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  subjectStatusPillText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  subjectProgressTrack: {
    width: '100%',
    height: 7,
    borderRadius: 4,
    overflow: 'hidden',
  },
  subjectProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  subjectMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 1,
  },
  subjectMetricAvg: {
    fontSize: 11.5,
    fontWeight: '600',
  },
  subjectMetricDetails: {
    fontSize: 10.5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  historySectionHeaderRow: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  historyCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyCountBadgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  clearAllHistoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  clearAllHistoryBtnText: {
    color: '#EF4444',
    fontSize: 11.5,
    fontWeight: '700',
  },
  // Píldoras de Filtro Rápido de Historial
  // Píldoras de Filtro Rápido de Historial
  historyPillsContainer: {
    marginBottom: 12,
    marginTop: 4,
    paddingVertical: 4,
  },
  historyPillsContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  historyFilterPill: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 32,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 4px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  historyFilterPillText: {
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  // Estado cuando el filtro no arroja resultados
  emptyFilterState: {
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyFilterTitle: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
  },
  emptyFilterSub: {
    fontSize: 12.5,
    textAlign: 'center',
    marginBottom: 14,
  },
  resetFilterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
  },
  resetFilterBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  // Estilos de Partidas Jugadas Gamificadas (Estilo CategoryCard Moderno)
  historyGamifiedCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderLeftWidth: 5,
  },
  historyIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1.5,
  },
  historyIcon: {
    fontSize: 24,
  },
  historyInfoContainer: {
    flex: 1,
    marginRight: 10,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 4,
  },
  historyTitle: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  historyScoreBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 8,
    borderWidth: 1,
  },
  historyScoreVal: {
    fontSize: 11.5,
    fontWeight: '900',
  },
  historyMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 11.5,
    fontWeight: '500',
  },
  historyBadgesGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  historyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
    borderWidth: 1,
  },
  historyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyActionGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
    paddingTop: 2,
  },
  historyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  historyActionBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
    lineHeight: 15,
  },
  historyDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 30,
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  historyDeleteBtnText: {
    fontSize: 12,
    lineHeight: 15,
  },
  historyArrowCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyArrowIcon: {
    fontSize: 14,
    fontWeight: '900',
  },
  // Estilos de Propuesta 2: Lista Compacta Minimalista
  historyCompactCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 1px 4px rgba(0,0,0,0.03)' }
      : { elevation: 1 }),
  },
  historyCategoryCircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCategoryEmoji: {
    fontSize: 18,
  },
  historyCompactCenter: {
    flex: 1,
    justifyContent: 'center',
  },
  historyCompactTitle: {
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 2,
  },
  historyCompactSub: {
    fontSize: 10.5,
  },
  historyCompactScoreBox: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  historyCompactPercent: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyCompactScoreFraction: {
    fontSize: 10,
    fontWeight: '600',
  },
  historyCompactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  // Estilos de Propuesta 1: Tarjetas Modernas con Píldora
  historyCardModern: {
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    gap: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyCategory: {
    fontSize: 14.5,
    fontWeight: '800',
    flex: 1,
  },
  historyScorePill: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyScorePillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  historyBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  historyMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  historyDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  historyDot: {
    fontSize: 11,
    color: 'rgba(128,128,128,0.5)',
  },
  historyStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  historyActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyMicroBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyMicroBtnIcon: {
    fontSize: 13,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 16,
  },
  emptyIllustration: {
    width: 140,
    height: 140,
    marginBottom: 16,
    borderRadius: 24,
  },
  emptyText: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 480,
    height: Platform.OS === 'web' ? undefined : '82%',
    maxHeight: '88%',
    flexDirection: 'column',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  modalCategory: {
    fontSize: 15,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 4,
  },
  modalDate: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 10,
  },
  modalStats: {
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  modalStatText: {
    fontSize: 14,
  },
  questionsScroll: {
    flex: 1,
    width: '100%',
    marginBottom: 12,
  },
  noDetailText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
  questionCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1.5,
  },
  qHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  qNumber: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  qBadge: {
    fontSize: 11,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  qBadgeCorrect: {
    backgroundColor: '#D4EDDA',
    color: '#155724',
  },
  qBadgeWrong: {
    backgroundColor: '#F8D7DA',
    color: '#721C24',
  },
  qText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  qOptionsContainer: {
    gap: 6,
  },
  qOption: {
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  qOptCorrectBg: {
    backgroundColor: '#D4EDDA',
    borderColor: '#C3E6CB',
  },
  qOptWrongBg: {
    backgroundColor: '#F8D7DA',
    borderColor: '#F5C6CB',
  },
  qOptionText: {
    fontSize: 13,
  },
  qOptCorrectText: {
    color: '#155724',
    fontWeight: '600',
  },
  qOptWrongText: {
    color: '#721C24',
    fontWeight: '600',
  },
  closeModalBtn: {
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeModalBtnText: {
    fontSize: 15,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  editBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    boxShadow: '0px 1px 2px rgba(0,0,0,0.2)',
    elevation: 2,
  },
  editBadgeText: {
    fontSize: 11,
  },
  // Estilos de Formulario de Contraseña
  passwordFormContainer: {
    padding: 12,
    gap: 8,
  },
  passInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  passInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  passInput: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  eyeIcon: {
    fontSize: 16,
  },
  savePassBtn: {
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savePassBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  // Estilos del Ranking en Tiempo Real en Perfil
  rankingButton: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  rankingModalCard: {
    borderRadius: 18,
    padding: 18,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F030',
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  rankingCategorySubtitle: {
    fontSize: 14,
    fontWeight: '700',
    marginTop: 2,
  },
  liveTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    gap: 4,
  },
  liveTagDot: {
    fontSize: 8,
  },
  liveTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  rankingCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingCloseBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  liveAlertBadge: {
    backgroundColor: '#10B98125',
    borderColor: '#10B981',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    marginBottom: 8,
  },
  liveAlertText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
  },
  rankingMedal: {
    fontSize: 22,
    marginRight: 10,
    width: 32,
    textAlign: 'center',
  },
  rankingStudentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  rankingStudentName: {
    fontSize: 14,
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  meBadgeText: {
    fontSize: 10,
    fontWeight: '800',
  },
  rankingDate: {
    fontSize: 11,
    marginTop: 2,
  },
  rankingScoreBadge: {
    alignItems: 'flex-end',
    marginLeft: 8,
  },
  rankingPercentage: {
    fontSize: 15,
    fontWeight: '900',
  },
  rankingLives: {
    fontSize: 11,
    marginTop: 1,
  },
});
