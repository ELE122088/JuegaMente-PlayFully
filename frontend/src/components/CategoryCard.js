import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Helper para sombras compatibles web/mobile sin advertencias
const createShadow = (color = '#000', offsetY = 2, opacity = 0.08, radius = 4, elevation = 3) => {
  const r = parseInt(color.slice(1,3), 16) || 0;
  const g = parseInt(color.slice(3,5), 16) || 0;
  const b = parseInt(color.slice(5,7), 16) || 0;
  return {
    boxShadow: `0px ${offsetY}px ${radius}px rgba(${r},${g},${b},${opacity})`,
    elevation,
  };
};

export default function CategoryCard({ category, onPress }) {
  const { colors } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const catColor = category.color || '#6C63FF';
  const iconBg = `${catColor}16`; // Suave 10%
  const badgeBg = `${catColor}18`; // Suave

  return (
    <TouchableOpacity 
      style={[
        styles.card, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          borderLeftColor: catColor,
          transform: isHovered ? [{ translateY: -3 }] : [{ translateY: 0 }],
          ...(isHovered ? createShadow(catColor, 6, 0.2, 12, 6) : createShadow('#000', 1, 0.04, 3, 2)),
        },
        Platform.OS === 'web' && {
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease',
          cursor: 'pointer',
        }
      ]} 
      onPress={onPress}
      activeOpacity={0.75}
      {...(Platform.OS === 'web' ? {
        onMouseEnter: () => setIsHovered(true),
        onMouseLeave: () => setIsHovered(false),
      } : {})}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBg, borderColor: `${catColor}35` }]}>
        <Text style={styles.icon}>{category.icon}</Text>
      </View>
      <View style={styles.infoContainer}>
        <Text style={[styles.title, { color: colors.text, fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined }]}>
          {category.name}
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
          {category.description}
        </Text>
        <View style={styles.badgesRow}>
          <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: `${catColor}30`, borderWidth: 1 }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>
              {(category.questionCount || 0) === 1 ? '1 pregunta' : `${category.questionCount || 0} preguntas`}
            </Text>
          </View>

          {category.isActive === false ? (
            <View style={[styles.badge, { backgroundColor: '#FF6B6B20', borderColor: '#FF6B6B60', borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: '#FF6B6B', fontWeight: '800' }]}>
                🚫 Cerrado
              </Text>
            </View>
          ) : (
            <>
              {/* Badge de Acceso: Público vs Con PIN */}
              {category.isPublic || !category.roomCode ? (
                <View style={[styles.badge, { backgroundColor: '#4ECDC415', borderColor: '#4ECDC445', borderWidth: 1 }]}>
                  <Text style={[styles.badgeText, { color: '#4ECDC4', fontWeight: '700' }]}>
                    🌐 Público
                  </Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: '#FF6B6B15', borderColor: '#FF6B6B45', borderWidth: 1 }]}>
                  <Text style={[styles.badgeText, { color: '#FF6B6B', fontWeight: '700' }]}>
                    🔒 PIN
                  </Text>
                </View>
              )}

              {/* Badge de Modo y Vidas */}
              <View style={[styles.badge, { backgroundColor: category.gameMode === 'exam' ? '#8B5CF615' : '#10B98115', borderColor: category.gameMode === 'exam' ? '#8B5CF645' : '#10B98145', borderWidth: 1 }]}>
                <Text style={[styles.badgeText, { color: category.gameMode === 'exam' ? '#8B5CF6' : '#10B981', fontWeight: '700' }]}>
                  {category.gameMode === 'exam' ? '📝 Examen' : '💡 Práctica'} ({category.initialLives || (category.gameMode === 'exam' ? 3 : 5)} ❤️)
                </Text>
              </View>
            </>
          )}

          {category.timePerQuestion !== undefined && (
            <View style={[styles.badge, { backgroundColor: `${colors.textSecondary}10`, borderColor: `${colors.textSecondary}25`, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                ⏱️ {category.timePerQuestion === 0 ? 'Sin límite' : `${category.timePerQuestion}s`}
              </Text>
            </View>
          )}

          {category.createdBy?.username ? (
            <View style={[styles.badge, { backgroundColor: `${colors.textSecondary}12`, borderColor: `${colors.textSecondary}25`, borderWidth: 1 }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                👨‍🏫 {category.createdBy.username}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View style={[styles.arrowContainer, { backgroundColor: category.isActive === false ? `${colors.textSecondary}15` : `${catColor}12` }]}>
        <Text style={[styles.arrowText, { color: category.isActive === false ? colors.textSecondary : catColor }]}>
          {category.isActive === false ? '🔒' : '➜'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderLeftWidth: 5,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
    borderWidth: 1.5,
  },
  icon: {
    fontSize: 24,
  },
  infoContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    borderRadius: 7,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  arrowContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    fontSize: 13,
    fontWeight: '800',
  },
});
