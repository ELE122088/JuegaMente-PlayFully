import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function OptionButton({ text, letter, isSelected, isCorrect, isWrong, onPress, disabled }) {
  const { colors } = useTheme();

  let buttonStyle = [
    styles.button, 
    { 
      backgroundColor: colors.card, 
      borderColor: colors.border 
    }
  ];
  let textStyle = [styles.text, { color: colors.text }];
  let letterStyle = [styles.letter, { color: colors.textSecondary }];

  if (isSelected) {
    buttonStyle.push({
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}1F`, // 12% opacidad
    });
    textStyle.push({
      color: colors.primary,
      fontWeight: '600',
    });
    letterStyle.push({
      color: colors.primary,
    });
  }

  if (isCorrect) {
    buttonStyle.push({
      borderColor: '#4ECDC4',
      backgroundColor: 'rgba(78, 205, 196, 0.15)',
    });
    textStyle.push({
      color: '#4ECDC4',
      fontWeight: '600',
    });
    letterStyle.push({
      color: '#4ECDC4',
    });
  } else if (isWrong) {
    buttonStyle.push({
      borderColor: '#FF6B6B',
      backgroundColor: 'rgba(255, 107, 107, 0.15)',
    });
    textStyle.push({
      color: '#FF6B6B',
      fontWeight: '600',
    });
    letterStyle.push({
      color: '#FF6B6B',
    });
  }

  return (
    <TouchableOpacity 
      style={buttonStyle} 
      onPress={onPress} 
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={letterStyle}>{letter}</Text>
      <Text style={textStyle}>{text}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  letter: {
    width: 30,
    fontSize: 16,
    fontWeight: 'bold',
  },
  text: {
    flex: 1,
    fontSize: 16,
  },
});
