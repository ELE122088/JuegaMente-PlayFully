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
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);

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
    setRankingLoading(true);
    setSelectedRankingCat({ _id: categoryId, name: categoryName });
    try {
      if (categoryId) {
        const res = await api.get(`/categories/${categoryId}/ranking`);
        setRankingData(res.data);
        setSelectedRankingCat(res.data.category || { _id: categoryId, name: categoryName });
      } else {
        const catsRes = await api.get('/categories');
        const match = catsRes.data?.find(c => c.name === categoryName);
        if (match) {
          const res = await api.get(`/categories/${match._id}/ranking`);
          setRankingData(res.data);
          setSelectedRankingCat(match);
        }
      }
    } catch (err) {
      console.error('Error al abrir ranking desde perfil:', err);
      Alert.alert('Aviso', 'No se pudo cargar el ranking en este momento');
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

  const getStats = () => {
    if (!profile || !profile.history || profile.history.length === 0) {
      return { total: 0, average: 0, bestScore: 0, passed: 0 };
    }
    const total = profile.history.length;
    const sumPercentages = profile.history.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
    const average = Math.round(sumPercentages / total);
    const bestScore = Math.max(...profile.history.map((h) => h.percentage || 0));
    const passed = profile.history.filter((h) => (h.percentage || 0) >= 60).length;
    return { total, average, bestScore, passed };
  };

  const { total, average, bestScore, passed } = getStats();

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

  const renderHistoryItem = ({ item }) => {
    const isGood = item.percentage >= 80;
    const isRegular = item.percentage >= 60 && item.percentage < 80;

    let medalEmoji = '⚠️';
    let statusText = 'Requiere Repaso';
    let statusColor = '#EF4444';
    let statusBg = '#EF444414';

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

    return (
      <TouchableOpacity
        style={[
          styles.historyGamifiedCard,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
          }
        ]}
        onPress={() => handleShowGameDetail(item)}
        activeOpacity={0.7}
      >
        {/* Cabecera de la Tarjeta Gamificada */}
        <View style={styles.historyGamifiedHeader}>
          <View style={styles.historyGamifiedLeft}>
            <Text style={styles.historyGamifiedMedal}>{medalEmoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.historyGamifiedTitle, { color: colors.text }]} numberOfLines={1}>
                {item.categoryName}
              </Text>
              <Text style={[styles.historyGamifiedDate, { color: colors.textSecondary }]}>
                {new Date(item.date).toLocaleDateString('es-ES', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          </View>

          {/* Badge de Puntuación Destacado */}
          <View style={[styles.historyGamifiedScoreBadge, { backgroundColor: statusBg }]}>
            <Text style={[styles.historyGamifiedScoreVal, { color: statusColor }]}>
              {item.percentage}%
            </Text>
            <Text style={[styles.historyGamifiedScoreSub, { color: statusColor }]}>
              {item.score}/{item.total} pts
            </Text>
          </View>
        </View>

        {/* Barra divisoria sutil */}
        <View style={[styles.historyGamifiedDivider, { backgroundColor: colors.border }]} />

        {/* Fila Inferior con Botones con Etiqueta */}
        <View style={styles.historyGamifiedFooter}>
          <View style={[styles.historyGamifiedStatusPill, { backgroundColor: statusBg }]}>
            <Text style={[styles.historyGamifiedStatusTxt, { color: statusColor }]}>
              {statusText}
            </Text>
          </View>

          <View style={styles.historyGamifiedBtnGroup}>
            {/* Botón Ranking con texto dorado nítido y legible */}
            <TouchableOpacity
              style={[styles.historyGamifiedActionBtn, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B55' }]}
              onPress={(e) => {
                e.stopPropagation();
                handleOpenCategoryRanking(item.category, item.categoryName);
              }}
              title="Ver Ranking de esta Materia"
            >
              <Text style={[styles.historyGamifiedActionTxt, { color: '#F59E0B' }]}>🏆 Ranking</Text>
            </TouchableOpacity>

            {/* Botón Eliminar Partida */}
            <TouchableOpacity
              style={[styles.historyGamifiedActionBtn, { backgroundColor: '#EF444418', borderColor: '#EF444433' }]}
              onPress={(e) => handleDeleteHistory(item._id, e)}
              title="Eliminar partida"
            >
              <Text style={styles.historyGamifiedActionTxt}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={profile?.history || []}
        keyExtractor={(item, index) => index.toString()}
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

              {/* Avatar circular (Toca para cambiar foto) */}
              <TouchableOpacity
                style={[styles.slimAvatar, { backgroundColor: colors.primary }]}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                {profile?.profileImage ? (
                  <Image
                    source={{ uri: `${BASE_URL}${profile.profileImage}` }}
                    style={styles.slimAvatarImg}
                  />
                ) : (
                  <Text style={[styles.slimAvatarTxt, { color: colors.primaryText }]}>
                    {profile?.username?.substring(0, 2).toUpperCase()}
                  </Text>
                )}
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

            {/* PROPUESTA 1: Tarjeta Unificada de Ajustes (Estilo iOS / Configuración) */}
            <View style={[styles.settingsUnifiedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.settingsCardHeader}>
                <Text style={[styles.settingsCardTitle, { color: colors.textSecondary }]}>⚙️ CONFIGURACIÓN Y CUENTA</Text>
              </View>

              {/* 1. Fila: Tema Visual */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsThemeExpanded(!isThemeExpanded)}
                style={[styles.settingsRow, isThemeExpanded && { backgroundColor: `${colors.primary}08` }]}
              >
                <View style={styles.settingsRowLeft}>
                  <View style={[styles.settingsIconCircle, { backgroundColor: `${colors.primary}18` }]}>
                    <Text style={styles.settingsRowIcon}>🎨</Text>
                  </View>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Tema Visual</Text>
                </View>
                <View style={styles.settingsRowRight}>
                  <Text style={[styles.settingsRowValue, { color: colors.primary }]}>
                    {
                      theme === 'light' ? '☀️ Claro' :
                      theme === 'dark' ? '🌙 Oscuro' :
                      theme === 'emerald' ? '🍃 Esmeralda' :
                      theme === 'sunset' ? '🌅 Atardecer' :
                      theme === 'sakura' ? '🌸 Sakura' :
                      theme === 'ocean' ? '🌊 Océano' :
                      theme === 'gold' ? '👑 Dorado' :
                      theme === 'cyber' ? '🍇 Púrpura' :
                      theme === 'neon' ? '🌌 Neón' : '🏛️ Medianoche'
                    }
                  </Text>
                  <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                    {isThemeExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {isThemeExpanded && (
                <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                  <View style={styles.themeOptionsGrid}>
                    {[
                      { id: 'light', name: 'Claro', emoji: '☀️' },
                      { id: 'dark', name: 'Oscuro', emoji: '🌙' },
                      { id: 'emerald', name: 'Esmeralda', emoji: '🍃' },
                      { id: 'sunset', name: 'Atardecer', emoji: '🌅' },
                      { id: 'sakura', name: 'Sakura', emoji: '🌸' },
                      { id: 'ocean', name: 'Océano', emoji: '🌊' },
                      { id: 'gold', name: 'Dorado', emoji: '👑' },
                      { id: 'cyber', name: 'Púrpura', emoji: '🍇' },
                      { id: 'neon', name: 'Neón', emoji: '🌌' },
                      { id: 'midnight', name: 'Medianoche', emoji: '🏛️' },
                    ].map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        style={[
                          styles.themeOption,
                          theme === t.id && [styles.themeOptionActive, { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` }]
                        ]}
                        onPress={() => setTheme(t.id)}
                      >
                        <Text style={styles.themeEmoji}>{t.emoji}</Text>
                        <Text style={[styles.themeText, { color: colors.text, fontWeight: theme === t.id ? 'bold' : 'normal' }]}>
                          {t.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

              {/* 2. Fila: Nombre de Usuario */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  const nextState = !isProfileEditExpanded;
                  setIsProfileEditExpanded(nextState);
                  if (nextState) {
                    setEditUsername(profile?.username || '');
                  }
                }}
                style={[styles.settingsRow, isProfileEditExpanded && { backgroundColor: `${colors.primary}08` }]}
              >
                <View style={styles.settingsRowLeft}>
                  <View style={[styles.settingsIconCircle, { backgroundColor: '#3B82F618' }]}>
                    <Text style={styles.settingsRowIcon}>✏️</Text>
                  </View>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Nombre de Usuario</Text>
                </View>
                <View style={styles.settingsRowRight}>
                  <Text style={[styles.settingsRowValue, { color: colors.textSecondary }]} numberOfLines={1}>
                    {profile?.username || 'Cargando...'}
                  </Text>
                  <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                    {isProfileEditExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {isProfileEditExpanded && (
                <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                  <View style={styles.passwordFormContainer}>
                    <Text style={[styles.passInputLabel, { color: colors.text }]}>Nuevo Nombre de Usuario</Text>
                    <View style={[styles.passInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.passInput, { color: colors.text }]}
                        placeholder="Mínimo 4 caracteres"
                        placeholderTextColor={colors.textSecondary}
                        value={editUsername}
                        onChangeText={setEditUsername}
                        autoCapitalize="none"
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.savePassBtn, { backgroundColor: colors.primary }]}
                      onPress={handleUpdateProfile}
                      disabled={profileEditLoading}
                    >
                      {profileEditLoading ? (
                        <ActivityIndicator color={colors.primaryText} size="small" />
                      ) : (
                        <Text style={[styles.savePassBtnText, { color: colors.primaryText }]}>
                          Guardar Cambios
                        </Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <View style={[styles.settingsDivider, { backgroundColor: colors.border }]} />

              {/* 3. Fila: Seguridad y Contraseña */}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setIsPasswordExpanded(!isPasswordExpanded)}
                style={[styles.settingsRow, isPasswordExpanded && { backgroundColor: `${colors.primary}08` }]}
              >
                <View style={styles.settingsRowLeft}>
                  <View style={[styles.settingsIconCircle, { backgroundColor: '#F59E0B18' }]}>
                    <Text style={styles.settingsRowIcon}>🔑</Text>
                  </View>
                  <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Seguridad y Clave</Text>
                </View>
                <View style={styles.settingsRowRight}>
                  <Text style={[styles.settingsRowValue, { color: colors.textSecondary }]}>Cambiar</Text>
                  <Text style={[styles.settingsChevron, { color: colors.textSecondary }]}>
                    {isPasswordExpanded ? '▲' : '▼'}
                  </Text>
                </View>
              </TouchableOpacity>

              {isPasswordExpanded && (
                <View style={[styles.expandedContentWrapper, { borderTopColor: colors.border }]}>
                  <View style={styles.passwordFormContainer}>
                    {/* Contraseña Actual */}
                    <Text style={[styles.passInputLabel, { color: colors.text }]}>Contraseña Actual</Text>
                    <View style={[styles.passInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.passInput, { color: colors.text }]}
                        placeholder="Ingresa tu clave actual"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={!showCurrentPass}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                      />
                      <TouchableOpacity onPress={() => setShowCurrentPass(!showCurrentPass)} style={styles.eyeBtn}>
                        <Text style={styles.eyeIcon}>{showCurrentPass ? '👁️' : '🙈'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Nueva Contraseña */}
                    <Text style={[styles.passInputLabel, { color: colors.text }]}>Nueva Contraseña</Text>
                    <View style={[styles.passInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.passInput, { color: colors.text }]}
                        placeholder="Mínimo 4 caracteres"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={!showNewPass}
                        value={newPassword}
                        onChangeText={setNewPassword}
                      />
                      <TouchableOpacity onPress={() => setShowNewPass(!showNewPass)} style={styles.eyeBtn}>
                        <Text style={styles.eyeIcon}>{showNewPass ? '👁️' : '🙈'}</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Confirmar Contraseña */}
                    <Text style={[styles.passInputLabel, { color: colors.text }]}>Confirmar Nueva Contraseña</Text>
                    <View style={[styles.passInputWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                      <TextInput
                        style={[styles.passInput, { color: colors.text }]}
                        placeholder="Repite la nueva clave"
                        placeholderTextColor={colors.textSecondary}
                        secureTextEntry={!showNewPass}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                      />
                    </View>

                    <TouchableOpacity
                      style={[styles.savePassBtn, { backgroundColor: colors.primary }]}
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
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* =========================================================
                PROPUESTA C (ACTIVA): Tira Horizontal Ultra-Compacta (Estilo Apple Analytics)
            ========================================================= */}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Resumen de Rendimiento</Text>
            <View style={[styles.stripContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {/* 1. Partidas */}
              <View style={styles.stripCol}>
                <Text style={styles.stripIcon}>🎮</Text>
                <Text style={[styles.stripVal, { color: colors.text }]}>{total}</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Partidas</Text>
              </View>

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
              <View style={styles.stripCol}>
                <Text style={styles.stripIcon}>🏆</Text>
                <Text style={[styles.stripVal, { color: '#D97706' }]}>{bestScore}%</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Récord</Text>
              </View>

              <View style={[styles.stripDivider, { backgroundColor: colors.border }]} />

              {/* 4. Aprobadas */}
              <View style={styles.stripCol}>
                <Text style={styles.stripIcon}>✅</Text>
                <Text style={[styles.stripVal, { color: '#8B5CF6' }]}>{passed}</Text>
                <Text style={[styles.stripLbl, { color: colors.textSecondary }]}>Aprobadas</Text>
              </View>
            </View>

            {/* =========================================================
                PROPUESTA B (Bloqueada/Comentada): Barra de Nivel
            ========================================================= */}
            {/*
            <View style={[styles.levelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.levelHeader}>
                <View style={styles.levelRankLeft}>
                  <Text style={styles.levelRankIcon}>
                    {average >= 90 ? '👑' : average >= 75 ? '⭐' : average >= 60 ? '📚' : '🌱'}
                  </Text>
                  <View>
                    <Text style={[styles.levelRankTitle, { color: colors.text }]}>
                      {average >= 90 ? 'Maestro Legendario' : average >= 75 ? 'Estudiante Avanzado' : average >= 60 ? 'Estudiante Destacado' : 'Aprendiz en Progreso'}
                    </Text>
                    <Text style={[styles.levelRankSub, { color: colors.textSecondary }]}>
                      Rango según efectividad
                    </Text>
                  </View>
                </View>
                <View style={[styles.levelPercentBadge, { backgroundColor: average >= 60 ? '#10B98118' : '#EF444418' }]}>
                  <Text style={[styles.levelPercentText, { color: average >= 60 ? '#10B981' : '#EF4444' }]}>
                    {average}%
                  </Text>
                </View>
              </View>
              <View style={[styles.progressBarTrack, { backgroundColor: colors.border }]}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${Math.min(Math.max(average, 6), 100)}%`,
                      backgroundColor: average >= 80 ? '#10B981' : average >= 60 ? colors.primary : '#EF4444',
                    }
                  ]}
                />
              </View>
              <View style={[styles.levelStatsRow, { borderTopColor: colors.border }]}>
                <View style={styles.levelStatItem}>
                  <Text style={[styles.levelStatVal, { color: colors.text }]}>🎮 {total}</Text>
                  <Text style={[styles.levelStatLbl, { color: colors.textSecondary }]}>Partidas</Text>
                </View>
                <View style={styles.levelStatDivider} />
                <View style={styles.levelStatItem}>
                  <Text style={[styles.levelStatVal, { color: '#8B5CF6' }]}>✅ {passed}</Text>
                  <Text style={[styles.levelStatLbl, { color: colors.textSecondary }]}>Aprobadas</Text>
                </View>
                <View style={styles.levelStatDivider} />
                <View style={styles.levelStatItem}>
                  <Text style={[styles.levelStatVal, { color: '#D97706' }]}>🏆 {bestScore}%</Text>
                  <Text style={[styles.levelStatLbl, { color: colors.textSecondary }]}>Récord</Text>
                </View>
              </View>
            </View>
            */}

            {/* =========================================================
                PROPUESTA A (Bloqueada/Comentada): Cuadrícula 2x2
            ========================================================= */}
            {/*
            <View style={styles.kpiContainer}>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.kpiIconWrapper, { backgroundColor: '#3B82F618' }]}>
                    <Text style={styles.kpiIcon}>🎮</Text>
                  </View>
                  <View style={styles.kpiContent}>
                    <Text style={[styles.kpiValue, { color: colors.text }]}>{total}</Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Partidas</Text>
                  </View>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.kpiIconWrapper, { backgroundColor: average >= 60 ? '#10B98118' : '#EF444418' }]}>
                    <Text style={styles.kpiIcon}>{average >= 60 ? '🎯' : '📉'}</Text>
                  </View>
                  <View style={styles.kpiContent}>
                    <Text style={[styles.kpiValue, { color: average >= 60 ? '#10B981' : '#EF4444' }]}>{average}%</Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Promedio</Text>
                  </View>
                </View>
              </View>
              <View style={styles.kpiRow}>
                <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.kpiIconWrapper, { backgroundColor: '#F59E0B18' }]}>
                    <Text style={styles.kpiIcon}>🏆</Text>
                  </View>
                  <View style={styles.kpiContent}>
                    <Text style={[styles.kpiValue, { color: '#D97706' }]}>{bestScore}%</Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Mejor Récord</Text>
                  </View>
                </View>
                <View style={[styles.kpiCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={[styles.kpiIconWrapper, { backgroundColor: '#8B5CF618' }]}>
                    <Text style={styles.kpiIcon}>✅</Text>
                  </View>
                  <View style={styles.kpiContent}>
                    <Text style={[styles.kpiValue, { color: '#8B5CF6' }]}>{passed}</Text>
                    <Text style={[styles.kpiLabel, { color: colors.textSecondary }]}>Aprobadas</Text>
                  </View>
                </View>
              </View>
            </View>
            */}

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Historial de Partidas</Text>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Image
              source={require('../../assets/images/empty_history_illustration1_1787436082611.jpg')}
              style={styles.emptyIllustration}
              resizeMode="contain"
            />
            <Text style={[styles.emptyText, { color: colors.text }]}>Aún no has jugado ninguna partida</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Las puntuaciones que guardes aparecerán aquí.</Text>
          </View>
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

            <TouchableOpacity 
              style={[styles.rankingButton, { backgroundColor: '#F59E0B', marginBottom: 10, marginTop: 4 }]} 
              onPress={() => {
                setModalVisible(false);
                handleOpenCategoryRanking(selectedGame?.category, selectedGame?.categoryName);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.rankingButtonText}>
                🏆 Ver Tabla de Posiciones / Ranking de esta Materia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.closeModalBtn, { backgroundColor: colors.inputBg, borderColor: colors.border, borderWidth: 1 }]} onPress={() => setModalVisible(false)}>
              <Text style={[styles.closeModalBtnText, { color: colors.text }]}>Cerrar Detalles</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 🏆 Modal de Ranking en Tiempo Real para la Materia Seleccionada */}
      <Modal
        visible={rankingModalVisible}
        animationType="slide"
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

              <TouchableOpacity
                style={[styles.rankingCloseBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setRankingModalVisible(false)}
              >
                <Text style={[styles.rankingCloseBtnText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Notificación de actualización en tiempo real */}
            {liveRankingBadge && (
              <View style={styles.liveAlertBadge}>
                <Text style={styles.liveAlertText}>⚡ ¡Ranking actualizado en tiempo real!</Text>
              </View>
            )}

            {/* Contenido del Ranking */}
            {rankingLoading ? (
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
            <TouchableOpacity
              style={[styles.closeModalBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={() => setRankingModalVisible(false)}
            >
              <Text style={[styles.closeModalBtnText, { color: colors.primaryText }]}>Entendido</Text>
            </TouchableOpacity>

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
  },
  // Cabecera Ultra-Slim Definitiva: Tarjeta Flotante Redondeada (Opción 2)
  profileSlimHeaderCard: {
    marginHorizontal: 16,
    marginTop: Platform.OS === 'web' ? 14 : 44,
    marginBottom: 4,
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
  role: {
    fontSize: 13,
    marginTop: 2,
  },
  // Tarjeta Unificada de Configuración (Estilo iOS)
  settingsUnifiedCard: {
    marginHorizontal: 16,
    marginTop: 12,
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
  // Estilos de Propuesta C: Tira Horizontal Ultra-Compacta
  stripContainer: {
    marginHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 16,
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
    gap: 2,
  },
  stripIcon: {
    fontSize: 16,
    marginBottom: 1,
  },
  stripVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  stripLbl: {
    fontSize: 10,
    fontWeight: '600',
  },
  stripDivider: {
    width: 1,
    height: 28,
  },
  // Estilos de Propuesta B: Barra de Nivel & Rango
  levelCard: {
    marginHorizontal: 16,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginBottom: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 8px rgba(0,0,0,0.06)' }
      : { elevation: 2 }),
  },
  levelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelRankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  levelRankIcon: {
    fontSize: 26,
  },
  levelRankTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  levelRankSub: {
    fontSize: 11,
    fontWeight: '600',
  },
  levelPercentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelPercentText: {
    fontSize: 14,
    fontWeight: '800',
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  levelStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  levelStatItem: {
    alignItems: 'center',
    gap: 2,
  },
  levelStatVal: {
    fontSize: 13.5,
    fontWeight: '800',
  },
  levelStatLbl: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  levelStatDivider: {
    width: 1,
    height: 22,
    backgroundColor: 'rgba(128,128,128,0.2)',
  },
  // Cuadrícula KPI Gamificada (2x2 Fija y Responsiva)
  kpiContainer: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  kpiIconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiIcon: {
    fontSize: 16,
  },
  kpiContent: {
    flex: 1,
    justifyContent: 'center',
  },
  kpiValue: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 1,
  },
  kpiLabel: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 16,
    marginTop: 8,
    marginBottom: 10,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  // Estilos de Propuesta 3: Tarjeta Gamificada con Medalla
  historyGamifiedCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(0,0,0,0.04)' }
      : { elevation: 1 }),
  },
  historyGamifiedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  historyGamifiedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  historyGamifiedMedal: {
    fontSize: 24,
  },
  historyGamifiedTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 1,
  },
  historyGamifiedDate: {
    fontSize: 10.5,
  },
  historyGamifiedScoreBadge: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyGamifiedScoreVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  historyGamifiedScoreSub: {
    fontSize: 9.5,
    fontWeight: '700',
  },
  historyGamifiedDivider: {
    height: 1,
  },
  historyGamifiedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  historyGamifiedStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  historyGamifiedStatusTxt: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  historyGamifiedBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyGamifiedActionBtn: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyGamifiedActionTxt: {
    fontSize: 11.5,
    fontWeight: '800',
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
