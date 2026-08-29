import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, ScrollView, Image, TextInput, Modal, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import api, { BASE_URL } from '../services/api';
import { getSocket } from '../services/socket';

const DRAWER_WIDTH = 295;

export default function Sidebar({ isOpen, onClose, username, role, isAdmin, profileImage, onLogout }) {
  const router = useRouter();
  const { theme, colors, setTheme } = useTheme();
  
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [isThemeExpanded, setIsThemeExpanded] = useState(false);

  // Estados para el Modal de PIN
  const [pinVisible, setPinVisible] = useState(false);
  const [pin, setPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // 🏆 Estados para el Modal Directo de Ranking en Vivo
  const [rankingModalVisible, setRankingModalVisible] = useState(false);
  const [rankingCategories, setRankingCategories] = useState([]);
  const [selectedRankingCat, setSelectedRankingCat] = useState(null);
  const [rankingData, setRankingData] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [liveRankingBadge, setLiveRankingBadge] = useState(false);

  const selectedRankingCatRef = useRef(selectedRankingCat);
  const rankingModalVisibleRef = useRef(rankingModalVisible);

  useEffect(() => {
    selectedRankingCatRef.current = selectedRankingCat;
    rankingModalVisibleRef.current = rankingModalVisible;
  }, [selectedRankingCat, rankingModalVisible]);

  // ⚡ Sincronización en tiempo real vía WebSockets para el Ranking
  useEffect(() => {
    try {
      const socket = getSocket();
      const handleRankingUpdate = async (data) => {
        const currentCat = selectedRankingCatRef.current;
        const isVisible = rankingModalVisibleRef.current;
        if (isVisible && currentCat && (!data?.categoryId || String(data.categoryId) === String(currentCat._id))) {
          try {
            const res = await api.get(`/categories/${currentCat._id}/ranking`);
            setRankingData(res.data);
            setLiveRankingBadge(true);
            setTimeout(() => setLiveRankingBadge(false), 4000);
          } catch {}
        }
      };

      socket.on('ranking:updated', handleRankingUpdate);
      return () => {
        socket.off('ranking:updated', handleRankingUpdate);
      };
    } catch {}
  }, []);

  const handleOpenRankingModal = async () => {
    onClose();
    setRankingModalVisible(true);
    setRankingLoading(true);
    try {
      const res = await api.get('/categories');
      const cats = res.data || [];
      setRankingCategories(cats);
      if (cats.length > 0) {
        const initialCat = selectedRankingCat || cats[0];
        setSelectedRankingCat(initialCat);
        const rankRes = await api.get(`/categories/${initialCat._id}/ranking`);
        setRankingData(rankRes.data);
      }
    } catch (err) {
      console.error('Error al cargar rankings en vivo:', err.message);
    } finally {
      setRankingLoading(false);
    }
  };

  const handleSelectRankingCat = async (cat) => {
    setSelectedRankingCat(cat);
    setRankingLoading(true);
    try {
      const res = await api.get(`/categories/${cat._id}/ranking`);
      setRankingData(res.data);
    } catch (err) {
      console.error('Error al cambiar materia en ranking:', err.message);
    } finally {
      setRankingLoading(false);
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return '';
    }
  };

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [isOpen]);

  const handleVerifyPin = async () => {
    if (!pin.trim()) {
      Alert.alert('Error', 'Por favor, introduce el PIN.');
      return;
    }
    setPinLoading(true);
    try {
      const response = await api.post('/auth/verify-pin', { pin: pin.trim() });
      if (response.data.success) {
        setPinVisible(false);
        router.push('/admin');
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'PIN incorrecto. Inténtalo de nuevo.';
      Alert.alert('Error de Acceso', msg);
    } finally {
      setPinLoading(false);
    }
  };

  // No renderizar si no está abierto ni están los modales visibles
  if (!shouldRender && !pinVisible && !rankingModalVisible) return null;

  const handleNavigate = (path) => {
    onClose();
    router.push(path);
  };

  return (
    <View style={StyleSheet.absoluteFillObject}>
      {/* Backdrop traslúcido */}
      {shouldRender && (
        <Animated.View 
          style={[
            styles.backdrop, 
            { 
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: backdropAnim 
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.backdropClickable} 
            activeOpacity={1} 
            onPress={onClose} 
          />
        </Animated.View>
      )}

      {/* Drawer Deslizable */}
      {shouldRender && (
        <Animated.View 
          style={[
            styles.drawer, 
            { 
              backgroundColor: colors.card,
              borderRightColor: colors.border,
              transform: [{ translateX: slideAnim }] 
            }
          ]}
          {...(Platform.OS === 'web' ? {
            onMouseLeave: onClose
          } : {})}
        >
          {/* Cabecera del Perfil con Marca JuegaMente Integrada Horizontal */}
          <View style={[styles.profileHeader, { borderBottomColor: colors.border, backgroundColor: colors.inputBg || `${colors.card}` }]}>
            <View style={styles.profileRow}>
              {/* Avatar a la izquierda */}
              <TouchableOpacity 
                style={[styles.avatar, { backgroundColor: colors.primary }]}
                onPress={() => handleNavigate('/profile')}
                activeOpacity={0.8}
              >
                {profileImage ? (
                  <Image source={{ uri: `${BASE_URL}${profileImage}` }} style={styles.avatarImage} />
                ) : (
                  <Text style={[styles.avatarText, { color: colors.primaryText }]}>
                    {username?.substring(0, 2).toUpperCase()}
                  </Text>
                )}
              </TouchableOpacity>

              {/* Información de Usuario en el centro */}
              <View style={styles.profileInfo}>
                <Text style={[styles.username, { color: colors.text }]} numberOfLines={1}>
                  {username}
                </Text>
                <View style={[styles.roleBadge, { backgroundColor: (isAdmin || role === 'admin') ? '#F59E0B20' : `${colors.primary}20` }]}>
                  <Text style={[styles.role, { color: (isAdmin || role === 'admin') ? '#D97706' : colors.primary }]} numberOfLines={1}>
                    {isAdmin || role === 'admin' ? '👑 Admin' : '🎓 Estudiante'}
                  </Text>
                </View>
              </View>

              {/* Insignia compacta de Marca Megamente */}
              <View style={styles.brandBadge}>
                <Image 
                  source={require('../../assets/images/megamind_sidebar.png')} 
                  style={styles.brandMascot}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>

          {/* Opciones del Menú */}
          <ScrollView contentContainerStyle={styles.menuList} showsVerticalScrollIndicator={false}>
            <TouchableOpacity 
              style={[
                styles.menuItem, 
                { 
                  backgroundColor: colors.inputBg || `${colors.card}`, 
                  borderColor: colors.border,
                  borderWidth: 1.5 
                }
              ]} 
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🏠</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Inicio</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.menuItem, 
                { 
                  backgroundColor: colors.inputBg || `${colors.card}`, 
                  borderColor: colors.border,
                  borderWidth: 1.5 
                }
              ]} 
              onPress={() => handleNavigate('/profile')}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={[styles.menuText, { color: colors.text }]}>Mi Perfil</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[
                styles.menuItem, 
                { 
                  backgroundColor: '#F59E0B12', 
                  borderColor: '#F59E0B50',
                  borderWidth: 1.5 
                }
              ]} 
              onPress={handleOpenRankingModal}
              activeOpacity={0.7}
            >
              <Text style={styles.menuIcon}>🏆</Text>
              <Text style={[styles.menuText, { color: '#D97706' }]}>Rankings en Vivo</Text>
            </TouchableOpacity>

            {(isAdmin || role === 'admin') && (
              <TouchableOpacity 
                style={[
                  styles.menuItem, 
                  { 
                    backgroundColor: colors.inputBg || `${colors.card}`, 
                    borderColor: colors.border,
                    borderWidth: 1.5 
                  }
                ]} 
                onPress={() => {
                  onClose();
                  setPin('');
                  setPinVisible(true);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.menuIcon}>⚙️</Text>
                <Text style={[styles.menuText, { color: colors.text }]}>Panel Admin</Text>
              </TouchableOpacity>
            )}

            {/* Selector de Temas Colapsable (Acordeón por Clic) */}
            <View style={[styles.themeSection, { borderColor: colors.border, backgroundColor: colors.inputBg || `${colors.card}`, borderWidth: 1.5 }]}>
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}
                onPress={() => setIsThemeExpanded(!isThemeExpanded)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.themeTitle, { color: colors.text, marginBottom: 2, fontWeight: '700' }]}>
                    🎨 Tema de la App
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    Actual: {
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
                </View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: 'bold' }}>
                  {isThemeExpanded ? '▲' : '▼'}
                </Text>
              </TouchableOpacity>

              {isThemeExpanded && (
                <View style={styles.themeGrid}>
                  {[
                    { id: 'light', emoji: '☀️', name: 'Claro' },
                    { id: 'dark', emoji: '🌙', name: 'Oscuro' },
                    { id: 'emerald', emoji: '🍃', name: 'Esmeralda' },
                    { id: 'sunset', emoji: '🌅', name: 'Atardecer' },
                    { id: 'sakura', emoji: '🌸', name: 'Sakura' },
                    { id: 'ocean', emoji: '🌊', name: 'Océano' },
                    { id: 'gold', emoji: '👑', name: 'Dorado' },
                    { id: 'cyber', emoji: '🍇', name: 'Púrpura' },
                    { id: 'neon', emoji: '🌌', name: 'Neón' },
                    { id: 'midnight', emoji: '🏛️', name: 'Medianoche' },
                  ].map((t) => (
                    <TouchableOpacity 
                      key={t.id}
                      style={[
                        styles.themeBtn,
                        theme === t.id && [styles.themeBtnActive, { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` }]
                      ]}
                      onPress={() => setTheme(t.id)}
                    >
                      <Text style={styles.themeEmoji}>{t.emoji}</Text>
                      <Text style={[styles.themeBtnText, { color: colors.text, fontWeight: theme === t.id ? 'bold' : 'normal' }]}>{t.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* Footer con Cierre de Sesión y Versión Compacta */}
          <View style={[styles.footer, { borderTopColor: colors.border }]}>
            <TouchableOpacity style={styles.logoutBtn} onPress={onLogout} activeOpacity={0.85}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Cerrar Sesión</Text>
            </TouchableOpacity>
            <Text style={[styles.versionText, { color: colors.textSecondary }]}>
              v1.0.0
            </Text>
          </View>
        </Animated.View>
      )}

      {/* Modal de Validación de PIN de Administrador */}
      <Modal visible={pinVisible} animationType="fade" transparent={true}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
            <Text style={styles.modalEmoji}>🔒</Text>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Acceso de Seguridad</Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Por favor, introduce el PIN de Administrador</Text>

            <TextInput
              style={[styles.pinInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={pin}
              onChangeText={setPin}
              placeholder="PIN de 4 dígitos"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.cancelBtn, { backgroundColor: colors.border }]} 
                onPress={() => setPinVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, { backgroundColor: colors.primary }]} 
                onPress={handleVerifyPin}
                disabled={pinLoading}
              >
                {pinLoading ? (
                  <ActivityIndicator color={colors.primaryText} />
                ) : (
                  <Text style={[styles.confirmBtnText, { color: colors.primaryText }]}>Verificar</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
      {/* 🏆 Modal Directo de Tabla de Posiciones en Tiempo Real */}
      <Modal
        visible={rankingModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRankingModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay || 'rgba(0,0,0,0.6)' }]}>
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
                  {selectedRankingCat?.name || rankingData?.category?.name || 'Selecciona una materia'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.rankingCloseBtn, { backgroundColor: colors.inputBg || `${colors.card}` }]}
                onPress={() => setRankingModalVisible(false)}
              >
                <Text style={[styles.rankingCloseBtnText, { color: colors.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Píldoras horizontales para cambiar de materia fácilmente */}
            {rankingCategories.length > 0 && (
              <View style={styles.pillsScrollContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillsScrollContent}>
                  {rankingCategories.map((cat) => {
                    const isSelected = selectedRankingCat?._id === cat._id;
                    return (
                      <TouchableOpacity
                        key={cat._id}
                        style={[
                          styles.rankingCatPill,
                          { backgroundColor: colors.inputBg || `${colors.card}`, borderColor: colors.border },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => handleSelectRankingCat(cat)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.rankingCatPillText,
                          { color: isSelected ? colors.primaryText : colors.text }
                        ]}>
                          {cat.icon || '📚'} {cat.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Notificación de actualización en tiempo real */}
            {liveRankingBadge && (
              <View style={styles.liveAlertBadge}>
                <Text style={styles.liveAlertText}>⚡ ¡Posición actualizada en tiempo real!</Text>
              </View>
            )}

            {/* Contenido del Ranking */}
            {rankingLoading ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13 }}>
                  Cargando posiciones en vivo...
                </Text>
              </View>
            ) : rankingData?.ranking && rankingData.ranking.length > 0 ? (
              <FlatList
                data={rankingData.ranking}
                keyExtractor={(item, index) => item._id || item.historyId || String(index)}
                style={{ maxHeight: 380, width: '100%', marginTop: 8 }}
                contentContainerStyle={{ paddingBottom: 10 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item, index }) => {
                  let medal = item.medal || (index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`);
                  const isMe = username && item.username && item.username.toLowerCase() === username.toLowerCase();
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
                          ⏱️ {formatDateTime(item.date)} • {item.score}/{item.total} pts
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
                  Sin posiciones registradas aún
                </Text>
                <Text style={{ fontSize: 12.5, color: colors.textSecondary, textAlign: 'center', marginTop: 4, paddingHorizontal: 20 }}>
                  Sé el primero en rendir una evaluación en esta materia para liderar el ranking.
                </Text>
              </View>
            )}

            {/* Botón de Cerrar */}
            <TouchableOpacity
              style={[styles.closeRankingBtn, { backgroundColor: colors.primary, marginTop: 12 }]}
              onPress={() => setRankingModalVisible(false)}
            >
              <Text style={[styles.closeRankingBtnText, { color: colors.primaryText }]}>Cerrar Tabla</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
  },
  backdropClickable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    borderRightWidth: 1,
    zIndex: 1000,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    flexDirection: 'column',
  },
  profileHeader: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 5px rgba(0,0,0,0.12)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 }),
  },
  avatarImage: {
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  avatarText: {
    fontSize: 17,
    fontWeight: '800',
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  username: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  role: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  brandBadge: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandMascot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 6px rgba(108,99,255,0.2)' }
      : { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 }),
  },
  menuList: {
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 4,
    paddingHorizontal: 14,
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuText: {
    fontSize: 16.5,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  themeSection: {
    marginTop: 16,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  themeTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  themeBtn: {
    width: '48%',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: 'rgba(128,128,128,0.05)',
  },
  themeBtnActive: {
    elevation: 1,
  },
  themeEmoji: {
    fontSize: 18,
    marginBottom: 2,
  },
  themeBtnText: {
    fontSize: 10.5,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 24 : 14,
    alignItems: 'center',
    gap: 8,
  },
  versionText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.5,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: 'center',
    width: '100%',
  },
  logoutIcon: {
    fontSize: 20,
    marginRight: 10,
    color: '#FFFFFF',
  },
  logoutText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
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
  // Estilos del Modal de Tabla de Posiciones
  rankingModalCard: {
    width: '92%',
    maxWidth: 540,
    borderRadius: 20,
    padding: 20,
    maxHeight: '85%',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 10px 30px rgba(0,0,0,0.3)' }
      : { elevation: 8 }),
  },
  rankingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rankingTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  rankingCategorySubtitle: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  rankingCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankingCloseBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  liveTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B98120',
    borderColor: '#10B981',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 4,
  },
  liveTagDot: {
    fontSize: 8,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  liveAlertBadge: {
    backgroundColor: '#3B82F620',
    borderColor: '#3B82F6',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 8,
    alignItems: 'center',
  },
  liveAlertText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#2563EB',
  },
  pillsScrollContainer: {
    marginBottom: 10,
  },
  pillsScrollContent: {
    gap: 8,
    paddingVertical: 4,
  },
  rankingCatPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  rankingCatPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  rankingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 10,
  },
  rankingMedal: {
    fontSize: 20,
    width: 32,
    textAlign: 'center',
    fontWeight: '900',
  },
  rankingStudentInfo: {
    flex: 1,
  },
  rankingStudentName: {
    fontSize: 14,
  },
  rankingDate: {
    fontSize: 11,
    marginTop: 2,
  },
  meBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  meBadgeText: {
    fontSize: 9.5,
    fontWeight: '800',
  },
  rankingScoreBadge: {
    alignItems: 'flex-end',
  },
  rankingPercentage: {
    fontSize: 15,
    fontWeight: '900',
  },
  rankingLives: {
    fontSize: 10,
    marginTop: 2,
  },
  closeRankingBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeRankingBtnText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
