import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, ScrollView, Image, TextInput, Modal, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import api, { BASE_URL } from '../services/api';

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

  // No renderizar si no está abierto ni está el PIN visible
  if (!shouldRender && !pinVisible) return null;

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
          {/* =========================================================
              OPCIÓN 1 (Bloqueada/Comentada): Tarjeta Horizontal Integrada
          ========================================================= */}
          {/*
          <View style={[styles.profileHeader, { borderBottomColor: colors.border, backgroundColor: colors.inputBg || `${colors.card}` }]}>
            <View style={styles.profileRow}>
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

              <View style={styles.brandBadge}>
                <Image 
                  source={require('../../assets/images/megamind_sidebar.png')} 
                  style={styles.brandMascot}
                  resizeMode="contain"
                />
              </View>
            </View>
          </View>
          */}

          {/* =========================================================
              OPCIÓN 2 (Bloqueada/Comentada): Barra Slim de Marca + Perfil Compacto
          ========================================================= */}
          {/*
          <View style={[styles.opt2Container, { borderBottomColor: colors.border }]}>
            <View style={[styles.opt2BrandBar, { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` }]}>
              <Image 
                source={require('../../assets/images/megamind_sidebar.png')} 
                style={styles.opt2BrandIcon}
                resizeMode="contain"
              />
              <Text style={[styles.opt2BrandTitle, { color: colors.primary }]}>
                🎮 JuegaMente <Text style={{ fontSize: 9.5, fontWeight: '700', color: colors.textSecondary }}>• (PlayFully)</Text>
              </Text>
            </View>

            <TouchableOpacity 
              style={[styles.opt2UserCard, { backgroundColor: colors.inputBg || `${colors.card}`, borderColor: colors.border }]}
              onPress={() => handleNavigate('/profile')}
              activeOpacity={0.7}
            >
              <View style={[styles.opt2Avatar, { backgroundColor: colors.primary }]}>
                {profileImage ? (
                  <Image source={{ uri: `${BASE_URL}${profileImage}` }} style={styles.opt2AvatarImg} />
                ) : (
                  <Text style={[styles.opt2AvatarTxt, { color: colors.primaryText }]}>
                    {username?.substring(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.opt2UserInfo}>
                <Text style={[styles.opt2Username, { color: colors.text }]} numberOfLines={1}>
                  {username}
                </Text>
                <Text style={[styles.opt2RoleText, { color: (isAdmin || role === 'admin') ? '#D97706' : colors.primary }]}>
                  {isAdmin || role === 'admin' ? '👑 Administrador' : '🎓 Estudiante'}
                </Text>
              </View>

              <View style={[styles.opt2ProfileArrow, { backgroundColor: `${colors.textSecondary}15` }]}>
                <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '800' }}>⚙️</Text>
              </View>
            </TouchableOpacity>
          </View>
          */}

          {/* =========================================================
              OPCIÓN 3 (ACTIVA): Perfil Minimalista Ultra-Limpio (Mascota en Header)
          ========================================================= */}
          <View style={[styles.opt3Container, { borderBottomColor: colors.border, backgroundColor: colors.inputBg || `${colors.card}` }]}>
            <TouchableOpacity 
              style={styles.opt3Row}
              onPress={() => handleNavigate('/profile')}
              activeOpacity={0.75}
            >
              <View style={[styles.opt3Avatar, { backgroundColor: colors.primary }]}>
                {profileImage ? (
                  <Image source={{ uri: `${BASE_URL}${profileImage}` }} style={styles.opt3AvatarImg} />
                ) : (
                  <Text style={[styles.opt3AvatarTxt, { color: colors.primaryText }]}>
                    {username?.substring(0, 2).toUpperCase()}
                  </Text>
                )}
              </View>

              <View style={styles.opt3UserInfo}>
                <Text style={[styles.opt3Username, { color: colors.text }]} numberOfLines={1}>
                  {username}
                </Text>
                <View style={[styles.opt3RoleBadge, { backgroundColor: (isAdmin || role === 'admin') ? '#F59E0B20' : `${colors.primary}20` }]}>
                  <Text style={[styles.opt3RoleText, { color: (isAdmin || role === 'admin') ? '#D97706' : colors.primary }]} numberOfLines={1}>
                    {isAdmin || role === 'admin' ? '👑 Administrador' : '🎓 Estudiante'}
                  </Text>
                </View>
              </View>

              <View style={[styles.opt3ActionBtn, { backgroundColor: `${colors.textSecondary}15` }]}>
                <Text style={{ fontSize: 13, color: colors.textSecondary }}>➜</Text>
              </View>
            </TouchableOpacity>
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
              onPress={() => handleNavigate('/profile')}
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
  // Estilos para Opción 2: Barra Slim de Marca + Perfil Compacto
  opt2Container: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  opt2BrandBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
  },
  opt2BrandIcon: {
    width: 20,
    height: 20,
    borderRadius: 6,
  },
  opt2BrandTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  opt2UserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  opt2Avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  opt2AvatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },
  opt2AvatarTxt: {
    fontSize: 15,
    fontWeight: '800',
  },
  opt2UserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  opt2Username: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  opt2RoleText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  opt2ProfileArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Estilos para Opción 3: Perfil Minimalista Ultra-Limpio
  opt3Container: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  opt3Row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  opt3Avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 5px rgba(0,0,0,0.12)' }
      : { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 3, elevation: 3 }),
  },
  opt3AvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  opt3AvatarTxt: {
    fontSize: 17,
    fontWeight: '800',
  },
  opt3UserInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  opt3Username: {
    fontSize: 15.5,
    fontWeight: '800',
    marginBottom: 2,
  },
  opt3RoleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  opt3RoleText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  opt3ActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
});
