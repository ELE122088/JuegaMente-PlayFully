import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

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

const InteractiveActionBtn = ({
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

export default function Header({ title, showBack = false, rightComponent, onBackPress }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { setSidebarOpen } = useSidebar();

  const isMainTitle = title === '🎮 JuegaMente' || title === 'JuegaMente';

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <View style={styles.leftContainer}>
        {showBack ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.iosBackBtn}
            activeOpacity={0.6}
          >
            <Text style={[styles.iosBackChevron, { color: colors.primary }]}>‹</Text>
            <Text style={[styles.iosBackText, { color: colors.primary }]}>volver</Text>
          </TouchableOpacity>
        ) : (
          <InteractiveActionBtn 
            onPress={() => setSidebarOpen(true)} 
            style={[styles.backButton, { borderColor: 'transparent' }]}
            accentColor={colors.primary}
            {...(Platform.OS === 'web' ? {
              onMouseEnter: () => setSidebarOpen(true)
            } : {})}
          >
            <Text style={[styles.backIcon, { color: colors.text, fontSize: 26, lineHeight: 28 }]}>☰</Text>
          </InteractiveActionBtn>
        )}
      </View>

      <View style={styles.titleContainer}>
        {isMainTitle && (
          <Image 
            source={require('../../assets/images/megamind_sidebar.png')} 
            style={styles.headerMascot}
            resizeMode="contain"
          />
        )}
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {isMainTitle ? 'JuegaMente' : title}
        </Text>
      </View>
      
      <View style={styles.rightContainer}>
        {rightComponent}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Platform.OS === 'web' ? 24 : 16,
    paddingTop: Platform.OS === 'web' ? 14 : 50, // 14px en web, 50px en móvil para el notch
    paddingBottom: Platform.OS === 'web' ? 14 : 16,
    borderBottomWidth: 1,
    width: '100%',
  },
  leftContainer: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iosBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 6,
    gap: 2,
    marginLeft: -4,
    ...(Platform.OS === 'web' ? { cursor: 'pointer', userSelect: 'none' } : {}),
  },
  iosBackChevron: {
    fontSize: 22,
    fontWeight: '300',
    marginTop: -2,
  },
  iosBackText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 4,
  },
  headerMascot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 2px 4px rgba(108,99,255,0.2)' }
      : { shadowColor: '#6C63FF', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 }),
  },
  rightContainer: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
    marginLeft: -4,
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 20 : 16.5,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
});
