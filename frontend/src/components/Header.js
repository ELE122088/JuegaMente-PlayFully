import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../context/ThemeContext';
import { useSidebar } from '../context/SidebarContext';

export default function Header({ title, showBack = false, rightComponent, onBackPress }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { setSidebarOpen } = useSidebar();

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
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            onPress={() => setSidebarOpen(true)} 
            style={styles.backButton}
            {...(Platform.OS === 'web' ? {
              onMouseEnter: () => setSidebarOpen(true)
            } : {})}
          >
            <Text style={[styles.backIcon, { color: colors.text, fontSize: 26, lineHeight: 28 }]}>☰</Text>
          </TouchableOpacity>
        )}
      </View>

      
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
      
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
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rightContainer: {
    flex: 1,
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
    flex: 2,
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 22 : 18,
    fontWeight: '800',
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
  },
});
