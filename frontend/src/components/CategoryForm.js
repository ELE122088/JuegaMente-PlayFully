import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const EMOJI_OPTIONS = [
  // 📚 Académico y Letras
  '📚', '📖', '📝', '📜', '🏛️', '🌍', '🗺️', '⚖️', '🎓', '🗣️',
  // 🔬 Ciencia, Tecnología y Matemáticas
  '🧮', '📐', '🔬', '🔭', '🧪', '🧬', '💻', '🚀', '🤖', '⚛️', '💡', '🧠',
  // ⚽ Deportes y Competencia
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🥊', '🥋', '🏆', '🥇', '🏊', '🚴',
  // 🎨 Arte, Música y Creatividad
  '🎨', '🎵', '🎸', '🎹', '🎭', '🎬', '📷', '🎤', '🧩', '🎲',
  // 🌱 Naturaleza, Salud y General
  '🌱', '🌿', '🐾', '🏥', '🩺', '🍎', '🔧', '🛡️', '🧭', '⭐', '🔥'
];
const COLOR_OPTIONS = ['#6C63FF', '#FF6B6B', '#4ECDC4', '#FFD166', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#FF8C00', '#00CED1', '#9370DB', '#20B2AA'];

export default function CategoryForm({ visible, onClose, onSave, category = null }) {
  const isEditing = !!category;
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📚');
  const [color, setColor] = useState('#6C63FF');
  const [isPublic, setIsPublic] = useState(false);
  const [gameMode, setGameMode] = useState('exam');
  const [initialLives, setInitialLives] = useState(3);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (category) {
      setName(category.name || '');
      setDescription(category.description || '');
      setIcon(category.icon || '📚');
      setColor(category.color || '#6C63FF');
      setIsPublic(category.isPublic || false);
      setGameMode(category.gameMode || 'exam');
      setInitialLives(category.initialLives !== undefined ? category.initialLives : (category.gameMode === 'practice' ? 5 : 3));
      setTimePerQuestion(category.timePerQuestion !== undefined ? category.timePerQuestion : 15);
      setIsActive(category.isActive !== undefined ? category.isActive : true);
    } else {
      setName('');
      setDescription('');
      setIcon('📚');
      setColor('#6C63FF');
      setIsPublic(false);
      setGameMode('exam');
      setInitialLives(3);
      setTimePerQuestion(15);
      setIsActive(true);
    }
  }, [category, visible]);

  const handleSave = () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre de la categoría es obligatorio');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Error', 'La descripción es obligatoria');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      icon,
      color,
      isPublic,
      gameMode,
      initialLives: Number(initialLives),
      timePerQuestion,
      isActive,
    });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isEditing ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
            </Text>

            {/* Estado de la Sala / Examen (Abierto vs Bloqueado) */}
            <Text style={[styles.label, { color: colors.text }]}>Estado de la Sala</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  isActive && { backgroundColor: '#4ECDC420', borderColor: '#4ECDC4' }
                ]}
                onPress={() => setIsActive(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, { color: isActive ? '#4ECDC4' : colors.textSecondary }]} numberOfLines={1}>
                  🟢 Abierto
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  !isActive && { backgroundColor: '#FF6B6B20', borderColor: '#FF6B6B' }
                ]}
                onPress={() => setIsActive(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, { color: !isActive ? '#FF6B6B' : colors.textSecondary }]} numberOfLines={1}>
                  🔴 Cerrado
                </Text>
              </TouchableOpacity>
            </View>

            {/* 1. Tipo de Acceso (Privado con PIN vs Público) */}
            <Text style={[styles.label, { color: colors.text }]}>🌐 Tipo de Acceso</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  !isPublic && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                ]}
                onPress={() => setIsPublic(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, { color: !isPublic ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  🔒 Con PIN
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  isPublic && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                ]}
                onPress={() => setIsPublic(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, { color: isPublic ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                  🌐 Público
                </Text>
              </TouchableOpacity>
            </View>

            {/* 2. Modalidad de Juego (Examen vs Práctica) */}
            <Text style={[styles.label, { color: colors.text }]}>🎮 Modo de Juego</Text>
            <View style={styles.segmentedControl}>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  gameMode === 'exam' && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF6' }
                ]}
                onPress={() => setGameMode('exam')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, { color: gameMode === 'exam' ? '#8B5CF6' : colors.textSecondary }]} numberOfLines={1}>
                  📝 Examen
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  { backgroundColor: colors.background, borderColor: colors.border },
                  gameMode === 'practice' && { backgroundColor: '#10B98120', borderColor: '#10B981' }
                ]}
                onPress={() => setGameMode('practice')}
                activeOpacity={0.7}
              >
                <Text style={[styles.segmentBtnText, { color: gameMode === 'practice' ? '#10B981' : colors.textSecondary }]} numberOfLines={1}>
                  💡 Práctica
                </Text>
              </TouchableOpacity>
            </View>

            {/* 3. Cantidad de Vidas */}
            <Text style={[styles.label, { color: colors.text }]}>❤️ Cantidad de Vidas</Text>
            <View style={styles.segmentedControl}>
              {[
                { label: '1 ❤️', value: 1 },
                { label: '3 ❤️', value: 3 },
                { label: '5 ❤️', value: 5 },
                { label: '10 ❤️', value: 10 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.segmentBtn,
                    { backgroundColor: colors.background, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 2 },
                    initialLives === item.value && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                  ]}
                  onPress={() => setInitialLives(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentBtnText, { fontSize: 12.5, color: initialLives === item.value ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* 4. Tiempo por Pregunta */}
            <Text style={[styles.label, { color: colors.text }]}>⏱️ Tiempo por Pregunta</Text>
            <View style={styles.segmentedControl}>
              {[
                { label: '10s', value: 10 },
                { label: '15s', value: 15 },
                { label: '30s', value: 30 },
                { label: '60s', value: 60 },
                { label: '♾️ Libre', value: 0 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.segmentBtn,
                    { backgroundColor: colors.background, borderColor: colors.border, paddingVertical: 8, paddingHorizontal: 2 },
                    timePerQuestion === item.value && { backgroundColor: `${colors.primary}20`, borderColor: colors.primary }
                  ]}
                  onPress={() => setTimePerQuestion(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.segmentBtnText, { fontSize: 12, color: timePerQuestion === item.value ? colors.primary : colors.textSecondary }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Nombre */}
            <Text style={[styles.label, { color: colors.text }]}>Nombre</Text>
            <TextInput
              style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Matemáticas"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Descripción */}
            <Text style={[styles.label, { color: colors.text }]}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Ej: Preguntas sobre álgebra, geometría..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Icono */}
            <Text style={[styles.label, { color: colors.text }]}>Icono</Text>
            <View style={styles.optionsGrid}>
              {EMOJI_OPTIONS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={[
                    styles.emojiOption, 
                    { backgroundColor: colors.background },
                    icon === emoji && [styles.emojiSelected, { borderColor: colors.primary, backgroundColor: `${colors.primary}1A` }]
                  ]}
                  onPress={() => setIcon(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Color */}
            <Text style={[styles.label, { color: colors.text }]}>Color</Text>
            <View style={styles.optionsGrid}>
              {COLOR_OPTIONS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorOption,
                    { backgroundColor: c },
                    color === c && styles.colorSelected,
                  ]}
                  onPress={() => setColor(c)}
                >
                  {color === c && <Text style={styles.checkMark}>✓</Text>}
                </TouchableOpacity>
              ))}
            </View>

            {/* Vista previa */}
            <Text style={[styles.label, { color: colors.text }]}>Vista previa</Text>
            <View style={[styles.preview, { backgroundColor: colors.background, borderLeftColor: color }]}>
              <Text style={styles.previewIcon}>{icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.previewName, { color: colors.text }]}>{name || 'Nombre'}</Text>
                <Text style={[styles.previewDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                  {description || 'Descripción'}
                </Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                  <Text style={{ fontSize: 12, color: isPublic ? '#4ECDC4' : '#FF6B6B', fontWeight: 'bold' }}>
                    {isPublic ? '🌐 Práctica Libre' : '🔒 Privado (Con PIN)'}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                    • {gameMode === 'practice' ? '5 Vidas ❤️' : '3 Vidas ❤️'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Botones */}
          <View style={styles.buttons}>
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: color }]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>
                {isEditing ? 'Guardar Cambios' : 'Crear Categoría'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  segmentedControl: {
    flexDirection: 'row',
    gap: 6,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  emojiOption: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiSelected: {
    // Definido dinámicamente
  },
  emojiText: {
    fontSize: 22,
  },
  colorOption: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#333',
  },
  checkMark: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 18,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 6,
    gap: 12,
  },
  previewIcon: {
    fontSize: 32,
  },
  previewName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  previewDesc: {
    fontSize: 13,
    marginTop: 2,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
