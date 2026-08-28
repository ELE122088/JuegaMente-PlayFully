import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { useTheme } from '../context/ThemeContext';

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

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
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
            <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave}>
              <Text style={[styles.saveButtonText, { color: colors.primaryText }]}>
                {isEditing ? 'Guardar Cambios' : 'Crear Pregunta'}
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
