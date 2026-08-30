import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, ActivityIndicator, Text, TouchableOpacity, Modal, TextInput, Alert, Platform, Image, RefreshControl, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import api, { BASE_URL } from '../services/api';
import { getSocket } from '../services/socket';
import Header from '../components/Header';
import CategoryCard from '../components/CategoryCard';
import storage from '../services/storage';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';
import { getAvatarSource } from './profile';

export default function CategoriesScreen() {
  const [categories, setCategories] = useState(() => {
    try {
      const cached = storage.getItem('cached_categories');
      if (cached) return JSON.parse(cached);
    } catch (e) {}
    return [];
  });

  const categoriesRef = useRef(categories);
  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const [loading, setLoading] = useState(() => {
    try {
      const cached = storage.getItem('cached_categories');
      if (cached && JSON.parse(cached).length > 0) return false;
    } catch (e) {}
    return true;
  });
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [username, setUsername] = useState('');
  const [profileImage, setProfileImage] = useState('');
  
  const [roomPinModal, setRoomPinModal] = useState(false);
  const [roomPin, setRoomPin] = useState('');
  const [pinChecking, setPinChecking] = useState(false);

  // Estado para PIN al tocar una tarjeta de categoría
  const [categoryPinModal, setCategoryPinModal] = useState(false);
  const [selectedCategoryForPin, setSelectedCategoryForPin] = useState(null);
  const [categoryPinInput, setCategoryPinInput] = useState('');
  
  // Estado para Modal de Confirmación Previo a la Partida
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [categoryToPlay, setCategoryToPlay] = useState(null);

  // Estado para la Barra de Búsqueda y Píldoras de Filtro
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPill, setSelectedPill] = useState('all'); // 'all', 'practice', 'exam', o nombre de docente
  
  const router = useRouter();
  const { colors } = useTheme();
  const { refreshUser } = useSidebar();

  useFocusEffect(
    useCallback(() => {
      checkAuth();
    }, [])
  );

  // ⚡ Sincronización automática en tiempo real vía WebSockets
  useEffect(() => {
    try {
      const socket = getSocket();

      const handleCategoriesUpdate = (data) => {
        console.log('⚡ [WebSocket Index] Notificación en tiempo real recibida:', data);
        fetchCategories(false); // Recarga automática sin spinner molesto
      };

      socket.on('categories:updated', handleCategoriesUpdate);

      return () => {
        socket.off('categories:updated', handleCategoriesUpdate);
      };
    } catch (err) {
      console.warn('No se pudo conectar socket en pantalla principal:', err);
    }
  }, []);

  const checkAuth = () => {
    const token = storage.getItem('token');
    if (!token) {
      router.replace('/login');
      return;
    }

    const storedAdmin = storage.getItem('isAdmin') === 'true';
    const storedUser = storage.getItem('username') || '';
    const storedImage = storage.getItem('profileImage') || '';
    setIsAdmin(storedAdmin);
    setUsername(storedUser);
    setProfileImage(storedImage);
    refreshUser();

    // ⚡ Usar categoriesRef para evitar el cierre estático desactualizado en móvil
    const hasCachedData = (categoriesRef.current && categoriesRef.current.length > 0);
    fetchCategories(!hasCachedData);
  };

  const fetchCategories = async (showLoading = true) => {
    if (showLoading && (!categoriesRef.current || categoriesRef.current.length === 0)) {
      setLoading(true);
    }
    try {
      const response = await api.get(`/categories?_t=${Date.now()}`);
      setCategories(response.data);
      categoriesRef.current = response.data;
      try {
        storage.setItem('cached_categories', JSON.stringify(response.data));
      } catch (e) {}
    } catch (error) {
      console.error('Error al cargar categorías:', error);
      if (error.response?.status === 401) {
        storage.removeItem('token');
        router.replace('/login');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handlePullToRefresh = () => {
    setRefreshing(true);
    fetchCategories(false);
  };

  // Obtener lista única de docentes
  const uniqueTeachers = Array.from(
    new Set(
      categories
        .map((c) => c.createdBy?.username)
        .filter((u) => Boolean(u && u.trim().length > 0))
    )
  );

  const activeExamsCount = categories.filter(
    (c) => !c.isPublic && c.roomCode && c.isActive !== false
  ).length;

  const filteredCategories = categories.filter((cat) => {
    // Filtro por píldoras rápidas
    if (selectedPill === 'practice' && !cat.isPublic && cat.roomCode) return false;
    if (selectedPill === 'exam' && (cat.isPublic || !cat.roomCode)) return false;
    if (selectedPill !== 'all' && selectedPill !== 'practice' && selectedPill !== 'exam') {
      if (cat.createdBy?.username !== selectedPill) return false;
    }

    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase().trim();
    const nameMatch = cat.name?.toLowerCase().includes(query);
    const descMatch = cat.description?.toLowerCase().includes(query);
    const teacherMatch = cat.createdBy?.username?.toLowerCase().includes(query);
    return nameMatch || descMatch || teacherMatch;
  });

  const handleStartGame = (category) => {
    if (category.isActive === false) {
      const msg = '🚫 Este examen ha sido cerrado por el docente. Ya no se aceptan nuevos intentos.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Examen Cerrado', msg);
      return;
    }

    setCategoryToPlay(category);
    setConfirmModalVisible(true);
  };

  const handleConfirmStart = () => {
    if (!categoryToPlay) return;
    const cat = categoryToPlay;
    setConfirmModalVisible(false);
    setCategoryToPlay(null);

    const initialLives = cat.initialLives || (cat.gameMode === 'practice' || cat.isPublic ? 5 : 3);
    const gameMode = cat.gameMode || (cat.isPublic ? 'practice' : 'exam');
    const timePerQuestion = cat.timePerQuestion !== undefined ? cat.timePerQuestion : 15;

    router.push({
      pathname: '/quiz',
      params: { 
        categoryId: cat._id, 
        categoryName: cat.name,
        roomCode: cat.roomCode || '',
        initialLives,
        gameMode,
        timePerQuestion,
      }
    });
  };

  const handleCategoryPress = (category) => {
    if (category.isActive === false) {
      const msg = '🚫 Este examen ha sido cerrado por el docente. Ya no se aceptan más intentos.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Examen Cerrado', msg);
      return;
    }

    const isOwner = category.createdBy?.username === username;

    // Si es privada (con PIN) y el usuario no es el dueño, pedir PIN primero
    if (!category.isPublic && category.roomCode && !isOwner) {
      setSelectedCategoryForPin(category);
      setCategoryPinInput('');
      setCategoryPinModal(true);
    } else {
      // Si es pública o el dueño, ir directo a la confirmación de partida
      handleStartGame(category);
    }
  };

  const handleValidateCategoryPin = () => {
    if (!selectedCategoryForPin) return;

    const inputClean = categoryPinInput.trim().toUpperCase();
    const correctPin = selectedCategoryForPin.roomCode?.toUpperCase();

    if (inputClean === correctPin) {
      const targetCat = selectedCategoryForPin;
      setCategoryPinModal(false);
      setSelectedCategoryForPin(null);
      setCategoryPinInput('');

      // Abrir modal de confirmación
      handleStartGame(targetCat);
    } else {
      const errorMsg = '❌ PIN incorrecto. Solicita el código a tu docente para ingresar a esta materia.';
      if (Platform.OS === 'web') {
        alert(errorMsg);
      } else {
        Alert.alert('Acceso Denegado', errorMsg);
      }
    }
  };

  const handleJoinRoom = async () => {
    const cleanPin = roomPin.trim();
    if (!cleanPin || cleanPin.length < 4) {
      if (Platform.OS === 'web') {
        alert('Por favor ingresa un código PIN de sala válido');
      } else {
        Alert.alert('PIN Inválido', 'Por favor ingresa un código PIN de sala válido.');
      }
      return;
    }
    setPinChecking(true);
    try {
      const response = await api.get(`/categories/room/${cleanPin}`);
      const category = response.data;
      setRoomPinModal(false);
      setRoomPin('');
      handleStartGame(category);
    } catch (error) {
      const msg = error.response?.data?.message || 'Código de sala no encontrado o no existe.';
      if (Platform.OS === 'web') {
        alert(msg);
      } else {
        Alert.alert('Sala no encontrada', msg);
      }
    } finally {
      setPinChecking(false);
    }
  };

  // Frases motivacionales de Megamente
  const MEGAMIND_QUOTES = [
    "¡Tu intelecto no tiene límites hoy! 🧠",
    "¡El conocimiento es tu mayor superpoder! ⚡",
    "¡Demuestra tu genialidad en cada respuesta! 🚀",
    "¡La mente más brillante siempre gana la partida! 👑",
    "¡Listo para conquistar un nuevo récord cerebral! 🏆",
    "¡Desafía tus límites y lidera el podio! 🌟",
  ];

  const [motivationalQuote] = useState(() => {
    const index = Math.floor(Math.random() * MEGAMIND_QUOTES.length);
    return MEGAMIND_QUOTES[index];
  });

  // Calcular racha de días activos a partir del historial en caché
  const getStreakDays = () => {
    try {
      const cachedProfile = storage.getItem('cached_profile');
      if (cachedProfile) {
        const parsed = JSON.parse(cachedProfile);
        if (parsed.history && parsed.history.length > 0) {
          const uniqueDays = new Set(
            parsed.history.map((h) => {
              const d = new Date(h.createdAt || Date.now());
              return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
            })
          );
          return Math.max(1, uniqueDays.size);
        }
      }
    } catch (e) {}
    return 1;
  };

  const streakDays = getStreakDays();

  // Partida rápida aleatoria
  const handleQuickRandomGame = () => {
    const activeCats = categories.filter((c) => c.isActive !== false);
    if (activeCats.length === 0) {
      const msg = 'No hay materias activas disponibles en este momento.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Sin Materias', msg);
      return;
    }
    const randomIndex = Math.floor(Math.random() * activeCats.length);
    const chosenCat = activeCats[randomIndex];
    handleCategoryPress(chosenCat);
  };

  const ProfileButton = () => (
    <TouchableOpacity 
      style={styles.headerBtn}
      onPress={() => router.push('/profile')}
      activeOpacity={0.8}
    >
      {profileImage ? (
        <Image 
          source={getAvatarSource(profileImage)} 
          style={styles.headerAvatar} 
        />
      ) : (
        <Text style={styles.headerBtnText}>👤</Text>
      )}
    </TouchableOpacity>
  );

  if (loading && categories.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="🎮 JuegaMente" rightComponent={<ProfileButton />} />
      
      <View style={styles.content}>
        {/* =========================================================
            BANNER HERO: MEGAMENTE & RACHA DIARIA (OPCIÓN 1)
        ========================================================= */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroTopRow}>
            {/* Avatar de Megamente */}
            <TouchableOpacity
              style={[styles.heroAvatarWrapper, { borderColor: colors.primary }]}
              onPress={() => router.push('/profile')}
              activeOpacity={0.8}
            >
              {profileImage ? (
                <Image
                  source={getAvatarSource(profileImage)}
                  style={styles.heroAvatarImg}
                />
              ) : (
                <View style={[styles.heroAvatarPlaceholder, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.heroAvatarInitial, { color: colors.primaryText }]}>
                    {username ? username.substring(0, 2).toUpperCase() : 'JM'}
                  </Text>
                </View>
              )}
              <View style={[styles.heroAvatarMiniBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ fontSize: 10 }}>🧠</Text>
              </View>
            </TouchableOpacity>

            {/* Saludo y Racha */}
            <View style={styles.heroUserTextCol}>
              <View style={styles.heroGreetingRow}>
                <Text style={[styles.heroGreeting, { color: colors.text }]} numberOfLines={1}>
                  ¡Hola, {username || 'Estudiante'}! 👋
                </Text>
                <View style={styles.heroStreakPill}>
                  <Text style={styles.heroStreakText}>🔥 {streakDays}d racha</Text>
                </View>
              </View>
              <Text style={[styles.heroQuote, { color: colors.textSecondary }]} numberOfLines={2}>
                "{motivationalQuote}"
              </Text>
            </View>
          </View>

          {/* Botones de Acción Rápida Hero */}
          <View style={[styles.heroActionsRow, { borderTopColor: `${colors.border}66` }]}>
            {/* 1. Botón: Partida Rápida */}
            <TouchableOpacity
              style={[styles.heroQuickPlayBtn, { backgroundColor: colors.primary }]}
              onPress={handleQuickRandomGame}
              activeOpacity={0.8}
            >
              <Text style={styles.heroQuickPlayIcon}>🎲</Text>
              <Text style={[styles.heroQuickPlayText, { color: colors.primaryText }]}>
                Partida Rápida
              </Text>
            </TouchableOpacity>

            {/* 2. Botón: Mi Perfil / Ranking */}
            <TouchableOpacity
              style={[styles.heroProfileBtn, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}33` }]}
              onPress={() => router.push('/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.heroProfileIcon}>🏆</Text>
              <Text style={[styles.heroProfileText, { color: colors.primary }]}>
                Mi Perfil
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        {/* =========================================================
            OPCIÓN 2: BARRA DE PIN & SALA DE EXAMEN EN VIVO (ESTILO KAHOOT)
        ========================================================= */}
        <View style={[styles.kahootPinCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.kahootTopRow}>
            <View style={styles.kahootTitleRow}>
              <View style={[styles.kahootIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                <Text style={styles.kahootIconEmoji}>⚡</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.kahootTitle, { color: colors.text }]}>
                  Unirse a Sala de Examen
                </Text>
                <Text style={[styles.kahootSubtitle, { color: colors.textSecondary }]}>
                  Ingresa el código PIN proporcionado por tu docente
                </Text>
              </View>
            </View>

            {activeExamsCount > 0 && (
              <View style={styles.kahootLiveBadge}>
                <View style={styles.kahootLiveDot} />
                <Text style={styles.kahootLiveBadgeText}>
                  {activeExamsCount} {activeExamsCount === 1 ? 'Examen Activo' : 'Exámenes Activos'}
                </Text>
              </View>
            )}
          </View>

          {/* Formulario Rápido de PIN Integrado */}
          <View style={styles.kahootInputRow}>
            <View style={[styles.kahootInputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={styles.kahootInputIcon}>🔒</Text>
              <TextInput
                style={[styles.kahootTextInput, { color: colors.text }]}
                placeholder="PIN DE SALA (ej. 8492)"
                placeholderTextColor={colors.textSecondary}
                value={roomPin}
                onChangeText={(val) => setRoomPin(val.toUpperCase())}
                autoCapitalize="characters"
                maxLength={8}
                onSubmitEditing={handleJoinRoom}
                returnKeyType="go"
              />
              {roomPin.length > 0 && (
                <TouchableOpacity onPress={() => setRoomPin('')} style={styles.kahootClearBtn}>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '700' }}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.kahootJoinBtn,
                {
                  backgroundColor: roomPin.trim().length >= 4 ? colors.primary : `${colors.primary}80`,
                },
              ]}
              onPress={handleJoinRoom}
              disabled={pinChecking || roomPin.trim().length < 4}
              activeOpacity={0.8}
            >
              {pinChecking ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <>
                  <Text style={[styles.kahootJoinBtnText, { color: colors.primaryText }]}>
                    ¡Entrar!
                  </Text>
                  <Text style={[styles.kahootJoinBtnArrow, { color: colors.primaryText }]}>➜</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Barra de Búsqueda de Categorías */}
        <View style={[styles.searchContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar materia, tema o profesor..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <Text style={[styles.clearSearchText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Píldoras de Filtro Rápido */}
        <View style={styles.pillsOuterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollContent}>
            <TouchableOpacity
              style={[
                styles.pillBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedPill === 'all' && { backgroundColor: colors.primary, borderColor: colors.primary }
              ]}
              onPress={() => setSelectedPill('all')}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: selectedPill === 'all' ? colors.primaryText : colors.text }]}>
                ✨ Todas ({categories.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedPill === 'practice' && { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' }
              ]}
              onPress={() => setSelectedPill('practice')}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: selectedPill === 'practice' ? '#FFFFFF' : colors.text }]}>
                🌐 Práctica Libre
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.pillBtn,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedPill === 'exam' && { backgroundColor: '#FF6B6B', borderColor: '#FF6B6B' }
              ]}
              onPress={() => setSelectedPill('exam')}
              activeOpacity={0.7}
            >
              <Text style={[styles.pillText, { color: selectedPill === 'exam' ? '#FFFFFF' : colors.text }]}>
                🔒 Exámenes (PIN)
              </Text>
            </TouchableOpacity>

            {uniqueTeachers.map((teacher) => (
              <TouchableOpacity
                key={teacher}
                style={[
                  styles.pillBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  selectedPill === teacher && { backgroundColor: colors.primary, borderColor: colors.primary }
                ]}
                onPress={() => setSelectedPill(teacher)}
                activeOpacity={0.7}
              >
                <Text style={[styles.pillText, { color: selectedPill === teacher ? colors.primaryText : colors.text }]}>
                  👨‍🏫 {teacher}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <Text style={[styles.subtitle, { color: colors.text }]}>
          {searchQuery.trim() || selectedPill !== 'all' ? `Resultados (${filteredCategories.length})` : 'Materias Disponibles'}
        </Text>
        
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => `${item._id}_${item.isPublic}_${item.roomCode || 'public'}_${item.name}`}
          extraData={categories}
          renderItem={({ item }) => (
            <CategoryCard 
              category={item} 
              onPress={() => handleCategoryPress(item)} 
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handlePullToRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Image
                source={
                  searchQuery.trim().length > 0
                    ? require('../../assets/images/no_results_search.jpg')
                    : require('../../assets/images/empty_categories.jpg')
                }
                style={styles.emptyIllustration}
                resizeMode="contain"
              />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {searchQuery.trim().length > 0 ? 'Sin coincidencias' : 'No hay categorías disponibles'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                {searchQuery.trim().length > 0
                  ? `No se encontraron materias que coincidan con "${searchQuery}".`
                  : 'Aún no se han publicado categorías de preguntas.'}
              </Text>
              {searchQuery.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.clearFilterBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setSearchQuery('')}
                >
                  <Text style={[styles.clearFilterBtnText, { color: colors.primaryText }]}>
                    Ver todas las materias
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>

      {/* Modal para Ingresar PIN de Sala */}
      <Modal visible={roomPinModal} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.modalEmoji}>🎯</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Ingresar PIN de Sala</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              Escribe el código de 6 dígitos que te compartió tu profesor
            </Text>

            <TextInput
              style={[styles.pinInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Ej. 849201"
              placeholderTextColor={colors.textSecondary}
              value={roomPin}
              onChangeText={setRoomPin}
              maxLength={10}
              keyboardType="default"
              autoCapitalize="characters"
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.border }]}
                onPress={() => setRoomPinModal(false)}
                disabled={pinChecking}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleJoinRoom}
                disabled={pinChecking}
              >
                {pinChecking ? (
                  <ActivityIndicator size="small" color={colors.primaryText} />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: colors.primaryText }]}>Entrar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal para Ingresar PIN de Categoría Seleccionada */}
      <Modal visible={categoryPinModal} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.modalEmoji}>{selectedCategoryForPin?.icon || '🔒'}</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {selectedCategoryForPin?.name || 'Materia Protegida'}
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              {selectedCategoryForPin?.createdBy?.username
                ? `Esta materia fue creada por Prof. ${selectedCategoryForPin.createdBy.username}. Ingresa el PIN para desbloquear el examen.`
                : 'Ingresa el código PIN para acceder a este cuestionario.'}
            </Text>

            <TextInput
              style={[styles.pinInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
              placeholder="Escribe el PIN aquí"
              placeholderTextColor={colors.textSecondary}
              value={categoryPinInput}
              onChangeText={setCategoryPinInput}
              maxLength={10}
              keyboardType="default"
              autoCapitalize="characters"
              autoFocus={true}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setCategoryPinModal(false);
                  setSelectedCategoryForPin(null);
                  setCategoryPinInput('');
                }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleValidateCategoryPin}
              >
                <Text style={[styles.confirmBtnText, { color: colors.primaryText }]}>Desbloquear 🔓</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Confirmación Previa e Instrucciones de Partida */}
      <Modal visible={confirmModalVisible} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.confirmGameCard, { backgroundColor: colors.card }]}>
            <View style={[styles.confirmGameIconContainer, { backgroundColor: `${categoryToPlay?.color || colors.primary}20` }]}>
              <Text style={styles.confirmGameIcon}>{categoryToPlay?.icon || '🎮'}</Text>
            </View>

            <Text style={[styles.confirmGameTitle, { color: colors.text }]}>
              {categoryToPlay?.name}
            </Text>

            <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16 }}>
              <View style={[styles.badge, { backgroundColor: (categoryToPlay?.isPublic || !categoryToPlay?.roomCode) ? '#4ECDC420' : '#FF6B6B20' }]}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: (categoryToPlay?.isPublic || !categoryToPlay?.roomCode) ? '#4ECDC4' : '#FF6B6B' }}>
                  {(categoryToPlay?.isPublic || !categoryToPlay?.roomCode) ? '🌐 Modo Práctica Libre' : '📝 Modo Examen Oficial'}
                </Text>
              </View>
            </View>

            {/* Caja de Reglas y Vidas */}
            <View style={[styles.rulesContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleEmoji}>💖</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleLabel, { color: colors.text }]}>Vidas Disponibles</Text>
                  <Text style={[styles.ruleValue, { color: colors.primary }]}>
                    {(categoryToPlay?.initialLives || (categoryToPlay?.gameMode === 'practice' || categoryToPlay?.isPublic ? 5 : 3))} Vidas
                    {' '}{'❤️'.repeat(categoryToPlay?.initialLives || (categoryToPlay?.gameMode === 'practice' || categoryToPlay?.isPublic ? 5 : 3))}
                  </Text>
                </View>
              </View>

              <View style={styles.ruleItem}>
                <Text style={styles.ruleEmoji}>⏱️</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.ruleLabel, { color: colors.text }]}>Tiempo por Pregunta</Text>
                  <Text style={[styles.ruleValue, { color: colors.textSecondary }]}>
                    {categoryToPlay?.timePerQuestion === 0 ? 'Sin límite (Libre)' : `${categoryToPlay?.timePerQuestion || 15} segundos`}
                  </Text>
                </View>
              </View>

              {categoryToPlay?.createdBy?.username ? (
                <View style={styles.ruleItem}>
                  <Text style={styles.ruleEmoji}>👨‍🏫</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.ruleLabel, { color: colors.text }]}>Docente Responsable</Text>
                    <Text style={[styles.ruleValue, { color: colors.textSecondary }]}>
                      Prof. {categoryToPlay.createdBy.username}
                    </Text>
                  </View>
                </View>
              ) : null}
            </View>

            {/* Advertencia Anti-Trampas */}
            <View style={[styles.warningBox, { backgroundColor: '#FF6B6B15', borderColor: '#FF6B6B50' }]}>
              <Text style={styles.warningText}>
                ⚠️ <Text style={{ fontWeight: 'bold' }}>Regla de Partida:</Text> Una vez que inicies, no podrás volver atrás hasta completar el cuestionario o se registrará como abandono.
              </Text>
            </View>

            {/* Acceso a ranking / posiciones de la materia */}
            <TouchableOpacity
              style={{
                backgroundColor: '#F59E0B15',
                borderColor: '#F59E0B60',
                borderWidth: 1,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 14,
                alignItems: 'center',
                marginBottom: 14,
                width: '100%',
              }}
              onPress={() => {
                setConfirmModalVisible(false);
                router.push('/profile');
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#D97706', fontWeight: '800', fontSize: 13 }}>
                🏆 Ver Historial y Posiciones en Mi Perfil
              </Text>
            </TouchableOpacity>

            {/* Botones de Acción */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.border }]}
                onPress={() => {
                  setConfirmModalVisible(false);
                  setCategoryToPlay(null);
                }}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
                onPress={handleConfirmStart}
              >
                <Text style={[styles.confirmBtnText, { color: colors.primaryText }]}>¡Comenzar! 🚀</Text>
              </TouchableOpacity>
            </View>
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
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 24 : 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    flex: 2,
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 24 : 20,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
    letterSpacing: 0.5,
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  headerBtn: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtnText: {
    fontSize: 22,
  },
  headerAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  content: {
    flex: 1,
    padding: Platform.OS === 'web' ? 24 : 16,
    width: '100%',
    maxWidth: 920,
    alignSelf: 'center',
  },
  // Estilos de la Barra de PIN y Sala de Examen (Opción 2 - Estilo Kahoot)
  kahootPinCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 3px 12px rgba(0,0,0,0.06)' }
      : { elevation: 2 }),
  },
  kahootTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
    flexWrap: 'wrap',
  },
  kahootTitleRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 180,
  },
  kahootIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kahootIconEmoji: {
    fontSize: 18,
  },
  kahootTitle: {
    fontSize: 14,
    fontWeight: '800',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  kahootSubtitle: {
    fontSize: 11,
  },
  kahootLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EF444415',
    borderColor: '#EF444444',
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  kahootLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  kahootLiveBadgeText: {
    color: '#EF4444',
    fontSize: 10.5,
    fontWeight: '800',
  },
  kahootInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  kahootInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  kahootInputIcon: {
    fontSize: 15,
  },
  kahootTextInput: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '800',
    letterSpacing: 2,
    paddingVertical: 0,
  },
  kahootClearBtn: {
    padding: 4,
  },
  kahootJoinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 12,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : {}),
  },
  kahootJoinBtnText: {
    fontSize: 13,
    fontWeight: '800',
  },
  kahootJoinBtnArrow: {
    fontSize: 13.5,
    fontWeight: '900',
  },
  // Estilos de la Barra de Búsqueda
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0,0,0,0.04)',
    elevation: 2,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    padding: 0,
    outlineWidth: 0,
  },
  clearSearchBtn: {
    padding: 6,
  },
  clearSearchText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: Platform.OS === 'web' ? 22 : 18,
    fontWeight: '700',
    marginBottom: 16,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  list: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyIllustration: {
    width: 220,
    height: 220,
    borderRadius: 20,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  clearFilterBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
  },
  clearFilterBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Estilos del Modal de PIN
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 10px rgba(0,0,0,0.1)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 }),
  },
  modalEmoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 4,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  modalSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 20,
  },
  pinInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 8,
    width: '100%',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  confirmBtn: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  // Estilos del Modal de Confirmación Previa
  confirmGameCard: {
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 24px rgba(0,0,0,0.15)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }),
  },
  confirmGameIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmGameIcon: {
    fontSize: 32,
  },
  confirmGameTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
    textAlign: 'center',
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rulesContainer: {
    width: '100%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 12,
    marginBottom: 16,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ruleEmoji: {
    fontSize: 20,
  },
  ruleLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  ruleValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningBox: {
    width: '100%',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    lineHeight: 16,
    textAlign: 'center',
  },
  // Estilos del Banner Hero Megamente & Racha Diaria (Opción 1)
  heroCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 3px 12px rgba(0,0,0,0.06)' }
      : { elevation: 2 }),
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  heroAvatarWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? { cursor: 'pointer' } : {}),
  },
  heroAvatarImg: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  heroAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroAvatarInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  heroAvatarMiniBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroUserTextCol: {
    flex: 1,
    gap: 2,
  },
  heroGreetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  heroGreeting: {
    fontSize: 15.5,
    fontWeight: '800',
    flexShrink: 1,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
  heroStreakPill: {
    backgroundColor: '#F59E0B18',
    borderColor: '#F59E0B44',
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 12,
  },
  heroStreakText: {
    color: '#D97706',
    fontSize: 11,
    fontWeight: '800',
  },
  heroQuote: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  heroActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  heroQuickPlayBtn: {
    flex: 1.2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : {}),
  },
  heroQuickPlayIcon: {
    fontSize: 15,
  },
  heroQuickPlayText: {
    fontSize: 12.5,
    fontWeight: '800',
  },
  heroProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', transition: 'transform 0.15s ease' } : {}),
  },
  heroProfileIcon: {
    fontSize: 14,
  },
  heroProfileText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  // Estilos de Píldoras de Filtro Rápido
  pillsOuterContainer: {
    marginBottom: 16,
  },
  pillsScrollContent: {
    gap: 8,
    paddingRight: 16,
  },
  pillBtn: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
