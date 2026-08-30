import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

// Helper para sombras compatibles web/mobile sin advertencias
const createShadow = (color = '#000', offsetY = 2, opacity = 0.08, radius = 4, elevation = 3) => {
  if (Platform.OS === 'web') {
    const r = parseInt(color.slice(1,3), 16) || 0;
    const g = parseInt(color.slice(3,5), 16) || 0;
    const b = parseInt(color.slice(5,7), 16) || 0;
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

export default function CategoryCard({ category, onPress }) {
  const { colors } = useTheme();
  const [isActive, setIsActive] = useState(false);

  const catColor = category.color || colors.primary;
  const iconBg = `${catColor}16`;
  const isClosed = category.isActive === false;
  const isExam = category.gameMode === 'exam';
  const hasPin = !category.isPublic && category.roomCode;
  const livesCount = category.initialLives || (isExam ? 3 : 5);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: isActive ? catColor : colors.border,
          borderLeftColor: isClosed ? colors.textSecondary : catColor,
          opacity: isClosed ? 0.75 : 1,
          transform: isActive && !isClosed ? [{ translateY: -3 }] : [{ translateY: 0 }],
          ...(isActive && !isClosed
            ? createShadow(catColor, 6, 0.35, 14, 8)
            : createShadow('#000', 1, 0.04, 3, 2)),
        },
        Platform.OS === 'web' && {
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease',
          cursor: isClosed ? 'not-allowed' : 'pointer',
        },
      ]}
      onPress={onPress}
      onPressIn={() => !isClosed && setIsActive(true)}
      onPressOut={() => !isClosed && setIsActive(false)}
      activeOpacity={0.8}
      {...(Platform.OS === 'web'
        ? {
            onMouseEnter: () => setIsActive(true),
            onMouseLeave: () => setIsActive(false),
          }
        : {})}
    >
      {/* Icono de la Materia */}
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: isClosed ? `${colors.textSecondary}15` : iconBg,
            borderColor: isClosed ? `${colors.textSecondary}30` : `${catColor}35`,
          },
        ]}
      >
        <Text style={styles.icon}>{category.icon || '📚'}</Text>
      </View>

      {/* Información Central */}
      <View style={styles.infoContainer}>
        {/* Título y Badge de Estado */}
        <View style={styles.titleRow}>
          <Text
            style={[
              styles.title,
              {
                color: colors.text,
                fontFamily: Platform.OS === 'web' ? 'var(--font-display)' : undefined,
              },
            ]}
            numberOfLines={1}
          >
            {category.name}
          </Text>

          {isClosed ? (
            <View style={[styles.statusBadge, { backgroundColor: '#EF444418', borderColor: '#EF444450' }]}>
              <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>🚫 Cerrado</Text>
            </View>
          ) : hasPin ? (
            <View style={[styles.statusBadge, { backgroundColor: '#EF444415', borderColor: '#EF444445' }]}>
              <Text style={[styles.statusBadgeText, { color: '#EF4444' }]}>🔒 Con PIN</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: '#10B98115', borderColor: '#10B98145' }]}>
              <Text style={[styles.statusBadgeText, { color: '#10B981' }]}>🌐 Libre</Text>
            </View>
          )}
        </View>

        {/* Descripción */}
        {category.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {category.description}
          </Text>
        ) : null}

        {/* Fila de Badges Informativos */}
        <View style={styles.badgesRow}>
          {/* Conteo de preguntas */}
          <View style={[styles.badge, { backgroundColor: `${catColor}15`, borderColor: `${catColor}30` }]}>
            <Text style={[styles.badgeText, { color: catColor }]}>
              📚 {category.questionCount || 0} {(category.questionCount || 0) === 1 ? 'pregunta' : 'preguntas'}
            </Text>
          </View>

          {/* Modalidad de Juego */}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isExam ? '#8B5CF615' : '#10B98115',
                borderColor: isExam ? '#8B5CF635' : '#10B98135',
              },
            ]}
          >
            <Text style={[styles.badgeText, { color: isExam ? '#8B5CF6' : '#10B981' }]}>
              {isExam ? '📝 Examen' : '💡 Práctica'} ({livesCount} ❤️)
            </Text>
          </View>

          {/* Tiempo por Pregunta */}
          {category.timePerQuestion !== undefined && (
            <View style={[styles.badge, { backgroundColor: `${colors.textSecondary}10`, borderColor: `${colors.textSecondary}25` }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                ⏱️ {category.timePerQuestion === 0 ? 'Sin límite' : `${category.timePerQuestion}s`}
              </Text>
            </View>
          )}

          {/* Docente / Creador */}
          {category.createdBy?.username ? (
            <View style={[styles.badge, { backgroundColor: `${colors.textSecondary}12`, borderColor: `${colors.textSecondary}25` }]}>
              <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
                👨‍🏫 {category.createdBy.username}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Botón de Acción Circular a la Derecha */}
      <View
        style={[
          styles.actionBtnCircle,
          {
            backgroundColor: isClosed
              ? `${colors.textSecondary}15`
              : isHovered
              ? catColor
              : `${catColor}15`,
            borderColor: isClosed ? `${colors.textSecondary}30` : `${catColor}40`,
            transform: isHovered && !isClosed ? [{ scale: 1.08 }] : [{ scale: 1 }],
          },
          Platform.OS === 'web' && {
            transition: 'all 0.2s ease',
          },
        ]}
      >
        <Text
          style={[
            styles.actionBtnIcon,
            {
              color: isClosed
                ? colors.textSecondary
                : isHovered
                ? '#FFFFFF'
                : catColor,
            },
          ]}
        >
          {isClosed ? '🔒' : '➜'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
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
  iconContainer: {
    width: 50,
    height: 50,
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
    marginRight: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 3,
  },
  title: {
    flex: 1,
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
  },
  description: {
    fontSize: 12,
    lineHeight: 16.5,
    marginBottom: 8,
    fontWeight: '500',
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
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionBtnCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnIcon: {
    fontSize: 14,
    fontWeight: '900',
  },
});
