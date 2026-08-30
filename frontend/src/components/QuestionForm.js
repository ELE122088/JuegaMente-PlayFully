import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert, Platform } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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
    shadowOpacity: opacity,
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
  const [isHovered, setIsHovered] = useState(false);

  return (
    <TouchableOpacity
      style={[
        style,
        Platform.OS === 'web' && {
          transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.25s ease, border-color 0.2s ease, opacity 0.2s ease',
          cursor: disabled ? 'default' : 'pointer',
        },
        isHovered && !disabled && {
          transform: [{ translateY: -2 }],
          borderColor: accentColor,
          ...createShadow(accentColor, 4, 0.28, 10, 4),
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      {...(Platform.OS === 'web' && !disabled
        ? {
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false),
          }
        : {})}
      {...props}
    >
      {children}
    </TouchableOpacity>
  );
};

export default function QuestionForm({ visible, onClose, onSave, question = null, categories = [] }) {
  const isEditing = !!question;
  const { colors } = useTheme();

  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState(0);
  const [categoryId, setCategoryId] = useState('');

  useEffect(() => {
    if (question) {
      setText(question.text || '');
      setOptions(question.options || ['', '', '', '']);
      setCorrectAnswer(question.correctAnswer ?? 0);
      setCategoryId(
        (question.category && typeof question.category === 'object') ? question.category._id : question.category || ''
      );
    } else {
      setText('');
      setOptions(['', '', '', '']);
      setCorrectAnswer(0);
      setCategoryId(categories.length > 0 ? categories[0]._id : '');
    }
  }, [question, visible]);

  const updateOption = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const handleSave = () => {
    if (!text.trim()) {
      Alert.alert('Error', 'El texto de la pregunta es obligatorio');
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      Alert.alert('Error', 'Todas las opciones deben estar completas');
      return;
    }
    if (!categoryId) {
      Alert.alert('Error', 'Debes seleccionar una categoría');
      return;
    }

    onSave({
      text: text.trim(),
      options: options.map((o) => o.trim()),
      correctAnswer,
      category: categoryId,
    });
  };

  const letters = ['A', 'B', 'C', 'D'];
  const selectedCat = categories.find((c) => c._id === categoryId);
  const selectedCatColor = selectedCat?.color || colors.primary;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: selectedCatColor }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={[styles.title, { color: colors.text }]}>
              {isEditing ? '✏️ Editar Pregunta' : '➕ Nueva Pregunta'}
            </Text>

            {/* Categoría */}
            <Text style={[styles.label, { color: colors.text }]}>Categoría</Text>
            <View style={styles.categoryGrid}>
              {categories.map((cat) => {
                const isSelected = categoryId === cat._id;
                return (
                  <TouchableOpacity
                    key={cat._id}
                    style={[
                      styles.categoryChip,
                      { borderColor: cat.color, backgroundColor: isSelected ? cat.color : colors.card },
                    ]}
                    onPress={() => setCategoryId(cat._id)}
                  >
                    <Text
                      style={[
                        styles.categoryChipText,
                        { color: isSelected ? '#FFFFFF' : colors.text },
                      ]}
                    >
                      {cat.icon} {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pregunta */}
            <Text style={[styles.label, { color: colors.text }]}>Pregunta</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              value={text}
              onChangeText={setText}
              placeholder="Escribe la pregunta..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
            />

            {/* Opciones */}
            <Text style={[styles.label, { color: colors.text }]}>Opciones de respuesta</Text>
            {options.map((option, index) => {
              const isCorrect = correctAnswer === index;
              return (
                <View key={index} style={styles.optionRow}>
                  <TouchableOpacity
                    style={[
                      styles.radioButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isCorrect && { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' },
                    ]}
                    onPress={() => setCorrectAnswer(index)}
                  >
                    <Text
                      style={[
                        styles.radioText,
                        { color: colors.textSecondary },
                        isCorrect && { color: '#FFFFFF' },
                      ]}
                    >
                      {letters[index]}
                    </Text>
                  </TouchableOpacity>
                  <TextInput
                    style={[
                      styles.optionInput,
                      { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
                      isCorrect && { borderColor: '#4ECDC4', backgroundColor: 'rgba(78, 205, 196, 0.12)' },
                    ]}
                    value={option}
                    onChangeText={(val) => updateOption(index, val)}
                    placeholder={`Opción ${letters[index]}`}
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              );
            })}
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Toca la letra para marcar la respuesta correcta (actual: {letters[correctAnswer]})
            </Text>
          </ScrollView>

          {/* Botones */}
          <View style={styles.buttons}>
            <InteractiveActionBtn
              style={[styles.cancelButton, { backgroundColor: colors.border }]}
              accentColor={colors.textSecondary}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </InteractiveActionBtn>
            <InteractiveActionBtn
              style={[styles.saveButton, { backgroundColor: selectedCatColor }]}
              accentColor={selectedCatColor}
              onPress={handleSave}
            >
              <Text style={[styles.saveButtonText, { color: '#FFFFFF' }]}>
                {isEditing ? 'Guardar Cambios' : 'Crear Pregunta'}
              </Text>
            </InteractiveActionBtn>
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
    borderWidth: 1.5,
    borderLeftWidth: 5,
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
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  radioButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  radioText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  hint: {
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
  },
});
