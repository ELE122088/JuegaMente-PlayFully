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
    if (categories.length === 0 || !categoryId) {
      const msg = '⚠️ No hay materias disponibles. Primero debes crear al menos una materia antes de poder guardar preguntas.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Sin Materias', msg);
      return;
    }
    if (!text.trim()) {
      const msg = '⚠️ El texto de la pregunta es obligatorio.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Pregunta Incompleta', msg);
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      const msg = '⚠️ Todas las 4 opciones de respuesta deben estar completas.';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert('Opciones Incompletas', msg);
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

            {/* Aviso si no hay materias */}
            {categories.length === 0 && (
              <View style={{ padding: 12, backgroundColor: '#EF444415', borderColor: '#EF4444', borderWidth: 1, borderRadius: 12, marginBottom: 12 }}>
                <Text style={{ color: '#EF4444', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                  ⚠️ No tienes materias creadas todavía. Primero debes crear una materia antes de poder registrar preguntas.
                </Text>
              </View>
            )}

            {/* Categoría */}
            <Text style={[styles.label, { color: colors.text }]}>Categoría / Materia</Text>
            {categories.length > 0 ? (
              <View style={styles.categoryGrid}>
                {categories.map((cat) => {
                  const isSelected = categoryId === cat._id;
                  return (
                    <InteractiveActionBtn
                      key={cat._id}
                      style={[
                        styles.categoryChip,
                        { borderColor: cat.color, backgroundColor: isSelected ? cat.color : colors.card },
                      ]}
                      accentColor={cat.color}
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
                    </InteractiveActionBtn>
                  );
                })}
              </View>
            ) : (
              <Text style={{ fontSize: 13, color: colors.textSecondary, fontStyle: 'italic', marginBottom: 8 }}>
                No hay materias disponibles para asignar esta pregunta.
              </Text>
            )}

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
                  <InteractiveActionBtn
                    style={[
                      styles.radioButton,
                      { backgroundColor: colors.background, borderColor: colors.border },
                      isCorrect && { backgroundColor: '#4ECDC4', borderColor: '#4ECDC4' },
                    ]}
                    accentColor="#4ECDC4"
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
                  </InteractiveActionBtn>
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
    padding: Platform.OS === 'web' ? 12 : 16,
  },
  modal: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: Platform.OS === 'web' ? 16 : 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '92%',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 13.5,
    fontWeight: '700',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 15,
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: '700',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  radioButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  radioText: {
    fontSize: 13.5,
    fontWeight: 'bold',
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 14.5,
    outlineWidth: 0,
    ...(Platform.OS === 'web' ? { outline: 'none', outlineStyle: 'none' } : {}),
  },
  hint: {
    fontSize: 11.5,
    marginTop: 4,
    fontStyle: 'italic',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    flex: 1.3,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
